import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import { createClient } from "@supabase/supabase-js"
import { getFileExt } from "@/lib/file-types"

// Force Node.js runtime — pdf-parse/pdfjs-dist need Node.js APIs (not Edge)
export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const XLSX = require("xlsx")
const JSZip = require("jszip")

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist v6.0.227: use the legacy ES-module build (works in Node.js without a worker)
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const data = await pdfjs.getDocument({ data: buffer }).promise
  const numPages = data.numPages
  console.log("[PARSE-DOC PDF] pdfjs-dist loaded. Pages:", numPages)

  let text = ""
  for (let i = 1; i <= numPages; i++) {
    const page = await data.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(" ")
    text += pageText + "\n\n"
  }

  console.log("[PARSE-DOC PDF] Extracted text length:", text.length)
  return text.trim()
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  let text = ""
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    text += `--- Sheet: ${sheetName} ---\n${csv}\n\n`
  }
  return text.trim()
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || "0", 10)
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || "0", 10)
      return numA - numB
    })

  let text = ""
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async("string")
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g)
    if (matches && matches.length > 0) {
      const slideText = matches.map((m: string) => m.replace(/<\/?a:t>/g, "")).join(" ")
      const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] || "?"
      text += `--- Slide ${slideNum} ---\n${slideText}\n\n`
    }
  }
  return text.trim() || "[No text found in presentation]"
}

function isTextFile(mimeType: string, ext: string): boolean {
  const textMimes = [
    "text/plain",
    "text/csv",
    "text/html",
    "text/markdown",
    "text/xml",
    "text/rtf",
    "application/json",
    "application/xml",
    "application/rtf",
  ]
  const textExts = ["txt", "csv", "html", "htm", "md", "markdown", "json", "xml", "rtf", "log", "tsv"]
  return textMimes.includes(mimeType) || textExts.includes(ext)
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("[PARSE-DOC] ====== Request started ======")

  try {
    // 1. Parse request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error("[PARSE-DOC] FAILED to parse JSON body:", e)
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    console.log("[PARSE-DOC] Request body:", JSON.stringify(body))

    const { userId, filename, mimeType } = body
    if (!userId || !filename) {
      console.error("[PARSE-DOC] FAILED: Missing userId or filename. Got:", { userId, filename })
      return NextResponse.json({ error: "Missing userId or filename" }, { status: 400 })
    }

    // 2. Check env vars
    console.log("[PARSE-DOC] Env check — NEXT_PUBLIC_SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[PARSE-DOC] Env check — NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[PARSE-DOC] FAILED: Missing env vars")
      return NextResponse.json({ error: "Server config missing: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 })
    }

    // 3. Download from storage
    const filePath = `${userId}/${filename}`
    console.log("[PARSE-DOC] Downloading from storage path:", filePath)

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("knowledge-base")
      .download(filePath)

    if (downloadError) {
      console.error("[PARSE-DOC] FAILED to download:", downloadError.message, downloadError)
      return NextResponse.json({ error: `Download failed: ${downloadError.message}` }, { status: 500 })
    }
    if (!blob) {
      console.error("[PARSE-DOC] FAILED: Download returned null blob")
      return NextResponse.json({ error: "Download returned null" }, { status: 500 })
    }
    console.log("[PARSE-DOC] Downloaded blob size:", blob.size, "bytes, type:", blob.type)

    // 4. Convert to buffer
    let buffer: Buffer
    try {
      const arrayBuffer = await blob.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log("[PARSE-DOC] Buffer created. Length:", buffer.length)
    } catch (e: any) {
      console.error("[PARSE-DOC] FAILED to create buffer:", e.message)
      return NextResponse.json({ error: `Buffer creation failed: ${e.message}` }, { status: 500 })
    }

    // 5. Detect type
    const ext = getFileExt(filename)
    console.log("[PARSE-DOC] Detected extension:", ext, "| Provided mimeType:", mimeType)

    let text = ""
    let extractionMethod = ""

    // PDF
    if (mimeType === "application/pdf" || ext === "pdf") {
      extractionMethod = "pdfjs-dist"
      console.log("[PARSE-DOC] Route: PDF extraction via", extractionMethod)
      console.log("[PARSE-DOC] Runtime:", process.env.NEXT_RUNTIME || "nodejs")
      try {
        text = await extractPdfText(buffer)
        console.log("[PARSE-DOC] PDF extracted. Length:", text.length)
      } catch (e: any) {
        console.error("[PARSE-DOC] PDF extraction FAILED:", e.message, e.stack)
        text = "[PDF text extraction failed — document may be scanned/image-based]"
      }
    }
    // Word (DOCX / DOC) — Microsoft Office and Google Docs exports
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      ext === "docx" ||
      ext === "doc" ||
      (mimeType === "application/octet-stream" && (ext === "docx" || ext === "doc"))
    ) {
      extractionMethod = "mammoth"
      console.log("[PARSE-DOC] Route: DOCX extraction via", extractionMethod)
      try {
        text = await extractDocxText(buffer)
        console.log("[PARSE-DOC] DOCX extracted. Length:", text.length)
      } catch (e: any) {
        console.error("[PARSE-DOC] DOCX extraction FAILED:", e.message, e.stack)
        text = "[DOCX text extraction failed]"
      }
    }
    // Excel (XLSX / XLS / CSV) — Microsoft Office and Google Sheets exports
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      mimeType === "text/csv" ||
      ext === "xlsx" ||
      ext === "xls" ||
      ext === "csv" ||
      (mimeType === "application/octet-stream" && (ext === "xlsx" || ext === "xls" || ext === "csv"))
    ) {
      if (ext === "csv" || mimeType === "text/csv") {
        extractionMethod = "raw-csv"
        console.log("[PARSE-DOC] Route: CSV raw text")
        text = buffer.toString("utf-8")
      } else {
        extractionMethod = "xlsx"
        console.log("[PARSE-DOC] Route: Excel extraction via", extractionMethod)
        try {
          text = await extractXlsxText(buffer)
          console.log("[PARSE-DOC] Excel extracted. Length:", text.length)
        } catch (e: any) {
          console.error("[PARSE-DOC] Excel extraction FAILED:", e.message, e.stack)
          text = "[Excel text extraction failed]"
        }
      }
    }
    // PowerPoint (PPTX / PPT) — Microsoft Office and Google Slides exports
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint" ||
      ext === "pptx" ||
      ext === "ppt" ||
      (mimeType === "application/octet-stream" && (ext === "pptx" || ext === "ppt"))
    ) {
      extractionMethod = "jszip-pptx"
      console.log("[PARSE-DOC] Route: PPTX extraction via", extractionMethod)
      try {
        text = await extractPptxText(buffer)
        console.log("[PARSE-DOC] PPTX extracted. Length:", text.length)
      } catch (e: any) {
        console.error("[PARSE-DOC] PPTX extraction FAILED:", e.message, e.stack)
        text = "[PowerPoint text extraction failed]"
      }
    }
    // Plain text & code files
    else if (isTextFile(mimeType, ext)) {
      extractionMethod = "raw-text"
      console.log("[PARSE-DOC] Route: Plain text file")
      text = buffer.toString("utf-8")
    }
    // Fallback
    else {
      extractionMethod = "none"
      console.warn("[PARSE-DOC] Route: UNSUPPORTED file type. mimeType:", mimeType, "ext:", ext)
      text = "[Unsupported file type for text extraction]"
    }

    // 6. Truncate
    const maxChars = 12000
    const truncated = text.length > maxChars ? text.slice(0, maxChars) + "\n\n[Document truncated...]" : text
    console.log("[PARSE-DOC] Final text length:", truncated.length, "(method:", extractionMethod, ")")
    console.log("[PARSE-DOC] First 200 chars:", truncated.slice(0, 200).replace(/\n/g, " "))
    console.log("[PARSE-DOC] ====== Request completed in", Date.now() - startTime, "ms ======")

    return NextResponse.json({ text: truncated, debug: { method: extractionMethod, bufferSize: buffer.length, originalLength: text.length } })
  } catch (err: any) {
    console.error("[PARSE-DOC] ====== UNEXPECTED ERROR ======", err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"
import mammoth from "mammoth"

export const runtime = "nodejs"

function estimateDocxPages(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
  // ~250 words per page is a standard estimate
  return Math.max(1, Math.ceil(wordCount / 250))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    let pageCount = 0

    if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const pdfDoc = await PDFDocument.load(buffer)
      pageCount = pdfDoc.getPageCount()
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      pageCount = estimateDocxPages(result.value)
    }

    return NextResponse.json({ pageCount })
  } catch (err: any) {
    console.error("Page count failed:", err)
    return NextResponse.json({ pageCount: 0 })
  }
}

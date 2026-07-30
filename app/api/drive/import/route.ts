import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
  try {
    const { userId, fileName, mimeType, content, category = "All Documents", workspaceId } = await req.json()
    console.log("[DRIVE IMPORT] Received request:", { userId, fileName, mimeType, contentLength: content?.length, category, workspaceId })
    if (!userId || !fileName || !content) {
      return NextResponse.json({ error: "Missing required fields: userId, fileName, content (base64)" }, { status: 400 })
    }

    // Decode base64 content (downloaded client-side with drive.file scope)
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(content, "base64")
    } catch {
      return NextResponse.json({ error: "Invalid base64 content" }, { status: 400 })
    }

    const fileSize = fileBuffer.length
    const outputMimeType = mimeType || "application/octet-stream"
    const outputName = fileName

    if (fileSize === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    // Upload to Supabase Storage
    const documentId = crypto.randomUUID()
    const safeName = outputName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `${userId}/${documentId}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("knowledge-base")
      .upload(filePath, fileBuffer, { contentType: outputMimeType, upsert: false })

    if (uploadError) throw uploadError

    // Insert documents row
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        user_id: userId,
        workspace_id: workspaceId || null,
        category,
        filename: `${documentId}_${safeName}`,
        original_filename: outputName,
        mime_type: outputMimeType,
        file_size_bytes: fileSize,
        status: "INDEXED",
        page_count: 0,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Trigger background parse
    try {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/parse-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, filename: `${documentId}_${safeName}`, mimeType: outputMimeType }),
      }).catch(() => {})
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      name: outputName,
      mimeType: outputMimeType,
      size: fileSize,
    })
  } catch (err: any) {
    console.error("[DRIVE IMPORT]", err)
    return NextResponse.json({ error: err?.message || "Drive import failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/drive/import")

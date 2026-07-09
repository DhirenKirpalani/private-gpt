import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshIfNeeded(conn: any): Promise<string> {
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return conn.access_token
  }
  if (!conn.refresh_token) throw new Error("Refresh token missing")

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  const data = await tokenRes.json()
  if (!tokenRes.ok) throw new Error(data.error_description || data.error || "Token refresh failed")

  const newAccess = data.access_token
  const expiresIn = data.expires_in || 3600
  const newExpires = new Date(Date.now() + expiresIn * 1000).toISOString()
  await supabase.from("calendar_connections").update({ access_token: newAccess, token_expires_at: newExpires }).eq("id", conn.id)
  return newAccess
}

const GOOGLE_WORKSPACE_EXPORT: Record<string, string> = {
  "application/vnd.google-apps.document": "application/pdf",
  "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.google-apps.presentation": "application/pdf",
}

export async function POST(req: NextRequest) {
  try {
    const { userId, driveFileId, category = "All Documents" } = await req.json()
    if (!userId || !driveFileId) {
      return NextResponse.json({ error: "Missing userId or driveFileId" }, { status: 400 })
    }

    const { data: conn } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "googledrive")
      .maybeSingle()

    if (!conn?.access_token) {
      return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 })
    }

    const accessToken = await refreshIfNeeded(conn)

    // Get file metadata
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,mimeType,size,createdTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const meta = await metaRes.json()
    if (!metaRes.ok) {
      return NextResponse.json({ error: meta.error?.message || "Failed to get Drive file metadata" }, { status: 500 })
    }

    if (meta.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.json({ error: "Cannot import a folder" }, { status: 400 })
    }

    // Build download/export URL
    let downloadUrl: string
    let outputMimeType = meta.mimeType
    let outputName = meta.name

    const exportMime = GOOGLE_WORKSPACE_EXPORT[meta.mimeType]
    if (exportMime) {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}/export?mimeType=${encodeURIComponent(exportMime)}`
      outputMimeType = exportMime
      const ext = exportMime.includes("spreadsheet") ? ".xlsx" : ".pdf"
      if (!outputName.toLowerCase().endsWith(ext)) outputName += ext
    } else {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`
    }

    // Download file content
    const fileRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!fileRes.ok) {
      const err = await fileRes.json().catch(() => ({}))
      return NextResponse.json({ error: err.error?.message || "Failed to download file from Drive" }, { status: 500 })
    }

    const arrayBuffer = await fileRes.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const fileSize = fileBuffer.length

    if (fileSize === 0) {
      return NextResponse.json({ error: "Downloaded file is empty" }, { status: 400 })
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

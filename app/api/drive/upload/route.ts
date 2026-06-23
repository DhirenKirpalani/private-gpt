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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, fileName, mimeType, content, folderId } = body

    if (!userId || !fileName || !content) {
      return NextResponse.json({ error: "Missing required fields: userId, fileName, content (base64)" }, { status: 400 })
    }

    // Get stored Drive connection
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

    // Decode base64 content
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(content, "base64")
    } catch {
      return NextResponse.json({ error: "Invalid base64 content" }, { status: 400 })
    }

    // Build metadata
    const metadata: any = {
      name: fileName,
      mimeType: mimeType || "application/octet-stream",
    }
    if (folderId) {
      metadata.parents = [folderId]
    }

    // Build multipart body
    const boundary = `----ExploroDriveBoundary${Date.now()}${Math.random().toString(36).slice(2, 10)}`
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const multipartBody = Buffer.concat([
      Buffer.from(
        `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
      ),
      Buffer.from(
        `${delimiter}Content-Type: ${metadata.mimeType}\r\n\r\n`
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ])

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) {
      console.error("[DRIVE UPLOAD] Google error:", uploadData)
      return NextResponse.json({ error: uploadData.error?.message || "Failed to upload file to Google Drive" }, { status: 500 })
    }

    // Get file webViewLink
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=id,name,mimeType,webViewLink,size,createdTime`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const fileData = await fileRes.json()

    return NextResponse.json({
      success: true,
      fileId: uploadData.id,
      name: fileData.name || fileName,
      mimeType: fileData.mimeType || metadata.mimeType,
      webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`,
      size: fileData.size ? parseInt(fileData.size) : fileBuffer.length,
      createdTime: fileData.createdTime,
    })
  } catch (err: any) {
    console.error("[DRIVE UPLOAD]", err)
    return NextResponse.json({ error: err?.message || "Drive upload failed" }, { status: 500 })
  }
}

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
    const userId = body.userId
    const query = body.query || ""
    const pageSize = body.pageSize || 50

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
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

    // Build search URL
    const url = new URL("https://www.googleapis.com/drive/v3/files")
    url.searchParams.set("pageSize", String(pageSize))
    url.searchParams.set("fields", "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, parents)")
    url.searchParams.set("orderBy", "modifiedTime desc")

    if (query) {
      url.searchParams.set("q", `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`)
    } else {
      url.searchParams.set("q", "trashed = false")
    }

    const driveRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const driveData = await driveRes.json()

    if (!driveRes.ok) {
      return NextResponse.json({ error: driveData.error?.message || "Failed to fetch Drive files" }, { status: 500 })
    }

    const files = (driveData.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size) : null,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      thumbnailLink: f.thumbnailLink,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }))

    return NextResponse.json({
      files,
      nextPageToken: driveData.nextPageToken || null,
    })
  } catch (err: any) {
    console.error("[DRIVE FETCH]", err)
    return NextResponse.json({ error: err?.message || "Drive fetch failed" }, { status: 500 })
  }
}

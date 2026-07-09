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
    const { userId, name, parentId } = await req.json()

    if (!userId || !name) {
      return NextResponse.json({ error: "Missing required fields: userId, name" }, { status: 400 })
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

    const metadata: any = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    }
    if (parentId) {
      metadata.parents = [parentId]
    }

    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    })

    const createData = await createRes.json()
    if (!createRes.ok) {
      return NextResponse.json({ error: createData.error?.message || "Failed to create folder" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      folderId: createData.id,
      name: createData.name,
      mimeType: createData.mimeType,
    })
  } catch (err: any) {
    console.error("[DRIVE FOLDER CREATE]", err)
    return NextResponse.json({ error: err?.message || "Folder creation failed" }, { status: 500 })
  }
}

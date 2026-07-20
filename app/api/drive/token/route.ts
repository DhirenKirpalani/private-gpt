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

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
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

    return NextResponse.json({ accessToken })
  } catch (err: any) {
    console.error("[DRIVE TOKEN] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to get Drive token" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshIfNeeded(conn: any): Promise<string> {
  if (!conn.refresh_token) return conn.access_token
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0
  if (Date.now() < expiresAt - 60000) return conn.access_token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error("Failed to refresh token")
  await supabase.from("calendar_connections").update({
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq("id", conn.id)
  return data.access_token
}

async function _DELETE(req: NextRequest) {
  try {
    const { userId, eventId } = await req.json()
    if (!userId || !eventId) {
      return NextResponse.json({ error: "Missing userId or eventId" }, { status: 400 })
    }

    const { data: conn } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google")
      .eq("status", "connected")
      .maybeSingle()

    if (!conn) {
      return NextResponse.json({ error: "No connected Google Calendar account" }, { status: 400 })
    }

    const accessToken = await refreshIfNeeded(conn)

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (res.status === 204 || res.status === 200) {
      await supabase.from("calendar_events").delete().eq("user_id", userId).eq("event_id", eventId)
      return NextResponse.json({ success: true })
    }

    const errData = await res.json().catch(() => ({}))
    return NextResponse.json({ error: errData?.error?.message || "Failed to delete event" }, { status: 500 })
  } catch (e: any) {
    console.error("[CALENDAR DELETE]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const DELETE = _DELETE
export const POST = _DELETE

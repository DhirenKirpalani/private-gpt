import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    const { userId, title, description, start, end, attendees, location, addGoogleMeet } = await req.json()
    if (!userId || !title || !start || !end) {
      return NextResponse.json({ error: "Missing required fields: userId, title, start, end" }, { status: 400 })
    }

    const { data: conn, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google")
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Calendar connection not found" }, { status: 404 })
    }

    const accessToken = await refreshIfNeeded(conn)

    const body: any = {
      summary: title,
      description: description || "",
      start: { dateTime: new Date(start).toISOString(), timeZone: "UTC" },
      end: { dateTime: new Date(end).toISOString(), timeZone: "UTC" },
    }

    if (location) body.location = location
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      body.attendees = attendees.map((a: string) => ({ email: a }))
    }
    if (addGoogleMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      }
    }

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error("[CALENDAR CREATE] Google API error:", data)
      return NextResponse.json({ error: data.error?.message || "Failed to create event" }, { status: 500 })
    }

    // Extract Google Meet link if created
    const meetLink = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri
    const eventLink = meetLink || data.htmlLink || null
    const isOnline = !!meetLink

    // Store in local DB
    await supabase.from("calendar_events").insert({
      user_id: userId,
      connection_id: conn.id,
      event_id: data.id,
      summary: title,
      description: description || null,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      attendees: attendees || [],
      location: location || null,
      event_link: eventLink,
      is_online: isOnline,
    })

    console.log(`[CALENDAR CREATE] Event created: ${data.id} - ${title}`)
    return NextResponse.json({ success: true, eventId: data.id, link: data.htmlLink })
  } catch (err: any) {
    console.error("[CALENDAR CREATE] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to create event" }, { status: 500 })
  }
}

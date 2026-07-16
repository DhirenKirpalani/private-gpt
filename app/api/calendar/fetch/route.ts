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
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
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

    // Delete past events from DB (end_time < now)
    const nowIso = new Date().toISOString()
    await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", userId)
      .eq("connection_id", conn.id)
      .lt("end_time", nowIso)

    // Fetch events from start of today to 14 days from now (15 days total)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const timeMin = startOfDay.toISOString()
    const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const calendarRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50&orderBy=startTime&singleEvents=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const calendarData = await calendarRes.json()
    if (!calendarRes.ok) throw new Error(calendarData.error?.message || "Calendar API failed")

    // Filter out birthday and holiday events
    const BIRTHDAY_PATTERNS = [
      /\bbirthday\b/i,
      /\bcumpleaños\b/i,
      /\bholidays\b/i,
      /\bferiados\b/i,
    ]
    const BIRTHDAY_ORGANIZERS = [
      "birthday@group.v.calendar.google.com",
      "holiday@group.v.calendar.google.com",
      "en.usa#holiday@group.v.calendar.google.com",
      "en.mexican#holiday@group.v.calendar.google.com",
    ]

    const events = (calendarData.items || []).filter((ev: any) => {
      // Filter by event type
      if (ev.eventType === "birthday" || ev.eventType === "holiday") return false
      // Filter by organizer email
      const organizerEmail = ev.organizer?.email || ""
      if (BIRTHDAY_ORGANIZERS.some(o => organizerEmail.toLowerCase() === o)) return false
      // Filter by summary pattern
      const summary = ev.summary || ""
      if (BIRTHDAY_PATTERNS.some(p => p.test(summary))) return false
      return true
    })
    const results: any[] = []

    for (const ev of events) {
      const eventId = ev.id
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("user_id", userId)
        .eq("connection_id", conn.id)
        .eq("event_id", eventId)
        .maybeSingle()

      if (!existing) {
        const start = ev.start?.dateTime || ev.start?.date
        const end = ev.end?.dateTime || ev.end?.date
        const attendees = (ev.attendees || []).map((a: any) => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
        }))

        const { data: inserted } = await supabase.from("calendar_events").insert({
          user_id: userId,
          connection_id: conn.id,
          event_id: eventId,
          summary: ev.summary || "(No title)",
          description: ev.description || null,
          start_time: start ? new Date(start).toISOString() : null,
          end_time: end ? new Date(end).toISOString() : null,
          attendees: attendees,
          location: ev.location || null,
          event_link: ev.htmlLink || null,
          is_online: ev.conferenceData?.conferenceSolution?.name?.toLowerCase().includes("meet") || false,
        }).select().single()

        if (inserted) results.push(inserted)
      }
    }

    return NextResponse.json({ success: true, fetched: results.length, events: results })
  } catch (err: any) {
    console.error("[CALENDAR FETCH]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch calendar events" }, { status: 500 })
  }
}

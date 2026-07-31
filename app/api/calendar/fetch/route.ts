import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

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

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Get any connected calendar (Google or Calendly)
    const { data: conn, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .maybeSingle()

    if (error || !conn) {
      return NextResponse.json({ error: "Calendar connection not found" }, { status: 404 })
    }

    // If Calendly, fetch events directly
    if (conn.provider === "calendly") {
      let accessToken = conn.access_token

      // Refresh if expired
      if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
        if (!conn.refresh_token) {
          return NextResponse.json({ error: "Calendly token expired and no refresh token" }, { status: 401 })
        }
        const refreshRes = await fetch("https://auth.calendly.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: conn.refresh_token,
            client_id: process.env.CALENDLY_CLIENT_ID!,
            client_secret: process.env.CALENDLY_CLIENT_SECRET!,
          }).toString(),
        })
        const refreshData = await refreshRes.json()
        if (!refreshRes.ok) {
          return NextResponse.json({ error: refreshData.message || "Failed to refresh Calendly token" }, { status: 401 })
        }
        accessToken = refreshData.access_token
        const expiresIn = refreshData.expires_in || 7200
        await supabase.from("calendar_connections").update({
          access_token: accessToken,
          refresh_token: refreshData.refresh_token || conn.refresh_token,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", conn.id)
      }

      // Get Calendly user URI
      const userRes = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userData = await userRes.json()
      if (!userRes.ok) {
        console.error("[CALENDAR FETCH] Calendly /users/me failed:", userRes.status, JSON.stringify(userData))
        return NextResponse.json({ error: userData.message || "Failed to get Calendly user" }, { status: 500 })
      }
      const userUri = userData.resource?.uri
      if (!userUri) {
        return NextResponse.json({ error: "No Calendly user URI found" }, { status: 500 })
      }

      // Fetch scheduled events (next 30 days)
      const now = new Date().toISOString()
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const eventsUrl = new URL("https://api.calendly.com/scheduled_events")
      eventsUrl.searchParams.set("user", userUri)
      eventsUrl.searchParams.set("min_start_time", now)
      eventsUrl.searchParams.set("max_start_time", thirtyDaysLater)
      eventsUrl.searchParams.set("count", "100")

      const eventsRes = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const eventsData = await eventsRes.json()
      if (!eventsRes.ok) {
        return NextResponse.json({ error: eventsData.message || "Failed to fetch Calendly events" }, { status: 500 })
      }

      const events = eventsData.collection || []
      let imported = 0
      for (const event of events) {
        const eventId = event.uri.split("/").pop()
        const attendees = (event.event_memberships || []).map((m: any) => ({ email: m.email, name: m.user_name, status: m.status }))

        const payload = {
          user_id: userId,
          connection_id: conn.id,
          event_id: eventId,
          summary: event.name || "Scheduled Meeting",
          description: event.event_memberships?.map((m: any) => m.user_name).join(", ") || "",
          start_time: event.start_time,
          end_time: event.end_time,
          attendees,
          location: event.location?.type || "",
          event_link: event.event_guests?.[0]?.invitee_url || event.uri || "",
          is_online: ["zoom", "google_meet", "webex", "microsoft_teams"].includes(event.location?.type),
        }

        const { data: existing } = await supabase
          .from("calendar_events")
          .select("id")
          .eq("user_id", userId)
          .eq("event_id", eventId)
          .maybeSingle()

        if (existing) {
          await supabase.from("calendar_events").update({
            summary: payload.summary,
            description: payload.description,
            start_time: payload.start_time,
            end_time: payload.end_time,
            attendees: payload.attendees,
            location: payload.location,
            event_link: payload.event_link,
            is_online: payload.is_online,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id)
        } else {
          await supabase.from("calendar_events").insert(payload)
        }
        imported++
      }

      return NextResponse.json({ success: true, fetched: imported, events: [] })
    }

    // Google Calendar fetch
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

    // Batch check: get all existing event IDs + their data in one query
    const allEventIds = events.map((ev: any) => ev.id).filter(Boolean)
    const { data: existingRows } = await supabase
      .from("calendar_events")
      .select("event_id, start_time, end_time, summary")
      .eq("user_id", userId)
      .eq("connection_id", conn.id)
      .in("event_id", allEventIds)
    const existingMap = new Map<string, any>()
    for (const r of existingRows || []) {
      existingMap.set(r.event_id, r)
    }

    // Build payloads for new events + updates for changed events
    const payloads: any[] = []
    const updates: any[] = []
    for (const ev of events) {
      const start = ev.start?.dateTime || ev.start?.date
      const end = ev.end?.dateTime || ev.end?.date
      const attendees = (ev.attendees || []).map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      }))
      const startIso = start ? new Date(start).toISOString() : null
      const endIso = end ? new Date(end).toISOString() : null
      const summary = ev.summary || "(No title)"

      const existing = existingMap.get(ev.id)
      if (existing) {
        // Check if anything changed — if so, update
        const existingStart = existing.start_time ? new Date(existing.start_time).toISOString() : null
        const existingEnd = existing.end_time ? new Date(existing.end_time).toISOString() : null
        if (existingStart !== startIso || existingEnd !== endIso || existing.summary !== summary) {
          updates.push({
            event_id: ev.id,
            data: {
              summary,
              description: ev.description || null,
              start_time: startIso,
              end_time: endIso,
              attendees,
              location: ev.location || null,
              event_link: ev.htmlLink || null,
              is_online: ev.conferenceData?.conferenceSolution?.name?.toLowerCase().includes("meet") || false,
            }
          })
        }
        continue
      }

      payloads.push({
        user_id: userId,
        connection_id: conn.id,
        event_id: ev.id,
        summary: ev.summary || "(No title)",
        description: ev.description || null,
        start_time: start ? new Date(start).toISOString() : null,
        end_time: end ? new Date(end).toISOString() : null,
        attendees: attendees,
        location: ev.location || null,
        event_link: ev.htmlLink || null,
        is_online: ev.conferenceData?.conferenceSolution?.name?.toLowerCase().includes("meet") || false,
      })
    }

    // Batch insert all new events in one query
    let results: any[] = []
    if (payloads.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("calendar_events")
        .insert(payloads)
        .select()
      if (insertErr) {
        console.error("[CALENDAR FETCH] Batch insert failed:", insertErr.message)
      } else if (inserted) {
        results = inserted
      }
    }

    // Update changed events
    if (updates.length > 0) {
      console.log(`[CALENDAR FETCH] Updating ${updates.length} changed events`)
      for (const u of updates) {
        const { error: updateErr } = await supabase
          .from("calendar_events")
          .update(u.data)
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .eq("event_id", u.event_id)
        if (updateErr) {
          console.error(`[CALENDAR FETCH] Update failed for event ${u.event_id}:`, updateErr.message)
        }
      }
    }

    return NextResponse.json({ success: true, fetched: results.length, events: results })
  } catch (err: any) {
    console.error("[CALENDAR FETCH]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch calendar events" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/calendar/fetch")

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.userId
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Get stored Calendly connection
    const { data: conn } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "calendly")
      .maybeSingle()

    if (!conn?.access_token) {
      return NextResponse.json({ error: "Calendly not connected" }, { status: 400 })
    }

    let accessToken = conn.access_token

    // Refresh if expired
    if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
      if (!conn.refresh_token) {
        return NextResponse.json({ error: "Calendly token expired and no refresh token" }, { status: 401 })
      }
      const refreshRes = await fetch("https://auth.calendly.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
          client_id: process.env.CALENDLY_CLIENT_ID!,
          client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        }),
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
    const userRes = await fetch("https://api.calendly.com/v2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    if (!userRes.ok) {
      return NextResponse.json({ error: userData.message || "Failed to get Calendly user" }, { status: 500 })
    }

    const userUri = userData.resource?.uri
    if (!userUri) {
      return NextResponse.json({ error: "No Calendly user URI found" }, { status: 500 })
    }

    // Fetch scheduled events (next 30 days)
    const now = new Date().toISOString()
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const eventsUrl = new URL("https://api.calendly.com/v2/scheduled_events")
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
    const mappedEvents = []

    for (const event of events) {
      const start = event.start_time
      const end = event.end_time

      // Get invitees for this event
      const inviteesRes = await fetch(`${event.uri}/invitees`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const inviteesData = await inviteesRes.json()
      const invitees = inviteesData.collection || []
      const attendees = invitees.map((inv: any) => ({
        email: inv.email,
        name: inv.name,
        status: inv.status,
      }))

      mappedEvents.push({
        id: event.uri.split("/").pop(),
        user_id: userId,
        summary: event.name || "Scheduled Meeting",
        description: event.event_memberships?.map((m: any) => m.user_name).join(", ") || "",
        start_time: start,
        end_time: end,
        attendees,
        location: event.location?.type || "",
        event_link: event.event_guests?.[0]?.invitee_url || event.uri || "",
        is_online: event.location?.type === "zoom" || event.location?.type === "google_meet" || event.location?.type === "webex" || event.location?.type === "microsoft_teams",
        created_at: new Date().toISOString(),
      })
    }

    // Upsert events into calendar_events table
    for (const evt of mappedEvents) {
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("user_id", userId)
        .eq("id", evt.id)
        .maybeSingle()

      if (existing) {
        await supabase.from("calendar_events").update({
          summary: evt.summary,
          description: evt.description,
          start_time: evt.start_time,
          end_time: evt.end_time,
          attendees: evt.attendees,
          location: evt.location,
          event_link: evt.event_link,
          is_online: evt.is_online,
          updated_at: new Date().toISOString(),
        }).eq("id", evt.id)
      } else {
        await supabase.from("calendar_events").insert(evt)
      }
    }

    return NextResponse.json({
      fetched: mappedEvents.length,
      events: mappedEvents,
    })
  } catch (err: any) {
    console.error("[CALENDLY FETCH]", err)
    return NextResponse.json({ error: err?.message || "Calendly fetch failed" }, { status: 500 })
  }
}

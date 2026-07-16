import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Fetch recent emails (last 10 received)
    const { data: emails, error: emailErr } = await supabase
      .from("email_messages")
      .select("from_address, to_address, subject, body, direction, received_at, created_at")
      .eq("user_id", userId)
      .eq("direction", "received")
      .order("received_at", { ascending: false })
      .limit(10)

    if (emailErr) console.error("[AI CONTEXT] Email fetch error:", emailErr.message)

    // Fetch upcoming calendar events (next 14 days, not yet ended)
    const now = new Date().toISOString()
    const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    let { data: events, error: calErr } = await supabase
      .from("calendar_events")
      .select("summary, description, start_time, end_time, location, attendees")
      .eq("user_id", userId)
      .gt("end_time", now)
      .lte("start_time", twoWeeksLater)
      .order("start_time", { ascending: true })
      .limit(10)

    if (calErr) console.error("[AI CONTEXT] Calendar fetch error:", calErr.message)

    // Auto-sync calendar if connected but no events in DB
    if ((!events || events.length === 0) && !calErr) {
      console.log("[AI CONTEXT] No events in DB, attempting calendar sync...")
      try {
        const syncRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/fetch`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }
        )
        if (syncRes.ok) {
          console.log("[AI CONTEXT] Calendar sync triggered, re-querying...")
          const requery = await supabase
            .from("calendar_events")
            .select("summary, description, start_time, end_time, location, attendees")
            .eq("user_id", userId)
            .gt("end_time", now)
            .lte("start_time", twoWeeksLater)
            .order("start_time", { ascending: true })
            .limit(10)
          if (requery.data) events = requery.data
        }
      } catch (syncErr: any) {
        console.error("[AI CONTEXT] Calendar sync failed:", syncErr.message)
      }
    }

    // Format email context
    let emailContext = ""
    if (emails && emails.length > 0) {
      emailContext = emails.map((e, i) => {
        const date = e.received_at ? new Date(e.received_at).toLocaleDateString() : ""
        const preview = (e.body || "").slice(0, 200).replace(/\s+/g, " ")
        return `${i + 1}. From: ${e.from_address || "Unknown"}\n   Subject: ${e.subject || "(No subject)"}\n   Date: ${date}\n   Preview: ${preview || "(no preview)"}`
      }).join("\n\n")
    }

    // Fetch recent WhatsApp messages (last 10)
    const { data: waMsgs, error: waErr } = await supabase
      .from("whatsapp_messages")
      .select("from_number, to_number, body, direction, timestamp, created_at")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(10)

    if (waErr) console.error("[AI CONTEXT] WhatsApp fetch error:", waErr.message)

    // Format calendar context
    let calendarContext = ""
    if (events && events.length > 0) {
      calendarContext = events.map((e, i) => {
        const start = e.start_time ? new Date(e.start_time).toLocaleString() : ""
        const end = e.end_time ? new Date(e.end_time).toLocaleString() : ""
        const attendees = Array.isArray(e.attendees) ? e.attendees.join(", ") : ""
        return `${i + 1}. ${e.summary || "Untitled"}\n   When: ${start}${end ? " - " + end : ""}\n   Where: ${e.location || "(no location)"}\n   Attendees: ${attendees || "(none)"}\n   Description: ${(e.description || "").slice(0, 100)}`
      }).join("\n\n")
    }

    // Format WhatsApp context
    let whatsappContext = ""
    if (waMsgs && waMsgs.length > 0) {
      whatsappContext = waMsgs.map((m, i) => {
        const date = m.timestamp ? new Date(m.timestamp).toLocaleString() : ""
        const dir = m.direction === "sent" ? "→" : "←"
        const number = m.direction === "sent" ? (m.to_number || "") : (m.from_number || "")
        return `${i + 1}. ${dir} ${number}\n   Time: ${date}\n   Message: ${m.body || ""}`
      }).join("\n\n")
    }

    return NextResponse.json({
      emails: emails || [],
      events: events || [],
      waMessages: waMsgs || [],
      emailContext,
      calendarContext,
      whatsappContext,
    })
  } catch (err: any) {
    console.error("[AI CONTEXT] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch context" }, { status: 500 })
  }
}

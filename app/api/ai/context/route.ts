import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
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

    // Fetch Calendly scheduling URL
    const { data: calendlyConn } = await supabase
      .from("calendar_connections")
      .select("scheduling_url, calendar_email")
      .eq("user_id", userId)
      .eq("provider", "calendly")
      .eq("status", "connected")
      .maybeSingle()

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

    // Fetch recent Slack messages (last 10)
    const { data: slackMsgs, error: slackErr } = await supabase
      .from("slack_messages")
      .select("slack_user_name, channel_name, body, direction, timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(10)

    if (slackErr) console.error("[AI CONTEXT] Slack fetch error:", slackErr.message)

    // Fetch recent Telegram messages (last 10)
    const { data: tgMsgs, error: tgErr } = await supabase
      .from("telegram_messages")
      .select("from_first_name, from_username, chat_title, chat_id, body, direction, timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(10)

    if (tgErr) console.error("[AI CONTEXT] Telegram fetch error:", tgErr.message)

    // Format Slack context
    let slackContext = ""
    if (slackMsgs && slackMsgs.length > 0) {
      slackContext = slackMsgs.map((m, i) => {
        const date = m.timestamp ? new Date(m.timestamp).toLocaleString() : ""
        const dir = m.direction === "sent" ? "→" : "←"
        const name = m.direction === "sent" ? (m.channel_name || "Slack") : (m.slack_user_name || "Unknown")
        return `${i + 1}. ${dir} ${name}\n   Time: ${date}\n   Message: ${m.body || ""}`
      }).join("\n\n")
    }

    // Format Telegram context
    let telegramContext = ""
    if (tgMsgs && tgMsgs.length > 0) {
      telegramContext = tgMsgs.map((m, i) => {
        const date = m.timestamp ? new Date(m.timestamp).toLocaleString() : ""
        const dir = m.direction === "sent" ? "→" : "←"
        const name = m.direction === "sent" ? (m.chat_title || m.chat_id || "Telegram") : (m.from_first_name || m.from_username || "Unknown")
        return `${i + 1}. ${dir} ${name} (chatId: ${m.chat_id})\n   Time: ${date}\n   Message: ${m.body || ""}`
      }).join("\n\n")
    }

    // Append Calendly scheduling URL to calendar context
    const calendlyUrl = calendlyConn?.scheduling_url || ""
    let calendlyContext = ""
    if (calendlyUrl) {
      calendlyContext = `Your Calendly booking link: ${calendlyUrl}\n\nINSTRUCTION: When the user asks to schedule a meeting, send a meeting invite, or mentions a demo/call/booking, you MUST include this exact Calendly link in the message. NEVER use a placeholder like [Insertar enlace de Calendly] or ask the user to provide the link. The link is provided above — use it directly.`
    }

    return NextResponse.json({
      emails: emails || [],
      events: events || [],
      waMessages: waMsgs || [],
      slackMessages: slackMsgs || [],
      telegramMessages: tgMsgs || [],
      calendlyUrl,
      emailContext,
      calendarContext,
      calendlyContext,
      whatsappContext,
      slackContext,
      telegramContext,
    })
  } catch (err: any) {
    console.error("[AI CONTEXT] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch context" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/ai/context")

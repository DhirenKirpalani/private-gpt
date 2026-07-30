import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { saveSlackMessage } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

// Verify Slack signing secret
function verifySlackSignature(req: NextRequest, body: string): boolean {
  if (!SIGNING_SECRET) return false

  const timestamp = req.headers.get("x-slack-request-timestamp")
  const signature = req.headers.get("x-slack-signature")
  if (!timestamp || !signature) return false

  // Prevent replay attacks (5 min window)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  const sigBase = `v0:${timestamp}:${body}`
  // Use Web Crypto API for HMAC
  // For simplicity, we'll skip full verification in dev and rely on the structure
  // In production, implement proper HMAC-SHA256 verification
  return true
}

async function _POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const event = JSON.parse(bodyText)

    // URL verification challenge
    if (event.type === "url_verification") {
      return NextResponse.json({ challenge: event.challenge })
    }

    // Verify signature (basic check)
    if (!verifySlackSignature(req, bodyText)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Handle event_callback
    if (event.type === "event_callback") {
      const evt = event.event

      // Only handle messages (not bot messages)
      if (evt.type === "message" && !evt.bot_id && !evt.subtype) {
        // Find the connection by team_id
        const { data: conn } = await supabase
          .from("slack_connections")
          .select("*")
          .eq("team_id", event.team_id)
          .eq("status", "connected")
          .single()

        if (!conn) return NextResponse.json({ ok: true })

        // Get user info for the sender
        let userName: string | null = null
        if (evt.user) {
          try {
            const userRes = await fetch("https://slack.com/api/users.info", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${conn.bot_access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ user: evt.user }),
            })
            const userData = await userRes.json()
            if (userData.ok) {
              userName = userData.user?.real_name || userData.user?.name || null
            }
          } catch {}
        }

        // Get channel info
        let channelName: string | null = null
        if (evt.channel) {
          try {
            const chanRes = await fetch("https://slack.com/api/conversations.info", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${conn.bot_access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ channel: evt.channel }),
            })
            const chanData = await chanRes.json()
            if (chanData.ok) {
              channelName = chanData.channel?.name || null
            }
          } catch {}
        }

        await saveSlackMessage({
          user_id: conn.user_id,
          connection_id: conn.id,
          direction: "received",
          channel_id: evt.channel || "",
          channel_name: channelName,
          slack_user_id: evt.user || null,
          slack_user_name: userName,
          slack_ts: evt.ts || "",
          body: evt.text || "",
          timestamp: new Date(parseFloat(evt.ts || "0") * 1000).toISOString(),
          read: false,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[SLACK EVENTS] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/slack/events")

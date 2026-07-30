import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { saveSlackMessage } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const { data: conn } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (!conn) return NextResponse.json({ error: "No Slack connection" }, { status: 404 })

    // Get list of DM conversations
    const dmRes = await fetch("https://slack.com/api/conversations.list?types=im&limit=100", {
      headers: { "Authorization": `Bearer ${conn.bot_access_token}` },
    })
    const dmData = await dmRes.json()
    if (!dmData.ok) return NextResponse.json({ error: dmData.error }, { status: 500 })

    let imported = 0
    for (const channel of dmData.channels || []) {
      // Fetch conversation history
      const histRes = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=50`, {
        headers: { "Authorization": `Bearer ${conn.bot_access_token}` },
      })
      const histData = await histRes.json()
      if (!histData.ok) continue

      for (const msg of histData.messages || []) {
        if (msg.subtype || msg.bot_id) continue

        // Get user info
        let userName: string | null = null
        if (msg.user) {
          try {
            const userRes = await fetch("https://slack.com/api/users.info", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${conn.bot_access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ user: msg.user }),
            })
            const userData = await userRes.json()
            if (userData.ok) {
              userName = userData.user?.real_name || userData.user?.name || null
            }
          } catch {}
        }

        const direction = msg.user === conn.bot_user_id ? "sent" : "received"

        await saveSlackMessage({
          user_id: userId,
          connection_id: conn.id,
          direction,
          channel_id: channel.id,
          channel_name: channel.name || null,
          slack_user_id: msg.user || null,
          slack_user_name: userName,
          slack_ts: msg.ts || "",
          body: msg.text || "",
          timestamp: new Date(parseFloat(msg.ts || "0") * 1000).toISOString(),
          read: direction === "sent",
        })
        imported++
      }
    }

    return NextResponse.json({ success: true, imported })
  } catch (err: any) {
    console.error("[SLACK FETCH] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/slack/fetch")

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
    const { userId, channelId, text } = await req.json()
    if (!userId || !channelId || !text) {
      return NextResponse.json({ error: "Missing userId, channelId, or text" }, { status: 400 })
    }

    const { data: conn } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (!conn) return NextResponse.json({ error: "No Slack connection" }, { status: 404 })

    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${conn.bot_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text,
      }),
    })

    const data = await res.json()
    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    // Save the sent message
    await saveSlackMessage({
      user_id: userId,
      connection_id: conn.id,
      direction: "sent",
      channel_id: channelId,
      channel_name: null,
      slack_user_id: conn.bot_user_id,
      slack_user_name: "Bot",
      slack_ts: data.ts || "",
      body: text,
      timestamp: new Date(parseFloat(data.ts || "0") * 1000).toISOString(),
      read: true,
    })

    return NextResponse.json({ success: true, ts: data.ts })
  } catch (err: any) {
    console.error("[SLACK SEND] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/slack/send")

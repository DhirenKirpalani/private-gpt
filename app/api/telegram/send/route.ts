import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
  try {
    const { userId, chatId, body } = await req.json()
    if (!userId || !chatId || !body) {
      return NextResponse.json({ error: "Missing userId, chatId, or body" }, { status: 400 })
    }

    // Get the Telegram connection
    const { data: conn, error } = await supabase
      .from("telegram_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Telegram connection not found" }, { status: 404 })
    }

    // Send via Telegram Bot API
    const tgRes = await fetch(
      `https://api.telegram.org/bot${conn.bot_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          parse_mode: "HTML",
        }),
      }
    )

    const tgData = await tgRes.json()
    if (!tgData.ok) {
      return NextResponse.json(
        { error: tgData.description || "Telegram send failed" },
        { status: 500 }
      )
    }

    const messageId = tgData.result?.message_id

    // Store sent message
    await supabase.from("telegram_messages").insert({
      user_id: userId,
      connection_id: conn.id,
      direction: "sent",
      chat_id: String(chatId),
      chat_type: tgData.result?.chat?.type || null,
      chat_title: tgData.result?.chat?.title || tgData.result?.chat?.first_name || tgData.result?.chat?.username || null,
      tg_message_id: messageId,
      body,
      timestamp: new Date().toISOString(),
      read: true,
    })

    return NextResponse.json({ success: true, messageId })
  } catch (err: any) {
    console.error("[TELEGRAM SEND]", err)
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/send")

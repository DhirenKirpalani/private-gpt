import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseTelegramUpdate } from "@/lib/telegram"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// The gateway bot token (a dedicated bot users forward their BotFather message to)
const GATEWAY_BOT_TOKEN = process.env.TELEGRAM_GATEWAY_BOT_TOKEN

// POST — Receives forwarded BotFather messages on the gateway bot
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Verify this is for our gateway bot
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token")
    if (secretToken !== "gateway") {
      return NextResponse.json({ success: true })
    }

    const message = update.message || update.channel_post
    if (!message) return NextResponse.json({ success: true })

    const text = message.text || message.caption || ""
    const from = message.from
    if (!from || !text) return NextResponse.json({ success: true })

    // Try to extract a bot token from the forwarded message
    // BotFather token format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    const tokenMatch = text.match(/\d{8,}:[A-Za-z0-9_-]{30,}/)
    if (!tokenMatch) {
      // Not a token message — send a hint
      await fetch(`https://api.telegram.org/bot${GATEWAY_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: from.id,
          text: "Please forward the message from @BotFather that contains your bot token (it looks like 123456789:ABCdef...).",
        }),
      })
      return NextResponse.json({ success: true })
    }

    const extractedToken = tokenMatch[0]
    const telegramUserId = String(from.id)

    // Store the pending token — the CRM/Channels page polls for it
    await supabase.from("pending_telegram_tokens").upsert({
      telegram_user_id: telegramUserId,
      bot_token: extractedToken,
      status: "pending",
      created_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" })

    // Confirm to the user
    await fetch(`https://api.telegram.org/bot${GATEWAY_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: from.id,
        text: "✅ Token received! Go back to your browser — the connection will complete automatically.",
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[TG GATEWAY WEBHOOK] Error:", err)
    return NextResponse.json({ error: err?.message || "Gateway webhook failed" }, { status: 500 })
  }
}

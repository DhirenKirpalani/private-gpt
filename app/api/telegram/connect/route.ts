import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { fetchAndStoreUpdates } from "@/lib/telegram"
import { withApiLogging } from "@/lib/with-api-logging"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
  try {
    const { userId, botToken } = await req.json()
    if (!userId || !botToken) {
      return NextResponse.json({ error: "Missing userId or botToken" }, { status: 400 })
    }

    // 1. Validate the bot token by calling Telegram getMe
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const meData = await meRes.json()

    if (!meData.ok) {
      return NextResponse.json(
        { error: meData.description || "Invalid bot token. Make sure you got it from @BotFather." },
        { status: 400 }
      )
    }

    const botUsername = meData.result?.username
    const botFirstName = meData.result?.first_name

    // 2. Upsert connection
    const { data: existing } = await supabase
      .from("telegram_connections")
      .select("id")
      .eq("user_id", userId)
      .single()

    let connectionId: string

    if (existing) {
      const { data, error } = await supabase
        .from("telegram_connections")
        .update({
          bot_token: botToken,
          bot_username: botUsername,
          bot_first_name: botFirstName,
          status: "connected",
          webhook_verified: false,
        })
        .eq("id", existing.id)
        .select("id")
        .single()
      if (error) throw error
      connectionId = data.id
    } else {
      const { data, error } = await supabase
        .from("telegram_connections")
        .insert({
          user_id: userId,
          bot_token: botToken,
          bot_username: botUsername,
          bot_first_name: botFirstName,
          status: "connected",
        })
        .select("id")
        .single()
      if (error) throw error
      connectionId = data.id
    }

    // 3. Set webhook with secret token (connectionId) for instant matching
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      const webhookUrl = `${appUrl}/api/telegram/webhook?secret=${connectionId}`
      await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${connectionId}`
      )
    }

    // 4. Initial fetch — pull any existing messages immediately
    const imported = await fetchAndStoreUpdates(userId, connectionId, botToken)

    return NextResponse.json({
      success: true,
      botUsername,
      botFirstName,
      imported,
    })
  } catch (err: any) {
    console.error("[TELEGRAM CONNECT]", err)
    return NextResponse.json({ error: err?.message || "Failed to connect" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/connect")

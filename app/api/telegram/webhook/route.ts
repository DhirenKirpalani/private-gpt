import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseTelegramUpdate, insertTelegramMessage } from "@/lib/telegram"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// POST — Incoming updates from Telegram (secret token = connectionId)
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Parse the update using shared helper
    const parsed = parseTelegramUpdate(update)
    if (!parsed) return NextResponse.json({ success: true })

    // Match connection via secret token header (set by Telegram from secret_token param)
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token")
    const urlSecret = new URL(req.url).searchParams.get("secret")
    const connectionId = secretToken || urlSecret

    if (!connectionId) {
      console.error("[TG WEBHOOK] No secret token — cannot match connection")
      return NextResponse.json({ success: true })
    }

    // Look up the connection
    const { data: conn, error } = await supabase
      .from("telegram_connections")
      .select("id, user_id, webhook_verified")
      .eq("id", connectionId)
      .single()

    if (error || !conn) {
      console.error("[TG WEBHOOK] Connection not found for id:", connectionId)
      return NextResponse.json({ success: true })
    }

    // Insert message via shared helper
    await insertTelegramMessage(conn.user_id, conn.id, parsed)

    // Mark webhook as verified
    if (!conn.webhook_verified) {
      await supabase
        .from("telegram_connections")
        .update({ webhook_verified: true })
        .eq("id", conn.id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[TG WEBHOOK] Error:", err)
    return NextResponse.json({ error: err?.message || "Webhook failed" }, { status: 500 })
  }
}

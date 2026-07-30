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

    // Get the connection
    const { data: conn, error } = await supabase
      .from("telegram_connections")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Delete the webhook from Telegram
    try {
      await fetch(`https://api.telegram.org/bot${conn.bot_token}/deleteWebhook`)
    } catch {
      // ignore webhook deletion errors
    }

    // Delete messages
    await supabase
      .from("telegram_messages")
      .delete()
      .eq("user_id", userId)
      .eq("connection_id", conn.id)

    // Delete telegram-imported contacts
    await supabase
      .from("contacts")
      .delete()
      .eq("user_id", userId)
      .eq("source", "telegram_import")

    // Delete the connection
    const { error: deleteError } = await supabase
      .from("telegram_connections")
      .delete()
      .eq("id", conn.id)
      .eq("user_id", userId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[TELEGRAM DISCONNECT]", err)
    return NextResponse.json({ error: err?.message || "Failed to disconnect" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/disconnect")

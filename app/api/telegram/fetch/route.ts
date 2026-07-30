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
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const { data: conn, error } = await supabase
      .from("telegram_connections")
      .select("id, bot_token")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Telegram connection not found" }, { status: 404 })
    }

    const imported = await fetchAndStoreUpdates(userId, conn.id, conn.bot_token)

    return NextResponse.json({ success: true, imported })
  } catch (err: any) {
    console.error("[TELEGRAM FETCH]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/fetch")

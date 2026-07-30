import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// GET — Grab the latest unconsumed pending token
async function _GET() {
  try {
    const { data, error } = await supabase
      .from("pending_telegram_tokens")
      .select("bot_token")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ found: false })
    }

    // Mark all pending as consumed
    await supabase
      .from("pending_telegram_tokens")
      .update({ status: "consumed" })
      .eq("status", "pending")

    return NextResponse.json({ found: true, botToken: data.bot_token })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/telegram/poll-token")

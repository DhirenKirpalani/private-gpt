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
    const { source, messageId } = await req.json()
    if (!source || !messageId) {
      return NextResponse.json({ error: "Missing source or messageId" }, { status: 400 })
    }

    const table = source === "whatsapp" ? "whatsapp_messages" : source === "telegram" ? "telegram_messages" : "slack_messages"
    const { error } = await supabase.from(table).update({ read: true }).eq("id", messageId)
    if (error) {
      console.error(`[MARK READ] ${source} failed:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[MARK READ] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/messages/mark-read")

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
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    // Get connection for token
    const { data: conn } = await supabase
      .from("slack_connections")
      .select("bot_access_token")
      .eq("user_id", userId)
      .single()

    // Delete from DB using admin client (bypasses RLS)
    await supabase.from("slack_messages").delete().eq("user_id", userId)
    const { error: contactError } = await supabase.from("contacts").delete().eq("user_id", userId).eq("source", "slack_import")
    if (contactError) console.error("[SLACK DISCONNECT] Failed to delete contacts:", contactError.message)
    await supabase.from("slack_connections").delete().eq("user_id", userId)

    // Optionally revoke token
    if (conn?.bot_access_token) {
      try {
        await fetch("https://slack.com/api/auth.revoke", {
          method: "POST",
          headers: { "Authorization": `Bearer ${conn.bot_access_token}` },
        })
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[SLACK DISCONNECT] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/slack/disconnect")

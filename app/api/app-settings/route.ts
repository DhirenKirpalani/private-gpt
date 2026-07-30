import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _GET() {
  noStore()
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")

    if (error) throw error

    const s: Record<string, string> = {}
    for (const row of data || []) s[row.key] = row.value

    const payload = {
      show_usage_bar: (s.show_usage_bar ?? "true") !== "false",
      announcement_text: s.announcement_text ?? "",
      announcement_enabled: s.announcement_enabled ?? "false",
      announcement_type: s.announcement_type ?? "info",
      announcement_link_url: s.announcement_link_url ?? "",
      announcement_link_label: s.announcement_link_label ?? "",
      token_limit_trial: parseInt(s.token_limit_trial || "50000", 10) || 50000,
      token_limit_solo: parseInt(s.token_limit_solo || "500000", 10) || 500000,
      token_limit_team: parseInt(s.token_limit_team || "2000000", 10) || 2000000,
      token_limit_enterprise: parseInt(s.token_limit_enterprise || "10000000", 10) || 10000000,
      message_limit_trial: parseInt(s.message_limit_trial || "20", 10) || 20,
      message_limit_solo: parseInt(s.message_limit_solo || "50", 10) || 50,
      message_limit_team: parseInt(s.message_limit_team || "200", 10) || 200,
      message_limit_enterprise: parseInt(s.message_limit_enterprise || "1000", 10) || 1000,
    }
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/app-settings")

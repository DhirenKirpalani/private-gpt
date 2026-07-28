import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { invalidateLimitsCache } from "@/lib/token-limits"

export async function POST(req: NextRequest) {
  try {
    const {
      requestingUserId,
      tokenLimitTrial, tokenLimitSolo, tokenLimitTeam, tokenLimitEnterprise,
      messageLimitTrial, messageLimitSolo, messageLimitTeam, messageLimitEnterprise,
      showUsageBar,
    } = await req.json()

    if (!requestingUserId) {
      return NextResponse.json({ error: "Missing requestingUserId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the requesting user is super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, contact_email")
      .eq("user_id", requestingUserId)
      .single()

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const now = new Date().toISOString()
    const updates = [
      { key: "token_limit_trial", value: String(tokenLimitTrial) },
      { key: "token_limit_solo", value: String(tokenLimitSolo) },
      { key: "token_limit_team", value: String(tokenLimitTeam) },
      { key: "token_limit_enterprise", value: String(tokenLimitEnterprise) },
      { key: "message_limit_trial", value: String(messageLimitTrial) },
      { key: "message_limit_solo", value: String(messageLimitSolo) },
      { key: "message_limit_team", value: String(messageLimitTeam) },
      { key: "message_limit_enterprise", value: String(messageLimitEnterprise) },
      { key: "show_usage_bar", value: showUsageBar === false ? "false" : "true" },
    ]

    for (const u of updates) {
      await supabase
        .from("app_settings")
        .upsert({ key: u.key, value: u.value, updated_at: now }, { onConflict: "key" })
    }

    invalidateLimitsCache()

    // Write audit log
    const adminEmail = (profile as any)?.contact_email ?? ""
    const { error: auditErr } = await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUserId,
      admin_email: adminEmail,
      action: "update_limits",
      target_user_id: requestingUserId,
      target_email: adminEmail,
      old_value: null,
      new_value: JSON.stringify({ tokenLimitTrial, tokenLimitSolo, tokenLimitTeam, tokenLimitEnterprise, messageLimitTrial, messageLimitSolo, messageLimitTeam, messageLimitEnterprise }),
    })
    if (auditErr) console.error("[update-limits] audit insert failed:", auditErr.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

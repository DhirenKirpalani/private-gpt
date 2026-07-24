import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, targetUserEmail, trialDays } = await req.json()

    if (!requestingUserId || !targetUserEmail || trialDays === undefined || trialDays === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the requesting user is super_admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!adminProfile || adminProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Find the target user by email via auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError || !authData?.users) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const targetUser = authData.users.find(u => u.email?.toLowerCase() === targetUserEmail.trim().toLowerCase())

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch the old trial_days value before updating
    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("trial_days")
      .eq("user_id", targetUser.id)
      .single()
    const oldValue = oldProfile?.trial_days ?? null

    // Update per-user trial_days override (0 = remove override, set to NULL)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ trial_days: trialDays > 0 ? trialDays : null })
      .eq("user_id", targetUser.id)

    if (updateError) throw updateError

    // If the user has an active trial, recalculate their end date
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, current_period_start, status")
      .eq("user_id", targetUser.id)
      .eq("status", "trialing")
      .single()

    if (sub?.current_period_start) {
      let daysToUse = trialDays
      if (trialDays <= 0) {
        // Reverting to global default — fetch it
        const { data: globalSetting } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "trial_days")
          .single()
        daysToUse = globalSetting ? parseInt(globalSetting.value, 10) || 15 : 15
      }
      const start = new Date(sub.current_period_start)
      const newEnd = new Date(start.getTime() + daysToUse * 24 * 60 * 60 * 1000)
      await supabase
        .from("subscriptions")
        .update({ current_period_end: newEnd.toISOString(), updated_at: new Date().toISOString() })
        .eq("id", sub.id)
    }

    // Get admin email for audit log
    const adminUser = authData.users.find(u => u.id === requestingUserId)
    const adminEmail = adminUser?.email ?? ""

    // Write audit log entry
    await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUserId,
      admin_email: adminEmail,
      action: trialDays > 0 ? "set_trial_override" : "remove_trial_override",
      target_user_id: targetUser.id,
      target_email: targetUser.email ?? targetUserEmail,
      old_value: oldValue !== null ? String(oldValue) : null,
      new_value: trialDays > 0 ? String(trialDays) : null,
    })

    return NextResponse.json({ success: true, targetUserEmail, trialDays })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

async function _POST(req: NextRequest) {
  try {
    const { requestingUserId, targetUserId } = await req.json()

    if (!requestingUserId || !targetUserId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get admin + target emails for audit log
    const { data: authData } = await supabase.auth.admin.listUsers()
    const adminEmail = authData?.users?.find((u: any) => u.id === requestingUserId)?.email ?? ""
    const targetEmail = authData?.users?.find((u: any) => u.id === targetUserId)?.email ?? targetUserId

    // Reset usage by moving current_period_start to now
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("subscriptions")
      .update({ current_period_start: now })
      .eq("user_id", targetUserId)

    if (error) throw error

    // Write audit log
    await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUserId,
      admin_email: adminEmail,
      action: "reset_usage",
      target_user_id: targetUserId,
      target_email: targetEmail,
      old_value: null,
      new_value: now,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/admin/reset-usage")

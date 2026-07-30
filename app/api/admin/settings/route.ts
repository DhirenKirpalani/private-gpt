import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { requestingUserId, settings } = await req.json()

    if (!requestingUserId || !settings) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, contact_email")
      .eq("user_id", requestingUserId)
      .single()

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const now = new Date().toISOString()
    const entries = Object.entries(settings as Record<string, string>)

    for (const [key, value] of entries) {
      await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: now }, { onConflict: "key" })
    }

    // Write audit log
    const adminEmail = (profile as any)?.contact_email ?? ""
    await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUserId,
      admin_email: adminEmail,
      action: "update_settings",
      target_user_id: requestingUserId,
      target_email: adminEmail,
      old_value: null,
      new_value: JSON.stringify(settings),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/admin/settings")

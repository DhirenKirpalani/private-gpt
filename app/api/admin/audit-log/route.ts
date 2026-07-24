import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  try {
    const requestingUserId = new URL(req.url).searchParams.get("requestingUserId")
    const limit = parseInt(new URL(req.url).searchParams.get("limit") || "20", 10)

    if (!requestingUserId) {
      return NextResponse.json({ error: "Missing requestingUserId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify super_admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!adminProfile || adminProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data: logs, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ logs: logs ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, settings } = await req.json()

    if (!requestingUserId || !settings) {
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

    const now = new Date().toISOString()
    const entries = Object.entries(settings as Record<string, string>)

    for (const [key, value] of entries) {
      await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: now }, { onConflict: "key" })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

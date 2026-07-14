import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { trialDays, requestingUserId } = await req.json()

    if (!trialDays || !requestingUserId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the requesting user is super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update app_settings
    await supabase
      .from("app_settings")
      .upsert({ key: "trial_days", value: String(trialDays), updated_at: new Date().toISOString() }, { onConflict: "key" })

    // Fetch all trialing subscriptions and recalculate their end dates
    const { data: trialing, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, current_period_start")
      .eq("status", "trialing")

    if (fetchError) throw fetchError

    const updates = (trialing || [])
      .filter(sub => sub.current_period_start)
      .map(sub => {
        const start = new Date(sub.current_period_start)
        const newEnd = new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000)
        return { id: sub.id, current_period_end: newEnd.toISOString(), updated_at: new Date().toISOString() }
      })

    for (const update of updates) {
      await supabase
        .from("subscriptions")
        .update({ current_period_end: update.current_period_end, updated_at: update.updated_at })
        .eq("id", update.id)
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

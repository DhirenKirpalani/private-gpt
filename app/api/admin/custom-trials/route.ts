import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  try {
    const requestingUserId = new URL(req.url).searchParams.get("requestingUserId")

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

    // Fetch all profiles with a custom trial_days override
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, trial_days")
      .not("trial_days", "is", null)
      .order("trial_days", { ascending: false })

    if (error) throw error

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Fetch emails from auth.users
    const { data: authData } = await supabase.auth.admin.listUsers()
    const emailMap: Record<string, string> = {}
    authData?.users?.forEach(u => { emailMap[u.id] = u.email ?? "" })

    // Fetch trial subscription status for these users
    const userIds = profiles.map(p => p.user_id)
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, status, current_period_end")
      .in("user_id", userIds)

    const subMap: Record<string, { status: string; current_period_end: string | null }> = {}
    subs?.forEach(s => { subMap[s.user_id] = { status: s.status, current_period_end: s.current_period_end } })

    const users = profiles.map(p => ({
      userId: p.user_id,
      name: p.full_name || "Unknown",
      email: emailMap[p.user_id] ?? "—",
      trialDays: p.trial_days,
      subStatus: subMap[p.user_id]?.status ?? null,
      periodEnd: subMap[p.user_id]?.current_period_end ?? null,
    }))

    return NextResponse.json({ users })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// Plan pricing (MXN/month)
const PLAN_PRICE: Record<string, number> = {
  solo: 30,
  team: 50,
  enterprise: 0, // custom / billed separately
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestingUserId = searchParams.get("userId")

  if (!requestingUserId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
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

  const [
    { count: totalUsers },
    { count: activeTrials },
    { count: expiredTrials },
    { data: activeSubs },
    { count: canceledSubs },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "trialing").gt("current_period_end", now),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "trialing").lte("current_period_end", now),
    supabase.from("subscriptions").select("plan").eq("status", "active"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "canceled"),
  ])

  // MRR
  const planCounts: Record<string, number> = {}
  for (const sub of activeSubs ?? []) {
    const plan = sub.plan ?? "solo"
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }
  const mrr = Object.entries(planCounts).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICE[plan] ?? 0) * count, 0
  )
  const activeSubscriptions = activeSubs?.length ?? 0

  // Conversion rate: paying / (paying + expired trials)
  const expired = expiredTrials ?? 0
  const conversionRate = expired + activeSubscriptions > 0
    ? Math.round((activeSubscriptions / (activeSubscriptions + expired)) * 100)
    : 0

  // LTV = MRR / active subscribers (avg monthly value; multiply by avg lifespan externally)
  const arpu = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0

  // Churn: canceled / (canceled + active)
  const canceled = canceledSubs ?? 0
  const churnRate = canceled + activeSubscriptions > 0
    ? Math.round((canceled / (canceled + activeSubscriptions)) * 100)
    : 0

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeTrials: activeTrials ?? 0,
    expiredTrials: expired,
    activeSubscriptions,
    canceledSubscriptions: canceled,
    planCounts,
    mrr,
    arr: mrr * 12,
    arpu,
    conversionRate,
    churnRate,
  })
}

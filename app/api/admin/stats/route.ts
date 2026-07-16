import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

const PLAN_PRICE: Record<string, number> = {
  solo: 30,
  team: 50,
  enterprise: 0,
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

  const now = new Date()
  const nowIso = now.toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // ── Batch 1: Basic counts ─────────────────────────────────────
  const [
    { count: totalUsers },
    { count: activeTrials },
    { count: expiredTrials },
    { data: activeSubs },
    { count: canceledSubs },
    { data: allSubs },
    { count: totalWorkspaces },
    { count: totalWorkspaceMembers },
    { count: totalDocuments },
    { count: totalChatMessages },
    { count: dauCount },
    { count: users30DaysAgo },
    { data: canceledSubsData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "trialing").gt("current_period_end", nowIso),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "trialing").lte("current_period_end", nowIso),
    supabase.from("subscriptions").select("plan, user_id, created_at, current_period_end").eq("status", "active"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "canceled"),
    supabase.from("subscriptions").select("plan, status, created_at, current_period_end").order("created_at", { ascending: false }),
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("workspace_members").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("user_id", { count: "exact", head: true }).gt("created_at", oneDayAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo),
    supabase.from("subscriptions").select("plan, created_at, current_period_end").eq("status", "canceled"),
  ])

  // ── MRR & Plan counts ─────────────────────────────────────────
  const planCounts: Record<string, number> = {}
  for (const sub of activeSubs ?? []) {
    const plan = sub.plan ?? "solo"
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }

  // For team plan: MRR = seats × price; for solo: just price
  let mrr = 0
  let totalActiveSeats = 0
  const teamOwnerIds = (activeSubs ?? []).filter(s => s.plan === "team").map(s => s.user_id)

  // Get workspace IDs for team owners to count seats
  let seatsPerOwner: Record<string, number> = {}
  if (teamOwnerIds.length > 0) {
    const { data: teamWorkspaces } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .in("owner_id", teamOwnerIds)

    const wsIds = (teamWorkspaces ?? []).map(w => w.id)
    if (wsIds.length > 0) {
      const { data: teamMembers } = await supabase
        .from("workspace_members")
        .select("workspace_id, user_id")
        .in("workspace_id", wsIds)

      // Count unique members per owner
      const memberSets: Record<string, Set<string>> = {}
      const wsOwnerMap: Record<string, string> = {}
      for (const w of teamWorkspaces ?? []) wsOwnerMap[w.id] = w.owner_id

      for (const m of teamMembers ?? []) {
        const ownerId = wsOwnerMap[m.workspace_id]
        if (ownerId) {
          if (!memberSets[ownerId]) memberSets[ownerId] = new Set()
          memberSets[ownerId].add(m.user_id)
        }
      }

      for (const sub of activeSubs ?? []) {
        if (sub.plan === "team") {
          const seats = (memberSets[sub.user_id]?.size ?? 0) + 1 // +1 for owner
          seatsPerOwner[sub.user_id] = seats
          totalActiveSeats += seats
          mrr += seats * PLAN_PRICE.team
        } else {
          mrr += PLAN_PRICE[sub.plan ?? "solo"] ?? 0
        }
      }
    } else {
      // Team owners with no workspaces yet — just 1 seat each
      for (const sub of activeSubs ?? []) {
        if (sub.plan === "team") {
          totalActiveSeats += 1
          mrr += PLAN_PRICE.team
        } else {
          mrr += PLAN_PRICE[sub.plan ?? "solo"] ?? 0
        }
      }
    }
  } else {
    for (const sub of activeSubs ?? []) {
      mrr += PLAN_PRICE[sub.plan ?? "solo"] ?? 0
    }
  }

  const activeSubscriptions = activeSubs?.length ?? 0

  // ── Conversion metrics ────────────────────────────────────────
  const expired = expiredTrials ?? 0
  const conversionRate = expired + activeSubscriptions > 0
    ? Math.round((activeSubscriptions / (activeSubscriptions + expired)) * 100)
    : 0

  // Solo → Team upgrade rate
  const soloCount = (allSubs ?? []).filter(s => s.plan === "solo").length
  const teamCount = (allSubs ?? []).filter(s => s.plan === "team").length
  const soloToTeamRate = soloCount + teamCount > 0
    ? Math.round((teamCount / (soloCount + teamCount)) * 100)
    : 0

  // ── Churn metrics ─────────────────────────────────────────────
  const canceled = canceledSubs ?? 0
  const churnRate = canceled + activeSubscriptions > 0
    ? Math.round((canceled / (canceled + activeSubscriptions)) * 100)
    : 0

  // Revenue churn: lost MRR from canceled subs
  const canceledMrr = (canceledSubsData ?? []).reduce(
    (sum, s) => sum + (PLAN_PRICE[s.plan ?? "solo"] ?? 0), 0
  )
  const revenueChurnRate = mrr + canceledMrr > 0
    ? Math.round((canceledMrr / (mrr + canceledMrr)) * 100)
    : 0

  // Net Revenue Retention
  const netRevenueRetention = mrr > 0 && canceledMrr > 0
    ? Math.round((mrr / (mrr + canceledMrr)) * 100)
    : 100

  // ── Growth metrics ────────────────────────────────────────────
  const prevUsers = users30DaysAgo ?? 0
  const userGrowthRate = prevUsers > 0
    ? Math.round(((totalUsers ?? 0 - prevUsers) / prevUsers) * 100)
    : 0

  // New MRR this month
  const subsThisMonth = (activeSubs ?? []).filter(s =>
    s.created_at && new Date(s.created_at) > new Date(thirtyDaysAgo)
  )
  const newMrrThisMonth = subsThisMonth.reduce(
    (sum, s) => sum + (PLAN_PRICE[s.plan ?? "solo"] ?? 0), 0
  )
  const mrrGrowthRate = mrr > 0
    ? Math.round((newMrrThisMonth / mrr) * 100)
    : 0

  // ── Usage / Engagement ────────────────────────────────────────
  const totalUsersNum = totalUsers ?? 0
  const dau = dauCount ?? 0
  const mau = totalUsersNum
  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0
  const docsPerUser = totalUsersNum > 0 ? Math.round((totalDocuments ?? 0) / totalUsersNum) : 0
  const messagesPerUser = totalUsersNum > 0 ? Math.round((totalChatMessages ?? 0) / totalUsersNum) : 0

  // ── Workspace metrics ────────────────────────────────────────
  const totalWs = totalWorkspaces ?? 0
  const totalMembers = totalWorkspaceMembers ?? 0
  const seatsPerWorkspace = totalWs > 0 ? Math.round((totalMembers + totalWs) / totalWs) : 0

  // ── Batch 2: Time-based counts ────────────────────────────────
  const [
    { count: newWorkspaces30d },
    { count: newSeats30d },
    { count: users30dAgoCount },
    { count: users60dAgoCount },
    { count: retained30dCount },
  ] = await Promise.all([
    supabase.from("workspaces").select("*", { count: "exact", head: true }).gt("created_at", thirtyDaysAgo),
    supabase.from("workspace_members").select("*", { count: "exact", head: true }).gt("created_at", thirtyDaysAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", sixtyDaysAgo),
    supabase.from("chat_messages").select("user_id", { count: "exact", head: true }).gt("created_at", thirtyDaysAgo),
  ])

  // ── Seat metrics ──────────────────────────────────────────────
  const avgSeatsPerTeam = teamOwnerIds.length > 0
    ? Math.round(totalActiveSeats / teamOwnerIds.length)
    : 0

  // ── LTV ───────────────────────────────────────────────────────
  const arpu = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0
  const ltv = churnRate > 0 ? Math.round(arpu / (churnRate / 100)) : arpu * 12

  // ── Cohort retention ──────────────────────────────────────────
  const retention30d = (users30dAgoCount ?? 0) > 0
    ? Math.min(100, Math.round(((retained30dCount ?? 0) / (users30dAgoCount ?? 1)) * 100))
    : 0

  return NextResponse.json({
    // Basic
    totalUsers: totalUsersNum,
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

    // Revenue
    ltv,
    revenueChurnRate,
    netRevenueRetention,
    mrrGrowthRate,
    newMrrThisMonth,

    // Conversion
    soloToTeamRate,

    // Usage / Engagement
    dau,
    mau,
    stickiness,
    docsPerUser,
    messagesPerUser,
    totalDocuments: totalDocuments ?? 0,
    totalChatMessages: totalChatMessages ?? 0,

    // Workspace
    totalWorkspaces: totalWs,
    seatsPerWorkspace,
    newWorkspaces30d: newWorkspaces30d ?? 0,

    // Seats
    totalActiveSeats,
    avgSeatsPerTeam,
    newSeats30d: newSeats30d ?? 0,

    // Growth
    userGrowthRate,

    // Cohort
    retention30d,
    users30dAgo: users30dAgoCount ?? 0,
    users60dAgo: users60dAgoCount ?? 0,
  })
}

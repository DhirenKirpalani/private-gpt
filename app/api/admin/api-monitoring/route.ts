import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestingUserId = searchParams.get("userId")
  const range = searchParams.get("range") || "24h" // 24h, 7d, 30d
  const filterUserId = searchParams.get("filterUserId") // optional: filter by specific user

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
  const rangeMs = range === "30d" ? 30 * 24 * 60 * 60 * 1000 : range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const since = new Date(now.getTime() - rangeMs).toISOString()

  // Lazy cleanup: delete data older than 30 days
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from("api_logs").delete().lt("created_at", cutoff)
  await supabase.from("api_stats_hourly").delete().lt("hour_bucket", cutoff)

  // Fetch aggregated stats in range (optionally filtered by user)
  let statsQuery = supabase
    .from("api_stats_hourly")
    .select("*")
    .gte("hour_bucket", since)
  if (filterUserId === "anonymous") {
    statsQuery = statsQuery.is("user_id", null)
  } else if (filterUserId) {
    statsQuery = statsQuery.eq("user_id", filterUserId)
  }
  const { data: stats, error: statsError } = await statsQuery
    .order("hour_bucket", { ascending: false })

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 })
  }

  // Fetch recent error logs (only errors are stored individually)
  let logsQuery = supabase
    .from("api_logs")
    .select("*")
    .gte("created_at", since)
  if (filterUserId === "anonymous") {
    logsQuery = logsQuery.is("user_id", null)
  } else if (filterUserId) {
    logsQuery = logsQuery.eq("user_id", filterUserId)
  }
  const { data: errorLogs } = await logsQuery
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch user profiles for user_id mapping
  const userIds = new Set<string>()
  for (const s of stats || []) { if (s.user_id) userIds.add(s.user_id) }
  for (const log of errorLogs || []) { if (log.user_id) userIds.add(log.user_id) }
  let userMap: Record<string, { full_name: string; email: string }> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, contact_email")
      .in("user_id", Array.from(userIds))
    if (profiles) {
      userMap = Object.fromEntries(profiles.map(p => [p.user_id, { full_name: p.full_name || "Unknown", email: p.contact_email || "" }]))
    }
    // Fallback: for user_ids not found in profiles, try auth.users via admin API
    const missingIds = Array.from(userIds).filter(id => !userMap[id])
    if (missingIds.length > 0) {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      if (authUsers) {
        for (const u of authUsers.users) {
          if (missingIds.includes(u.id)) {
            const email = u.email || ""
            const namePart = email.split("@")[0] || "Unknown"
            userMap[u.id] = { full_name: namePart, email }
          }
        }
      }
    }
  }

  // Per-user stats
  const userStatsMap: Record<string, { total: number; success: number; errors: number; totalDuration: number }> = {}
  for (const s of stats || []) {
    const uid = s.user_id || "anonymous"
    if (!userStatsMap[uid]) userStatsMap[uid] = { total: 0, success: 0, errors: 0, totalDuration: 0 }
    userStatsMap[uid].total += s.total_requests
    userStatsMap[uid].success += s.success_count
    userStatsMap[uid].errors += s.error_count
    userStatsMap[uid].totalDuration += s.total_duration_ms
  }
  const topUsers = Object.entries(userStatsMap)
    .map(([uid, s]) => ({
      userId: uid,
      name: uid === "anonymous" ? "Anonymous" : (userMap[uid]?.full_name || "Unknown user"),
      email: uid === "anonymous" ? "" : (userMap[uid]?.email || ""),
      total: s.total,
      success: s.success,
      errors: s.errors,
      errorRate: s.total > 0 ? Math.round((s.errors / s.total) * 100) : 0,
      avgDuration: s.total > 0 ? Math.round(s.totalDuration / s.total) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Compute totals from aggregated stats
  const total = stats?.reduce((sum, s) => sum + s.total_requests, 0) || 0
  const successCount = stats?.reduce((sum, s) => sum + s.success_count, 0) || 0
  const errorCount = stats?.reduce((sum, s) => sum + s.error_count, 0) || 0
  const totalDuration = stats?.reduce((sum, s) => sum + s.total_duration_ms, 0) || 0
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0

  // Compute global percentiles from all durations
  const allDurations: number[] = []
  for (const s of stats || []) {
    if (s.durations && Array.isArray(s.durations)) {
      allDurations.push(...s.durations)
    }
  }
  allDurations.sort((a, b) => a - b)
  function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const idx = Math.min(Math.floor((p / 100) * arr.length), arr.length - 1)
    return arr[idx]
  }
  const p50 = percentile(allDurations, 50)
  const p95 = percentile(allDurations, 95)
  const p99 = percentile(allDurations, 99)

  // Method distribution
  const methodMap: Record<string, { total: number; success: number; errors: number }> = {}
  for (const s of stats || []) {
    const m = s.method || "UNKNOWN"
    if (!methodMap[m]) methodMap[m] = { total: 0, success: 0, errors: 0 }
    methodMap[m].total += s.total_requests
    methodMap[m].success += s.success_count
    methodMap[m].errors += s.error_count
  }
  const methods = Object.entries(methodMap).map(([method, s]) => ({
    method,
    total: s.total,
    success: s.success,
    errors: s.errors,
    errorRate: s.total > 0 ? Math.round((s.errors / s.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total)

  // Per-endpoint stats with hourly trend data
  const endpointMap: Record<string, {
    total: number; success: number; errors: number; totalDuration: number
    durations: number[]; methods: Record<string, number>
    lastCalled: string; hourlyTrend: { hour: string; total: number; errors: number; avgDuration: number }[]
    peakHour: { hour: string; total: number } | null
  }> = {}
  for (const s of stats || []) {
    const key = s.endpoint
    if (!endpointMap[key]) {
      endpointMap[key] = { total: 0, success: 0, errors: 0, totalDuration: 0, durations: [], methods: {}, lastCalled: s.hour_bucket, hourlyTrend: [], peakHour: null }
    }
    const ep = endpointMap[key]
    ep.total += s.total_requests
    ep.success += s.success_count
    ep.errors += s.error_count
    ep.totalDuration += s.total_duration_ms
    if (s.durations && Array.isArray(s.durations)) ep.durations.push(...s.durations)
    const m = s.method || "UNKNOWN"
    ep.methods[m] = (ep.methods[m] || 0) + s.total_requests
    if (s.hour_bucket > ep.lastCalled) ep.lastCalled = s.hour_bucket
    ep.hourlyTrend.push({
      hour: s.hour_bucket,
      total: s.total_requests,
      errors: s.error_count,
      avgDuration: s.total_requests > 0 ? Math.round(s.total_duration_ms / s.total_requests) : 0,
    })
    if (!ep.peakHour || s.total_requests > ep.peakHour.total) {
      ep.peakHour = { hour: s.hour_bucket, total: s.total_requests }
    }
  }
  const endpoints = Object.entries(endpointMap).map(([endpoint, s]) => {
    const epDurations = s.durations.sort((a, b) => a - b)
    return {
      endpoint,
      total: s.total,
      success: s.success,
      errors: s.errors,
      errorRate: s.total > 0 ? Math.round((s.errors / s.total) * 100) : 0,
      avgDuration: s.total > 0 ? Math.round(s.totalDuration / s.total) : 0,
      p50: percentile(epDurations, 50),
      p95: percentile(epDurations, 95),
      p99: percentile(epDurations, 99),
      methods: Object.entries(s.methods).map(([m, count]) => ({ method: m, count })).sort((a, b) => b.count - a.count),
      lastCalled: s.lastCalled,
      peakHour: s.peakHour,
      hourlyTrend: s.hourlyTrend.sort((a, b) => a.hour.localeCompare(b.hour)),
    }
  }).sort((a, b) => b.total - a.total)

  // Hourly distribution from aggregated stats (all endpoints combined)
  const hourlyMap: Record<string, { total: number; errors: number; success: number; totalDuration: number }> = {}
  for (const s of stats || []) {
    const hour = s.hour_bucket
    if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, errors: 0, success: 0, totalDuration: 0 }
    hourlyMap[hour].total += s.total_requests
    hourlyMap[hour].errors += s.error_count
    hourlyMap[hour].success += s.success_count
    hourlyMap[hour].totalDuration += s.total_duration_ms
  }
  const hourly = Object.entries(hourlyMap)
    .map(([hour, h]) => ({
      hour,
      total: h.total,
      errors: h.errors,
      success: h.success,
      avgDuration: h.total > 0 ? Math.round(h.totalDuration / h.total) : 0,
      errorRate: h.total > 0 ? Math.round((h.errors / h.total) * 100) : 0,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // Peak hour
  const peakHour = hourly.length > 0 ? hourly.reduce((max, h) => h.total > max.total ? h : max, hourly[0]) : null

  // Requests per hour average
  const hoursCount = hourly.length || 1
  const reqPerHour = Math.round(total / hoursCount)

  // Status code distribution from error logs
  const statusBreakdown: Record<number, number> = {}
  for (const log of errorLogs || []) {
    statusBreakdown[log.status_code] = (statusBreakdown[log.status_code] || 0) + 1
  }
  const statusCodes = Object.entries(statusBreakdown)
    .map(([code, count]) => ({ code: parseInt(code), count }))
    .sort((a, b) => b.count - a.count)

  // Error breakdown by endpoint (from error logs)
  const errorByEndpoint: Record<string, number> = {}
  for (const log of errorLogs || []) {
    errorByEndpoint[log.endpoint] = (errorByEndpoint[log.endpoint] || 0) + 1
  }
  const topErrors = Object.entries(errorByEndpoint)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Duration trend (avg duration per hour)
  const durationTrend = hourly.map(h => ({ hour: h.hour, avgDuration: h.avgDuration }))

  // Success rate trend
  const successRateTrend = hourly.map(h => ({
    hour: h.hour,
    successRate: h.total > 0 ? Math.round((h.success / h.total) * 100) : 100,
  }))

  // Enrich error logs with user info
  const enrichedLogs = (errorLogs || []).map(log => ({
    ...log,
    user_name: log.user_id ? (userMap[log.user_id]?.full_name || "Unknown") : "Anonymous",
    user_email: log.user_id ? (userMap[log.user_id]?.email || "") : "",
  }))

  return NextResponse.json({
    total,
    successCount,
    errorCount,
    successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    errorRate: total > 0 ? Math.round((errorCount / total) * 100) : 0,
    avgDuration,
    p50, p95, p99,
    methods,
    reqPerHour,
    peakHour: peakHour ? { hour: peakHour.hour, total: peakHour.total } : null,
    endpoints,
    topUsers,
    recentLogs: enrichedLogs,
    hourly,
    statusCodes,
    topErrors,
    durationTrend,
    successRateTrend,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestingUserId = searchParams.get("userId")
  const range = searchParams.get("range") || "24h" // 24h, 7d, 30d

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

  // Fetch aggregated stats in range
  const { data: stats, error: statsError } = await supabase
    .from("api_stats_hourly")
    .select("*")
    .gte("hour_bucket", since)
    .order("hour_bucket", { ascending: false })

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 })
  }

  // Fetch recent error logs (only errors are stored individually)
  const { data: errorLogs } = await supabase
    .from("api_logs")
    .select("*")
    .gte("created_at", since)
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
      .select("user_id, full_name, email")
      .in("user_id", Array.from(userIds))
    if (profiles) {
      userMap = Object.fromEntries(profiles.map(p => [p.user_id, { full_name: p.full_name || "Unknown", email: p.email || "" }]))
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

  // Per-endpoint stats with hourly trend data
  const endpointMap: Record<string, {
    total: number; success: number; errors: number; totalDuration: number
    lastCalled: string; hourlyTrend: { hour: string; total: number; errors: number; avgDuration: number }[]
    peakHour: { hour: string; total: number } | null
  }> = {}
  for (const s of stats || []) {
    const key = s.endpoint
    if (!endpointMap[key]) {
      endpointMap[key] = { total: 0, success: 0, errors: 0, totalDuration: 0, lastCalled: s.hour_bucket, hourlyTrend: [], peakHour: null }
    }
    const ep = endpointMap[key]
    ep.total += s.total_requests
    ep.success += s.success_count
    ep.errors += s.error_count
    ep.totalDuration += s.total_duration_ms
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
  const endpoints = Object.entries(endpointMap).map(([endpoint, s]) => ({
    endpoint,
    total: s.total,
    success: s.success,
    errors: s.errors,
    errorRate: s.total > 0 ? Math.round((s.errors / s.total) * 100) : 0,
    avgDuration: s.total > 0 ? Math.round(s.totalDuration / s.total) : 0,
    lastCalled: s.lastCalled,
    peakHour: s.peakHour,
    hourlyTrend: s.hourlyTrend.sort((a, b) => a.hour.localeCompare(b.hour)),
  })).sort((a, b) => b.total - a.total)

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

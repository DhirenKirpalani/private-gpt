import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export type ApiLogEntry = {
  userId?: string | null
  method: string
  endpoint: string
  statusCode: number
  durationMs?: number | null
  error?: string | null
  userAgent?: string | null
  ipAddress?: string | null
}

function getHourBucket(date: Date = new Date()): string {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d.toISOString()
}

export async function logApiRequest(entry: ApiLogEntry): Promise<void> {
  const { method, endpoint, statusCode, durationMs } = entry
  const isError = statusCode >= 400
  const hourBucket = getHourBucket()

  try {
    // 1. Upsert aggregated stats (1 row per endpoint per hour per user)
    const { data: existing } = await supabaseAdmin
      .from("api_stats_hourly")
      .select("id, total_requests, success_count, error_count, total_duration_ms, durations")
      .eq("endpoint", endpoint)
      .eq("method", method)
      .eq("hour_bucket", hourBucket)
      .eq("user_id", entry.userId || null)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from("api_stats_hourly")
        .update({
          total_requests: existing.total_requests + 1,
          success_count: existing.success_count + (isError ? 0 : 1),
          error_count: existing.error_count + (isError ? 1 : 0),
          total_duration_ms: existing.total_duration_ms + (durationMs || 0),
          durations: [...(existing.durations || []), durationMs || 0].slice(-1000),
        })
        .eq("id", existing.id)
    } else {
      await supabaseAdmin
        .from("api_stats_hourly")
        .insert({
          endpoint,
          method,
          hour_bucket: hourBucket,
          user_id: entry.userId || null,
          total_requests: 1,
          success_count: isError ? 0 : 1,
          error_count: isError ? 1 : 0,
          total_duration_ms: durationMs || 0,
          durations: [durationMs || 0],
        })
    }
  } catch (err) {
    console.error("[API LOG] Failed to upsert stats:", err)
  }

  // 2. Only store individual log for errors (debugging)
  if (isError) {
    try {
      await supabaseAdmin.from("api_logs").insert({
        user_id: entry.userId || null,
        method: entry.method,
        endpoint: entry.endpoint,
        status_code: entry.statusCode,
        duration_ms: entry.durationMs || null,
        error: entry.error || null,
        user_agent: entry.userAgent || null,
        ip_address: entry.ipAddress || null,
      })
    } catch (err) {
      console.error("[API LOG] Failed to insert error log:", err)
    }
  }
}

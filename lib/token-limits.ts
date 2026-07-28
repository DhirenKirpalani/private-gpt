import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// ── Default token limits per plan (monthly) ─────────────────────
const DEFAULT_LIMITS: Record<string, { tokens: number; messages: number }> = {
  trial:      { tokens: 50_000,     messages: 20 },
  solo:       { tokens: 500_000,    messages: 50 },
  team:       { tokens: 2_000_000,  messages: 200 },
  enterprise: { tokens: 10_000_000, messages: 1000 },
  free:       { tokens: 10_000,     messages: 5 },
}

// ── In-memory cache for token limits (5-min TTL) ────────────────
let _limitsCache: { value: Record<string, { tokens: number; messages: number }>; expiresAt: number } | null = null
const LIMITS_CACHE_TTL_MS = 5 * 60 * 1000

export function invalidateLimitsCache() { _limitsCache = null }

// ── Load limits from DB (with fallback to defaults) ─────────────
export async function getTokenLimits(): Promise<Record<string, { tokens: number; messages: number }>> {
  if (_limitsCache && Date.now() < _limitsCache.expiresAt) return _limitsCache.value

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "token_limit_trial", "token_limit_solo", "token_limit_team", "token_limit_enterprise",
        "message_limit_trial", "message_limit_solo", "message_limit_team", "message_limit_enterprise",
      ])
    if (error || !data) return DEFAULT_LIMITS

    const settings: Record<string, string> = {}
    for (const row of data) settings[row.key] = row.value

    const result = {
      trial:      { tokens: parseInt(settings.token_limit_trial || "50000", 10) || 50000, messages: parseInt(settings.message_limit_trial || "20", 10) || 20 },
      solo:       { tokens: parseInt(settings.token_limit_solo || "500000", 10) || 500000, messages: parseInt(settings.message_limit_solo || "50", 10) || 50 },
      team:       { tokens: parseInt(settings.token_limit_team || "2000000", 10) || 2000000, messages: parseInt(settings.message_limit_team || "200", 10) || 200 },
      enterprise: { tokens: parseInt(settings.token_limit_enterprise || "10000000", 10) || 10000000, messages: parseInt(settings.message_limit_enterprise || "1000", 10) || 1000 },
      free:       DEFAULT_LIMITS.free,
    }
    _limitsCache = { value: result, expiresAt: Date.now() + LIMITS_CACHE_TTL_MS }
    return result
  } catch {
    return DEFAULT_LIMITS
  }
}

// Keep hardcoded export for backwards compatibility
export const TOKEN_LIMITS = DEFAULT_LIMITS

export type UsageCheck = {
  allowed: boolean
  reason?: "token_limit" | "message_limit" | "trial_expired"
  tokensUsed: number
  tokenLimit: number
  messagesUsedToday: number
  messageLimit: number
  plan: string
  periodStart: string
  degradeToShorter?: boolean  // true when >80% of token quota used
}

// ── Get the billing period start date ──────────────────────────
// For paid users: use subscription.current_period_start
// For trial/free: use 1st of current calendar month
function getBillingPeriodStart(sub: any): Date {
  if (sub?.current_period_start && (sub.status === "active" || sub.status === "trialing")) {
    return new Date(sub.current_period_start)
  }
  // Default: 1st of current month
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ── Get plan key for limit lookup ───────────────────────────────
function getPlanKey(sub: any): string {
  if (!sub || !sub.status || sub.status === "canceled" || sub.status === "unpaid" || sub.status === "past_due") {
    return "free"
  }
  if (sub.status === "trialing") return "trial"
  if (sub.status === "active") {
    return sub.plan || "solo"
  }
  return "free"
}

// ── Check user's token and message usage ───────────────────────
export async function checkUsage(userId: string, sub: any): Promise<UsageCheck> {
  const planKey = getPlanKey(sub)
  const allLimits = await getTokenLimits()
  const limits = allLimits[planKey] || allLimits.free
  const periodStart = getBillingPeriodStart(sub)

  // Check trial expiry
  if (sub?.status === "trialing" && sub.current_period_end) {
    if (new Date(sub.current_period_end) <= new Date()) {
      return {
        allowed: false,
        reason: "trial_expired",
        tokensUsed: 0,
        tokenLimit: limits.tokens,
        messagesUsedToday: 0,
        messageLimit: limits.messages,
        plan: planKey,
        periodStart: periodStart.toISOString(),
      }
    }
  }

  // Fetch conversation IDs once — reused for both queries below
  const { data: convRows } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_id", userId)
  const convIds = convRows?.map((c: any) => c.id) || []

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Fetch token usage since billing period start (assistant messages only)
  const { data: tokenData } = convIds.length === 0 ? { data: [] } : await supabase
    .from("chat_messages")
    .select("total_tokens")
    .eq("role", "assistant")
    .gte("created_at", periodStart.toISOString())
    .in("conversation_id", convIds)

  let tokensUsed = 0
  for (const msg of tokenData || []) {
    tokensUsed += (msg as any).total_tokens || 0
  }

  // Count user messages sent today (daily message cap)
  const { data: userMsgsToday } = convIds.length === 0 ? { data: [] } : await supabase
    .from("chat_messages")
    .select("id")
    .eq("role", "user")
    .gte("created_at", todayStart.toISOString())
    .in("conversation_id", convIds)

  const messagesUsedToday = userMsgsToday?.length || 0

  const tokenLimit = limits.tokens
  const messageLimit = limits.messages
  const tokenUsagePct = tokensUsed / tokenLimit

  // Check limits
  if (tokensUsed >= tokenLimit) {
    return { allowed: false, reason: "token_limit", tokensUsed, tokenLimit, messagesUsedToday, messageLimit, plan: planKey, periodStart: periodStart.toISOString() }
  }
  if (messagesUsedToday >= messageLimit) {
    return { allowed: false, reason: "message_limit", tokensUsed, tokenLimit, messagesUsedToday, messageLimit, plan: planKey, periodStart: periodStart.toISOString() }
  }

  // Graceful degradation: if >80% of token quota, suggest shorter responses
  const degradeToShorter = tokenUsagePct >= 0.8

  return {
    allowed: true,
    tokensUsed,
    tokenLimit,
    messagesUsedToday,
    messageLimit,
    plan: planKey,
    periodStart: periodStart.toISOString(),
    degradeToShorter,
  }
}

// ── Get usage summary for frontend display ──────────────────────
export async function getUsageSummary(userId: string, sub: any) {
  const planKey = getPlanKey(sub)
  const allLimits = await getTokenLimits()
  const limits = allLimits[planKey] || allLimits.free
  const periodStart = getBillingPeriodStart(sub)

  // Get conversation IDs for this user
  const { data: convs } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_id", userId)

  const convIds = (convs || []).map((c: any) => c.id)
  if (convIds.length === 0) {
    return {
      plan: planKey,
      tokensUsed: 0,
      tokenLimit: limits.tokens,
      messagesUsedToday: 0,
      messageLimit: limits.messages,
      periodStart: periodStart.toISOString(),
    }
  }

  const { data: tokenData } = await supabase
    .from("chat_messages")
    .select("total_tokens, created_at, role")
    .in("conversation_id", convIds)
    .gte("created_at", periodStart.toISOString())

  let tokensUsed = 0
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: userMsgsToday } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("role", "user")
    .gte("created_at", todayStart.toISOString())
    .in("conversation_id", convIds)

  for (const msg of tokenData || []) {
    tokensUsed += (msg as any).total_tokens || 0
  }

  return {
    plan: planKey,
    tokensUsed,
    tokenLimit: limits.tokens,
    messagesUsedToday: userMsgsToday?.length || 0,
    messageLimit: limits.messages,
    periodStart: periodStart.toISOString(),
  }
}

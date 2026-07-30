import { NextRequest, NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { createAdminClient } from "@/lib/supabase"
import { getTokenLimits } from "@/lib/token-limits"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

function getPlanKey(sub: any): string {
  if (!sub || !sub.status || sub.status === "canceled" || sub.status === "unpaid" || sub.status === "past_due") return "free"
  if (sub.status === "trialing") return "trial"
  if (sub.status === "active") return sub.plan || "solo"
  return "free"
}

function getBillingPeriodStart(sub: any): Date {
  if (sub?.current_period_start && (sub.status === "active" || sub.status === "trialing")) {
    return new Date(sub.current_period_start)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

async function _GET(req: NextRequest) {
  noStore()
  try {
    const { searchParams } = new URL(req.url)
    const requestingUserId = searchParams.get("userId")
    if (!requestingUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const limits = await getTokenLimits()

    // Fetch all subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, status, plan, current_period_start, current_period_end")

    if (!subs || subs.length === 0) return NextResponse.json({ users: [] })

    // Fetch all profiles for names/emails
    const userIds = subs.map((s: any) => s.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, contact_email")
      .in("user_id", userIds)

    const profileMap: Record<string, { full_name: string; contact_email: string }> = {}
    for (const p of profiles || []) profileMap[p.user_id] = p

    // Fetch all conversations grouped by user
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("id, user_id")
      .in("user_id", userIds)

    const convsByUser: Record<string, string[]> = {}
    for (const c of convs || []) {
      if (!convsByUser[c.user_id]) convsByUser[c.user_id] = []
      convsByUser[c.user_id].push(c.id)
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const result = []

    for (const sub of subs) {
      const planKey = getPlanKey(sub)
      const planLimits = limits[planKey] || limits.free
      const periodStart = getBillingPeriodStart(sub)
      const convIds = convsByUser[sub.user_id] || []

      let tokensUsed = 0
      let messagesUsedToday = 0

      if (convIds.length > 0) {
        const { data: tokenData } = await supabase
          .from("chat_messages")
          .select("total_tokens")
          .eq("role", "assistant")
          .gte("created_at", periodStart.toISOString())
          .in("conversation_id", convIds)

        for (const msg of tokenData || []) tokensUsed += (msg as any).total_tokens || 0

        const { data: userMsgs } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("role", "user")
          .gte("created_at", todayStart.toISOString())
          .in("conversation_id", convIds)

        messagesUsedToday = userMsgs?.length || 0
      }

      const tokenPct = planLimits.tokens > 0 ? tokensUsed / planLimits.tokens : 0
      const msgPct = planLimits.messages > 0 ? messagesUsedToday / planLimits.messages : 0

      result.push({
        userId: sub.user_id,
        name: profileMap[sub.user_id]?.full_name || "Unknown",
        email: profileMap[sub.user_id]?.contact_email || "",
        plan: planKey,
        status: sub.status,
        periodStart: periodStart.toISOString(),
        periodEnd: sub.current_period_end || null,
        tokensUsed,
        tokenLimit: planLimits.tokens,
        tokenPct: Math.round(tokenPct * 100),
        messagesUsedToday,
        messageLimit: planLimits.messages,
        msgPct: Math.round(msgPct * 100),
      })
    }

    // Sort by token usage % descending
    result.sort((a, b) => b.tokenPct - a.tokenPct)

    return NextResponse.json({ users: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/admin/user-usage")

import { supabase } from "./supabase"
import { getTrialDays } from "./app-settings"

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  fastspring_subscription_id: string | null
  fastspring_customer_id: string | null
  fastspring_product_path: string | null
  lemonsqueezy_subscription_id: string | null
  lemonsqueezy_customer_id: string | null
  status: "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "paused" | "trialing" | "unpaid" | null
  plan: "solo" | "team" | "enterprise" | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error && error.code !== "PGRST116") throw error
  return (data as Subscription | null) ?? null
}

export function isActive(sub: Subscription | null): boolean {
  if (!sub) return false
  if (sub.status === "active") return true
  if (sub.status === "trialing") {
    if (!sub.current_period_end) return true
    return new Date(sub.current_period_end) > new Date()
  }
  return false
}

export function isPaid(sub: Subscription | null): boolean {
  return isActive(sub)
}

export function isTrialExpired(sub: Subscription | null): boolean {
  if (!sub || sub.status !== "trialing") return false
  if (!sub.current_period_end) return false
  return new Date(sub.current_period_end) <= new Date()
}

export function getTrialDaysLeft(sub: Subscription | null): number | null {
  if (!sub || sub.status !== "trialing") return null
  if (!sub.current_period_end) return null
  const end = new Date(sub.current_period_end)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

export function planName(sub: Subscription | null): string {
  if (!sub) return "Free"
  const name = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "Solo"
  if (sub.status === "trialing") return `${name} (Trial)`
  return name
}

export async function startTrial(userId: string): Promise<void> {
  const now = new Date()
  const trialDays = await getTrialDays()
  const end = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      status: "trialing",
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      plan: "solo",
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}

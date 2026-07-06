import { supabase } from "./supabase"

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  fastspring_subscription_id: string | null
  fastspring_customer_id: string | null
  fastspring_product_path: string | null
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
  return sub.status === "active" || sub.status === "trialing"
}

export function isPaid(sub: Subscription | null): boolean {
  return isActive(sub)
}

export function planName(sub: Subscription | null): string {
  if (!sub?.plan) return "Free"
  return sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)
}

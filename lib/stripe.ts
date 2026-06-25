import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const PLAN_PRICES: Record<string, string | undefined> = {
  solo: process.env.STRIPE_PRICE_SOLO,
  team: process.env.STRIPE_PRICE_TEAM,
}

export function getPlanPriceId(plan: "solo" | "team"): string | undefined {
  return PLAN_PRICES[plan]
}

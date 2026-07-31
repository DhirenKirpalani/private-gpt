/**
 * Polar.sh API client and product configuration.
 *
 * Polar is a Merchant of Record — they handle payments, tax/VAT,
 * invoicing, and compliance globally.
 *
 * Required env vars:
 *   POLAR_ACCESS_TOKEN       — Access token from Polar dashboard
 *   POLAR_WEBHOOK_SECRET     — Webhook signing secret
 *   POLAR_PRODUCT_SOLO       — Product ID for the Solo plan
 *   POLAR_PRODUCT_TEAM       — Product ID for the Team plan
 */

export const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN ?? ""
export const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? ""

export const POLAR_PRODUCTS: Record<string, string | undefined> = {
  solo: process.env.POLAR_PRODUCT_SOLO,
  team: process.env.POLAR_PRODUCT_TEAM,
}

const POLAR_API_BASE = "https://api.polar.sh/v1"

function polarHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
  }
}

/**
 * Create a Polar checkout session.
 * Returns a checkout URL the user is redirected to.
 */
export async function createCheckoutSession(opts: {
  productId: string
  userEmail: string
  userId: string
  plan: "solo" | "team"
  successUrl: string
}): Promise<{ url: string }> {
  const body = {
    products: [opts.productId],
    customer_email: opts.userEmail,
    customer_external_id: opts.userId,
    metadata: {
      user_id: opts.userId,
      plan: opts.plan,
    },
    success_url: opts.successUrl,
  }

  const res = await fetch(`${POLAR_API_BASE}/checkouts/`, {
    method: "POST",
    headers: polarHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Polar API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  const url = data?.url
  if (!url) throw new Error("Polar: no checkout URL returned")

  return { url }
}

/**
 * Verify a Polar webhook signature using Standard Webhooks spec.
 * Polar uses the webhook-signature header.
 */
export async function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string | null>
): Promise<boolean> {
  try {
    const { Webhook } = await import("standardwebhooks")
    const base64Secret = Buffer.from(POLAR_WEBHOOK_SECRET.trim(), "utf-8").toString("base64")
    const wh = new Webhook(base64Secret)
    wh.verify(payload, headers as any)
    return true
  } catch {
    return false
  }
}

/**
 * Get a subscription from Polar by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
  const res = await fetch(`${POLAR_API_BASE}/subscriptions/${subscriptionId}`, {
    headers: polarHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Polar API error: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Map Polar subscription statuses to internal status values.
 */
export function mapPolarStatus(polarStatus: string): string {
  const map: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    paused: "paused",
    unpaid: "unpaid",
    canceled: "canceled",
    revoked: "canceled",
    incomplete: "incomplete",
  }
  return map[polarStatus?.toLowerCase()] ?? "active"
}

/**
 * FastSpring API client and product configuration.
 *
 * FastSpring is a Merchant of Record — they handle payments, tax/VAT,
 * invoicing, and compliance globally.
 *
 * Required env vars:
 *   FASTSPRING_STORE_ID     — e.g. "exploro" (your store front)
 *   FASTSPRING_API_KEY      — API key from FastSpring dashboard
 *   FASTSPRING_WEBHOOK_SECRET — Webhook signing secret
 *
 * Product paths are configured in the FastSpring dashboard.
 * Set them as env vars so they can be changed without code edits:
 *   FASTSPRING_PRODUCT_SOLO — e.g. "exploro-solo-monthly"
 *   FASTSPRING_PRODUCT_TEAM — e.g. "exploro-team-monthly"
 */

export const FASTSPRING_STORE_ID = process.env.FASTSPRING_STORE_ID ?? ""
export const FASTSPRING_API_KEY = process.env.FASTSPRING_API_KEY ?? ""
export const FASTSPRING_WEBHOOK_SECRET = process.env.FASTSPRING_WEBHOOK_SECRET ?? ""

export const FASTSPRING_PRODUCTS: Record<string, string | undefined> = {
  solo: process.env.FASTSPRING_PRODUCT_SOLO,
  team: process.env.FASTSPRING_PRODUCT_TEAM,
}

export function getPlanProductPath(plan: "solo" | "team"): string | undefined {
  return FASTSPRING_PRODUCTS[plan]
}

/**
 * Base URL for FastSpring's API.
 * Uses the /companies/{storeId} endpoint for server-side operations.
 */
const FS_API_BASE = "https://api.fastspring.com"

/**
 * Create a FastSpring checkout session.
 * Returns a checkout URL the user is redirected to.
 */
export async function createCheckoutSession(opts: {
  productPath: string
  userEmail: string
  userId: string
  plan: "solo" | "team"
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string }> {
  const credentials = Buffer.from(`${FASTSPRING_API_KEY}:`).toString("base64")

  const body = {
    items: [
      {
        product: opts.productPath,
        quantity: 1,
      },
    ],
    contact: {
        email: opts.userEmail,
    },
    tags: {
      userId: opts.userId,
      plan: opts.plan,
    },
    storefront: FASTSPRING_STORE_ID,
    language: "en",
    returnUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
  }

  const res = await fetch(`${FS_API_BASE}/companies/${FASTSPRING_STORE_ID}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FastSpring API error: ${res.status} ${text}`)
  }

  const data = await res.json()

  // FastSpring returns a session object with a checkout URL
  const sessionId = data.sessionId ?? data.id ?? data.sessions?.[0]?.id
  if (!sessionId) {
    throw new Error("FastSpring: no session ID returned")
  }

  // Build the checkout URL
  const url = `https://${FASTSPRING_STORE_ID}.onfastspring.com/session/${sessionId}`
  return { url }
}

/**
 * Verify a FastSpring webhook signature.
 * FastSpring sends an HMAC-SHA256 signature in the "X-FS-Signature" header.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const crypto = require("crypto")
    const expected = crypto
      .createHmac("sha256", FASTSPRING_WEBHOOK_SECRET)
      .update(payload)
      .digest("base64")
    return expected === signature
  } catch {
    return false
  }
}

/**
 * Get a subscription by ID from FastSpring.
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
  const credentials = Buffer.from(`${FASTSPRING_API_KEY}:`).toString("base64")

  const res = await fetch(
    `${FS_API_BASE}/companies/${FASTSPRING_STORE_ID}/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FastSpring API error: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Cancel a FastSpring subscription.
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const credentials = Buffer.from(`${FASTSPRING_API_KEY}:`).toString("base64")

  const res = await fetch(
    `${FS_API_BASE}/companies/${FASTSPRING_STORE_ID}/subscriptions/${subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FastSpring API error: ${res.status} ${text}`)
  }
}

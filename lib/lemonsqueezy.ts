/**
 * Lemon Squeezy API client and product configuration.
 *
 * Lemon Squeezy is a Merchant of Record — they handle payments, tax/VAT,
 * invoicing, and compliance globally.
 *
 * Required env vars:
 *   LEMONSQUEEZY_API_KEY          — API key from Lemon Squeezy dashboard
 *   LEMONSQUEEZY_WEBHOOK_SECRET   — Webhook signing secret
 *   LEMONSQUEEZY_STORE_ID         — Your store ID (numeric, e.g. "12345")
 *   LEMONSQUEEZY_VARIANT_SOLO     — Variant ID for the Solo plan
 *   LEMONSQUEEZY_VARIANT_TEAM     — Variant ID for the Team plan
 */

export const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY ?? ""
export const LS_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ""
export const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID ?? ""

export const LS_VARIANTS: Record<string, string | undefined> = {
  solo: process.env.LEMONSQUEEZY_VARIANT_SOLO,
  team: process.env.LEMONSQUEEZY_VARIANT_TEAM,
}

const LS_API_BASE = "https://api.lemonsqueezy.com/v1"

function lsHeaders() {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${LS_API_KEY}`,
  }
}

/**
 * Create a Lemon Squeezy checkout session.
 * Returns a checkout URL the user is redirected to.
 */
export async function createCheckoutSession(opts: {
  variantId: string
  userEmail: string
  userId: string
  plan: "solo" | "team"
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string }> {
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
        checkout_data: {
          email: opts.userEmail,
          custom: {
            user_id: opts.userId,
            plan: opts.plan,
          },
        },
        expires_at: null,
        preview: false,
      },
      relationships: {
        store: {
          data: { type: "stores", id: LS_STORE_ID },
        },
        variant: {
          data: { type: "variants", id: opts.variantId },
        },
      },
    },
  }

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: lsHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lemon Squeezy API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  const url = data?.data?.attributes?.url
  if (!url) throw new Error("Lemon Squeezy: no checkout URL returned")

  return { url }
}

/**
 * Verify a Lemon Squeezy webhook signature.
 * Lemon Squeezy sends an HMAC-SHA256 hex signature in the "X-Signature" header.
 */
export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(LS_WEBHOOK_SECRET)
    const msgData = encoder.encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    return expected === signature
  } catch {
    return false
  }
}

/**
 * Get a subscription from Lemon Squeezy by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
  const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
    headers: lsHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lemon Squeezy API error: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Get the customer portal URL for a subscription.
 */
export async function getCustomerPortalUrl(subscriptionId: string): Promise<string | null> {
  try {
    const data = await getSubscription(subscriptionId)
    return data?.data?.attributes?.urls?.customer_portal ?? null
  } catch {
    return null
  }
}

/**
 * Map Lemon Squeezy subscription statuses to internal status values.
 */
export function mapLSStatus(lsStatus: string): string {
  const map: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    paused: "paused",
    unpaid: "unpaid",
    cancelled: "canceled",
    expired: "canceled",
    on_trial: "trialing",
  }
  return map[lsStatus?.toLowerCase()] ?? "active"
}

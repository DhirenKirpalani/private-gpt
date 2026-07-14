import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, mapLSStatus } from "@/lib/lemonsqueezy"
import { createAdminClient } from "@/lib/supabase"

/**
 * Lemon Squeezy webhook handler.
 *
 * Configure the webhook URL in your Lemon Squeezy dashboard:
 *   https://your-domain.com/api/lemonsqueezy/webhook
 *
 * Key events handled:
 *   - subscription_created
 *   - subscription_updated
 *   - subscription_cancelled
 *   - subscription_expired
 *   - subscription_payment_success
 *   - subscription_payment_failed
 *   - order_created
 */

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get("x-signature") ?? ""

  if (process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    const valid = await verifyWebhookSignature(payload, signature)
    if (!valid) {
      console.error("[LemonSqueezy Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventName: string = event.meta?.event_name ?? ""
  console.log(`[LemonSqueezy Webhook] Received: ${eventName}`)

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_payment_success":
        await handleSubscriptionActivated(event)
        break

      case "subscription_cancelled":
      case "subscription_expired":
      case "subscription_payment_failed":
        await handleSubscriptionDeactivated(event)
        break

      case "order_created":
        await handleOrderCreated(event)
        break

      default:
        console.log(`[LemonSqueezy Webhook] Unhandled event: ${eventName}`)
    }
  } catch (err: any) {
    console.error(`[LemonSqueezy Webhook] Error handling ${eventName}:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionActivated(event: any) {
  const attrs = event.data?.attributes ?? {}
  const meta = event.meta?.custom_data ?? {}

  const subscriptionId = String(event.data?.id ?? "")
  const userId = meta.user_id ?? attrs.custom_data?.user_id
  const plan = meta.plan ?? attrs.custom_data?.plan
  const customerId = String(attrs.customer_id ?? "")
  const lsStatus = attrs.status ?? "active"
  const periodStart = attrs.trial_ends_at ?? attrs.created_at ?? null
  const periodEnd = attrs.renews_at ?? attrs.ends_at ?? null
  const cancelAtEnd = attrs.cancelled ?? false

  if (!subscriptionId || !userId) {
    console.warn("[LemonSqueezy Webhook] Missing subscription ID or userId")
    return
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from("subscriptions").upsert(
    {
      user_id: userId,
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_customer_id: customerId || null,
      status: mapLSStatus(lsStatus),
      plan: plan ?? null,
      current_period_start: periodStart ? new Date(periodStart).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      cancel_at_period_end: cancelAtEnd,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[LemonSqueezy Webhook] Failed to upsert subscription:", error)
    throw error
  }

  console.log(`[LemonSqueezy Webhook] Subscription ${subscriptionId} activated for user ${userId}`)
}

async function handleSubscriptionDeactivated(event: any) {
  const attrs = event.data?.attributes ?? {}
  const subscriptionId = String(event.data?.id ?? "")
  const lsStatus = attrs.status ?? "cancelled"

  if (!subscriptionId) {
    console.warn("[LemonSqueezy Webhook] Missing subscription ID in deactivation event")
    return
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("subscriptions")
    .update({
      status: mapLSStatus(lsStatus),
      cancel_at_period_end: true,
    })
    .eq("lemonsqueezy_subscription_id", subscriptionId)

  if (error) {
    console.error("[LemonSqueezy Webhook] Failed to update subscription:", error)
    throw error
  }

  console.log(`[LemonSqueezy Webhook] Subscription ${subscriptionId} deactivated`)
}

async function handleOrderCreated(event: any) {
  const orderId = event.data?.id
  const meta = event.meta?.custom_data ?? {}
  console.log(`[LemonSqueezy Webhook] Order ${orderId} created for user ${meta.user_id}`)
  // Subscription events will handle the subscription activation separately
}

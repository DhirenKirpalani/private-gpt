import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, getSubscription } from "@/lib/fastspring"
import { createAdminClient } from "@/lib/supabase"

/**
 * FastSpring webhook handler.
 *
 * FastSpring sends webhook events for subscription lifecycle changes.
 * Configure the webhook URL in your FastSpring dashboard:
 *   https://exploro-os.com/api/fastspring/webhook
 *
 * Key events handled:
 *   - subscription.activated
 *   - subscription.deactivated
 *   - subscription.updated
 *   - subscription.charge.completed
 *   - subscription.charge.failed
 *   - order.completed
 */

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get("x-fs-signature") ?? req.headers.get("X-FS-Signature") ?? ""

  // Verify webhook signature
  if (process.env.FASTSPRING_WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("[FastSpring Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    console.error("[FastSpring Webhook] Failed to parse JSON")
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = event.type ?? event.event
  console.log(`[FastSpring Webhook] Received event: ${eventType}`)

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.charge.completed":
        await handleSubscriptionActivated(event)
        break

      case "subscription.deactivated":
      case "subscription.charge.failed":
        await handleSubscriptionDeactivated(event)
        break

      case "order.completed":
        await handleOrderCompleted(event)
        break

      default:
        console.log(`[FastSpring Webhook] Unhandled event: ${eventType}`)
    }
  } catch (err: any) {
    console.error(`[FastSpring Webhook] Error handling ${eventType}:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle subscription activation / update.
 * Upserts the subscription in Supabase.
 */
async function handleSubscriptionActivated(event: any) {
  const sub = event.data ?? event.subscription ?? event
  const subscriptionId = sub.id ?? sub.subscriptionId
  const userId = sub.tags?.userId ?? sub.tag?.userId
  const plan = sub.tags?.plan ?? sub.tag?.plan
  const customerId = sub.account ?? sub.customerId ?? sub.contact?.email
  const productPath = sub.product ?? sub.productPath
  const statusValue = sub.state ?? sub.status ?? "active"

  if (!subscriptionId || !userId) {
    console.warn("[FastSpring Webhook] Missing subscription ID or userId in event")
    return
  }

  // Fetch full subscription details from FastSpring API
  let fullSub = sub
  try {
    fullSub = await getSubscription(subscriptionId)
  } catch (err) {
    console.warn("[FastSpring Webhook] Could not fetch full subscription, using event data:", err)
  }

  const periodStart = fullSub.start ?? fullSub.startDate ?? sub.start
  const periodEnd = fullSub.end ?? fullSub.endDate ?? sub.end
  const cancelAtEnd = fullSub.cancelable ?? false

  const adminClient = createAdminClient()
  const { error } = await adminClient.from("subscriptions").upsert(
    {
      user_id: userId,
      fastspring_subscription_id: subscriptionId,
      fastspring_customer_id: customerId ?? null,
      fastspring_product_path: productPath ?? null,
      status: mapFastSpringStatus(statusValue),
      plan: plan ?? null,
      current_period_start: periodStart ? new Date(periodStart).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      cancel_at_period_end: cancelAtEnd,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[FastSpring Webhook] Failed to upsert subscription:", error)
    throw error
  }

  console.log(`[FastSpring Webhook] Subscription ${subscriptionId} activated for user ${userId}`)
}

/**
 * Handle subscription deactivation / payment failure.
 */
async function handleSubscriptionDeactivated(event: any) {
  const sub = event.data ?? event.subscription ?? event
  const subscriptionId = sub.id ?? sub.subscriptionId
  const userId = sub.tags?.userId ?? sub.tag?.userId
  const statusValue = sub.state ?? sub.status ?? "deactivated"

  if (!subscriptionId || !userId) {
    console.warn("[FastSpring Webhook] Missing subscription ID or userId in deactivation event")
    return
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("subscriptions")
    .update({
      status: mapFastSpringStatus(statusValue),
      cancel_at_period_end: true,
    })
    .eq("fastspring_subscription_id", subscriptionId)

  if (error) {
    console.error("[FastSpring Webhook] Failed to update subscription:", error)
    throw error
  }

  console.log(`[FastSpring Webhook] Subscription ${subscriptionId} deactivated for user ${userId}`)
}

/**
 * Handle one-time order completion (for non-subscription purchases).
 */
async function handleOrderCompleted(event: any) {
  const order = event.data ?? event.order ?? event
  const orderId = order.id ?? order.orderId
  const userId = order.tags?.userId ?? order.tag?.userId
  const plan = order.tags?.plan ?? order.tag?.plan

  console.log(`[FastSpring Webhook] Order ${orderId} completed for user ${userId}, plan: ${plan}`)

  // If this is a subscription order, the subscription.activated event will handle it.
  // For one-time purchases, you can record the order here.
}

/**
 * Map FastSpring subscription states to our internal status values.
 */
function mapFastSpringStatus(fsStatus: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    trial: "trialing",
    overdue: "past_due",
    canceled: "canceled",
    deactivated: "canceled",
    failed: "unpaid",
    expired: "canceled",
    paused: "paused",
  }
  return statusMap[fsStatus.toLowerCase()] ?? "active"
}

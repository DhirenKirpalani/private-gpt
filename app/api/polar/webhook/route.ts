import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, mapPolarStatus } from "@/lib/polar"
import { createAdminClient } from "@/lib/supabase"
import { sendSubscriptionActivatedEmail, sendSubscriptionCanceledEmail } from "@/lib/system-email"

/**
 * Polar webhook handler.
 *
 * Configure the webhook URL in your Polar dashboard:
 *   https://your-domain.com/api/polar/webhook
 *
 * Key events handled:
 *   - subscription.created
 *   - subscription.updated
 *   - subscription.active
 *   - subscription.canceled
 *   - subscription.revoked
 *   - order.created
 */

export async function POST(req: NextRequest) {
  const payload = await req.text()

  const headers: Record<string, string | null> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  if (process.env.POLAR_WEBHOOK_SECRET) {
    const valid = await verifyWebhookSignature(payload, headers)
    if (!valid) {
      console.error("[Polar Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType: string = event.type ?? ""
  console.log(`[Polar Webhook] Received: ${eventType}`)

  try {
    switch (eventType) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
        await handleSubscriptionActivated(event)
        break

      case "subscription.canceled":
      case "subscription.revoked":
        await handleSubscriptionDeactivated(event)
        break

      case "order.created":
        console.log(`[Polar Webhook] Order ${event.data?.id} created`)
        break

      default:
        console.log(`[Polar Webhook] Unhandled event: ${eventType}`)
    }
  } catch (err: any) {
    console.error(`[Polar Webhook] Error handling ${eventType}:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionActivated(event: any) {
  const data = event.data ?? {}
  const metadata = data.metadata ?? {}

  const subscriptionId = String(data.id ?? "")
  const userId = metadata.user_id ?? data.customer_external_id
  const plan = metadata.plan ?? null
  const customerId = String(data.customer_id ?? "")
  const polarStatus = data.status ?? "active"
  const periodStart = data.current_period_start ?? data.created_at ?? null
  const periodEnd = data.current_period_end ?? null
  const cancelAtEnd = data.cancel_at_period_end ?? false

  if (!subscriptionId || !userId) {
    console.warn("[Polar Webhook] Missing subscription ID or userId")
    return
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from("subscriptions").upsert(
    {
      user_id: userId,
      polar_subscription_id: subscriptionId,
      polar_customer_id: customerId || null,
      status: mapPolarStatus(polarStatus),
      plan: plan ?? null,
      current_period_start: periodStart ? new Date(periodStart).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      cancel_at_period_end: cancelAtEnd,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[Polar Webhook] Failed to upsert subscription:", error)
    throw error
  }

  console.log(`[Polar Webhook] Subscription ${subscriptionId} activated for user ${userId}`)

  // Send billing confirmation email
  try {
    const { data: authData } = await adminClient.auth.admin.getUserById(userId)
    const email = authData.user?.email
    const { data: profile } = await adminClient.from("profiles").select("full_name").eq("user_id", userId).maybeSingle()
    if (email) {
      const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Solo"
      await sendSubscriptionActivatedEmail(email, planName, profile?.full_name || undefined)
    }
  } catch (emailErr) {
    console.error("[Polar Webhook] Failed to send activation email:", emailErr)
  }
}

async function handleSubscriptionDeactivated(event: any) {
  const data = event.data ?? {}
  const subscriptionId = String(data.id ?? "")
  const polarStatus = data.status ?? "canceled"

  if (!subscriptionId) {
    console.warn("[Polar Webhook] Missing subscription ID in deactivation event")
    return
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("subscriptions")
    .update({
      status: mapPolarStatus(polarStatus),
      cancel_at_period_end: true,
    })
    .eq("polar_subscription_id", subscriptionId)

  if (error) {
    console.error("[Polar Webhook] Failed to update subscription:", error)
    throw error
  }

  console.log(`[Polar Webhook] Subscription ${subscriptionId} deactivated`)

  // Send cancellation email
  try {
    const { data: sub } = await adminClient.from("subscriptions").select("user_id, plan, current_period_end").eq("polar_subscription_id", subscriptionId).maybeSingle()
    if (sub?.user_id) {
      const { data: authData } = await adminClient.auth.admin.getUserById(sub.user_id)
      const email = authData.user?.email
      const { data: profile } = await adminClient.from("profiles").select("full_name").eq("user_id", sub.user_id).maybeSingle()
      if (email) {
        const planName = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "Solo"
        await sendSubscriptionCanceledEmail(email, planName, sub.current_period_end || undefined, profile?.full_name || undefined)
      }
    }
  } catch (emailErr) {
    console.error("[Polar Webhook] Failed to send cancellation email:", emailErr)
  }
}

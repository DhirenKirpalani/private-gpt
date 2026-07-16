import { stripe } from "./stripe"
import { createAdminClient } from "./supabase"

/**
 * Count all members across all workspaces owned by a user (including the owner).
 * Each owner counts as 1 seat, plus each member in their workspaces.
 */
export async function countSeatsForOwner(ownerId: string): Promise<number> {
  const supabase = createAdminClient()

  // Get all workspaces owned by this user
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", ownerId)

  if (!workspaces || workspaces.length === 0) return 1 // owner is always 1 seat

  const workspaceIds = workspaces.map(w => w.id)

  // Count all members across those workspaces (excluding the owner, who is counted as 1)
  const { count } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .in("workspace_id", workspaceIds)
    .neq("user_id", ownerId)

  return 1 + (count ?? 0)
}

/**
 * Sync the Stripe subscription quantity to match the actual seat count.
 * Called after adding or removing a workspace member.
 */
export async function syncStripeSeats(ownerId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Get the owner's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, plan")
      .eq("user_id", ownerId)
      .single()

    if (!subscription?.stripe_subscription_id) return
    if (subscription.plan !== "team") return

    const seatCount = await countSeatsForOwner(ownerId)

    // Update the Stripe subscription quantity
    await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: (await stripe.subscriptions.retrieve(subscription.stripe_subscription_id))
              .items.data[0].id,
            quantity: seatCount,
          },
        ],
        proration_behavior: "create_prorations",
      }
    )

    console.log(`[Stripe Seats] Synced ${ownerId} to ${seatCount} seats`)
  } catch (err) {
    console.error("[Stripe Seats] Failed to sync seats:", err)
  }
}

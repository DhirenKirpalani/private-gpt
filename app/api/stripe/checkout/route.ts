import { NextRequest, NextResponse } from "next/server"
import { stripe, getPlanPriceId } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = (await req.json()) as { plan?: "solo" | "team"; userId?: string }

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing plan or userId" }, { status: 400 })
    }

    const priceId = getPlanPriceId(plan)
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or missing price configuration" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user email from Supabase auth
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const email = userData.user.email

    // Check for existing subscription/customer
    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single()

    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: { metadata: { userId, plan } },
      metadata: { userId, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[Stripe Checkout Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

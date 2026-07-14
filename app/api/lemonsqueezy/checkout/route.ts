import { NextRequest, NextResponse } from "next/server"
import { createCheckoutSession, LS_STORE_ID, LS_VARIANTS } from "@/lib/lemonsqueezy"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = (await req.json()) as { plan?: "solo" | "team"; userId?: string }

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing plan or userId" }, { status: 400 })
    }

    if (!LS_STORE_ID) {
      return NextResponse.json({ error: "Lemon Squeezy store ID not configured" }, { status: 500 })
    }

    const variantId = LS_VARIANTS[plan]
    if (!variantId) {
      return NextResponse.json(
        { error: "Invalid plan or missing Lemon Squeezy variant configuration" },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const email = userData.user.email!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const { url } = await createCheckoutSession({
      variantId,
      userEmail: email,
      userId,
      plan,
      successUrl: `${appUrl}/profile?success=true`,
      cancelUrl: `${appUrl}/pricing?canceled=true`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[LemonSqueezy Checkout Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

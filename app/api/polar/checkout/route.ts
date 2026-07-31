import { NextRequest, NextResponse } from "next/server"
import { createCheckoutSession, POLAR_PRODUCTS } from "@/lib/polar"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { plan, userId } = (await req.json()) as { plan?: "solo" | "team"; userId?: string }

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing plan or userId" }, { status: 400 })
    }

    if (!process.env.POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Polar access token not configured" }, { status: 500 })
    }

    const productId = POLAR_PRODUCTS[plan]
    if (!productId) {
      return NextResponse.json(
        { error: "Invalid plan or missing Polar product configuration" },
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
      productId,
      userEmail: email,
      userId,
      plan,
      successUrl: `${appUrl}/profile?success=true`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[Polar Checkout Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/polar/checkout")

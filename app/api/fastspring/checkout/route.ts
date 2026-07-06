import { NextRequest, NextResponse } from "next/server"
import { createCheckoutSession, getPlanProductPath, FASTSPRING_STORE_ID } from "@/lib/fastspring"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = (await req.json()) as { plan?: "solo" | "team"; userId?: string }

    if (!plan || !userId) {
      return NextResponse.json({ error: "Missing plan or userId" }, { status: 400 })
    }

    const productPath = getPlanProductPath(plan)
    if (!productPath) {
      return NextResponse.json(
        { error: "Invalid plan or missing FastSpring product configuration" },
        { status: 400 }
      )
    }

    if (!FASTSPRING_STORE_ID) {
      return NextResponse.json(
        { error: "FastSpring store ID not configured" },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient()

    // Get user email from Supabase auth
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const email = userData.user.email

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const { url } = await createCheckoutSession({
      productPath,
      userEmail: email!,
      userId,
      plan,
      successUrl: `${appUrl}/profile?success=true`,
      cancelUrl: `${appUrl}/pricing?canceled=true`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[FastSpring Checkout Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

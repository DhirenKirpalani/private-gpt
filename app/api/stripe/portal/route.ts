import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabase } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

async function _POST(req: NextRequest) {
  try {
    const { userId } = (await req.json()) as { userId?: string }
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[Stripe Portal Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/stripe/portal")

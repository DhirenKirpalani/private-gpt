import { NextRequest, NextResponse } from "next/server"
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy"

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 })
    }

    const url = await getCustomerPortalUrl(subscriptionId)
    if (!url) {
      return NextResponse.json({ error: "Could not retrieve portal URL" }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[LemonSqueezy Portal Error]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

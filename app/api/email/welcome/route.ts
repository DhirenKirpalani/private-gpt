import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/system-email"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { email, name, planName, trialEnd } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }
    await sendWelcomeEmail(email, name || undefined, planName || undefined, trialEnd || undefined)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Welcome Email] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/email/welcome")

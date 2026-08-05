import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    // Verify the auth user exists to avoid FK violation
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !authUser.user) {
      console.error("[START TRIAL] User not found in auth:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status, plan")
      .eq("user_id", userId)
      .single()

    if (existing) {
      return NextResponse.json({ subscription: existing, isNew: false })
    }

    // Check for per-user override in profiles.trial_days
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_days")
      .eq("user_id", userId)
      .single()

    const defaultDays = 15
    const days = profile?.trial_days ?? defaultDays
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        status: "trialing",
        plan: "solo",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
      }, { onConflict: "user_id" })
      .select("*")
      .single()

    if (error) {
      console.error("[START TRIAL] Insert failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscription: data, isNew: true })
  } catch (err: any) {
    console.error("[START TRIAL] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/subscriptions/start-trial")

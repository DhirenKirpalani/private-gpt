import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUsageSummary } from "@/lib/token-limits"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    const summary = await getUsageSummary(userId, sub)
    return NextResponse.json(summary)
  } catch (err: any) {
    console.error("[USAGE API]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch usage" }, { status: 500 })
  }
}

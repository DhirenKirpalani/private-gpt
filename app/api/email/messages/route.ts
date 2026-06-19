import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const provider = searchParams.get("provider")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    let query = supabase
      .from("email_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (provider) query = query.eq("provider", provider)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ messages: data || [] })
  } catch (err: any) {
    console.error("[EMAIL MESSAGES] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

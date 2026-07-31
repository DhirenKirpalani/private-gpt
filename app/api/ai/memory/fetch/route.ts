import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const { data: memories, error } = await supabase
    .from("ai_long_term_memories")
    .select("id, content, category, importance, created_at, last_accessed_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .order("last_accessed_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update last_accessed_at for retrieved memories (fire-and-forget)
  if (memories && memories.length > 0) {
    const now = new Date().toISOString()
    supabase
      .from("ai_long_term_memories")
      .update({ last_accessed_at: now })
      .in("id", memories.map((m: any) => m.id))
      .then(() => {})
  }

  return NextResponse.json({ memories: memories || [] })
}

export const GET = _GET

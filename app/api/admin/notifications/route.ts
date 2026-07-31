import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function _GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requestingUserId = searchParams.get("userId")
  if (!requestingUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  // Verify super_admin
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("user_id", requestingUserId)
    .single()

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Fetch notification logs
  const { data: logs, error } = await adminClient
    .from("notification_log")
    .select("id, user_id, type, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error

  // Fetch user emails and names
  const userIds = Array.from(new Set(logs?.map(l => l.user_id) ?? []))
  const emailMap: Record<string, string> = {}
  const nameMap: Record<string, string> = {}

  if (userIds.length > 0) {
    let page = 1
    let hasMore = true
    while (hasMore) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
      authUsers?.users?.forEach(u => {
        if (userIds.includes(u.id)) {
          emailMap[u.id] = u.email ?? ""
        }
      })
      hasMore = authUsers?.users?.length === 1000
      page++
    }

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds)
    profiles?.forEach(p => { nameMap[p.user_id] = p.full_name ?? "" })
  }

  const notifications = (logs ?? []).map(l => ({
    id: l.id,
    userId: l.user_id,
    email: emailMap[l.user_id] ?? l.user_id,
    fullName: nameMap[l.user_id] ?? "",
    type: l.type,
    stage: (l.metadata as any)?.stage ?? null,
    daysLeft: (l.metadata as any)?.days_left ?? null,
    plan: (l.metadata as any)?.plan ?? null,
    sentAt: l.created_at,
  }))

  return NextResponse.json({ notifications })
}

export const GET = withApiLogging(_GET, "/api/admin/notifications")

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
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

  // Fetch all profiles
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("user_id, full_name, job_title, company_name, role, created_at, trial_days")
    .order("created_at", { ascending: false })

  // Fetch all workspaces
  const { data: workspaces } = await adminClient
    .from("workspaces")
    .select("id, owner_id, name, icon, created_at")
    .order("created_at", { ascending: true })

  // Fetch all workspace members
  const { data: members } = await adminClient
    .from("workspace_members")
    .select("workspace_id, user_id, role")

  // Fetch all subscriptions for trial info
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("user_id, status, plan, current_period_end, current_period_start")

  const subMap: Record<string, { status: string; plan: string | null; currentPeriodEnd: string | null; currentPeriodStart: string | null }> = {}
  subs?.forEach(s => { subMap[s.user_id] = { status: s.status, plan: s.plan, currentPeriodEnd: s.current_period_end, currentPeriodStart: s.current_period_start } })

  // Fetch auth users for emails + last sign-in (handle pagination)
  const emailMap: Record<string, string> = {}
  const lastSignInMap: Record<string, string | null> = {}
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    authUsers?.users?.forEach(u => {
      emailMap[u.id] = u.email ?? u.id
      lastSignInMap[u.id] = u.last_sign_in_at ?? null
    })
    hasMore = authUsers?.users?.length === 1000
    page++
  }

  // Build a set of all user IDs that have workspaces (as owner or member)
  const userIdsWithWorkspaces = new Set<string>()
  workspaces?.forEach(ws => userIdsWithWorkspaces.add(ws.owner_id))
  members?.forEach(m => userIdsWithWorkspaces.add(m.user_id))

  // Build profile map for quick lookup
  const profileMap: Record<string, typeof profiles extends (infer T)[] | null ? T : never> = {}
  profiles?.forEach(p => { profileMap[p.user_id] = p })

  // Include users that exist in auth but have no profile row
  const allUserIds = new Set<string>([
    ...(profiles?.map(p => p.user_id) ?? []),
    ...Object.keys(emailMap),
  ])

  // Group workspaces by owner
  const workspaceMap: Record<string, typeof workspaces> = {}
  workspaces?.forEach(ws => {
    if (!workspaceMap[ws.owner_id]) workspaceMap[ws.owner_id] = []
    workspaceMap[ws.owner_id]!.push(ws)
  })

  // Group workspace memberships by user_id (for non-owner workspaces)
  const memberWsMap: Record<string, string[]> = {}
  members?.forEach(m => {
    if (!memberWsMap[m.user_id]) memberWsMap[m.user_id] = []
    memberWsMap[m.user_id].push(m.workspace_id)
  })

  // Group members by workspace
  const memberMap: Record<string, typeof members> = {}
  members?.forEach(m => {
    if (!memberMap[m.workspace_id]) memberMap[m.workspace_id] = []
    memberMap[m.workspace_id]!.push(m)
  })

  const wsById: Record<string, typeof workspaces extends (infer T)[] | null ? T : never> = {}
  workspaces?.forEach(ws => { wsById[ws.id] = ws })

  const companies = Array.from(allUserIds).map(userId => {
    const p = profileMap[userId]
    const sub = subMap[userId]
    // Combine owned workspaces + workspaces where user is a member
    const ownedWsIds = (workspaceMap[userId] ?? []).map(ws => ws.id)
    const memberWsIds = (memberWsMap[userId] ?? []).filter(id => !ownedWsIds.includes(id))
    const allWsIds = [...ownedWsIds, ...memberWsIds]

    // Calculate remaining trial days
    let trialDaysRemaining: number | null = null
    if (sub?.status === "trialing" && sub.currentPeriodEnd) {
      const end = new Date(sub.currentPeriodEnd)
      const now = new Date()
      const diffMs = end.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    return {
      userId,
      email: emailMap[userId] ?? userId,
      fullName: p?.full_name ?? "",
      jobTitle: p?.job_title ?? "",
      companyName: p?.company_name ?? "",
      platformRole: p?.role ?? "user",
      createdAt: p?.created_at ?? null,
      lastSignIn: lastSignInMap[userId] ?? null,
      subStatus: sub?.status ?? null,
      subPlan: sub?.plan ?? null,
      trialEnd: sub?.currentPeriodEnd ?? null,
      trialDaysRemaining,
      workspaces: allWsIds.map(wsId => {
        const ws = wsById[wsId]
        if (!ws) return null
        return {
          id: ws.id,
          name: ws.name,
          icon: ws.icon,
          createdAt: ws.created_at,
          members: (memberMap[ws.id] ?? []).map(m => {
            const mp = profileMap[m.user_id]
            return {
              userId: m.user_id,
              email: emailMap[m.user_id] ?? m.user_id,
              fullName: mp?.full_name ?? "",
              role: m.role,
            }
          }),
        }
      }).filter(Boolean),
    }
  })

  return NextResponse.json({ companies })
}

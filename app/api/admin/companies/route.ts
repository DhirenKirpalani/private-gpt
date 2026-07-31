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

  // Fetch all channel connections
  const [emailConns, waConns, tgConns, slConns, calConns] = await Promise.all([
    adminClient.from("email_connections").select("user_id, provider, status, email_address, created_at"),
    adminClient.from("whatsapp_connections").select("user_id, phone_number_id, status, created_at"),
    adminClient.from("telegram_connections").select("user_id, bot_username, status, created_at"),
    adminClient.from("slack_connections").select("user_id, team_name, status, created_at"),
    adminClient.from("calendar_connections").select("user_id, provider, status, calendar_email, created_at"),
  ])

  type ChannelInfo = { provider: string; label: string; status: string; detail: string; connectedAt: string | null }
  const channelsMap: Record<string, ChannelInfo[]> = {}

  const addChannel = (userId: string, ch: ChannelInfo) => {
    if (!channelsMap[userId]) channelsMap[userId] = []
    const existing = channelsMap[userId].find(c => c.label === ch.label)
    if (existing) {
      // Keep the most recent one
      if (!existing.connectedAt || (ch.connectedAt && new Date(ch.connectedAt) > new Date(existing.connectedAt))) {
        Object.assign(existing, ch)
      }
    } else {
      channelsMap[userId].push(ch)
    }
  }

  emailConns.data?.forEach((e: any) => {
    const label = e.provider === "gmail" ? "Gmail" : e.provider === "outlook" ? "Outlook" : e.provider === "hostinger" ? "Hostinger" : e.provider ? e.provider.charAt(0).toUpperCase() + e.provider.slice(1) : "Email"
    addChannel(e.user_id, { provider: "email", label, status: e.status, detail: e.email_address || e.provider, connectedAt: e.created_at })
  })
  waConns.data?.forEach((w: any) => {
    addChannel(w.user_id, { provider: "whatsapp", label: "WhatsApp", status: w.status, detail: w.phone_number_id || "", connectedAt: w.created_at })
  })
  tgConns.data?.forEach((tg: any) => {
    addChannel(tg.user_id, { provider: "telegram", label: "Telegram", status: tg.status, detail: tg.bot_username || "", connectedAt: tg.created_at })
  })
  slConns.data?.forEach((s: any) => {
    addChannel(s.user_id, { provider: "slack", label: "Slack", status: s.status, detail: s.team_name || "", connectedAt: s.created_at })
  })
  calConns.data?.forEach((c: any) => {
    if (!c.provider || (c.provider !== "calendly" && c.provider !== "google")) return
    addChannel(c.user_id, { provider: "calendar", label: c.provider === "calendly" ? "Calendly" : "Google Calendar", status: c.status, detail: c.calendar_email || "", connectedAt: c.created_at })
  })

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
      channels: channelsMap[userId] ?? [],
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

export const GET = withApiLogging(_GET, "/api/admin/companies")

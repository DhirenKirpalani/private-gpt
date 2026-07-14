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
    .select("user_id, full_name, company_name, role")
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

  // Fetch auth users for emails
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const emailMap: Record<string, string> = {}
  authUsers?.users?.forEach(u => { emailMap[u.id] = u.email ?? u.id })

  // Group workspaces by owner
  const workspaceMap: Record<string, typeof workspaces> = {}
  workspaces?.forEach(ws => {
    if (!workspaceMap[ws.owner_id]) workspaceMap[ws.owner_id] = []
    workspaceMap[ws.owner_id]!.push(ws)
  })

  // Group members by workspace
  const memberMap: Record<string, typeof members> = {}
  members?.forEach(m => {
    if (!memberMap[m.workspace_id]) memberMap[m.workspace_id] = []
    memberMap[m.workspace_id]!.push(m)
  })

  const companies = profiles?.map(p => ({
    userId: p.user_id,
    email: emailMap[p.user_id] ?? p.user_id,
    companyName: p.company_name || p.full_name || "—",
    platformRole: p.role ?? "user",
    workspaces: (workspaceMap[p.user_id] ?? []).map(ws => ({
      id: ws.id,
      name: ws.name,
      icon: ws.icon,
      createdAt: ws.created_at,
      members: (memberMap[ws.id] ?? []).map(m => ({
        userId: m.user_id,
        email: emailMap[m.user_id] ?? m.user_id,
        role: m.role,
      })),
    })),
  }))

  return NextResponse.json({ companies })
}

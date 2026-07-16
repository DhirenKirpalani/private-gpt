import { supabase } from "./supabase"

export type WorkspaceRole = "owner" | "admin" | "manager" | "member"

export type Workspace = {
  id: string
  owner_id: string
  name: string
  description: string | null
  icon: string
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by: string | null
  created_at: string
  // Joined from profiles
  email?: string
  full_name?: string
}

export async function getWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .or(`owner_id.eq.${userId},id.in.(${
      supabase.from("workspace_members").select("workspace_id").eq("user_id", userId)
    })`)
    .order("created_at", { ascending: true })

  if (error) {
    // Fallback: just get owned workspaces
    const { data: owned } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
    return (owned ?? []) as Workspace[]
  }
  return (data ?? []) as Workspace[]
}

export async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
  // Get workspaces owned by user
  const { data: owned } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)

  // Get workspaces user is a member of
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)

  const memberWorkspaceIds = (memberships ?? []).map(m => m.workspace_id)

  let memberWorkspaces: Workspace[] = []
  if (memberWorkspaceIds.length > 0) {
    const { data: mw } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", memberWorkspaceIds)
      .neq("owner_id", userId) // avoid duplicates
    memberWorkspaces = (mw ?? []) as Workspace[]
  }

  const all = [...(owned ?? []), ...memberWorkspaces] as Workspace[]
  all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return all
}

export async function createWorkspace(
  userId: string,
  name: string,
  description?: string,
  icon?: string
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon || "🏢",
    })
    .select()
    .single()

  if (error) throw error

  // Add owner as a member with role 'owner'
  await supabase.from("workspace_members").insert({
    workspace_id: data.id,
    user_id: userId,
    role: "owner",
  })

  return data as Workspace
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Pick<Workspace, "name" | "description" | "icon">>
): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)

  if (error) throw error
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
  if (error) throw error
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as WorkspaceMember[]
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = "admin",
  invitedBy?: string
): Promise<void> {
  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
    invited_by: invitedBy ?? null,
  })
  if (error) throw error
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
  if (error) throw error
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
  if (error) throw error
}

export async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single()
  return (data?.role as WorkspaceRole) ?? null
}

/** Backfill all legacy records (workspace_id IS NULL) for a user into their Default workspace. */
export async function backfillWorkspaceId(userId: string, workspaceId: string): Promise<void> {
  await Promise.all([
    supabase.from("documents")
      .update({ workspace_id: workspaceId })
      .eq("user_id", userId)
      .is("workspace_id", null),
    supabase.from("knowledge_categories")
      .update({ workspace_id: workspaceId })
      .eq("user_id", userId)
      .is("workspace_id", null),
    supabase.from("chat_conversations")
      .update({ workspace_id: workspaceId })
      .eq("user_id", userId)
      .is("workspace_id", null),
  ])
}

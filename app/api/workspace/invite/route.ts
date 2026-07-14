import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, workspaceId, email, role = "editor" } = await req.json()

    if (!requestingUserId || !workspaceId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify requester owns the workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single()

    if (!workspace || workspace.owner_id !== requestingUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Find target user by email
    const { data: userList } = await supabase.auth.admin.listUsers()
    const targetUser = userList?.users?.find(u => u.email === email)

    if (!targetUser) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 })
    }

    if (targetUser.id === requestingUserId) {
      return NextResponse.json({ error: "You are already a member of this workspace" }, { status: 400 })
    }

    // Add to workspace_members (upsert)
    const { error } = await supabase
      .from("workspace_members")
      .upsert(
        { workspace_id: workspaceId, user_id: targetUser.id, role, invited_by: requestingUserId },
        { onConflict: "workspace_id,user_id" }
      )

    if (error) throw error

    return NextResponse.json({ success: true, userId: targetUser.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, workspaceId, email, role = "member", workspaceName } = await req.json()

    if (!requestingUserId || !workspaceId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["admin", "manager", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify requester owns the workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("owner_id, name")
      .eq("id", workspaceId)
      .single()

    if (!workspace || workspace.owner_id !== requestingUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from("workspace_invitations")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("invited_email", email)
      .eq("status", "pending")
      .single()

    if (existing) {
      return NextResponse.json({ error: "A pending invitation already exists for this email" }, { status: 400 })
    }

    // Check if user is already a member
    const { data: userList } = await supabase.auth.admin.listUsers()
    const targetUser = userList?.users?.find(u => u.email === email)

    if (targetUser) {
      if (targetUser.id === requestingUserId) {
        return NextResponse.json({ error: "You are already a member of this workspace" }, { status: 400 })
      }

      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUser.id)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 400 })
      }
    }

    // Get inviter profile for notification
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name, contact_email")
      .eq("user_id", requestingUserId)
      .single()

    // Create invitation record with token
    const { data: invitation, error: inviteError } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        invited_email: email,
        role,
        invited_by: requestingUserId,
        status: "pending",
      })
      .select("token")
      .single()

    if (inviteError) throw inviteError

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite?token=${invitation.token}`
    const wsName = workspaceName || workspace.name

    if (targetUser) {
      // User exists — create in-app notification
      await supabase
        .from("notifications")
        .insert({
          user_id: targetUser.id,
          type: "workspace_invite",
          title: `You've been invited to join ${wsName}`,
          body: `${inviterProfile?.full_name || inviterProfile?.contact_email || "Someone"} invited you to join "${wsName}" as ${role}.`,
          data: {
            workspace_id: workspaceId,
            workspace_name: wsName,
            role,
            token: invitation.token,
            inviter_name: inviterProfile?.full_name || inviterProfile?.contact_email,
          },
        })

      // Also send email via Supabase
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
      })

      return NextResponse.json({
        success: true,
        inviteUrl,
        message: `Invitation sent to ${email}`,
      })
    } else {
      // User doesn't exist — send Supabase invite to create account
      const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
        data: {
          workspace_id: workspaceId,
          workspace_name: wsName,
          invited_by: requestingUserId,
          role,
          invite_token: invitation.token,
        },
      })

      if (emailError) throw emailError

      return NextResponse.json({
        success: true,
        inviteUrl,
        message: `Invitation email sent to ${email}. They'll join after signing up.`,
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

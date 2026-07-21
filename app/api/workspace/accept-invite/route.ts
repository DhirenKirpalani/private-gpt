import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { syncStripeSeats } from "@/lib/stripe-seats"

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json()

    if (!token || !userId) {
      return NextResponse.json({ error: "Missing token or userId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
    }

    if (invitation.status === "accepted") {
      return NextResponse.json({ error: "This invitation has already been accepted", alreadyMember: true }, { status: 400 })
    }

    if (invitation.status === "declined") {
      return NextResponse.json({ error: "This invitation has been declined" }, { status: 400 })
    }

    if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
      // Mark as expired in DB
      await supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)

      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    // Verify the user's email matches the invited email
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    if (!userData?.user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (userData.user.email !== invitation.invited_email) {
      return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 403 })
    }

    // Check if already a member (idempotent)
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", userId)
      .single()

    if (existingMember) {
      // Already a member — just mark invitation as accepted
      await supabase
        .from("workspace_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id)

      return NextResponse.json({
        success: true,
        alreadyMember: true,
        workspaceId: invitation.workspace_id,
      })
    }

    // Add user to workspace_members
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
      })

    if (memberError) throw memberError

    // Mark invitation as accepted
    await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)

    // Mark notification as read (if exists)
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("type", "workspace_invite")
      .contains("data", { token })

    // Sync Stripe seats
    const ownerId = invitation.invited_by
    if (ownerId) {
      await syncStripeSeats(ownerId).catch(() => {})
    }

    // Get workspace info for response
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name, icon")
      .eq("id", invitation.workspace_id)
      .single()

    return NextResponse.json({
      success: true,
      workspaceId: invitation.workspace_id,
      workspaceName: workspace?.name,
      workspaceIcon: workspace?.icon,
      role: invitation.role,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

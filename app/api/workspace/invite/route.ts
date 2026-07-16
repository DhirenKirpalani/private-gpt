import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { syncStripeSeats } from "@/lib/stripe-seats"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, workspaceId, email, role = "member", workspaceName } = await req.json()

    if (!requestingUserId || !workspaceId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["owner", "admin", "manager", "member"].includes(role)) {
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

    // Check if user already exists in Supabase Auth
    const { data: userList } = await supabase.auth.admin.listUsers()
    const targetUser = userList?.users?.find(u => u.email === email)

    if (targetUser) {
      // User exists — add to workspace_members directly
      if (targetUser.id === requestingUserId) {
        return NextResponse.json({ error: "You are already a member of this workspace" }, { status: 400 })
      }

      const { error } = await supabase
        .from("workspace_members")
        .upsert(
          { workspace_id: workspaceId, user_id: targetUser.id, role, invited_by: requestingUserId },
          { onConflict: "workspace_id,user_id" }
        )

      if (error) throw error

      // Sync Stripe seats (+1)
      await syncStripeSeats(requestingUserId)

      // Send notification email via Supabase invite
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/chat`,
      })

      return NextResponse.json({
        success: true,
        userId: targetUser.id,
        invited: true,
        message: `Invitation sent to ${email}`,
      })
    } else {
      // User doesn't exist — invite via Supabase to create account + send email
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/chat`,
        data: {
          workspace_id: workspaceId,
          workspace_name: workspaceName || workspace.name,
          invited_by: requestingUserId,
          role,
        },
      })

      if (inviteError) throw inviteError

      // Store pending invitation in workspace_members with a placeholder
      // The user will be fully linked when they accept the invite and sign up
      if (inviteData?.user?.id) {
        await supabase
          .from("workspace_members")
          .upsert(
            { workspace_id: workspaceId, user_id: inviteData.user.id, role, invited_by: requestingUserId },
            { onConflict: "workspace_id,user_id" }
          )

        // Sync Stripe seats (+1)
        await syncStripeSeats(requestingUserId)
      }

      return NextResponse.json({
        success: true,
        invited: true,
        message: `Invitation email sent to ${email}. They'll join the workspace after signing up.`,
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

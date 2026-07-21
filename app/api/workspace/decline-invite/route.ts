import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
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

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: `Invitation is already ${invitation.status}` }, { status: 400 })
    }

    // Mark invitation as declined
    await supabase
      .from("workspace_invitations")
      .update({ status: "declined" })
      .eq("id", invitation.id)

    // Mark notification as read (if exists)
    if (userId) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("type", "workspace_invite")
        .contains("data", { token })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

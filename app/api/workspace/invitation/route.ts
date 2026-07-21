import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: invitation, error } = await supabase
      .from("workspace_invitations")
      .select(`
        id,
        workspace_id,
        invited_email,
        role,
        status,
        expires_at,
        created_at,
        invited_by,
        workspaces!inner(name, icon)
      `)
      .eq("token", token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
    }

    // Get inviter profile
    let inviterName = "Someone"
    if (invitation.invited_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, contact_email")
        .eq("user_id", invitation.invited_by)
        .single()

      if (profile) {
        inviterName = profile.full_name || profile.contact_email || "Someone"
      }
    }

    const ws = invitation.workspaces as any

    // Check expiry
    const isExpired = invitation.status === "expired" || new Date(invitation.expires_at) < new Date()

    return NextResponse.json({
      id: invitation.id,
      workspace_id: invitation.workspace_id,
      workspace_name: ws?.name || "Unknown",
      workspace_icon: ws?.icon || "🏢",
      invited_email: invitation.invited_email,
      role: invitation.role,
      status: isExpired ? "expired" : invitation.status,
      inviter_name: inviterName,
      expires_at: invitation.expires_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

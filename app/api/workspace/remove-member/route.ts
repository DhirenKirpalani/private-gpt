import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { syncStripeSeats } from "@/lib/stripe-seats"

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, workspaceId, userId } = await req.json()

    if (!requestingUserId || !workspaceId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    // Don't allow removing the owner
    if (userId === requestingUserId) {
      return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 400 })
    }

    // Remove the member
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)

    if (error) throw error

    // Sync Stripe seats (-1)
    await syncStripeSeats(requestingUserId)

    return NextResponse.json({ success: true, message: "Member removed" })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

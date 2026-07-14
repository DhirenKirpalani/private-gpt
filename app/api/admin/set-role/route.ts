import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

const VALID_ROLES = ["user", "manager", "admin", "super_admin"]

export async function POST(req: NextRequest) {
  try {
    const { requestingUserId, targetEmail, role } = await req.json()

    if (!requestingUserId || !targetEmail || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify requesting user is super_admin
    const { data: requester } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!requester || requester.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Find target user by email via auth admin API
    const { data: userList } = await supabase.auth.admin.listUsers()
    const targetUser = userList?.users?.find(u => u.email === targetEmail)

    if (!targetUser) {
      return NextResponse.json({ error: "User not found with that email" }, { status: 404 })
    }

    // Prevent demoting yourself
    if (targetUser.id === requestingUserId && role !== "super_admin") {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
    }

    // Update role in profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("user_id", targetUser.id)

    if (error) throw error

    return NextResponse.json({ success: true, userId: targetUser.id, role })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

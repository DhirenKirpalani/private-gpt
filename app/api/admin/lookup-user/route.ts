import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const requestingUserId = searchParams.get("requestingUserId")

    if (!email || !requestingUserId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the requesting user is super_admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single()

    if (!adminProfile || adminProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Look up the target user by email via auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError || !authData?.users) {
      return NextResponse.json({ found: false })
    }

    const targetUser = authData.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

    if (!targetUser) {
      return NextResponse.json({ found: false })
    }

    // Get the user's name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", targetUser.id)
      .single()

    return NextResponse.json({ found: true, name: profile?.full_name || targetUser.email })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

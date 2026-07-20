import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const VALID_ROLES = ["user", "manager", "admin", "super_admin"]

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  manager: "Manager",
  admin: "Admin",
  super_admin: "Super Admin",
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  user: "You have standard access to Exploro.",
  manager: "You can manage teams and oversee workspaces.",
  admin: "You have full platform access including billing and user management.",
  super_admin: "You have complete platform control including all companies and settings.",
}

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

    // Send email notification to the user
    try {
      await resend.emails.send({
        from: "Exploro <support@exploro-os.com>",
        to: targetEmail,
        subject: `Your Exploro role has been updated to ${ROLE_LABELS[role]}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"}/assets/images/exploro-icon.svg" alt="Exploro" style="height:40px;" />
            </div>
            <h2 style="color:#34d399;margin:0 0 16px;">Your role has been updated</h2>
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
              Hi ${targetEmail.split("@")[0]},
            </p>
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
              Your Exploro account role has been changed to <strong style="color:#34d399;">${ROLE_LABELS[role]}</strong>.
            </p>
            <div style="background:#1a2235;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">What this means:</p>
              <p style="margin:8px 0 0;font-size:14px;color:#e2e8f0;">${ROLE_DESCRIPTIONS[role]}</p>
            </div>
            <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
              If you believe this was a mistake, please contact us at <a href="mailto:support@exploro-os.com" style="color:#34d399;">support@exploro-os.com</a>.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"}/chat" style="display:inline-block;margin-top:20px;background:#34d399;color:#0f1520;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
              Go to Exploro
            </a>
            <p style="margin-top:32px;font-size:11px;color:#4b5563;">
              This is an automated message from Exploro. Please do not reply.
            </p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error("[set-role] Email notification failed:", emailErr)
    }

    return NextResponse.json({ success: true, userId: targetUser.id, role })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

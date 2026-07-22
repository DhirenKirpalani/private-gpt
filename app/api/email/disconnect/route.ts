import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { userId, providerId } = await req.json()
    if (!userId || !providerId) {
      return NextResponse.json({ error: "Missing userId or providerId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete associated email messages
    const { error: msgError } = await supabase
      .from("email_messages")
      .delete()
      .eq("user_id", userId)
      .eq("provider", providerId)
    if (msgError) console.error("[DISCONNECT] Failed to delete messages:", msgError.message)

    // Delete contacts imported from email
    const { error: contactError } = await supabase
      .from("contacts")
      .delete()
      .eq("user_id", userId)
      .eq("source", "email_import")
    if (contactError) console.error("[DISCONNECT] Failed to delete contacts:", contactError.message)

    // Delete the connection
    const { error: connError } = await supabase
      .from("email_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", providerId)
    if (connError) throw connError

    console.log(`[DISCONNECT] Successfully disconnected ${providerId} for user ${userId}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[DISCONNECT] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to disconnect" }, { status: 500 })
  }
}

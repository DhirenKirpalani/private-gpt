import { NextRequest, NextResponse } from "next/server"
import { deleteUserSession } from "@/lib/telegram-user"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    await deleteUserSession(userId)

    // Clean up Telegram messages and contacts
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error: msgError } = await supabase.from("telegram_messages").delete().eq("user_id", userId)
    if (msgError) console.error("[TG USER DISCONNECT] Failed to delete messages:", msgError.message)

    const { error: contactError } = await supabase.from("contacts").delete().eq("user_id", userId).eq("source", "telegram_import")
    if (contactError) console.error("[TG USER DISCONNECT] Failed to delete contacts:", contactError.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[TG USER DISCONNECT]", err)
    return NextResponse.json({ error: err?.message || "Failed to disconnect" }, { status: 500 })
  }
}

export const POST = _POST

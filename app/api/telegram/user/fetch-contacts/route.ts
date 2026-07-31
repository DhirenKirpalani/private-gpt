import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, supabase } from "@/lib/telegram-user"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Fetch contacts
    const result: any = await client.invoke(
      new (require("teleproto").raw.contacts.GetContacts)({})
    )

    const contacts = (result.users || []).map((u: any) => ({
      tg_user_id: String(u.id),
      username: u.username || null,
      first_name: u.firstName || null,
      last_name: u.lastName || null,
      phone: u.phone || null,
    }))

    // Import contacts into CRM
    let imported = 0
    for (const c of contacts) {
      if (!c.first_name && !c.last_name && !c.username) continue
      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim()
      const email = c.username ? `${c.username}@telegram` : null

      const { error } = await supabase.from("contacts").upsert({
        user_id: userId,
        name,
        email,
        phone: c.phone ? `+${c.phone}` : null,
        source: "telegram_import",
        tags: ["telegram"],
      }, { onConflict: "user_id,email" })

      if (!error) imported++
    }

    return NextResponse.json({ success: true, total: contacts.length, imported })
  } catch (err: any) {
    console.error("[TG FETCH CONTACTS]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch contacts" }, { status: 500 })
  }
}

export const POST = _POST

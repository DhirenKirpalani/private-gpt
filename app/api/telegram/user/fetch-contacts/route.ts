import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, isSessionExpiredError, markSessionExpired } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"
import { Api } from "teleproto"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  const { userId } = await req.json()
  let client: any = null
  try {
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const supabase = createAdminClient()
    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Fetch contacts
    const result: any = await client.invoke(
      new Api.contacts.GetContacts({})
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
      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.username || c.tg_user_id
      const email = c.username ? `${c.username}@telegram` : null

      // Use tg_user_id as phone for dedup (consistent with importContactsFromTelegram)
      const { error } = await supabase.from("contacts").upsert({
        user_id: userId,
        name,
        email,
        phone: c.phone ? `+${c.phone}` : c.tg_user_id,
        source: "telegram_import",
        tags: ["telegram"],
      }, { onConflict: "user_id,phone" })

      if (!error) imported++
    }

    return NextResponse.json({ success: true, total: contacts.length, imported })
  } catch (err: any) {
    console.error("[TG FETCH CONTACTS]", err)
    if (isSessionExpiredError(err)) {
      await markSessionExpired(userId)
      return NextResponse.json({ error: "Your Telegram session has expired. Please reconnect your account." }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || "Failed to fetch contacts" }, { status: 500 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = _POST

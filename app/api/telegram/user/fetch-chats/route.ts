import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, supabase } from "@/lib/telegram-user"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId, limit } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Get dialog list (personal chats)
    const dialogs: any = await client.getDialogs({ limit: limit || 50 })

    let imported = 0
    for (const dialog of dialogs) {
      const entity = dialog.entity as any
      if (!entity) continue

      const chatId = String(entity.id)
      const chatType = entity.className?.replace("User", "private").replace("Chat", "group") || "private"
      const chatTitle = entity.title || `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.username || "Unknown"

      // Fetch last few messages from this dialog
      try {
        const messages = await client.getMessages(entity, { limit: 20 })
        for (const msg of messages) {
          if (!msg.message) continue // skip non-text messages

          const msgId = String(msg.id)
          const direction = msg.out ? "sent" : "received"
          const timestamp = new Date((msg.date || 0) * 1000).toISOString()

          // Dedup by tg_message_id + chat_id
          const { data: existing } = await supabase
            .from("telegram_messages")
            .select("id")
            .eq("user_id", userId)
            .eq("tg_message_id", parseInt(msgId))
            .eq("chat_id", chatId)
            .single()

          if (existing) continue

          const fromEntity = msg.sender as any
          const { error } = await supabase.from("telegram_messages").insert({
            user_id: userId,
            connection_id: null,
            direction,
            chat_id: chatId,
            chat_type: chatType,
            chat_title: chatTitle,
            from_id: fromEntity ? String(fromEntity.id) : null,
            from_first_name: fromEntity?.firstName || null,
            from_last_name: fromEntity?.lastName || null,
            from_username: fromEntity?.username || null,
            tg_message_id: parseInt(msgId),
            body: msg.message,
            timestamp,
            read: true, // historical messages are already read
          })

          if (!error) imported++
        }
      } catch (e) {
        // Skip dialogs that fail
        continue
      }
    }

    return NextResponse.json({ success: true, dialogs: dialogs.length, imported })
  } catch (err: any) {
    console.error("[TG FETCH CHATS]", err)
    return NextResponse.json({ error: err?.message || "Failed to fetch chats" }, { status: 500 })
  }
}

export const POST = _POST

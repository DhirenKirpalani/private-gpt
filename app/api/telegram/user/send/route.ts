import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, isSessionExpiredError, markSessionExpired } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"
import { Api } from "teleproto"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  const { userId, chatId, body } = await req.json()
  let client: any = null
  try {
    if (!userId || !chatId || !body) {
      return NextResponse.json({ error: "Missing userId, chatId, or body" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const supabase = createAdminClient()
    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Resolve entity — need access hash from dialog list for bare user IDs
    let entity: any = null
    const numericId = parseInt(chatId)

    // Method 1: Try getEntity (works for usernames/channels)
    try {
      entity = await client.getEntity(chatId)
    } catch { /* not a username, continue */ }

    // Method 2: Search dialogs for the entity with matching ID
    if (!entity) {
      try {
        const dialogs = await client.getDialogs({ limit: 200 })
        for (const d of dialogs) {
          const e = d.entity as any
          if (e && String(e.id) === String(numericId)) {
            entity = e
            break
          }
        }
      } catch { /* continue */ }
    }

    // Method 3: Try InputPeerUser with accessHash from fetched messages
    if (!entity) {
      const { data: msgData } = await supabase
        .from("telegram_messages")
        .select("from_id, chat_id")
        .eq("user_id", userId)
        .or(`chat_id.eq.${chatId},from_id.eq.${chatId}`)
        .limit(1)
        .single()
      if (msgData) {
        try {
          entity = await client.getEntity(parseInt(msgData.from_id || msgData.chat_id))
        } catch { /* continue */ }
      }
    }

    if (!entity) {
      return NextResponse.json({ error: "Could not resolve this chat. Try refreshing your Telegram messages first." }, { status: 400 })
    }

    const result: any = await client.sendMessage(entity, { message: body })

    const messageId = result.id
    const timestamp = new Date((result.date || 0) * 1000).toISOString()

    // Use the actual peer ID from the result to match fetched messages
    const resultChatId = String(result.peerId?.userId || result.peerId?.chatId || result.chatId?.value || entity.id || chatId)

    // Store sent message
    await supabase.from("telegram_messages").insert({
      user_id: userId,
      connection_id: null,
      direction: "sent",
      chat_id: resultChatId,
      chat_type: result.chat?.className?.replace("User", "private").replace("Chat", "group") || "private",
      chat_title: result.chat?.title || result.chat?.firstName || result.chat?.username || null,
      from_id: null,
      tg_message_id: messageId,
      body,
      timestamp,
      read: true,
    })

    return NextResponse.json({ success: true, messageId })
  } catch (err: any) {
    console.error("[TG USER SEND]", err)
    if (isSessionExpiredError(err)) {
      await markSessionExpired(userId)
      return NextResponse.json({ error: "Your Telegram session has expired. Please reconnect your account." }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/user/send")

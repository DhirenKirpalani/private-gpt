import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, supabase } from "@/lib/telegram-user"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId, chatId, body } = await req.json()
    if (!userId || !chatId || !body) {
      return NextResponse.json({ error: "Missing userId, chatId, or body" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Send message as the user
    const entity = await client.getInputEntity(parseInt(chatId))
    const result: any = await client.sendMessage(entity, { message: body })

    const messageId = result.id
    const timestamp = new Date((result.date || 0) * 1000).toISOString()

    // Store sent message
    await supabase.from("telegram_messages").insert({
      user_id: userId,
      connection_id: null,
      direction: "sent",
      chat_id: chatId,
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
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/user/send")

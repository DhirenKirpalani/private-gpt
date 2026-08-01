import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, isSessionExpiredError, markSessionExpired } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"
import { Api } from "teleproto"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  const { userId, chatId, body, mediaUrl } = await req.json()
  let client: any = null
  let tempFilePath: string | null = null
  try {
    if (!userId || !chatId || (!body && !mediaUrl)) {
      return NextResponse.json({ error: "Missing userId, chatId, or body/mediaUrl" }, { status: 400 })
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

    let result: any
    let sentBody = body || ""

    if (mediaUrl) {
      // Download the image from Supabase storage to a temp file
      const response = await fetch(mediaUrl)
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to download media from storage" }, { status: 500 })
      }
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      tempFilePath = path.join(os.tmpdir(), `tg_send_${Date.now()}.jpg`)
      fs.writeFileSync(tempFilePath, buffer)

      // Send photo with optional caption
      result = await client.sendFile(entity, {
        file: tempFilePath,
        caption: body || undefined,
        forceDocument: false,
      })
      sentBody = body ? `[Photo] ${body}` : "[Photo]"
    } else {
      result = await client.sendMessage(entity, { message: body })
    }

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
      body: sentBody,
      media_url: mediaUrl || null,
      media_type: mediaUrl ? "photo" : null,
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
    if (tempFilePath) { try { fs.unlinkSync(tempFilePath) } catch {} }
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/user/send")

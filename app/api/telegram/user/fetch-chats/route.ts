import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, isSessionExpiredError, markSessionExpired } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

async function downloadAndStoreMedia(client: any, msg: any, userId: string, supabase: any): Promise<{ mediaUrl: string; mediaType: string } | null> {
  try {
    if (!msg.media) return null
    const media = msg.media
    const mediaClass = media.className || ""

    // Only handle photos for now
    if (mediaClass === "MessageMediaPhoto" && media.photo) {
      // Add timeout to prevent infinite reconnection loops
      const buffer = await Promise.race([
        client.downloadMedia(media.photo),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Media download timeout")), 15000))
      ])
      if (!buffer) return null

      const fileName = `telegram/${userId}/${msg.id}_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from("telegram-media")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false })

      if (uploadError) {
        console.error("[TG FETCH] Storage upload error:", uploadError)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("telegram-media")
        .getPublicUrl(fileName)

      return { mediaUrl: urlData.publicUrl, mediaType: "photo" }
    }

    // Handle documents (files, voice notes, etc.)
    if (mediaClass === "MessageMediaDocument" && media.document) {
      const doc = media.document
      const mimeType = doc.mimeType || "application/octet-stream"
      // Only handle images sent as documents
      if (!mimeType.startsWith("image/")) return null

      const buffer = await Promise.race([
        client.downloadMedia(doc),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Media download timeout")), 15000))
      ])
      if (!buffer) return null

      const ext = mimeType.split("/")[1] || "jpg"
      const fileName = `telegram/${userId}/${msg.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("telegram-media")
        .upload(fileName, buffer, { contentType: mimeType, upsert: false })

      if (uploadError) {
        console.error("[TG FETCH] Storage upload error:", uploadError)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("telegram-media")
        .getPublicUrl(fileName)

      return { mediaUrl: urlData.publicUrl, mediaType: "photo" }
    }

    return null
  } catch (e: any) {
    console.error("[TG FETCH] Media download error (skipping):", e?.message || e)
    return null
  }
}

async function _POST(req: NextRequest) {
  const { userId, limit } = await req.json()
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

    // Ensure storage bucket exists
    const { error: bucketError } = await supabase.storage.getBucket("telegram-media")
    if (bucketError) {
      console.log("[TG FETCH] Creating telegram-media bucket...")
      const { error: createError } = await supabase.storage.createBucket("telegram-media", { public: true })
      if (createError) {
        console.error("[TG FETCH] Failed to create bucket:", createError)
      }
    }

    // Get dialog list (personal chats)
    const dialogs: any = await client.getDialogs({ limit: limit || 50 })

    let imported = 0
    for (const dialog of dialogs) {
      const entity = dialog.entity as any
      if (!entity) continue

      const chatId = String(entity.id)
      const className = entity.className || ""
      let chatType = "private"
      if (className === "Channel" || className === "ChannelForbidden") chatType = entity.megagroup ? "group" : "channel"
      else if (className === "Chat" || className === "ChatForbidden") chatType = "group"
      else if (className === "User") chatType = "private"

      const chatTitle = dialog.title || dialog.name || entity.title || `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.username || "Unknown"

      // Fetch last few messages from this dialog
      try {
        const messages = await client.getMessages(entity, { limit: 20 })
        let mediaDownloadCount = 0
        const MAX_MEDIA_PER_DIALOG = 3
        for (const msg of messages) {
          // Skip if no text AND no media
          if (!msg.message && !msg.media) continue

          const msgId = String(msg.id)
          const direction = msg.out ? "sent" : "received"
          const timestamp = new Date((msg.date || 0) * 1000).toISOString()

          // Dedup by tg_message_id + chat_id — use limit(1) instead of single() to handle existing duplicates
          const { data: existing } = await supabase
            .from("telegram_messages")
            .select("id")
            .eq("user_id", userId)
            .eq("tg_message_id", parseInt(msgId))
            .eq("chat_id", chatId)
            .limit(1)

          if (existing && existing.length > 0) continue

          // Download media if present — disabled during bulk fetch to avoid 429 rate limiting
          // Media is fetched on-demand when viewing a conversation
          let mediaUrl: string | null = null
          let mediaType: string | null = null
          if (msg.media) {
            // Just record that media exists; actual download happens on-demand
            const mediaClass = msg.media.className || ""
            if (mediaClass === "MessageMediaPhoto") {
              mediaType = "photo"
            }
          }

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
            body: msg.message || "",
            media_url: mediaUrl,
            media_type: mediaType,
            caption: msg.message && mediaUrl ? null : (mediaUrl ? (msg.message || "") : null),
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
    if (isSessionExpiredError(err)) {
      await markSessionExpired(userId)
      return NextResponse.json({ error: "Your Telegram session has expired. Please reconnect your account." }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || "Failed to fetch chats" }, { status: 500 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = _POST

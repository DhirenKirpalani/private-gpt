import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, getUserSession, isSessionExpiredError, markSessionExpired } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  const { userId, chatId, messageIds } = await req.json()
  let client: any = null
  try {
    if (!userId || !chatId || !messageIds?.length) {
      return NextResponse.json({ error: "Missing userId, chatId, or messageIds" }, { status: 400 })
    }

    const session = await getUserSession(userId)
    if (!session) {
      return NextResponse.json({ error: "Telegram personal account not connected" }, { status: 404 })
    }

    const supabase = createAdminClient()

    // Only fetch messages that have media_type but no media_url
    const { data: messages } = await supabase
      .from("telegram_messages")
      .select("id, tg_message_id, media_type, media_url")
      .eq("user_id", userId)
      .eq("chat_id", chatId)
      .eq("media_type", "photo")
      .is("media_url", null)
      .in("tg_message_id", messageIds)
      .limit(5) // Max 5 at a time to avoid rate limiting

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, downloaded: 0 })
    }

    const client = createTelegramClient(session.sessionString)
    await client.connect()

    // Resolve entity
    let entity: any = null
    try { entity = await client.getEntity(chatId) } catch {}
    if (!entity) {
      const dialogs = await client.getDialogs({ limit: 200 })
      for (const d of dialogs) {
        const e = d.entity as any
        if (e && String(e.id) === String(chatId)) { entity = e; break }
      }
    }
    if (!entity) {
      return NextResponse.json({ error: "Could not resolve chat" }, { status: 400 })
    }

    let downloaded = 0
    for (const dbMsg of messages) {
      try {
        // Fetch the specific message from Telegram
        const msgs = await client.getMessages(entity, { minId: dbMsg.tg_message_id - 1, maxId: dbMsg.tg_message_id + 1, limit: 1 })
        const tgMsg = msgs.find((m: any) => String(m.id) === String(dbMsg.tg_message_id))
        if (!tgMsg?.media) continue

        const mediaClass = tgMsg.media.className || ""
        let buffer: any = null

        if (mediaClass === "MessageMediaPhoto" && (tgMsg.media as any).photo) {
          buffer = await Promise.race([
            client.downloadMedia((tgMsg.media as any).photo),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
          ])
        } else if (mediaClass === "MessageMediaDocument" && (tgMsg.media as any).document) {
          const mimeType = (tgMsg.media as any).document.mimeType || ""
          if (!mimeType.startsWith("image/")) continue
          buffer = await Promise.race([
            client.downloadMedia((tgMsg.media as any).document),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
          ])
        }

        if (!buffer) continue

        const ext = mediaClass === "MessageMediaPhoto" ? "jpg" : ((tgMsg.media as any).document?.mimeType?.split("/")[1] || "jpg")
        const fileName = `telegram/${userId}/${dbMsg.tg_message_id}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("telegram-media")
          .upload(fileName, buffer, { contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`, upsert: false })

        if (uploadError) {
          console.error("[TG FETCH MEDIA] Upload error:", uploadError)
          continue
        }

        const { data: urlData } = supabase.storage.from("telegram-media").getPublicUrl(fileName)

        // Update the message with the media URL
        await supabase
          .from("telegram_messages")
          .update({ media_url: urlData.publicUrl })
          .eq("id", dbMsg.id)

        downloaded++
        // Delay between downloads to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000))
      } catch (e: any) {
        console.error("[TG FETCH MEDIA] Error for msg", dbMsg.tg_message_id, ":", e?.message || e)
        continue
      }
    }

    return NextResponse.json({ success: true, downloaded })
  } catch (err: any) {
    console.error("[TG FETCH MEDIA]", err)
    if (isSessionExpiredError(err)) {
      await markSessionExpired(userId)
      return NextResponse.json({ error: "Telegram session expired. Please reconnect." }, { status: 401 })
    }
    return NextResponse.json({ error: err?.message || "Failed to fetch media" }, { status: 500 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = withApiLogging(_POST, "/api/telegram/user/fetch-media")

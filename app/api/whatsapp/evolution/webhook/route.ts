import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getEvolutionSessions, updateEvolutionSession, saveEvolutionMessage } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body.event
    const instance = body.instance

    if (!instance) {
      return NextResponse.json({ success: true })
    }

    const admin = createAdminClient()

    // Find session by instance_name
    const { data: session } = await admin
      .from("whatsapp_sessions")
      .select("*")
      .eq("instance_name", instance)
      .single()

    if (!session) {
      return NextResponse.json({ success: true })
    }

    // Handle connection event (both camelCase and UPPER_CASE)
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = body.data?.state
      if (state === "open") {
        const phone = body.data?.number || null
        await updateEvolutionSession(session.id, {
          status: "connected",
          phone_number: phone,
        })
      } else if (state === "close") {
        await updateEvolutionSession(session.id, { status: "disconnected" })
      }
      return NextResponse.json({ success: true })
    }

    // Handle incoming message (both camelCase and UPPER_CASE)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const messages = body.data?.messages || []
      for (const msg of messages) {
        if (msg.key?.fromMe) continue // Skip outgoing

        const text = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption ||
                     ""

        if (!text && !msg.message?.imageMessage && !msg.message?.documentMessage) continue

        let mediaUrl = null
        let mediaType = null

        // Handle media (we don't auto-download, just note the type)
        if (msg.message?.imageMessage) {
          mediaType = "image"
        } else if (msg.message?.documentMessage) {
          mediaType = "document"
        } else if (msg.message?.videoMessage) {
          mediaType = "video"
        } else if (msg.message?.audioMessage) {
          mediaType = "audio"
        }

        const rawJid = msg.key?.remoteJid || ""
        const altJid = msg.key?.remoteJidAlt || ""
        const contactPhone = (altJid && altJid.includes("@s.whatsapp.net"))
          ? altJid.replace(/@.+$/, "").replace(/[^0-9]/g, "")
          : rawJid.replace(/@.+$/, "").replace(/[^0-9]/g, "")

        await saveEvolutionMessage({
          user_id: session.user_id,
          session_id: session.id,
          direction: "received",
          from_number: contactPhone,
          to_number: session.phone_number || "",
          wa_message_id: msg.key?.id || null,
          body: text,
          media_url: mediaUrl,
          media_type: mediaType,
          timestamp: new Date(parseInt(msg.messageTimestamp || Date.now()) * 1000).toISOString(),
          read: false,
        })
      }
    }

    // Handle QR code update
    if (event === "qrcode.updated") {
      // QR is fetched on-demand via /api/whatsapp/qr, nothing to store here
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[EVOLUTION WEBHOOK]", err)
    return NextResponse.json({ error: err?.message || "Webhook failed" }, { status: 500 })
  }
}

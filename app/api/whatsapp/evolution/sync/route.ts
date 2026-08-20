import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

function extractPhone(jid: string, altJid?: string): string {
  // Prefer altJid for @lid addressing mode
  const raw = (altJid && altJid.includes("@s.whatsapp.net")) ? altJid : jid
  return raw.replace(/@.+$/, "").replace(/[^0-9]/g, "")
}

function isGroup(jid: string) {
  return jid.includes("@g.us")
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    if (!EVOLUTION_URL || !EVOLUTION_KEY) return NextResponse.json({ error: "Evolution not configured" }, { status: 500 })

    const admin = createAdminClient()

    // Get connected session
    const { data: session } = await admin
      .from("whatsapp_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (!session) return NextResponse.json({ error: "No connected session" }, { status: 404 })

    const instanceName = session.instance_name
    const myPhone = session.phone_number || ""

    // Fetch existing wa_message_ids to avoid duplicates (no unique constraint needed)
    const { data: existing } = await admin
      .from("whatsapp_messages")
      .select("wa_message_id")
      .eq("session_id", session.id)
      .not("wa_message_id", "is", null)
    const existingIds = new Set((existing || []).map((r: any) => r.wa_message_id))

    let totalSynced = 0
    let page = 1
    const limit = 50

    // Fetch messages page by page (max 5 pages = 250 messages)
    while (page <= 5) {
      const res = await fetch(
        `${EVOLUTION_URL}/chat/findMessages/${instanceName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ where: {}, limit, page }),
          cache: "no-store",
        }
      )
      if (!res.ok) break
      const data = await res.json()
      const records = data?.messages?.records || data?.records || (Array.isArray(data) ? data : [])
      if (!records.length) break

      const rows = records
        .filter((msg: any) => {
          const jid = msg.key?.remoteJid || ""
          if (isGroup(jid)) return false
          const msgId = msg.key?.id
          if (msgId && existingIds.has(msgId)) return false // skip already saved
          return true
        })
        .map((msg: any) => {
          const fromMe = !!msg.key?.fromMe
          const remoteJid = msg.key?.remoteJid || ""
          const altJid = msg.key?.remoteJidAlt || ""
          const contactPhone = extractPhone(remoteJid, altJid)

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.documentMessage?.caption ||
            ""

          let mediaType: string | null = null
          if (msg.message?.imageMessage) mediaType = "image"
          else if (msg.message?.videoMessage) mediaType = "video"
          else if (msg.message?.audioMessage) mediaType = "audio"
          else if (msg.message?.documentMessage) mediaType = "document"

          const ts = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
            : (msg.createdAt || new Date().toISOString())

          return {
            user_id: userId,
            session_id: session.id,
            direction: fromMe ? "sent" : "received",
            from_number: fromMe ? myPhone : contactPhone,
            to_number: fromMe ? contactPhone : myPhone,
            wa_message_id: msg.key?.id || null,
            body: text,
            media_url: null,
            media_type: mediaType,
            timestamp: ts,
            read: fromMe ? true : false,
          }
        })
        .filter((r: any) => r.from_number || r.to_number)

      if (rows.length > 0) {
        const { error } = await admin.from("whatsapp_messages").insert(rows)
        if (!error) totalSynced += rows.length
        else console.error("[EVOLUTION SYNC] Insert error:", error.message)
      }

      if (!data?.messages?.pages || page >= (data?.messages?.pages || 1)) break
      page++
    }

    return NextResponse.json({ ok: true, synced: totalSynced })
  } catch (err: any) {
    console.error("[EVOLUTION SYNC]", err)
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 })
  }
}

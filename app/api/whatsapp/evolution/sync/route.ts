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
  const tag = "[EVOLUTION SYNC]"
  const t0 = Date.now()
  try {
    const { userId } = await req.json()
    console.log(`${tag} ── START userId=${userId}`)

    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      console.error(`${tag} Evolution API not configured (EVOLUTION_API_URL or EVOLUTION_API_KEY missing)`)
      return NextResponse.json({ error: "Evolution not configured" }, { status: 500 })
    }

    const admin = createAdminClient()

    // Get connected session
    const { data: session, error: sessionErr } = await admin
      .from("whatsapp_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (sessionErr) console.error(`${tag} Session DB error:`, sessionErr.message)
    if (!session) {
      console.warn(`${tag} No connected session found for userId=${userId}`)
      return NextResponse.json({ error: "No connected session" }, { status: 404 })
    }

    const instanceName = session.instance_name
    const myPhone = session.phone_number || ""
    console.log(`${tag} Session found → id=${session.id} instance=${instanceName} phone=${myPhone}`)

    // Fetch existing wa_message_ids to avoid duplicates
    const { data: existing, error: existingErr } = await admin
      .from("whatsapp_messages")
      .select("wa_message_id")
      .eq("session_id", session.id)
      .not("wa_message_id", "is", null)
    if (existingErr) console.error(`${tag} Error fetching existing IDs:`, existingErr.message)
    const existingIds = new Set((existing || []).map((r: any) => r.wa_message_id))
    console.log(`${tag} Existing messages in DB for this session: ${existingIds.size}`)

    let totalSynced = 0
    let totalSkippedDup = 0
    let totalSkippedGroup = 0
    let page = 1
    const limit = 50

    while (page <= 5) {
      console.log(`${tag} Fetching page ${page} (limit=${limit}) from VPS...`)
      const res = await fetch(
        `${EVOLUTION_URL}/chat/findMessages/${instanceName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ where: {}, limit, page }),
          cache: "no-store",
        }
      )
      if (!res.ok) {
        console.error(`${tag} VPS /chat/findMessages returned ${res.status} on page ${page}`)
        break
      }
      const data = await res.json()
      const totalVPS = data?.messages?.total ?? "?"
      const totalPages = data?.messages?.pages ?? 1
      const records = data?.messages?.records || data?.records || (Array.isArray(data) ? data : [])
      console.log(`${tag} Page ${page}/${totalPages}: ${records.length} records (VPS total=${totalVPS})`)

      if (!records.length) { console.log(`${tag} No records on page ${page}, stopping.`); break }

      const rows: any[] = []
      for (const msg of records) {
        const jid = msg.key?.remoteJid || ""
        if (isGroup(jid)) { totalSkippedGroup++; continue }
        const msgId = msg.key?.id
        if (msgId && existingIds.has(msgId)) { totalSkippedDup++; continue }

        const fromMe = !!msg.key?.fromMe
        const altJid = msg.key?.remoteJidAlt || ""
        const contactPhone = extractPhone(jid, altJid)
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

        const row = {
          user_id: userId,
          session_id: session.id,
          direction: fromMe ? "sent" : "received",
          from_number: fromMe ? myPhone : contactPhone,
          to_number: fromMe ? contactPhone : myPhone,
          wa_message_id: msgId || null,
          body: text,
          media_url: null,
          media_type: mediaType,
          timestamp: ts,
          read: fromMe,
        }
        console.log(`${tag}   → ${row.direction} from=${row.from_number} to=${row.to_number} type=${mediaType || "text"} body="${text.slice(0, 40)}"`)
        if (row.from_number || row.to_number) rows.push(row)
        else console.warn(`${tag}   ⚠ Skipped (no phone number) jid=${jid} altJid=${altJid}`)
      }

      console.log(`${tag} Page ${page}: ${rows.length} new rows to insert, ${totalSkippedDup} dup, ${totalSkippedGroup} group`)

      if (rows.length > 0) {
        const { error: insertErr } = await admin.from("whatsapp_messages").insert(rows)
        if (insertErr) {
          console.error(`${tag} ❌ Insert failed on page ${page}:`, insertErr.message, insertErr.code, insertErr.details)
        } else {
          totalSynced += rows.length
          console.log(`${tag} ✓ Inserted ${rows.length} rows (total so far: ${totalSynced})`)
        }
      }

      if (page >= totalPages) { console.log(`${tag} All ${totalPages} page(s) fetched.`); break }
      page++
    }

    const elapsed = Date.now() - t0
    console.log(`${tag} ── DONE synced=${totalSynced} skippedDup=${totalSkippedDup} skippedGroup=${totalSkippedGroup} elapsed=${elapsed}ms`)
    return NextResponse.json({ ok: true, synced: totalSynced })
  } catch (err: any) {
    console.error(`${tag} ❌ Unhandled error:`, err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 })
  }
}

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
    const limit = 100

    while (page <= 50) {
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
        if (row.from_number || row.to_number) {
          rows.push(row)
        }
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

    // No FIFO trim during sync — synced messages are kept permanently.
    // FIFO trim only runs on real-time webhook messages (saveEvolutionMessage).
    const totalTrimmed = 0
    const elapsed = Date.now() - t0

    // Sync contacts from VPS (pushName = display name) — batch upsert
    let contactsSynced = 0
    try {
      console.log(`${tag} Syncing contacts from VPS...`)
      const contactsRes = await fetch(
        `${EVOLUTION_URL}/chat/findContacts/${instanceName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ where: {} }),
          cache: "no-store",
        }
      )
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        const vpsContacts = Array.isArray(contactsData) ? contactsData : []
        console.log(`${tag} VPS contacts found: ${vpsContacts.length}`)

        // Build phone→pushName map from VPS
        const vpsMap = new Map<string, string>()
        for (const vc of vpsContacts) {
          const jid = vc.remoteJid || ""
          if (isGroup(jid) || jid === "0@s.whatsapp.net" || jid === "status@broadcast") continue
          const altJid = vc.remoteJidAlt || ""
          const phone = extractPhone(jid, altJid)
          if (!phone) continue
          const pushName = vc.pushName || vc.name || ""
          if (pushName) vpsMap.set(phone, pushName)
        }

        const allPhones = Array.from(vpsMap.keys())
        console.log(`${tag} Unique VPS contacts with names: ${allPhones.length}`)

        // Fetch all existing contacts for this user in one query
        const BATCH = 500
        const existingMap = new Map<string, { id: string; name: string }>()
        for (let i = 0; i < allPhones.length; i += BATCH) {
          const batch = allPhones.slice(i, i + BATCH)
          const { data: existing } = await admin
            .from("contacts")
            .select("id, name, phone")
            .eq("user_id", userId)
            .in("phone", batch)
          if (existing) {
            for (const c of existing) existingMap.set(c.phone, { id: c.id, name: c.name })
          }
        }

        // Separate into inserts and updates
        const toInsert: any[] = []
        const toUpdate: Array<{ id: string; name: string }> = []
        const now = new Date().toISOString()

        for (const [phone, pushName] of Array.from(vpsMap.entries())) {
          const existing = existingMap.get(phone)
          if (existing) {
            if (pushName && (existing.name === phone || !existing.name || existing.name === "")) {
              toUpdate.push({ id: existing.id, name: pushName })
            }
          } else {
            toInsert.push({
              user_id: userId,
              name: pushName || phone,
              phone,
              tags: ["whatsapp"],
              source: "whatsapp_sync",
              last_contact: now,
              deal_value: 0,
              deal_stage: "",
            })
          }
        }

        // Batch insert new contacts
        if (toInsert.length > 0) {
          for (let i = 0; i < toInsert.length; i += BATCH) {
            const batch = toInsert.slice(i, i + BATCH)
            const { error: insErr } = await admin.from("contacts").insert(batch)
            if (insErr) console.error(`${tag} Contact insert error:`, insErr.message)
            else contactsSynced += batch.length
          }
        }

        // Batch updates (each needs id, do in parallel chunks)
        if (toUpdate.length > 0) {
          const updateChunks: Array<Array<{ id: string; name: string }>> = []
          for (let i = 0; i < toUpdate.length; i += 50) updateChunks.push(toUpdate.slice(i, i + 50))
          await Promise.all(updateChunks.map(chunk =>
            Promise.all(chunk.map(u => admin.from("contacts").update({ name: u.name }).eq("id", u.id)))
          ))
          contactsSynced += toUpdate.length
        }

        console.log(`${tag} Contacts synced: ${toInsert.length} new, ${toUpdate.length} updated`)
      }
    } catch (e: any) {
      console.error(`${tag} Contact sync error:`, e?.message)
    }

    console.log(`${tag} ── DONE synced=${totalSynced} contactsSynced=${contactsSynced} trimmed=${totalTrimmed} skippedDup=${totalSkippedDup} skippedGroup=${totalSkippedGroup} elapsed=${elapsed}ms`)
    return NextResponse.json({ ok: true, synced: totalSynced, contactsSynced, trimmed: totalTrimmed })
  } catch (err: any) {
    console.error(`${tag} ❌ Unhandled error:`, err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 })
  }
}

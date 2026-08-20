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
    const FIFO_LIMIT = 30
    const allInsertedRows: any[] = []

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
          allInsertedRows.push({ ...row, contactPhone })
        }
        else console.warn(`${tag}   ⚠ Skipped (no phone number) jid=${jid} altJid=${altJid}`)
      }

      console.log(`${tag} Page ${page}: ${rows.length} new rows to insert, ${totalSkippedDup} dup, ${totalSkippedGroup} group`)

      if (rows.length > 0) {
        const { error: insertErr, data: insertedData } = await admin.from("whatsapp_messages").insert(rows).select("id, from_number, to_number, direction")
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

    // FIFO trim: keep only 30 most recent messages per contact
    const contactsToTrim = new Set<string>()
    for (const r of allInsertedRows) {
      const contactNum = r.direction === "received" ? r.from_number : r.to_number
      if (contactNum) contactsToTrim.add(contactNum)
    }
    let totalTrimmed = 0
    for (const contactNum of Array.from(contactsToTrim)) {
      const { data: contactMsgs } = await admin
        .from("whatsapp_messages")
        .select("id")
        .eq("user_id", userId)
        .or(`from_number.eq.${contactNum},to_number.eq.${contactNum}`)
        .order("timestamp", { ascending: false })
      if (contactMsgs && contactMsgs.length > FIFO_LIMIT) {
        const toDelete = contactMsgs.slice(FIFO_LIMIT).map((r: any) => r.id)
        if (toDelete.length > 0) {
          await admin.from("whatsapp_messages").delete().in("id", toDelete)
          totalTrimmed += toDelete.length
        }
      }
    }
    if (totalTrimmed > 0) console.log(`${tag} FIFO trim: removed ${totalTrimmed} old messages (limit ${FIFO_LIMIT}/contact)`)

    const elapsed = Date.now() - t0

    // Sync contacts from VPS (pushName = display name)
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

        for (const vc of vpsContacts) {
          const jid = vc.remoteJid || ""
          if (isGroup(jid) || jid === "0@s.whatsapp.net" || jid === "status@broadcast") continue
          const altJid = vc.remoteJidAlt || ""
          const phone = extractPhone(jid, altJid)
          if (!phone) continue

          const pushName = vc.pushName || vc.name || ""
          const existingContact = await admin
            .from("contacts")
            .select("id, name")
            .eq("user_id", userId)
            .eq("phone", phone)
            .single()

          if (existingContact.data) {
            // Update name if we have a pushName and current name is just the phone number
            if (pushName && (existingContact.data.name === phone || !existingContact.data.name)) {
              await admin.from("contacts").update({ name: pushName }).eq("id", existingContact.data.id)
              contactsSynced++
            }
          } else {
            // Create new contact
            await admin.from("contacts").insert({
              user_id: userId,
              name: pushName || phone,
              phone,
              tags: ["whatsapp"],
              source: "whatsapp_sync",
              last_contact: new Date().toISOString(),
              deal_value: 0,
              deal_stage: "",
            })
            contactsSynced++
          }
        }
        console.log(`${tag} Contacts synced/updated: ${contactsSynced}`)
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

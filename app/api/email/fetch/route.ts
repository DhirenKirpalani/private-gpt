import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshIfNeeded(conn: any): Promise<string> {
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return conn.access_token
  }
  if (!conn.refresh_token) throw new Error("Refresh token missing")

  let tokenRes: Response
  if (conn.oauth_provider === "google") {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: conn.refresh_token,
        grant_type: "refresh_token",
      }),
    })
  } else if (conn.oauth_provider === "microsoft") {
    tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: conn.refresh_token,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read openid email offline_access",
      }),
    })
  } else { throw new Error("Unknown oauth_provider") }

  const data = await tokenRes.json()
  if (!tokenRes.ok) throw new Error(data.error_description || data.error || "Token refresh failed")

  const newAccess = data.access_token
  const newExpires = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
  await supabase.from("email_connections").update({ access_token: newAccess, token_expires_at: newExpires }).eq("id", conn.id)
  return newAccess
}

const BUSINESS_KEYWORDS = [
  "proposal","invoice","contract","quote","order","purchase","payment","receipt",
  "agreement","deal","lead","client","project","billing","estimate","PO","due",
  "refund","sales","opportunity","milestone","deliverable","deadline","status",
  "update","approval","sign","legal",
]

function matchesBusinessKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  return BUSINESS_KEYWORDS.some(k => lower.includes(k.toLowerCase()))
}

// Remove invalid Unicode surrogate pairs and control chars that break JSON/Postgres
function sanitizeText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    // Remove lone surrogates (invalid UTF-16 pairs)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    // Remove other control characters except tab, newline, carriage return
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const { userId, providerId, pageToken } = await req.json()
    if (!userId || !providerId) {
      return NextResponse.json({ error: "Missing userId or providerId" }, { status: 400 })
    }

    // Fetch the email connection
    const { data: conn, error } = await supabase
      .from("email_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", providerId)
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // 15-day window since connection
    const connectionDate = new Date(conn.created_at)
    const cutoffDate = new Date(connectionDate)
    cutoffDate.setDate(cutoffDate.getDate() - 15)
    const afterTimestamp = Math.floor(cutoffDate.getTime() / 1000)
    const cutoffISO = cutoffDate.toISOString()

    const results: any[] = []
    let nextPageToken: string | null = null

    // ── OAuth path ──
    if (conn.oauth_provider && conn.access_token) {
      const accessToken = await refreshIfNeeded(conn)

      if (conn.oauth_provider === "google") {
        // Fetch via Gmail API with pagination + 15-day window (keyword filter applied client-side below)
        const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : ""
        const qParam = encodeURIComponent(`after:${afterTimestamp}`)
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${qParam}${pageTokenParam}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const listData = await listRes.json()
        if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed")

        nextPageToken = listData.nextPageToken || null
        const messageIds = (listData.messages || []).map((m: any) => m.id)
        if (messageIds.length === 0) {
          return NextResponse.json({ success: true, fetched: 0, messages: [], nextPageToken })
        }

        // Batch check existing messages in one query
        const { data: existingRows } = await supabase
          .from("email_messages")
          .select("message_id")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .in("message_id", messageIds)

        const existingIds = new Set((existingRows || []).map((r: any) => r.message_id))
        const newIds = messageIds.filter((id: string) => !existingIds.has(id))

        if (newIds.length === 0) {
          return NextResponse.json({ success: true, fetched: 0, messages: [], nextPageToken })
        }

        // Fetch thread IDs of existing emails in DB so we can match replies to keyword threads
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          const text = `${te.subject || ""} ${te.body || ""}`.toLowerCase()
          if (matchesBusinessKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
          }
        }
        console.log(`[EMAIL FETCH] Found ${keywordThreadIds.size} existing threads with keywords`)

        // Fetch details in parallel with concurrency limit of 8
        const details: (any | null)[] = []
        for (let i = 0; i < newIds.length; i += 8) {
          const batch = newIds.slice(i, i + 8)
          const batchResults = await Promise.allSettled(
            batch.map((id: string) =>
              fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              ).then(r => r.ok ? r.json() : null)
            )
          )
          for (const r of batchResults) {
            details.push(r.status === "fulfilled" ? r.value : null)
          }
        }

        const payloads: any[] = []
        for (const d of details) {
          if (!d) continue
          const headers = d.payload?.headers || []
          const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ""

          let body = ""
          let html = ""
          const traverse = (parts: any[]) => {
            for (const part of parts || []) {
              if (part.mimeType === "text/plain" && part.body?.data) {
                body = Buffer.from(part.body.data, "base64url").toString("utf-8")
              } else if (part.mimeType === "text/html" && part.body?.data) {
                html = Buffer.from(part.body.data, "base64url").toString("utf-8")
              } else if (part.parts) { traverse(part.parts) }
            }
          }
          if (d.payload?.parts) traverse(d.payload.parts)
          else if (d.payload?.body?.data) {
            body = Buffer.from(d.payload.body.data, "base64url").toString("utf-8")
          }

          const subject = getHeader("Subject")
          const combinedText = `${subject} ${body || html}`.toLowerCase()
          const threadId = d.threadId || d.id
          const isInKeywordThread = keywordThreadIds.has(threadId)
          if (!matchesBusinessKeywords(combinedText) && !isInKeywordThread) {
            continue
          }

          payloads.push({
            user_id: userId,
            connection_id: conn.id,
            provider: providerId,
            direction: "received",
            from_address: getHeader("From"),
            to_address: getHeader("To"),
            subject: subject,
            body: body || html,
            html_body: html || null,
            message_id: d.id,
            message_id_header: getHeader("Message-ID") || null,
            thread_id: d.threadId || d.id,
            read: false,
            received_at: new Date(parseInt(d.internalDate)).toISOString(),
          })
        }

        if (payloads.length > 0) {
          const { data: inserted } = await supabase
            .from("email_messages")
            .insert(payloads)
            .select()
          if (inserted) results.push(...inserted)
        }

      } else if (conn.oauth_provider === "microsoft") {
        // Debug: list folders first to see what's available
        const folderRes = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders", { headers: { Authorization: `Bearer ${accessToken}` } })
        const folderData = await folderRes.json()
        console.log(`[EMAIL FETCH] Folders: ${folderData.value?.map((f: any) => `${f.displayName}(${f.totalItemCount})`).join(", ") || "none"}`)

        // Fetch via Microsoft Graph with pagination + 15-day window (keyword filter applied client-side below)
        const baseUrl = `https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=receivedDateTime ge ${cutoffISO}`
        const url = pageToken || baseUrl
        console.log(`[EMAIL FETCH] Microsoft Graph URL: ${url}`)
        const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
        const listData = await listRes.json()
        console.log(`[EMAIL FETCH] Microsoft Graph status: ${listRes.status}, messages count: ${listData.value?.length || 0}, error: ${listData.error?.message || "none"}`)
        if (!listRes.ok) throw new Error(listData.error?.message || "Graph list failed")

        nextPageToken = listData["@odata.nextLink"] || null
        const msgs = listData.value || []
        const msgIds = msgs.map((m: any) => m.id)
        if (msgIds.length === 0) {
          return NextResponse.json({ success: true, fetched: 0, messages: [], nextPageToken })
        }

        // Batch check existing messages
        const { data: existingRows } = await supabase
          .from("email_messages")
          .select("message_id")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .in("message_id", msgIds)

        const existingIds = new Set((existingRows || []).map((r: any) => r.message_id))
        const newMsgs = msgs.filter((m: any) => !existingIds.has(m.id))

        if (newMsgs.length === 0) {
          return NextResponse.json({ success: true, fetched: 0, messages: [], nextPageToken })
        }

        // Fetch thread IDs of existing emails in DB for keyword thread matching
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          const text = `${te.subject || ""} ${te.body || ""}`.toLowerCase()
          if (matchesBusinessKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
          }
        }
        console.log(`[EMAIL FETCH] Microsoft: Found ${keywordThreadIds.size} existing threads with keywords`)

        const payloads: any[] = []
        for (const msg of newMsgs) {
          const combinedText = `${msg.subject || ""} ${msg.bodyPreview || msg.body?.content || ""}`.toLowerCase()
          const threadId = msg.conversationId || msg.id
          const isInKeywordThread = keywordThreadIds.has(threadId)
          if (!matchesBusinessKeywords(combinedText) && !isInKeywordThread) {
            continue
          }
          payloads.push({
            user_id: userId,
            connection_id: conn.id,
            provider: providerId,
            direction: "received",
            from_address: msg.from?.emailAddress?.address || "",
            to_address: msg.toRecipients?.map((r: any) => r.emailAddress?.address).join(", ") || "",
            subject: msg.subject || "",
            body: msg.bodyPreview || msg.body?.content || "",
            html_body: msg.body?.contentType === "html" ? msg.body?.content : null,
            message_id: msg.id,
            message_id_header: msg.internetMessageId || null,
            thread_id: msg.conversationId || msg.id,
            read: msg.isRead || false,
            received_at: msg.receivedDateTime || new Date().toISOString(),
          })
        }

        const { data: inserted } = await supabase
          .from("email_messages")
          .insert(payloads)
          .select()

        if (inserted) results.push(...inserted)
      }

    } else {
      // ── IMAP path (manual / custom providers) ──
      console.log(`[IMAP FETCH] Provider=${providerId} — entering IMAP path`)
      if (!conn.imap_host || !conn.imap_port || !conn.smtp_user || !conn.smtp_pass) {
        console.warn(`[IMAP FETCH] Incomplete IMAP credentials: imap_host=${!!conn.imap_host} imap_port=${!!conn.imap_port} user=${!!conn.smtp_user} pass=${!!conn.smtp_pass}`)
        return NextResponse.json({ error: "IMAP credentials incomplete" }, { status: 400 })
      }

      console.log(`[IMAP FETCH] Importing imap-simple and mailparser...`)
      const imaps = await import("imap-simple")
      const simpleParser = await import("mailparser")
      console.log(`[IMAP FETCH] Modules imported successfully`)

      const config = {
        imap: {
          user: conn.smtp_user, password: conn.smtp_pass,
          host: conn.imap_host, port: conn.imap_port,
          tls: true, tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      }
      console.log(`[IMAP FETCH] IMAP config: host=${config.imap.host} port=${config.imap.port} user=${config.imap.user} tls=true`)

      console.log(`[IMAP FETCH] Connecting to IMAP server...`)
      const connection = await imaps.connect(config)
      console.log(`[IMAP FETCH] IMAP connection established`)
      try {
        console.log(`[IMAP FETCH] Opening INBOX...`)
        await connection.openBox("INBOX")
        console.log(`[IMAP FETCH] INBOX opened`)
        // IMAP: search since 15 days before connection
        const imapDate = cutoffDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")

        // Search IMAP for messages matching business keywords (server-side filtering)
        // Also search for replies to existing keyword threads
        console.log(`[IMAP FETCH] Searching for messages with business keywords since ${imapDate}...`)
        const matchingUids = new Set<number>()

        // 1. Search by keywords
        for (const keyword of BUSINESS_KEYWORDS) {
          try {
            const results = await connection.search([["SINCE", imapDate], ["TEXT", keyword]], { bodies: "", struct: true })
            for (const msg of results) {
              if (msg.attributes?.uid) matchingUids.add(msg.attributes.uid)
            }
          } catch (e: any) {
            console.warn(`[IMAP FETCH] Keyword search "${keyword}" failed:`, e?.message)
          }
        }

        // 2. Fetch thread IDs of existing emails in DB for keyword thread matching
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body, message_id_header")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        const keywordMessageIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          const text = `${te.subject || ""} ${te.body || ""}`.toLowerCase()
          if (matchesBusinessKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
            if (te.message_id_header) keywordMessageIds.add(te.message_id_header)
          }
        }
        console.log(`[IMAP FETCH] Found ${keywordThreadIds.size} existing keyword threads, ${keywordMessageIds.size} message IDs`)

        // 3. Search for replies to keyword threads (by In-Reply-To / References headers)
        for (const msgId of Array.from(keywordMessageIds)) {
          const cleanId = msgId.replace(/[<>]/g, "")
          try {
            const results = await connection.search([["SINCE", imapDate], ["HEADER", "In-Reply-To", cleanId]], { bodies: "", struct: true })
            for (const msg of results) {
              if (msg.attributes?.uid) matchingUids.add(msg.attributes.uid)
            }
          } catch (e: any) {
            // Some IMAP servers don't support HEADER search — fallback to TEXT search on message ID
            try {
              const results = await connection.search([["SINCE", imapDate], ["TEXT", cleanId]], { bodies: "", struct: true })
              for (const msg of results) {
                if (msg.attributes?.uid) matchingUids.add(msg.attributes.uid)
              }
            } catch (e2: any) {
              console.warn(`[IMAP FETCH] Reply search for "${cleanId}" failed:`, e2?.message)
            }
          }
        }

        console.log(`[IMAP FETCH] Found ${matchingUids.size} unique messages (keywords + thread replies)`)

        if (matchingUids.size === 0) {
          console.log(`[IMAP FETCH] No matching messages, closing connection`)
          await connection.end()
          return NextResponse.json({ success: true, fetched: 0, messages: [], nextPageToken: null })
        }

        // Fetch full message bodies only for matching UIDs
        const fetchOptions = { bodies: [""], struct: true }
        const uidList = Array.from(matchingUids)

        // Limit to 50 messages per request to avoid Vercel timeout
        const MAX_MSGS = 50
        const uidsToFetch = uidList.slice(0, MAX_MSGS)
        if (uidList.length > MAX_MSGS) {
          console.log(`[IMAP FETCH] Limiting to first ${MAX_MSGS} of ${uidList.length} matching messages`)
        }

        console.log(`[IMAP FETCH] Fetching full bodies for ${uidsToFetch.length} messages...`)
        const messages = await connection.search([["UID", uidsToFetch.join(",")]], fetchOptions)
        console.log(`[IMAP FETCH] Retrieved ${messages.length} messages`)

        // Batch check existing messages in one query
        const allUids = messages.map((m: any) => m.attributes?.uid?.toString()).filter(Boolean)
        const { data: existingRows } = await supabase
          .from("email_messages").select("message_id")
          .eq("user_id", userId).eq("connection_id", conn.id)
          .in("message_id", allUids)
        const existingIds = new Set((existingRows || []).map((r: any) => r.message_id))

        const payloads: any[] = []
        for (const msg of messages) {
          const uid = msg.attributes?.uid?.toString()
          if (!uid) continue
          if (existingIds.has(uid)) {
            console.log(`[IMAP FETCH] Message uid=${uid} already exists, skipping`)
            continue
          }

          // Get the full raw message (bodies: [""] returns it under which: "")
          const raw = msg.parts.find((p: any) => p.which === "")
          if (!raw) {
            console.warn(`[IMAP FETCH] Skipping uid=${uid} — no raw body`)
            continue
          }

          console.log(`[IMAP FETCH] Parsing uid=${uid} with mailparser...`)
          const parsed = await simpleParser.simpleParser(raw.body)
          const from = parsed.from?.text || parsed.from?.value?.[0]?.address || ""
          const to = parsed.to?.text || parsed.to?.value?.map((v: any) => v.address).join(", ") || ""
          console.log(`[IMAP FETCH] Parsed: from="${from}" to="${to}" subject="${parsed.subject || "(no subject)"}"`)

          payloads.push({
            user_id: userId, connection_id: conn.id, provider: providerId,
            direction: "received", from_address: sanitizeText(from), to_address: sanitizeText(to),
            subject: sanitizeText(parsed.subject) || "", body: sanitizeText(parsed.text) || "",
            html_body: sanitizeText(parsed.html) || null,
            message_id: uid,
            thread_id: sanitizeText(parsed.inReplyTo) || uid,
            read: false,
            received_at: parsed.date?.toISOString() || new Date().toISOString(),
          })
        }

        if (payloads.length > 0) {
          console.log(`[IMAP FETCH] Batch inserting ${payloads.length} messages...`)
          const { data: inserted, error: insertErr } = await supabase
            .from("email_messages").insert(payloads).select()
          if (insertErr) {
            console.error(`[IMAP FETCH] Batch insert failed:`, insertErr.message)
          } else if (inserted) {
            console.log(`[IMAP FETCH] Inserted ${inserted.length} messages`)
            results.push(...inserted)
          }
        }

        console.log(`[IMAP FETCH] Closing IMAP connection...`)
        await connection.end()
        console.log(`[IMAP FETCH] IMAP connection closed`)
      } catch (imapErr: any) {
        console.error(`[IMAP FETCH] IMAP error:`, imapErr?.message, imapErr?.source, imapErr?.textCode)
        await connection.end().catch(() => {})
        throw imapErr
      }
    }

    return NextResponse.json({
      success: true, fetched: results.length, messages: results, nextPageToken,
    })
  } catch (err: any) {
    console.error("[EMAIL FETCH] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

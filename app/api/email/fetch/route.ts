import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

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
  "proposal", "invoice", "contract", "quote", "purchase order",
  "payment", "receipt", "agreement", "deal", "billing", "estimate",
  "refund", "opportunity", "sow", "rfp", "nda", "msa", "scope of work",
  "inquiry", "campaign", "marketing", "strategy", "meeting", "schedule",
  "consultation", "services", "partnership", "collaboration", "project",
  "pricing", "demo", "introduction", "follow up", "follow-up", "request",
  "question", "update", "report", "plan", "budget",
  // Extended — common professional/B2B subjects
  "platform", "solution", "service", "offer", "offering",
  "intelligence", "compliance", "sustainability", "integration",
  "onboarding", "implementation", "support", "subscription",
  "renewal", "upgrade", "pilot", "trial", "evaluation",
  "presentation", "webinar", "workshop", "training",
  "invite", "invitation", "podcast", "speaker", "guest",
  "re:", "fwd:", "fw:",
]

const EXCLUDED_SENDERS = [
  "linkedin.com", "noreply", "no-reply", "donotreply", "do-not-reply", "notifications", "jobs-noreply",
  "google.com", "facebook.com", "twitter.com", "instagram.com",
  "youtube.com", "github.com", "medium.com", "substack.com",
  "mailchimp.com", "sendgrid.net", "amazonses.com", "mailerlite.com",
  "convertkit.com", "aweber.com", "getresponse.com", "campaign-monitor.com",
  "stripe.com", "paypal.com", "shopify.com", "notion.so", "figma.com",
  "vercel.com", "netlify.com", "heroku.com", "github.io",
  "eventbrite.com", "meetup.com", "zoom.us", "calendly.com",
  "slack.com", "discord.com", "teams.microsoft.com",
  "newsletter", "digest", "weekly@", "daily@", "alerts@",
  "teamtailor-mail.com", "upwork.com", "talent.acquisition", "greenhouse.io",
  "lever.co", "workday.com", "smartrecruiters.com", "jobvite.com",
  "indeed.com", "glassdoor.com", "naukri.com", "glassdoor.com",
  "panin.co.id", "ePromo@", "promo@", "marketing@", "noreply.",
  "bcg.com", "bain.com", "mckinsey.com",
]

const NEWSLETTER_INDICATORS = [
  "unsubscribe", "manage preferences", "manage subscriptions",
  "view in browser", "view this email in your browser",
  "you're receiving this", "you are receiving this",
  "this email was sent to", "update your email preferences",
  "job alert", "new job alert", "application confirmation",
  "we have received your application", "thank you for your application",
  "thank you for your interest", "welcome to",
  "you have been invited to join", "you've been invited to join",
  "verify your email", "confirm your email", "verification code",
  "your account has been", "sign in to your account",
  "diskon", "promo", "kepada yth",
]

function isExcludedSender(fromAddress: string): boolean {
  const lower = (fromAddress || "").toLowerCase()
  return EXCLUDED_SENDERS.some(s => lower.includes(s))
}

function isNewsletter(body: string, headers: any[]): boolean {
  const listUnsub = headers.find((h: any) => h.name?.toLowerCase() === "list-unsubscribe")
  if (listUnsub) return true
  const lower = (body || "").toLowerCase()
  return NEWSLETTER_INDICATORS.some(ind => lower.includes(ind))
}

function matchesBusinessKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  const matched = BUSINESS_KEYWORDS.filter(k => {
    if (k.includes(" ")) return lower.includes(k)
    return new RegExp(`\\b${k}\\b`).test(lower)
  })
  return matched.length > 0
}

function getMatchedKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return BUSINESS_KEYWORDS.filter(k => {
    if (k.includes(" ")) return lower.includes(k)
    return new RegExp(`\\b${k}\\b`).test(lower)
  })
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

async function getKnownContactEmails(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("contacts")
    .select("email")
    .eq("user_id", userId)
    .not("email", "is", null)
  const set = new Set<string>()
  for (const c of data || []) {
    if (c.email) set.add(c.email.toLowerCase().trim())
  }
  return set
}

async function getUserKeywords(userId: string): Promise<string[] | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email_keywords")
    .eq("user_id", userId)
    .maybeSingle()
  const kw = data?.email_keywords
  if (!kw || !Array.isArray(kw) || kw.length === 0) return null
  return kw.map((k: string) => k.toLowerCase().trim()).filter(Boolean)
}

function extractEmail(address: string): string {
  const m = address.match(/<([^>]+)>/)
  return (m ? m[1] : address).toLowerCase().trim()
}

async function _POST(req: NextRequest) {
  try {
    const { userId, providerId, pageToken, since } = await req.json()
    if (!userId || !providerId) {
      return NextResponse.json({ error: "Missing userId or providerId" }, { status: 400 })
    }

    // Pre-load known CRM contacts so their emails always pass the keyword filter
    const knownContactEmails = await getKnownContactEmails(userId)

    // Load user's custom keywords; if set, they replace BUSINESS_KEYWORDS
    const userKeywords = await getUserKeywords(userId)
    const activeKeywords = userKeywords || BUSINESS_KEYWORDS
    const matchesKeywords = (text: string) => {
      const lower = text.toLowerCase()
      return activeKeywords.some(k => {
        if (k.includes(" ")) return lower.includes(k)
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
      })
    }
    const getMatchedKw = (text: string) => {
      const lower = text.toLowerCase()
      return activeKeywords.filter(k => {
        if (k.includes(" ")) return lower.includes(k)
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
      })
    }
    if (userKeywords) {
      console.log(`[EMAIL FETCH] Using ${userKeywords.length} custom user keywords:`, userKeywords.slice(0, 10))
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

    // Use 'since' for incremental fetch, falling back to 15 days from today.
    let cutoffDate: Date
    if (since) {
      cutoffDate = new Date(since)
    } else {
      cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 15)
    }
    const afterTimestamp = Math.floor(cutoffDate.getTime() / 1000)
    const cutoffISO = cutoffDate.toISOString()

    const results: any[] = []
    const droppedEmails: any[] = []
    let nextPageToken: string | null = null

    // ── OAuth path ──
    if (conn.oauth_provider && conn.access_token) {
      const accessToken = await refreshIfNeeded(conn)

      if (conn.oauth_provider === "google") {
        console.log(`[EMAIL FETCH] ${since ? `Incremental fetch since ${cutoffISO}` : `Full 15-day fetch from ${cutoffISO}`}`)
        // Fetch via Gmail API with pagination + 15-day window (keyword filter applied client-side below)
        const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : ""
        const qParam = encodeURIComponent(`after:${afterTimestamp} -in:trash -in:spam -in:junk -in:sent`)
        let listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${qParam}${pageTokenParam}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        let listData = await listRes.json()
        if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed")

        let allMessageIds = (listData.messages || []).map((m: any) => m.id)
        let currentNextPageToken = listData.nextPageToken || null

        // Paginate to get all emails in the window (up to 500 total)
        let paginationGuard = 0
        while (currentNextPageToken && allMessageIds.length < 500 && paginationGuard < 5) {
          paginationGuard++
          const pageRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${qParam}&pageToken=${currentNextPageToken}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const pageData = await pageRes.json()
          if (!pageRes.ok) break
          allMessageIds.push(...(pageData.messages || []).map((m: any) => m.id))
          currentNextPageToken = pageData.nextPageToken || null
        }

        nextPageToken = currentNextPageToken
        const messageIds = allMessageIds
        console.log(`[EMAIL FETCH] Gmail returned ${messageIds.length} messages. since=${since || "none"}, cutoff=${cutoffISO}`)
        if (messageIds.length === 0) {
          // No new received emails, but still fetch sent emails for tracked threads
          console.log(`[SENT FETCH] No received emails from Gmail, checking sent emails...`)
          const { data: existingThreadEmails } = await supabase
            .from("email_messages")
            .select("thread_id, subject, body, direction")
            .eq("user_id", userId)
            .eq("connection_id", conn.id)
            .not("thread_id", "is", null)
          console.log(`[SENT FETCH] existingThreadEmails: ${existingThreadEmails?.length || 0} rows`)

          if (existingThreadEmails && existingThreadEmails.length > 0) {
            const trackedThreadIds = new Set(existingThreadEmails.map((te: any) => te.thread_id).filter(Boolean))
            console.log(`[SENT FETCH] trackedThreadIds (${trackedThreadIds.size}):`, Array.from(trackedThreadIds).slice(0, 10))
            const sentCutoffDate = new Date()
            sentCutoffDate.setDate(sentCutoffDate.getDate() - 15)
            const sentAfterTimestamp = Math.floor(sentCutoffDate.getTime() / 1000)
            const sentQParam = encodeURIComponent(`after:${sentAfterTimestamp} in:sent`)
            const sentListRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${sentQParam}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            const sentListData = await sentListRes.json()
            const sentResults: any[] = []
            if (sentListRes.ok && sentListData.messages) {
              const sentMessageIds = sentListData.messages.map((m: any) => m.id)
              console.log(`[SENT FETCH] Gmail returned ${sentMessageIds.length} sent emails`)
              const { data: existingSentRows } = await supabase
                .from("email_messages")
                .select("message_id")
                .eq("user_id", userId)
                .eq("connection_id", conn.id)
                .in("message_id", sentMessageIds)
              const existingSentIds = new Set((existingSentRows || []).map((r: any) => r.message_id))
              const newSentIds = sentMessageIds.filter((id: string) => !existingSentIds.has(id))
              console.log(`[SENT FETCH] ${newSentIds.length} new sent emails to check (after filtering ${existingSentIds.size} existing)`)

              if (newSentIds.length > 0) {
                const sentDetails: (any | null)[] = []
                for (let i = 0; i < newSentIds.length; i += 8) {
                  const batch = newSentIds.slice(i, i + 8)
                  const batchResults = await Promise.allSettled(
                    batch.map((id: string) =>
                      fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                      ).then(r => r.ok ? r.json() : null)
                    )
                  )
                  for (const r of batchResults) {
                    sentDetails.push(r.status === "fulfilled" ? r.value : null)
                  }
                }

                const sentPayloads: any[] = []
                for (const d of sentDetails) {
                  if (!d) continue
                  const threadId = d.threadId || d.id
                  const subj = (d.payload?.headers || []).find((h: any) => h.name === "Subject")?.value || "(no subject)"
                  console.log(`[SENT FETCH] IMPORT thread_id=${threadId} — subject="${subj}"`)

                  const headers = d.payload?.headers || []
                  const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ""

                  let sentBody = ""
                  let sentHtml = ""
                  const sentAttachments: any[] = []
                  const traverseSent = (parts: any[]) => {
                    for (const part of parts || []) {
                      if (part.mimeType === "text/plain" && part.body?.data) {
                        sentBody = Buffer.from(part.body.data, "base64url").toString("utf-8")
                      } else if (part.mimeType === "text/html" && part.body?.data) {
                        sentHtml = Buffer.from(part.body.data, "base64url").toString("utf-8")
                      } else if (part.parts) { traverseSent(part.parts) }
                      if (part.filename && part.body?.attachmentId && part.mimeType?.startsWith("image/")) {
                        sentAttachments.push({
                          filename: part.filename,
                          mimeType: part.mimeType,
                          size: part.body.size || 0,
                          attachmentId: part.body.attachmentId,
                          messageId: d.id,
                        })
                      }
                    }
                  }
                  if (d.payload?.parts) traverseSent(d.payload.parts)
                  else if (d.payload?.body?.data) {
                    sentBody = Buffer.from(d.payload.body.data, "base64url").toString("utf-8")
                  }

                  for (const att of sentAttachments) {
                    try {
                      const attRes = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${att.messageId}/attachments/${att.attachmentId}`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                      )
                      const attData = await attRes.json()
                      if (attRes.ok && attData.data) {
                        att.data = attData.data || ""
                        delete att.attachmentId
                        delete att.messageId
                      }
                    } catch (e) {
                      console.error(`[EMAIL FETCH] Failed to fetch sent attachment ${att.filename}:`, e)
                    }
                  }

                  sentPayloads.push({
                    user_id: userId,
                    connection_id: conn.id,
                    provider: providerId,
                    direction: "sent",
                    from_address: getHeader("From"),
                    to_address: getHeader("To"),
                    subject: getHeader("Subject"),
                    body: sentBody || sentHtml,
                    html_body: sentHtml || null,
                    message_id: d.id,
                    message_id_header: getHeader("Message-ID") || null,
                    thread_id: threadId,
                    read: true,
                    sent_at: new Date(parseInt(d.internalDate)).toISOString(),
                    attachments: sentAttachments.length > 0 ? sentAttachments : [],
                  })
                }

                if (sentPayloads.length > 0) {
                  const { data: sentInserted } = await supabase
                    .from("email_messages")
                    .upsert(sentPayloads, { onConflict: "message_id,connection_id" })
                    .select()
                  if (sentInserted) sentResults.push(...sentInserted)
                  console.log(`[EMAIL FETCH] Imported ${sentPayloads.length} sent emails (0 received path)`)
                }
              }
            }
            return NextResponse.json({ success: true, fetched: sentResults.length, messages: sentResults, dropped: [], dateRange: { from: cutoffISO, to: new Date().toISOString() }, nextPageToken })
          }
          return NextResponse.json({ success: true, fetched: 0, messages: [], dropped: [], dateRange: { from: cutoffISO, to: new Date().toISOString() }, nextPageToken })
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
        const skippedIds = messageIds.filter((id: string) => existingIds.has(id))
        console.log(`[EMAIL FETCH] ${newIds.length} new, ${skippedIds.length} already imported`)

        // Fetch details of already-imported emails for the modal display + sync read status
        if (skippedIds.length > 0) {
          const { data: skippedDetails } = await supabase
            .from("email_messages")
            .select("subject, from_address, received_at, read, message_id")
            .eq("user_id", userId)
            .eq("connection_id", conn.id)
            .in("message_id", skippedIds)
          for (const d of (skippedDetails || [])) {
            droppedEmails.push({ subject: d.subject || "(No subject)", from: d.from_address || "Unknown", reason: "already imported", date: d.received_at || null })
          }

          // Sync read status from Gmail for skipped emails (batch fetch labelIds)
          const toCheck = (skippedDetails || []).filter((d: any) => d.read === false)
          if (toCheck.length > 0) {
            const readUpdates: any[] = []
            for (const d of toCheck) {
              try {
                const detailRes = await fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${d.message_id}?format=minimal`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                )
                if (detailRes.ok) {
                  const detail = await detailRes.json()
                  const isUnread = (detail.labelIds || []).includes("UNREAD")
                  if (!isUnread) {
                    readUpdates.push(d.message_id)
                  }
                }
              } catch { /* ignore individual failures */ }
            }
            if (readUpdates.length > 0) {
              await supabase
                .from("email_messages")
                .update({ read: true })
                .eq("user_id", userId)
                .eq("connection_id", conn.id)
                .in("message_id", readUpdates)
              console.log(`[EMAIL FETCH] Synced read status for ${readUpdates.length} emails`)
            }
          }
        }

        if (newIds.length === 0) {
          console.log(`[SENT FETCH] No new received emails, checking sent emails for tracked threads...`)
          // Even with no new received emails, still fetch sent emails for tracked threads
          const { data: existingThreadEmails } = await supabase
            .from("email_messages")
            .select("thread_id, subject, body, direction")
            .eq("user_id", userId)
            .eq("connection_id", conn.id)
            .not("thread_id", "is", null)
          console.log(`[SENT FETCH] existingThreadEmails: ${existingThreadEmails?.length || 0} rows`)

          if (existingThreadEmails && existingThreadEmails.length > 0) {
            const trackedThreadIds = new Set(existingThreadEmails.map((te: any) => te.thread_id).filter(Boolean))
            console.log(`[SENT FETCH] trackedThreadIds (${trackedThreadIds.size}):`, Array.from(trackedThreadIds).slice(0, 10))
            const sentCutoffDate = new Date()
            sentCutoffDate.setDate(sentCutoffDate.getDate() - 15)
            const sentAfterTimestamp = Math.floor(sentCutoffDate.getTime() / 1000)
            const sentQParam = encodeURIComponent(`after:${sentAfterTimestamp} in:sent`)
            const sentListRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${sentQParam}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            const sentListData = await sentListRes.json()
            if (sentListRes.ok && sentListData.messages) {
              const sentMessageIds = sentListData.messages.map((m: any) => m.id)
              console.log(`[SENT FETCH] Gmail returned ${sentMessageIds.length} sent emails`)
              const { data: existingSentRows } = await supabase
                .from("email_messages")
                .select("message_id")
                .eq("user_id", userId)
                .eq("connection_id", conn.id)
                .in("message_id", sentMessageIds)
              const existingSentIds = new Set((existingSentRows || []).map((r: any) => r.message_id))
              const newSentIds = sentMessageIds.filter((id: string) => !existingSentIds.has(id))
              console.log(`[SENT FETCH] ${newSentIds.length} new sent emails to check (after filtering ${existingSentIds.size} existing)`)

              if (newSentIds.length > 0) {
                const sentDetails: (any | null)[] = []
                for (let i = 0; i < newSentIds.length; i += 8) {
                  const batch = newSentIds.slice(i, i + 8)
                  const batchResults = await Promise.allSettled(
                    batch.map((id: string) =>
                      fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                      ).then(r => r.ok ? r.json() : null)
                    )
                  )
                  for (const r of batchResults) {
                    sentDetails.push(r.status === "fulfilled" ? r.value : null)
                  }
                }

                const sentPayloads: any[] = []
                for (const d of sentDetails) {
                  if (!d) continue
                  const threadId = d.threadId || d.id
                  const subj = (d.payload?.headers || []).find((h: any) => h.name === "Subject")?.value || "(no subject)"
                  console.log(`[SENT FETCH] IMPORT thread_id=${threadId} — subject="${subj}"`)

                  const headers = d.payload?.headers || []
                  const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ""

                  let sentBody = ""
                  let sentHtml = ""
                  const sentAttachments: any[] = []
                  const traverseSent = (parts: any[]) => {
                    for (const part of parts || []) {
                      if (part.mimeType === "text/plain" && part.body?.data) {
                        sentBody = Buffer.from(part.body.data, "base64url").toString("utf-8")
                      } else if (part.mimeType === "text/html" && part.body?.data) {
                        sentHtml = Buffer.from(part.body.data, "base64url").toString("utf-8")
                      } else if (part.parts) { traverseSent(part.parts) }
                      if (part.filename && part.body?.attachmentId && part.mimeType?.startsWith("image/")) {
                        sentAttachments.push({
                          filename: part.filename,
                          mimeType: part.mimeType,
                          size: part.body.size || 0,
                          attachmentId: part.body.attachmentId,
                          messageId: d.id,
                        })
                      }
                    }
                  }
                  if (d.payload?.parts) traverseSent(d.payload.parts)
                  else if (d.payload?.body?.data) {
                    sentBody = Buffer.from(d.payload.body.data, "base64url").toString("utf-8")
                  }

                  for (const att of sentAttachments) {
                    try {
                      const attRes = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${att.messageId}/attachments/${att.attachmentId}`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                      )
                      const attData = await attRes.json()
                      if (attRes.ok && attData.data) {
                        att.data = attData.data || ""
                        delete att.attachmentId
                        delete att.messageId
                      }
                    } catch (e) {
                      console.error(`[EMAIL FETCH] Failed to fetch sent attachment ${att.filename}:`, e)
                    }
                  }

                  sentPayloads.push({
                    user_id: userId,
                    connection_id: conn.id,
                    provider: providerId,
                    direction: "sent",
                    from_address: getHeader("From"),
                    to_address: getHeader("To"),
                    subject: getHeader("Subject"),
                    body: sentBody || sentHtml,
                    html_body: sentHtml || null,
                    message_id: d.id,
                    message_id_header: getHeader("Message-ID") || null,
                    thread_id: threadId,
                    read: true,
                    sent_at: new Date(parseInt(d.internalDate)).toISOString(),
                    attachments: sentAttachments.length > 0 ? sentAttachments : [],
                  })
                }

                if (sentPayloads.length > 0) {
                  const { data: sentInserted } = await supabase
                    .from("email_messages")
                    .upsert(sentPayloads, { onConflict: "message_id,connection_id" })
                    .select()
                  if (sentInserted) results.push(...sentInserted)
                  console.log(`[EMAIL FETCH] Imported ${sentPayloads.length} sent emails (no new received path)`)
                }
              }
            }
          }

          return NextResponse.json({ success: true, fetched: results.length, messages: results, dropped: droppedEmails, dateRange: { from: cutoffISO, to: new Date().toISOString() }, nextPageToken })
        }

        // Fetch thread IDs of existing emails in DB so we can match replies to keyword threads + sent emails
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body, direction")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        const sentThreadIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          // Always capture replies to emails we sent
          if (te.direction === "sent") {
            sentThreadIds.add(te.thread_id)
          }
          // Also capture threads with business keywords
          const text = `${te.subject || ""}`.toLowerCase()
          if (matchesKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
          }
        }
        console.log(`[EMAIL FETCH] Found ${keywordThreadIds.size} keyword threads, ${sentThreadIds.size} sent threads`)

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
          const attachments: any[] = []
          const traverse = (parts: any[]) => {
            for (const part of parts || []) {
              if (part.mimeType === "text/plain" && part.body?.data) {
                body = Buffer.from(part.body.data, "base64url").toString("utf-8")
              } else if (part.mimeType === "text/html" && part.body?.data) {
                html = Buffer.from(part.body.data, "base64url").toString("utf-8")
              } else if (part.parts) { traverse(part.parts) }
              // Collect image attachments
              if (part.filename && part.body?.attachmentId && part.mimeType?.startsWith("image/")) {
                attachments.push({
                  filename: part.filename,
                  mimeType: part.mimeType,
                  size: part.body.size || 0,
                  attachmentId: part.body.attachmentId,
                  messageId: d.id,
                })
              }
            }
          }
          if (d.payload?.parts) traverse(d.payload.parts)
          else if (d.payload?.body?.data) {
            body = Buffer.from(d.payload.body.data, "base64url").toString("utf-8")
          }

          // Fetch actual attachment data for images
          for (const att of attachments) {
            try {
              const attRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${att.messageId}/attachments/${att.attachmentId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              if (attRes.ok) {
                const attData = await attRes.json()
                att.data = attData.data || ""
                delete att.attachmentId
                delete att.messageId
                console.log(`[EMAIL FETCH] Retrieved attachment: ${att.filename} (${att.mimeType}, ${att.size} bytes)`)
              }
            } catch (e) {
              console.error(`[EMAIL FETCH] Failed to fetch attachment ${att.filename}:`, e)
            }
          }

          const subject = getHeader("Subject")
          const fromAddress = getHeader("From")
          const senderEmail = extractEmail(fromAddress)
          const isKnownContact = knownContactEmails.has(senderEmail)
          const userEmail = (conn.email_address || conn.smtp_user || "").toLowerCase()
          if (userEmail && senderEmail.toLowerCase() === userEmail) {
            console.log(`[EMAIL FILTER] SKIPPED (own sent email): subject="${subject}"`)
            continue
          }
          // If user has custom keywords and subject matches → always keep (user explicitly opted in)
          const matchedKeywords = getMatchedKw(subject)
          const customKeywordMatch = userKeywords && matchedKeywords.length > 0
          if (!customKeywordMatch) {
            if (isExcludedSender(fromAddress)) {
              console.log(`[EMAIL FILTER] DROPPED (excluded sender): from="${fromAddress}" subject="${subject}"`)
              droppedEmails.push({ subject, from: fromAddress, reason: "excluded sender", date: new Date(parseInt(d.internalDate)).toISOString() })
              continue
            }
            if (isNewsletter(body || html, headers)) {
              console.log(`[EMAIL FILTER] DROPPED (newsletter): from="${fromAddress}" subject="${subject}"`)
              droppedEmails.push({ subject, from: fromAddress, reason: "newsletter", date: new Date(parseInt(d.internalDate)).toISOString() })
              continue
            }
          }
          if (!isKnownContact && matchedKeywords.length === 0) {
            console.log(`[EMAIL FILTER] DROPPED (no keyword match): subject="${subject}"`)
            droppedEmails.push({ subject, from: fromAddress, reason: "no keyword match", date: new Date(parseInt(d.internalDate)).toISOString() })
            continue
          }
          console.log(`[EMAIL FILTER] KEPT: subject="${subject}" knownContact=${isKnownContact} customKeyword=${customKeywordMatch} matchedKeywords=[${matchedKeywords.join(", ")}]`)

          payloads.push({
            user_id: userId,
            connection_id: conn.id,
            provider: providerId,
            direction: "received",
            from_address: getHeader("From"),
            to_address: getHeader("To"),
            cc_address: getHeader("Cc") || null,
            subject: subject,
            body: body || html,
            html_body: html || null,
            message_id: d.id,
            message_id_header: getHeader("Message-ID") || null,
            thread_id: d.threadId || d.id,
            read: !(d.labelIds || []).includes("UNREAD"),
            received_at: new Date(parseInt(d.internalDate)).toISOString(),
            attachments: attachments.length > 0 ? attachments : [],
          })
        }

        if (payloads.length > 0) {
          const { data: inserted } = await supabase
            .from("email_messages")
            .upsert(payloads, { onConflict: "message_id,connection_id" })
            .select()
          if (inserted) results.push(...inserted)
        }

        // ── Fetch sent emails from Gmail Sent folder ──
        // Fetch sent emails that share a thread_id with existing or newly imported emails
        if ((existingThreadEmails && existingThreadEmails.length > 0) || payloads.length > 0) {
          // Include thread_ids from existing + newly imported received emails
          const trackedThreadIds = new Set((existingThreadEmails || []).map((te: any) => te.thread_id).filter(Boolean))
          for (const p of payloads) {
            if (p.thread_id) trackedThreadIds.add(p.thread_id)
          }
          // Use 15-day window for sent emails (not incremental cutoff) since sent replies
          // may be older than last_fetched_at but still belong to tracked threads
          const sentCutoffDate = new Date()
          sentCutoffDate.setDate(sentCutoffDate.getDate() - 15)
          const sentAfterTimestamp = Math.floor(sentCutoffDate.getTime() / 1000)
          const sentQParam = encodeURIComponent(`after:${sentAfterTimestamp} in:sent`)
          const sentListRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${sentQParam}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const sentListData = await sentListRes.json()
          if (sentListRes.ok && sentListData.messages) {
            const sentMessageIds = sentListData.messages.map((m: any) => m.id)
            // Filter out already-stored sent emails
            const { data: existingSentRows } = await supabase
              .from("email_messages")
              .select("message_id")
              .eq("user_id", userId)
              .eq("connection_id", conn.id)
              .in("message_id", sentMessageIds)
            const existingSentIds = new Set((existingSentRows || []).map((r: any) => r.message_id))
            const newSentIds = sentMessageIds.filter((id: string) => !existingSentIds.has(id))

            if (newSentIds.length > 0) {
              // Fetch sent email details in batches
              const sentDetails: (any | null)[] = []
              for (let i = 0; i < newSentIds.length; i += 8) {
                const batch = newSentIds.slice(i, i + 8)
                const batchResults = await Promise.allSettled(
                  batch.map((id: string) =>
                    fetch(
                      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                      { headers: { Authorization: `Bearer ${accessToken}` } }
                    ).then(r => r.ok ? r.json() : null)
                  )
                )
                for (const r of batchResults) {
                  sentDetails.push(r.status === "fulfilled" ? r.value : null)
                }
              }

              const sentPayloads: any[] = []
              for (const d of sentDetails) {
                if (!d) continue
                const threadId = d.threadId || d.id
                // Only import sent emails that belong to a tracked thread
                if (!trackedThreadIds.has(threadId)) continue

                const headers = d.payload?.headers || []
                const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ""

                let sentBody = ""
                let sentHtml = ""
                const sentAttachments: any[] = []
                const traverseSent = (parts: any[]) => {
                  for (const part of parts || []) {
                    if (part.mimeType === "text/plain" && part.body?.data) {
                      sentBody = Buffer.from(part.body.data, "base64url").toString("utf-8")
                    } else if (part.mimeType === "text/html" && part.body?.data) {
                      sentHtml = Buffer.from(part.body.data, "base64url").toString("utf-8")
                    } else if (part.parts) { traverseSent(part.parts) }
                    if (part.filename && part.body?.attachmentId && part.mimeType?.startsWith("image/")) {
                      sentAttachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType,
                        size: part.body.size || 0,
                        attachmentId: part.body.attachmentId,
                        messageId: d.id,
                      })
                    }
                  }
                }
                if (d.payload?.parts) traverseSent(d.payload.parts)
                else if (d.payload?.body?.data) {
                  sentBody = Buffer.from(d.payload.body.data, "base64url").toString("utf-8")
                }

                // Fetch actual attachment data for images
                for (const att of sentAttachments) {
                  try {
                    const attRes = await fetch(
                      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${att.messageId}/attachments/${att.attachmentId}`,
                      { headers: { Authorization: `Bearer ${accessToken}` } }
                    )
                    if (attRes.ok) {
                      const attData = await attRes.json()
                      att.data = attData.data || ""
                      delete att.attachmentId
                      delete att.messageId
                      console.log(`[EMAIL FETCH] Retrieved sent attachment: ${att.filename} (${att.mimeType}, ${att.size} bytes)`)
                    }
                  } catch (e) {
                    console.error(`[EMAIL FETCH] Failed to fetch sent attachment ${att.filename}:`, e)
                  }
                }

                sentPayloads.push({
                  user_id: userId,
                  connection_id: conn.id,
                  provider: providerId,
                  direction: "sent",
                  from_address: getHeader("From"),
                  to_address: getHeader("To"),
                  subject: getHeader("Subject"),
                  body: sentBody || sentHtml,
                  html_body: sentHtml || null,
                  message_id: d.id,
                  message_id_header: getHeader("Message-ID") || null,
                  thread_id: threadId,
                  read: true,
                  sent_at: new Date(parseInt(d.internalDate)).toISOString(),
                  attachments: sentAttachments.length > 0 ? sentAttachments : [],
                })
              }

              if (sentPayloads.length > 0) {
                const { data: sentInserted } = await supabase
                  .from("email_messages")
                  .upsert(sentPayloads, { onConflict: "message_id,connection_id" })
                  .select()
                if (sentInserted) results.push(...sentInserted)
                console.log(`[EMAIL FETCH] Imported ${sentPayloads.length} sent emails from Gmail Sent folder`)
              }
            }
          }
        }

      } else if (conn.oauth_provider === "microsoft") {
        // Debug: list folders first to see what's available
        const folderRes = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders", { headers: { Authorization: `Bearer ${accessToken}` } })
        const folderData = await folderRes.json()
        console.log(`[EMAIL FETCH] Folders: ${folderData.value?.map((f: any) => `${f.displayName}(${f.totalItemCount})`).join(", ") || "none"}`)

        // Fetch via Microsoft Graph — Inbox folder only, excludes junk/deleted at the API level
        const baseUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=50&$filter=receivedDateTime ge ${cutoffISO}&$orderby=receivedDateTime desc`
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

        // Fetch thread IDs of existing emails in DB for keyword + sent thread matching
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body, direction")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        const sentThreadIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          if (te.direction === "sent") {
            sentThreadIds.add(te.thread_id)
          }
          const text = `${te.subject || ""}`.toLowerCase()
          if (matchesKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
          }
        }
        console.log(`[EMAIL FETCH] Microsoft: Found ${keywordThreadIds.size} keyword threads, ${sentThreadIds.size} sent threads`)

        const payloads: any[] = []
        for (const msg of newMsgs) {
          const fromAddr = msg.from?.emailAddress?.address || ""
          const msgSubject = msg.subject || ""
          const senderEmail = extractEmail(fromAddr)
          const isKnownContact = knownContactEmails.has(senderEmail)
          const userEmail = (conn.email_address || conn.smtp_user || "").toLowerCase()
          if (userEmail && senderEmail.toLowerCase() === userEmail) {
            console.log(`[EMAIL FILTER] SKIPPED (own sent email): subject="${msgSubject}"`)
            continue
          }
          // If user has custom keywords and subject matches → always keep
          const matchedKeywords = getMatchedKw(msgSubject)
          const customKeywordMatch = userKeywords && matchedKeywords.length > 0
          const msgBody = msg.bodyPreview || msg.body?.content || ""
          if (!customKeywordMatch) {
            if (isExcludedSender(fromAddr)) {
              console.log(`[EMAIL FILTER] DROPPED (excluded sender): from="${fromAddr}" subject="${msgSubject}"`)
              continue
            }
            if (isNewsletter(msgBody, [])) {
              console.log(`[EMAIL FILTER] DROPPED (newsletter): from="${fromAddr}" subject="${msgSubject}"`)
              continue
            }
          }
          if (!isKnownContact && matchedKeywords.length === 0) {
            console.log(`[EMAIL FILTER] DROPPED (no keyword match): subject="${msgSubject}"`)
            continue
          }
          console.log(`[EMAIL FILTER] KEPT: subject="${msgSubject}" knownContact=${isKnownContact} customKeyword=${customKeywordMatch} matchedKeywords=[${matchedKeywords.join(", ")}]`)
          payloads.push({
            user_id: userId,
            connection_id: conn.id,
            provider: providerId,
            direction: "received",
            from_address: msg.from?.emailAddress?.address || "",
            to_address: msg.toRecipients?.map((r: any) => r.emailAddress?.address).join(", ") || "",
            cc_address: msg.ccRecipients?.map((r: any) => r.emailAddress?.address).join(", ") || null,
            subject: msg.subject || "",
            body: msgBody,
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
            const results = await connection.search([["SINCE", imapDate], ["SUBJECT", keyword]], { bodies: "", struct: true })
            if (results.length > 0) {
              console.log(`[IMAP FETCH] Keyword "${keyword}" matched ${results.length} messages`)
              for (const msg of results) {
                if (msg.attributes?.uid) matchingUids.add(msg.attributes.uid)
              }
            }
          } catch (e: any) {
            console.warn(`[IMAP FETCH] Keyword search "${keyword}" failed:`, e?.message)
          }
        }

        // Log total emails in inbox for context + collect dropped emails for modal
        try {
          const allMsgs = await connection.search([["SINCE", imapDate]], { bodies: "", struct: true })
          console.log(`[IMAP FETCH] Total emails in INBOX since ${imapDate}: ${allMsgs.length}, matched: ${matchingUids.size}, dropped: ${allMsgs.length - matchingUids.size}`)
          for (const msg of allMsgs) {
            const uid = msg.attributes?.uid
            if (!matchingUids.has(uid)) {
              const raw = msg.parts?.find((p: any) => p.which === "")
              let subject = "(unknown)"
              let from = "Unknown"
              let date = null
              if (raw) {
                try {
                  const parsed = await simpleParser.simpleParser(raw.body)
                  subject = parsed.subject || "(no subject)"
                  from = parsed.from?.text || parsed.from?.value?.[0]?.address || "Unknown"
                  date = parsed.date?.toISOString() || null
                } catch {}
              }
              console.log(`[IMAP FETCH] DROPPED uid=${uid} — subject="${subject}"`)
              droppedEmails.push({ subject, from, reason: "no keyword match", date })
            }
          }
        } catch (e: any) {
          console.warn(`[IMAP FETCH] Could not fetch all messages for drop logging:`, e?.message)
        }

        // 2. Fetch thread IDs of existing emails in DB for keyword + sent thread matching
        const { data: existingThreadEmails } = await supabase
          .from("email_messages")
          .select("thread_id, subject, body, message_id_header, direction")
          .eq("user_id", userId)
          .eq("connection_id", conn.id)
          .not("thread_id", "is", null)
        const keywordThreadIds = new Set<string>()
        const keywordMessageIds = new Set<string>()
        const sentMessageIds = new Set<string>()
        for (const te of existingThreadEmails || []) {
          if (te.direction === "sent") {
            if (te.message_id_header) sentMessageIds.add(te.message_id_header)
          }
          const text = `${te.subject || ""}`.toLowerCase()
          if (matchesBusinessKeywords(text)) {
            keywordThreadIds.add(te.thread_id)
            if (te.message_id_header) keywordMessageIds.add(te.message_id_header)
          }
        }
        console.log(`[IMAP FETCH] Found ${keywordThreadIds.size} keyword threads, ${keywordMessageIds.size} keyword msg IDs, ${sentMessageIds.size} sent msg IDs`)

        // 3. Search for replies to keyword threads only (by In-Reply-To / References headers)
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
        const messages: any[] = []
        for (const uid of uidsToFetch) {
          try {
            const results = await connection.search([["UID", String(uid)]], fetchOptions)
            for (const m of results) {
              if (m.attributes?.uid === uid) messages.push(m)
            }
          } catch (e: any) {
            console.warn(`[IMAP FETCH] Failed to fetch uid=${uid}:`, e?.message)
          }
        }
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
            read: raw.flags?.includes("\\Seen") || false,
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

    // Update last_fetched_at on the connection
    const nowISO = new Date().toISOString()
    const { error: updateErr } = await supabase.from("email_connections").update({ last_fetched_at: nowISO }).eq("id", conn.id)
    if (updateErr) console.error("[EMAIL FETCH] Failed to update last_fetched_at:", updateErr.message)
    else console.log("[EMAIL FETCH] Updated last_fetched_at to", nowISO, "for connection", conn.id)

    return NextResponse.json({
      success: true,
      fetched: results.length,
      messages: results,
      dropped: droppedEmails,
      dateRange: { from: cutoffISO, to: nowISO },
      nextPageToken,
    })
  } catch (err: any) {
    console.error("[EMAIL FETCH] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

export const POST = withApiLogging(_POST, "/api/email/fetch")

import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshIfNeeded(conn: any): Promise<string> {
  // If token not expired, return current access_token
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
  } else {
    throw new Error("Unknown oauth_provider")
  }

  const data = await tokenRes.json()
  if (!tokenRes.ok) throw new Error(data.error_description || data.error || "Token refresh failed")

  const newAccess = data.access_token
  const expiresIn = data.expires_in || 3600
  const newExpires = new Date(Date.now() + expiresIn * 1000).toISOString()

  // Update DB
  await supabase
    .from("email_connections")
    .update({ access_token: newAccess, token_expires_at: newExpires })
    .eq("id", conn.id)

  return newAccess
}

export async function POST(req: NextRequest) {
  try {
    const { userId, providerId, to, cc, subject, body, html, threadId: clientThreadId, originalMessageId } = await req.json()
    let threadId = clientThreadId || null
    if (!userId || !providerId || !to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Build headers for threading
    const replyHeaders: string[] = []
    if (originalMessageId) {
      replyHeaders.push(`In-Reply-To: <${originalMessageId}>`)
      replyHeaders.push(`References: <${originalMessageId}>`)
    }

    // Fetch the email connection
    const { data: conn, error } = await supabase
      .from("email_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", providerId)
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "Email connection not found" }, { status: 404 })
    }

    // Fetch user profile for sender display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", userId)
      .maybeSingle()
    const senderName = profile?.company_name || profile?.full_name || conn.email_address || conn.smtp_user

    let messageId = ""

    // ── OAuth path (Gmail / Outlook one-click) ──
    if (conn.oauth_provider && conn.access_token) {
      const accessToken = await refreshIfNeeded(conn)

      if (conn.oauth_provider === "google") {
        // Send via Gmail API
        const mimeParts = [
          `To: ${to}`,
          ...(cc ? [`Cc: ${cc}`] : []),
          `From: ${conn.email_address}`,
          `Subject: ${subject}`,
          ...replyHeaders,
          `Content-Type: text/html; charset=utf-8`,
          "",
          html || `<p>${body.replace(/\n/g, "<br>")}</p>`,
        ]
        const raw = Buffer.from(mimeParts.join("\n")).toString("base64url")

        const sendBody: any = { raw }
        if (threadId) sendBody.threadId = threadId

        const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(sendBody),
        })
        const gmailData = await gmailRes.json()
        if (!gmailRes.ok) throw new Error(gmailData.error?.message || "Gmail API send failed")
        messageId = gmailData.id
        // Use Gmail's threadId from response if not already set from client
        if (!threadId && gmailData.threadId) {
          threadId = gmailData.threadId
        }

      } else if (conn.oauth_provider === "microsoft") {
        // Send via Microsoft Graph
        // Note: Microsoft Graph does not allow standard headers like In-Reply-To
        // in internetMessageHeaders (only x- prefixed custom headers).
        // Threading is handled by the message reply API instead.
        const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: html || `<p>${body.replace(/\n/g, "<br>")}</p>` },
              toRecipients: [{ emailAddress: { address: to } }],
              ...(cc ? { ccRecipients: cc.split(",").map((addr: string) => ({ emailAddress: { address: addr.trim() } })) } : {}),
              from: { emailAddress: { address: conn.email_address } },
            },
            saveToSentItems: true,
          }),
        })
        if (!graphRes.ok) {
          const errData = await graphRes.json()
          throw new Error(errData.error?.message || "Microsoft Graph send failed")
        }
        messageId = `graph-${Date.now()}`
      }
    } else {
      // ── SMTP path (manual / custom providers) ──
      console.log(`[SMTP SEND] Provider=${providerId} — entering SMTP path`)
      if (!conn.smtp_host || !conn.smtp_port || !conn.smtp_user || !conn.smtp_pass) {
        console.warn(`[SMTP SEND] Incomplete credentials: host=${!!conn.smtp_host} port=${!!conn.smtp_port} user=${!!conn.smtp_user} pass=${!!conn.smtp_pass}`)
        return NextResponse.json({ error: "SMTP credentials incomplete" }, { status: 400 })
      }

      // Port 465 = implicit TLS (secure=true), Port 587 = STARTTLS (secure=false)
      // Ignore stored smtp_secure flag — it is often set incorrectly by users
      const secure = conn.smtp_port === 465
      console.log(`[SMTP SEND] Creating transporter: host=${conn.smtp_host} port=${conn.smtp_port} secure=${secure}`)
      const transporter = nodemailer.createTransport({
        host: conn.smtp_host,
        port: conn.smtp_port,
        secure,
        requireTLS: !secure, // Force STARTTLS upgrade on port 587
        auth: { user: conn.smtp_user, pass: conn.smtp_pass },
        tls: { rejectUnauthorized: false },
        debug: true,
        logger: true,
      })

      console.log(`[SMTP SEND] Sending mail: from=${conn.email_address || conn.smtp_user} to=${to} subject="${subject}"`)
      const info = await transporter.sendMail({
        from: `"${senderName}" <${conn.email_address || conn.smtp_user}>`,
        to,
        cc: cc || undefined,
        subject,
        text: body,
        html: html || `<p>${body.replace(/\n/g, "<br>")}</p>`,
        inReplyTo: originalMessageId ? `<${originalMessageId}>` : undefined,
        references: originalMessageId ? `<${originalMessageId}>` : undefined,
      })
      messageId = info.messageId
      console.log(`[SMTP SEND] Sent successfully. messageId=${messageId} accepted=${info.accepted?.length} rejected=${info.rejected?.length}`)
    }

    // Store sent email in DB
    const { data: insertedMsg, error: insertError } = await supabase.from("email_messages").insert({
      user_id: userId,
      connection_id: conn.id,
      provider: providerId,
      direction: "sent",
      from_address: conn.email_address || conn.smtp_user || conn.email_account,
      to_address: to,
      cc_address: cc || null,
      subject,
      body,
      message_id: messageId,
      message_id_header: conn.oauth_provider === "google" ? null : messageId,
      thread_id: threadId,
      sent_at: new Date().toISOString(),
    }).select().single()

    if (insertError) {
      console.error("[EMAIL SEND] DB insert failed:", insertError.message, insertError.details)
    } else {
      console.log(`[EMAIL SEND] Stored in DB: id=${insertedMsg?.id} direction=sent to=${to} subject="${subject}"`)
    }

    return NextResponse.json({
      success: true,
      messageId,
      previewUrl: null,
    })
  } catch (err: any) {
    console.error("[EMAIL SEND] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to send email" },
      { status: 500 }
    )
  }
}

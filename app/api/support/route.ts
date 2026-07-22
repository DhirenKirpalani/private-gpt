import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, imageUrls, attachments, systemInfo } = await req.json()

    console.log("[Support API] Received:", { name, hasAttachments: attachments?.length, hasImageUrls: imageUrls?.length })

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate ticket number: EXP-YYYYMMDD-XXXX
    const now = new Date()
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0")
    const rand = Math.floor(1000 + Math.random() * 9000)
    const ticketNumber = `EXP-${dateStr}-${rand}`

    const screenshotsHtml = imageUrls?.length
      ? "<h3 style='color:#ccc;margin-top:24px;'>Screenshots</h3>" +
        imageUrls.map((url: string) => "<img src='" + url + "' style='max-width:100%;border-radius:8px;margin-top:8px;' />").join("")
      : ""

    const systemHtml = systemInfo
      ? "<h3 style='color:#ccc;margin-top:24px;'>System Info</h3>" +
        "<table style='font-size:12px;color:#999;border-collapse:collapse;'>" +
        "<tr><td style='padding:2px 12px 2px 0'>Browser</td><td>" + systemInfo.browser + "</td></tr>" +
        "<tr><td style='padding:2px 12px 2px 0'>Platform</td><td>" + systemInfo.platform + "</td></tr>" +
        "<tr><td style='padding:2px 12px 2px 0'>Screen</td><td>" + systemInfo.screen + "</td></tr>" +
        "<tr><td style='padding:2px 12px 2px 0'>Page</td><td>" + systemInfo.url + "</td></tr>" +
        "</table>"
      : ""

    const subject = `[${ticketNumber}] ${name} — ${message.slice(0, 60) + (message.length > 60 ? "…" : "")}`

    const html = [
      "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;'>",
      "<h2 style='color:#34d399;margin:0 0 8px;'>New Support Request</h2>",
      "<p style='font-size:13px;color:#9ca3af;margin:0 0 24px;'>Ticket: <span style='color:#34d399;font-weight:600;'>" + ticketNumber + "</span></p>",
      "<table style='width:100%;border-collapse:collapse;margin-bottom:20px;'>",
      "<tr><td style='padding:4px 16px 4px 0;color:#9ca3af;font-size:13px;white-space:nowrap;'>Name</td><td style='padding:4px 0;font-size:14px;'>" + name + "</td></tr>",
      "<tr><td style='padding:4px 16px 4px 0;color:#9ca3af;font-size:13px;'>Email</td><td style='padding:4px 0;font-size:14px;'><a href='mailto:" + email + "' style='color:#34d399;'>" + email + "</a></td></tr>",
      "</table>",
      "<h3 style='color:#ccc;margin-bottom:8px;'>What happened?</h3>",
      "<div style='background:#1a2235;border-radius:8px;padding:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;'>" + message + "</div>",
      screenshotsHtml,
      systemHtml,
      "<p style='margin-top:32px;font-size:11px;color:#4b5563;'>Reply directly to this email to respond to " + name + ".</p>",
      "</div>",
    ].join("")

    await resend.emails.send({
      from: "Exploro Support <support@exploro-os.com>",
      to: "support@exploro-os.com",
      replyTo: name + " <" + email + ">",
      subject,
      html,
      attachments: attachments?.length
        ? attachments.map((a: { filename: string; content: string; contentType: string }) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          }))
        : undefined,
    })

    // Auto-reply to the user confirming receipt (non-blocking — don't let it affect the main request)
    try {
      const autoReplySubject = `[${ticketNumber}] We've received your support request — Exploro`
      const autoReplyHtml = [
        "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;'>",
        "<h2 style='color:#34d399;margin:0 0 8px;'>Hi " + name + ",</h2>",
        "<p style='font-size:13px;color:#9ca3af;margin:0 0 16px;'>Your ticket: <span style='color:#34d399;font-weight:600;'>" + ticketNumber + "</span></p>",
        "<p style='font-size:15px;line-height:1.6;margin:0 0 16px;'>Thank you for reaching out to Exploro Support. We've received your message and our team will get back to you within 24 hours.</p>",
        "<div style='background:#1a2235;border-radius:8px;padding:16px;margin:16px 0;'>",
        "<p style='color:#9ca3af;font-size:12px;margin:0 0 8px;'>Your message:</p>",
        "<p style='font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;'>" + message + "</p>",
        "</div>",
        "<p style='font-size:15px;line-height:1.6;margin:16px 0 0;'>If you have any additional details or screenshots to share, just reply to this email.</p>",
        "<p style='font-size:15px;line-height:1.6;margin:8px 0 0;'>— The Exploro Team</p>",
        "<hr style='border:none;border-top:1px solid #1a2235;margin:24px 0;' />",
        "<p style='font-size:11px;color:#4b5563;'>This is an automated message. Please don't modify the subject line when replying so we can track your request.</p>",
        "</div>",
      ].join("")

      const autoReplyRes = await resend.emails.send({
        from: "Exploro Support <support@exploro-os.com>",
        to: email,
        subject: autoReplySubject,
        html: autoReplyHtml,
      })
      console.log("[Support API] Auto-reply sent to:", email, "response:", autoReplyRes)
    } catch (autoErr: any) {
      console.error("[Support API] Auto-reply failed:", autoErr?.message || autoErr)
    }

    return NextResponse.json({ success: true, ticketNumber })
  } catch (err: any) {
    console.error("[Support API] Error:", err)
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 })
  }
}

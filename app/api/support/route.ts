import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, imageUrls, systemInfo } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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

    const subject = "[Support] " + name + " — " + message.slice(0, 60) + (message.length > 60 ? "…" : "")

    const html = [
      "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;'>",
      "<h2 style='color:#34d399;margin:0 0 24px;'>New Support Request</h2>",
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
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Support API] Error:", err)
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 })
  }
}

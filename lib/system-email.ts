import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = "Exploro OS <no-reply@exploro-os.com>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

const BASE_STYLE = "font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;"
const LOGO_HTML = `<div style="text-align:center;margin-bottom:24px;"><img src="https://exploro-os.com/assets/images/exploro-logo.png" alt="Exploro" style="height:40px;" /></div>`

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[System Email] RESEND_API_KEY not set — skipping send to", to)
    return
  }
  try {
    const res = await resend.emails.send({ from: FROM, to, subject, html })
    console.log("[System Email] Resend response:", JSON.stringify(res))
  } catch (err: any) {
    console.error("[System Email] Failed:", err?.message || err)
  }
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const firstName = name || email.split("@")[0]
  const html = `
    <div style="${BASE_STYLE}">
      ${LOGO_HTML}
      <h2 style="color:#34d399;margin:0 0 16px;">Welcome to Exploro, ${firstName}!</h2>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Your account is ready. Exploro is your AI-powered CRM, chat assistant, and unified communications hub.
      </p>
      <div style="background:#1a2235;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">Here's what you can do:</p>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#e2e8f0;line-height:1.8;">
          <li>Chat with your AI assistant trained on your business</li>
          <li>Connect Email, WhatsApp, Telegram, and Slack channels</li>
          <li>Manage contacts and conversations in one CRM</li>
          <li>Schedule meetings with calendar integration</li>
        </ul>
      </div>
      <a href="${APP_URL}/channels" style="display:inline-block;margin-top:20px;background:#34d399;color:#0f1520;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        Connect Your Channels
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
        This is an automated message from Exploro. Please do not reply to this email.
        For support, visit <a href="${APP_URL}/support" style="color:#34d399;">our support page</a>.
      </p>
    </div>
  `
  await send(email, "Welcome to Exploro — Let's get started!", html)
}

export async function sendSubscriptionActivatedEmail(email: string, planName: string, name?: string) {
  const firstName = name || email.split("@")[0]
  const html = `
    <div style="${BASE_STYLE}">
      ${LOGO_HTML}
      <h2 style="color:#34d399;margin:0 0 16px;">Subscription Activated</h2>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hi ${firstName}, your <strong style="color:#34d399;">${planName}</strong> plan is now active.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        You now have full access to all ${planName} features. Your subscription will renew automatically.
      </p>
      <a href="${APP_URL}/profile" style="display:inline-block;margin-top:20px;background:#34d399;color:#0f1520;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        Manage Subscription
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
        This is an automated message. Please do not reply to this email.
        For billing questions, visit <a href="${APP_URL}/support" style="color:#34d399;">our support page</a>.
      </p>
    </div>
  `
  await send(email, `Your ${planName} plan is active — Exploro`, html)
}

export async function sendSubscriptionCanceledEmail(email: string, planName: string, endDate?: string, name?: string) {
  const firstName = name || email.split("@")[0]
  const endDateText = endDate ? new Date(endDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "the end of your current billing period"
  const html = `
    <div style="${BASE_STYLE}">
      ${LOGO_HTML}
      <h2 style="color:#ef4444;margin:0 0 16px;">Subscription Canceled</h2>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hi ${firstName}, your <strong>${planName}</strong> subscription has been canceled.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        You'll retain access until <strong>${endDateText}</strong>. After that, your account will revert to limited access.
      </p>
      <div style="background:#1a2235;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#e2e8f0;">Changed your mind?</p>
        <a href="${APP_URL}/pricing" style="display:inline-block;margin-top:12px;background:#34d399;color:#0f1520;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
          Resubscribe
        </a>
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
        This is an automated message. Please do not reply to this email.
        For questions, visit <a href="${APP_URL}/support" style="color:#34d399;">our support page</a>.
      </p>
    </div>
  `
  await send(email, `Your ${planName} subscription has been canceled — Exploro`, html)
}

export async function sendTrialStartedEmail(email: string, planName: string, trialEnd: string, name?: string) {
  const firstName = name || email.split("@")[0]
  const endDateText = new Date(trialEnd).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  const html = `
    <div style="${BASE_STYLE}">
      ${LOGO_HTML}
      <h2 style="color:#34d399;margin:0 0 16px;">Your Free Trial Has Started</h2>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hi ${firstName}, enjoy full access to Exploro's <strong style="color:#34d399;">${planName}</strong> plan for 15 days.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Your trial ends on <strong>${endDateText}</strong>. No credit card required — just explore and see what Exploro can do for you.
      </p>
      <a href="${APP_URL}/channels" style="display:inline-block;margin-top:20px;background:#34d399;color:#0f1520;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        Get Started
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
        This is an automated message. Please do not reply to this email.
        For help, visit <a href="${APP_URL}/support" style="color:#34d399;">our support page</a>.
      </p>
    </div>
  `
  await send(email, `Your ${planName} trial has started — Exploro`, html)
}

export async function sendWarningEmail(email: string, subject: string, message: string, name?: string) {
  const firstName = name || email.split("@")[0]
  const html = `
    <div style="${BASE_STYLE}">
      ${LOGO_HTML}
      <h2 style="color:#FFBF00;margin:0 0 16px;">${subject}</h2>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hi ${firstName},
      </p>
      <div style="background:#1a2235;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;">
        ${message}
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
        This is an automated message. Please do not reply to this email.
        For support, visit <a href="${APP_URL}/support" style="color:#34d399;">our support page</a>.
      </p>
    </div>
  `
  await send(email, `${subject} — Exploro`, html)
}

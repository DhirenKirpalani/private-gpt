import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

// Reminder stages: days before trial ends → urgency level
const REMINDER_STAGES = [
  { daysBefore: 7, stage: "early", urgency: "info" },     // Heads up
  { daysBefore: 3, stage: "urgent", urgency: "warning" },  // Urgent
  { daysBefore: 1, stage: "final", urgency: "critical" },  // Last chance
] as const

const STAGE_COLORS: Record<string, { heading: string; badge: string; button: string }> = {
  info:    { heading: "#34d399", badge: "#34d399", button: "#34d399" },
  warning: { heading: "#FFBF00", badge: "#FFBF00", button: "#FFBF00" },
  critical:{ heading: "#ef4444", badge: "#ef4444", button: "#ef4444" },
}

async function _GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const maxDays = Math.max(...REMINDER_STAGES.map(s => s.daysBefore))
    const reminderDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)

    // Find trialing subscriptions ending within the max reminder window
    const { data: trialingSubs, error: subError } = await adminClient
      .from("subscriptions")
      .select("user_id, status, plan, current_period_end")
      .eq("status", "trialing")
      .lte("current_period_end", reminderDate.toISOString())
      .gt("current_period_end", now.toISOString())

    if (subError) throw subError
    if (!trialingSubs || trialingSubs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No trials ending soon" })
    }

    // Get user emails from auth
    const userIds = trialingSubs.map(s => s.user_id)
    const emailMap: Record<string, string> = {}
    let page = 1
    let hasMore = true
    while (hasMore) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
      authUsers?.users?.forEach(u => {
        if (userIds.includes(u.id)) {
          emailMap[u.id] = u.email ?? ""
        }
      })
      hasMore = authUsers?.users?.length === 1000
      page++
    }

    // Fetch profile names
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds)
    const nameMap: Record<string, string> = {}
    profiles?.forEach(p => { nameMap[p.user_id] = p.full_name ?? "" })

    // Check which users already received each reminder stage (avoid duplicates per stage)
    const { data: alreadySent } = await adminClient
      .from("notification_log")
      .select("user_id, metadata")
      .eq("type", "trial_reminder")
      .in("user_id", userIds)
      .gte("created_at", new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())

    // Build a set of "userId:stage" to track which stages already sent
    const sentStages = new Set<string>()
    alreadySent?.forEach(n => {
      const stage = (n.metadata as any)?.stage
      if (stage) sentStages.add(`${n.user_id}:${stage}`)
    })

    let sentCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const sub of trialingSubs) {
      const email = emailMap[sub.user_id]
      if (!email) continue

      const trialEnd = new Date(sub.current_period_end)
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const planName = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "Solo"

      // Find the appropriate reminder stage for this user's days remaining
      const stage = REMINDER_STAGES.find(s => daysLeft <= s.daysBefore && daysLeft > (REMINDER_STAGES[REMINDER_STAGES.indexOf(s) + 1]?.daysBefore ?? 0))
      if (!stage) continue

      // Skip if this stage already sent
      if (sentStages.has(`${sub.user_id}:${stage.stage}`)) {
        skippedCount++
        continue
      }

      const colors = STAGE_COLORS[stage.urgency]
      const subjectLine = stage.stage === "final"
        ? `Last chance: Your ${planName} trial ends tomorrow`
        : stage.stage === "urgent"
        ? `Urgent: Your ${planName} trial ends in ${daysLeft} days`
        : `Your ${planName} trial ends in ${daysLeft} days`

      const urgencyText = stage.stage === "final"
        ? "This is your last reminder before your trial expires."
        : stage.stage === "urgent"
        ? "Time is running out — upgrade now to keep your workflow running."
        : "This is a friendly reminder that your trial is coming to an end."

      try {
        await resend.emails.send({
          from: "Exploro OS <no-reply@exploro-os.com>",
          to: email,
          subject: subjectLine,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1520;color:#e2e8f0;padding:32px;border-radius:12px;">
              <div style="text-align:center;margin-bottom:24px;">
                <img src="https://exploro-os.com/assets/images/exploro-logo.png" alt="Exploro" style="height:40px;" />
              </div>
              <h2 style="color:${colors.heading};margin:0 0 16px;">Your free trial is ending soon</h2>
              <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
                Hi ${nameMap[sub.user_id] || email.split("@")[0]},
              </p>
              <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
                Your <strong style="color:#34d399;">${planName}</strong> trial on Exploro expires in <strong style="color:${colors.badge};">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong> (${trialEnd.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}).
              </p>
              <p style="font-size:13px;line-height:1.6;color:#9ca3af;margin:12px 0 0;">
                ${urgencyText}
              </p>
              <div style="background:#1a2235;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;font-size:13px;color:#9ca3af;">Don't lose access to:</p>
                <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#e2e8f0;line-height:1.8;">
                  <li>AI-powered CRM & chat assistant</li>
                  <li>Connected channels (Email, WhatsApp, Telegram, Slack)</li>
                  <li>Calendar integration & scheduling</li>
                  <li>Team workspaces & collaboration</li>
                </ul>
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"}/pricing" style="display:inline-block;margin-top:20px;background:${colors.button};color:#0f1520;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
                Upgrade Your Plan
              </a>
              <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5;">
                If you have any questions about your trial or need help choosing the right plan, visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"}/support" style="color:#34d399;">support page</a> or contact us at <a href="mailto:support@exploro-os.com" style="color:#34d399;">support@exploro-os.com</a>.
              </p>
            </div>
          `,
        })

        // Log the notification with stage info
        await adminClient.from("notification_log").insert({
          user_id: sub.user_id,
          type: "trial_reminder",
          metadata: { stage: stage.stage, days_left: daysLeft, plan: sub.plan, trial_end: sub.current_period_end },
        })

        sentCount++
      } catch (err: any) {
        errors.push(`Failed to send to ${email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/cron/trial-reminder")

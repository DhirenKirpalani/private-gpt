import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, providerId } = await req.json()
    console.log(`[SMTP TEST] Starting test for provider=${providerId} userId=${userId}`)
    if (!userId || !providerId) {
      console.warn("[SMTP TEST] Missing userId or providerId")
      return NextResponse.json({ error: "Missing userId or providerId" }, { status: 400 })
    }

    // Fetch the email connection
    console.log(`[SMTP TEST] Fetching connection from DB: user_id=${userId} provider=${providerId}`)
    const { data: conn, error } = await supabase
      .from("email_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", providerId)
      .single()

    if (error) {
      console.error(`[SMTP TEST] DB error:`, error.message, error.details)
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }
    if (!conn) {
      console.warn(`[SMTP TEST] No connection found for user=${userId} provider=${providerId}`)
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    console.log(`[SMTP TEST] Connection found: id=${conn.id} email=${conn.email_address} host=${conn.smtp_host} port=${conn.smtp_port} secure=${conn.smtp_secure}`)
    console.log(`[SMTP TEST] smtp_user=${conn.smtp_user} imap_host=${conn.imap_host} imap_port=${conn.imap_port} status=${conn.status}`)

    if (!conn.smtp_host || !conn.smtp_port || !conn.smtp_user || !conn.smtp_pass) {
      console.warn(`[SMTP TEST] Incomplete credentials: host=${!!conn.smtp_host} port=${!!conn.smtp_port} user=${!!conn.smtp_user} pass=${!!conn.smtp_pass}`)
      return NextResponse.json({ error: "SMTP credentials incomplete" }, { status: 400 })
    }

    // Create transporter and verify
    const secure = conn.smtp_secure ?? conn.smtp_port === 465
    console.log(`[SMTP TEST] Creating transporter: host=${conn.smtp_host} port=${conn.smtp_port} secure=${secure}`)
    const transporter = nodemailer.createTransport({
      host: conn.smtp_host,
      port: conn.smtp_port,
      secure,
      auth: {
        user: conn.smtp_user,
        pass: conn.smtp_pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    })

    console.log(`[SMTP TEST] Calling transporter.verify()...`)
    await transporter.verify()
    console.log(`[SMTP TEST] transporter.verify() succeeded`)

    // Update status to connected
    console.log(`[SMTP TEST] Updating connection status to connected for id=${conn.id}`)
    await supabase
      .from("email_connections")
      .update({ status: "connected", last_error: null })
      .eq("id", conn.id)

    console.log(`[SMTP TEST] SUCCESS for provider=${providerId}`)
    return NextResponse.json({ success: true, message: "SMTP connection verified" })
  } catch (err: any) {
    console.error(`[SMTP TEST] FAILED:`, err?.message, err?.code, err?.command, err?.response)
    return NextResponse.json(
      { error: err?.message || "Failed to verify SMTP connection" },
      { status: 500 }
    )
  }
}

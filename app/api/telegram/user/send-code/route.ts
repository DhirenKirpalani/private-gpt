import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  let client: any = null
  try {
    const { userId, phoneNumber } = await req.json()
    if (!userId || !phoneNumber) {
      return NextResponse.json({ error: "Missing userId or phoneNumber" }, { status: 400 })
    }

    if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
      return NextResponse.json({ error: "Telegram API credentials not configured. Add TELEGRAM_API_ID and TELEGRAM_API_HASH to .env" }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server is still starting up. Please try again in a moment." }, { status: 500 })
    }

    const client = createTelegramClient()
    await client.connect()

    const result: any = await client.sendCode({
      apiId: parseInt(process.env.TELEGRAM_API_ID),
      apiHash: process.env.TELEGRAM_API_HASH,
    }, phoneNumber)

    const sessionString = (client.session.save() as string) || ""
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const adminClient = createAdminClient()
    await adminClient.from("telegram_user_sessions").upsert({
      user_id: userId,
      phone_number: phoneNumber,
      session_string: sessionString,
      status: "pending",
      pending_code_hash: result.phoneCodeHash,
      pending_session: sessionString,
      pending_expires_at: expiresAt,
    }, { onConflict: "user_id" })

    return NextResponse.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
    })
  } catch (err: any) {
    console.error("[TG SEND CODE]", err)
    const msg = err?.message || ""
    let friendly = "Failed to send code. Please try again."
    if (msg.includes("PHONE_NUMBER_INVALID") || msg.includes("phone number is invalid"))
      friendly = "This phone number is not registered on Telegram. Double-check the country code and number."
    else if (msg.includes("PHONE_NUMBER_FLOOD"))
      friendly = "Too many code requests. Please wait a few minutes before trying again."
    else if (msg.includes("API_ID") || msg.includes("API_HASH"))
      friendly = "Telegram API credentials are misconfigured. Contact support."
    else if (msg.includes("PHONE_NUMBER_BANNED"))
      friendly = "This phone number is banned from Telegram."
    return NextResponse.json({ error: friendly }, { status: 400 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = _POST

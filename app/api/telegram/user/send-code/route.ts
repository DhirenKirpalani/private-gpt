import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient } from "@/lib/telegram-user"

export const dynamic = "force-dynamic"

// Store temporary phone_code_hash in memory (expires in 5 min)
const codeHashStore = new Map<string, { hash: string; expires: number }>()

async function _POST(req: NextRequest) {
  try {
    const { userId, phoneNumber } = await req.json()
    if (!userId || !phoneNumber) {
      return NextResponse.json({ error: "Missing userId or phoneNumber" }, { status: 400 })
    }

    if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
      return NextResponse.json({ error: "Telegram API credentials not configured. Add TELEGRAM_API_ID and TELEGRAM_API_HASH to .env" }, { status: 500 })
    }

    const client = createTelegramClient()
    await client.connect()

    const result: any = await client.sendCode({
      apiId: parseInt(process.env.TELEGRAM_API_ID),
      apiHash: process.env.TELEGRAM_API_HASH,
    }, phoneNumber)

    // Store phone_code_hash for verification
    codeHashStore.set(userId, {
      hash: result.phoneCodeHash,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    })

    // Save the partial session string for later use in verify step
    const sessionString = (client.session.save() as string) || ""
    codeHashStore.set(userId + ":session", {
      hash: sessionString,
      expires: Date.now() + 5 * 60 * 1000,
    })

    return NextResponse.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
    })
  } catch (err: any) {
    console.error("[TG SEND CODE]", err)
    return NextResponse.json({ error: err?.message || "Failed to send code" }, { status: 500 })
  }
}

export { codeHashStore }
export const POST = _POST

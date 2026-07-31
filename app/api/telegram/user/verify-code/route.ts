import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, saveUserSession } from "@/lib/telegram-user"
import { createAdminClient } from "@/lib/supabase"
import { Api, password as teleprotoPassword } from "teleproto"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  let client: any = null
  try {
    const { userId, phoneNumber, code, password } = await req.json()
    if (!userId || !phoneNumber || !code) {
      return NextResponse.json({ error: "Missing userId, phoneNumber, or code" }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server is still starting up. Please try again in a moment." }, { status: 500 })
    }

    const adminClient = createAdminClient()
    const { data: pending, error: pendingError } = await adminClient
      .from("telegram_user_sessions")
      .select("pending_code_hash, pending_session, pending_expires_at")
      .eq("user_id", userId)
      .single()

    if (pendingError || !pending || !pending.pending_code_hash) {
      return NextResponse.json({ error: "Code expired. Please request a new code." }, { status: 400 })
    }

    if (new Date(pending.pending_expires_at) < new Date()) {
      return NextResponse.json({ error: "Code expired. Please request a new code." }, { status: 400 })
    }

    const sessionString = pending.pending_session || ""
    const client = createTelegramClient(sessionString)
    await client.connect()

    let result: any
    try {
      result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash: pending.pending_code_hash,
          phoneCode: code,
        })
      )
    } catch (err: any) {
      // 2FA required
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
        const passwordResult = await client.invoke(
          new Api.account.GetPassword()
        )
        const passwordSrpResult: any = passwordResult
        const passwordCheck = await teleprotoPassword.computeCheck(passwordSrpResult, password)
        result = await client.invoke(
          new Api.auth.CheckPassword({ password: passwordCheck })
        )
      } else if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        return NextResponse.json({ error: "2FA password required", needPassword: true }, { status: 400 })
      } else {
        throw err
      }
    }

    // Get user info
    const me: any = await client.getMe()
    const finalSession = (client.session.save() as string) || ""

    await saveUserSession(userId, phoneNumber, finalSession, {
      id: me.id,
      username: me.username,
      first_name: me.firstName,
      last_name: me.lastName,
    })

    // Cleanup pending fields
    await adminClient.from("telegram_user_sessions")
      .update({ pending_code_hash: null, pending_session: null, pending_expires_at: null })
      .eq("user_id", userId)

    return NextResponse.json({
      success: true,
      user: {
        id: me.id,
        username: me.username,
        firstName: me.firstName,
        lastName: me.lastName,
      },
    })
  } catch (err: any) {
    console.error("[TG VERIFY CODE]", err)
    return NextResponse.json({ error: err?.message || "Failed to verify code" }, { status: 500 })
  } finally {
    if (client) { try { await client.disconnect() } catch {} }
  }
}

export const POST = _POST

import { NextRequest, NextResponse } from "next/server"
import { createTelegramClient, saveUserSession } from "@/lib/telegram-user"
import { codeHashStore } from "../send-code/route"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId, phoneNumber, code, password } = await req.json()
    if (!userId || !phoneNumber || !code) {
      return NextResponse.json({ error: "Missing userId, phoneNumber, or code" }, { status: 400 })
    }

    const stored = codeHashStore.get(userId)
    if (!stored || stored.expires < Date.now()) {
      return NextResponse.json({ error: "Code expired. Please request a new code." }, { status: 400 })
    }

    const storedSession = codeHashStore.get(userId + ":session")
    const sessionString = storedSession?.hash || ""

    const client = createTelegramClient(sessionString)
    await client.connect()

    let result: any
    try {
      result = await client.invoke(
        new (require("teleproto").raw.auth.SignIn)({
          phoneNumber,
          phoneCodeHash: stored.hash,
          phoneCode: code,
        })
      )
    } catch (err: any) {
      // 2FA required
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
        const passwordResult = await client.invoke(
          new (require("teleproto").raw.account.GetPassword)()
        )
        const passwordSrpResult: any = passwordResult
        const { computeCheck } = require("teleproto/Password")
        const passwordCheck = computeCheck(passwordSrpResult, password)
        result = await client.invoke(
          new (require("teleproto").raw.auth.CheckPassword)({ password: passwordCheck })
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

    // Cleanup
    codeHashStore.delete(userId)
    codeHashStore.delete(userId + ":session")

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
  }
}

export const POST = _POST

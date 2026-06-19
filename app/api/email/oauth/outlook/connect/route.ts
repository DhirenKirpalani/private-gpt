import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email/oauth/callback`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
    if (!MICROSOFT_CLIENT_ID) {
      return NextResponse.json({ error: "MICROSOFT_CLIENT_ID not configured" }, { status: 500 })
    }

    const state = Buffer.from(JSON.stringify({ userId, provider: "outlook" })).toString("base64url")

    const scopes = [
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Mail.Read",
      "openid",
      "email",
      "offline_access",
    ].join(" ")

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
    url.searchParams.set("client_id", MICROSOFT_CLIENT_ID)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", scopes)
    url.searchParams.set("state", state)

    return NextResponse.redirect(url.toString())
  } catch (err: any) {
    console.error("[OAUTH OUTLOOK CONNECT] Error:", err)
    return NextResponse.json({ error: err?.message || "OAuth init failed" }, { status: 500 })
  }
}

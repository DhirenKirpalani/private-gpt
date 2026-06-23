import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email/oauth/callback`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 })
    }

    const state = Buffer.from(JSON.stringify({ userId, provider: "gmail" })).toString("base64url")

    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ].join(" ")

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", scopes)
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("prompt", "consent")
    url.searchParams.set("state", state)

    return NextResponse.redirect(url.toString())
  } catch (err: any) {
    console.error("[OAUTH GMAIL CONNECT] Error:", err)
    return NextResponse.json({ error: err?.message || "OAuth init failed" }, { status: 500 })
  }
}

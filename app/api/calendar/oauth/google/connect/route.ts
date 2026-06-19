import { NextRequest, NextResponse } from "next/server"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
]

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/oauth/callback`

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const state = Buffer.from(JSON.stringify({ userId, provider: "googlecalendar" })).toString("base64url")

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!)
  url.searchParams.set("redirect_uri", REDIRECT_URI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", SCOPES.join(" "))
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)

  return NextResponse.redirect(url.toString())
}

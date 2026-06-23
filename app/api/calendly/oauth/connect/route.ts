import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendly/oauth/callback`

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString("base64url")

  const url = new URL("https://auth.calendly.com/oauth/authorize")
  url.searchParams.set("client_id", process.env.CALENDLY_CLIENT_ID!)
  url.searchParams.set("redirect_uri", REDIRECT_URI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)

  return NextResponse.redirect(url.toString())
}

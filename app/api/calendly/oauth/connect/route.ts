import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendly/oauth/callback`

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Use the actual request origin for redirect_uri
  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/calendly/oauth/callback`

  // Generate PKCE code_verifier and code_challenge (S256)
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")

  // Embed code_verifier in state so callback can retrieve it
  const state = Buffer.from(JSON.stringify({ userId, cv: codeVerifier })).toString("base64url")

  const url = new URL("https://auth.calendly.com/oauth/authorize")
  url.searchParams.set("client_id", process.env.CALENDLY_CLIENT_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  url.searchParams.set("scope", "users:read event_types:read event_types:write scheduled_events:read scheduled_events:write availability:read shares:write webhooks:read webhooks:write")
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")

  return NextResponse.redirect(url.toString())
}

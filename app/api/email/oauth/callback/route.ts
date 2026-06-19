import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email/oauth/callback`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(error)}`)
    }
    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=Missing OAuth parameters`)
    }

    const { userId, provider } = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
    if (!userId || !provider) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=Invalid state`)
    }

    let tokenRes: Response
    let email = ""

    if (provider === "gmail") {
      // Exchange code for Google tokens
      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      })

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(tokenData.error_description || tokenData.error || "Google token exchange failed")}`)
      }

      // Get user email from Google
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const profile = await profileRes.json()
      email = profile.email || ""

      // Store tokens
      await supabase
        .from("email_connections")
        .upsert({
          user_id: userId,
          provider: "gmail",
          email_address: email,
          email_account: email,
          oauth_provider: "google",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: "connected",
          last_error: null,
        }, { onConflict: "user_id,provider" })

    } else if (provider === "outlook") {
      // Exchange code for Microsoft tokens
      tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      })

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(tokenData.error_description || tokenData.error || "Microsoft token exchange failed")}`)
      }

      // Get user email from Microsoft Graph
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const profile = await profileRes.json()
      email = profile.mail || profile.userPrincipalName || ""

      // Store tokens
      await supabase
        .from("email_connections")
        .upsert({
          user_id: userId,
          provider: "outlook",
          email_address: email,
          email_account: email,
          oauth_provider: "microsoft",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          status: "connected",
          last_error: null,
        }, { onConflict: "user_id,provider" })
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?success=connected&email=${encodeURIComponent(email)}`)
  } catch (err: any) {
    console.error("[OAUTH CALLBACK] Error:", err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(err?.message || "OAuth callback failed")}`)
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendly/oauth/callback`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(errorDescription || error)}`
      )
    }
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=Missing OAuth parameters`
      )
    }

    const { userId, cv: codeVerifier } = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
    if (!userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=Invalid state`
      )
    }

    // Use the actual request origin for redirect_uri (must match authorize step)
    const origin = new URL(req.url).origin
    const redirectUri = `${origin}/api/calendly/oauth/callback`

    // Exchange code for Calendly token (PKCE + form-urlencoded)
    const tokenRes = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.CALENDLY_CLIENT_ID!,
        client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        code_verifier: codeVerifier,
      }).toString(),
    })

    const tokenData = await tokenRes.json()
    console.log("[CALENDLY CALLBACK] Token exchange:", tokenRes.status, JSON.stringify(tokenData))
    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(tokenData.message || tokenData.error || "Calendly token exchange failed")}`
      )
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in || 7200
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Get Calendly user info
    const userRes = await fetch("https://api.calendly.com/v2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    const email = userData.resource?.email || ""
    const schedulingUrl = userData.resource?.scheduling_url || ""

    // Upsert calendly connection in calendar_connections
    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "calendly")
      .maybeSingle()

    if (existing) {
      await supabase.from("calendar_connections").update({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        token_expires_at: expiresAt,
        calendar_email: email,
        scheduling_url: schedulingUrl || undefined,
        status: "connected",
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
    } else {
      await supabase.from("calendar_connections").insert({
        user_id: userId,
        provider: "calendly",
        status: "connected",
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        calendar_email: email,
        scheduling_url: schedulingUrl,
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?calendar=connected`
    )
  } catch (err: any) {
    console.error("[CALENDLY CALLBACK]", err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(err?.message || "Calendly OAuth callback failed")}`
    )
  }
}

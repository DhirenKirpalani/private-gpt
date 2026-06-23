import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/drive/oauth/callback`

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

    const { userId } = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
    if (!userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=Invalid state`)
    }

    // Exchange code for Google tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Get user email from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json()
    const email = profile.email || ""

    // Upsert drive connection (reuse calendar_connections table with provider="googledrive")
    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "googledrive")
      .maybeSingle()

    if (existing) {
      await supabase.from("calendar_connections").update({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        token_expires_at: expiresAt,
        calendar_email: email,
        status: "connected",
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
    } else {
      await supabase.from("calendar_connections").insert({
        user_id: userId,
        provider: "googledrive",
        status: "connected",
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        calendar_email: email,
      })
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?drive=connected`)
  } catch (err: any) {
    console.error("[DRIVE CALLBACK]", err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/channels?error=${encodeURIComponent(err?.message || "Drive OAuth callback failed")}`)
  }
}

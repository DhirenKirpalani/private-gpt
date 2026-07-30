import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { saveSlackConnection } from "@/lib/supabase"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_error=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_error=missing_params`)
  }

  // state = userId
  const userId = state

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_error=config`)
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.ok) {
    console.error("[SLACK OAUTH] Token exchange failed:", tokenData.error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_error=token_exchange`)
  }

  const botAccessToken = tokenData.access_token
  const botUserId = tokenData.bot_user_id
  const teamId = tokenData.team?.id
  const teamName = tokenData.team?.name
  const userAccessToken = tokenData.authed_user?.access_token || null

  if (!botAccessToken || !teamId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_error=incomplete_token`)
  }

  // Save connection
  await saveSlackConnection({
    user_id: userId,
    team_id: teamId,
    team_name: teamName || "",
    bot_user_id: botUserId || "",
    bot_access_token: botAccessToken,
    user_access_token: userAccessToken,
    status: "connected",
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/channels?slack_connected=true`)
}

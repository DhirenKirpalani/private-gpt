import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const META_APP_ID = process.env.META_APP_ID
const META_WHATSAPP_CONFIG_ID = process.env.META_WHATSAPP_CONFIG_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whatsapp/oauth/callback`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const popup = searchParams.get("popup") === "1"
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
    if (!META_APP_ID) {
      return NextResponse.json({ error: "META_APP_ID not configured" }, { status: 500 })
    }

    const state = Buffer.from(JSON.stringify({ userId, popup })).toString("base64url")

    const scopes = [
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "business_management",
    ].join(",")

    const url = new URL("https://www.facebook.com/v18.0/dialog/oauth")
    url.searchParams.set("client_id", META_APP_ID)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", scopes)
    url.searchParams.set("state", state)
    // Force re-auth so we always get a usable token for the right business
    url.searchParams.set("auth_type", "rerequest")

    // If Embedded Signup config is set, trigger the guided WABA setup dialog
    if (META_WHATSAPP_CONFIG_ID) {
      url.searchParams.set("config_id", META_WHATSAPP_CONFIG_ID)
    }

    return NextResponse.redirect(url.toString())
  } catch (err: any) {
    console.error("[WHATSAPP OAUTH CONNECT] Error:", err)
    return NextResponse.json({ error: err?.message || "OAuth init failed" }, { status: 500 })
  }
}

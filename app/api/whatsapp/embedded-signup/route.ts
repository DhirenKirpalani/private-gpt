import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET

async function fbGet(path: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v18.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `FB API failed: ${path}`)
  return data
}

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { userId, code, token: shortTokenInput } = await req.json()
    if (!userId || (!code && !shortTokenInput)) {
      return NextResponse.json({ error: "Missing userId or code/token" }, { status: 400 })
    }
    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.json({ error: "Meta app credentials not configured" }, { status: 500 })
    }

    let shortToken = shortTokenInput

    // 1. If code provided, exchange for short-lived access token
    if (code && !shortToken) {
      const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token")
      tokenUrl.searchParams.set("client_id", META_APP_ID)
      tokenUrl.searchParams.set("client_secret", META_APP_SECRET)
      tokenUrl.searchParams.set("redirect_uri", "https://private-gpt-psi.vercel.app/")
      tokenUrl.searchParams.set("code", code)

      const tokenDataRes = await fetch(tokenUrl.toString())
      const tokenData = await tokenDataRes.json()
      if (!tokenDataRes.ok || !tokenData.access_token) {
        return NextResponse.json({ error: tokenData.error?.message || tokenData.error || "Token exchange failed" }, { status: 500 })
      }
      shortToken = tokenData.access_token
    }

    if (!shortToken) {
      return NextResponse.json({ error: "No access token available" }, { status: 500 })
    }

    // 2. Exchange short-lived token for long-lived token
    const lltRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const lltData = await lltRes.json()
    const accessToken = lltData.access_token || shortToken
    const expiresIn = lltData.expires_in || 5184000

    // 3. Get WhatsApp Business Accounts
    let wabaId = ""
    let phoneNumberId = ""
    let phoneNumber = ""
    let displayName = ""

    try {
      const owned = await fbGet("/me/owned_whatsapp_business_accounts", accessToken)
      const ownedList = owned.data || []
      if (ownedList.length > 0) wabaId = ownedList[0].id

      if (!wabaId) {
        const businesses = await fbGet("/me/businesses", accessToken)
        const bizList = businesses.data || []
        for (const biz of bizList) {
          try {
            const wabas = await fbGet(`/${biz.id}/whatsapp_business_accounts`, accessToken)
            const wabaList = wabas.data || []
            if (wabaList.length > 0) {
              wabaId = wabaList[0].id
              break
            }
          } catch { /* try next */ }
        }
      }

      if (wabaId) {
        const phones = await fbGet(`/${wabaId}/phone_numbers`, accessToken)
        const phoneList = phones.data || []
        if (phoneList.length > 0) {
          phoneNumberId = phoneList[0].id
          phoneNumber = phoneList[0].display_phone_number || phoneList[0].phone_number || ""
          displayName = phoneList[0].verified_name || phoneList[0].display_phone_number || ""
        }
      }
    } catch (e: any) {
      console.error("[WHATSAPP EMBEDDED] WABA lookup failed:", e.message)
    }

    if (!phoneNumberId) {
      return NextResponse.json({ error: "No WhatsApp phone number found. Please complete the WhatsApp setup in the dialog." }, { status: 404 })
    }

    // 4. Store connection
    const { error: dbErr } = await supabase
      .from("whatsapp_connections")
      .upsert({
        user_id: userId,
        phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        display_name: displayName,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        status: "connected",
        webhook_verified: false,
      }, { onConflict: "user_id,phone_number_id" })

    if (dbErr) {
      console.error("[WHATSAPP EMBEDDED] DB error:", dbErr.message)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, phoneNumber, phoneNumberId, displayName })
  } catch (err: any) {
    console.error("[WHATSAPP EMBEDDED SIGNUP] Error:", err)
    return NextResponse.json({ error: err?.message || "Embedded signup failed" }, { status: 500 })
  }
}

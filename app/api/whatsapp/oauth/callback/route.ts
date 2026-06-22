import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whatsapp/oauth/callback`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

async function fbGet(path: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v18.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `FB API failed: ${path}`)
  return data
}

export async function GET(req: NextRequest) {
  let popup = false
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Parse state first so we know if this is a popup flow
    let userId = ""
    try {
      if (state) {
        const stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
        popup = !!stateData.popup
        userId = stateData.userId
      }
    } catch { /* ignore parse errors */ }

    if (error) {
      if (popup) {
        return new NextResponse(
          `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:false,error:${JSON.stringify(error)}},"*");window.close();</script>`,
          { headers: { "Content-Type": "text/html" } }
        )
      }
      return NextResponse.redirect(`${APP_URL}/channels?error=${encodeURIComponent(error)}`)
    }
    if (!code || !state || !userId) {
      if (popup) {
        return new NextResponse(
          `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:false,error:"Missing OAuth parameters"},"*");window.close();</script>`,
          { headers: { "Content-Type": "text/html" } }
        )
      }
      return NextResponse.redirect(`${APP_URL}/channels?error=Missing OAuth parameters`)
    }

    // 1. Exchange code for short-lived access token
    const tokenRes = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    // Facebook uses query params for this endpoint
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token")
    tokenUrl.searchParams.set("client_id", META_APP_ID!)
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET!)
    tokenUrl.searchParams.set("redirect_uri", REDIRECT_URI)
    tokenUrl.searchParams.set("code", code)

    const tokenDataRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenDataRes.json()
    if (!tokenDataRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(`${APP_URL}/channels?error=${encodeURIComponent(tokenData.error?.message || tokenData.error || "Meta token exchange failed")}`)
    }
    const shortToken = tokenData.access_token

    // 2. Exchange short-lived token for long-lived token
    const lltRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const lltData = await lltRes.json()
    const accessToken = lltData.access_token || shortToken
    const expiresIn = lltData.expires_in || 5184000 // default ~60 days

    // 3. Get WhatsApp Business Accounts
    let wabaId = ""
    let phoneNumberId = ""
    let phoneNumber = ""
    let displayName = ""

    try {
      // Primary: try /me/owned_whatsapp_business_accounts (works with whatsapp_business_management)
      try {
        const owned = await fbGet("/me/owned_whatsapp_business_accounts", accessToken)
        const ownedList = owned.data || []
        console.log("[WHATSAPP OAUTH] Owned WABAs:", ownedList.length)
        if (ownedList.length > 0) wabaId = ownedList[0].id
      } catch { /* ignore */ }

      // Fallback: try via /me/businesses (requires business_management scope)
      if (!wabaId) {
        try {
          const businesses = await fbGet("/me/businesses", accessToken)
          const bizList = businesses.data || []
          console.log("[WHATSAPP OAUTH] Businesses:", bizList.length)

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
        } catch { /* ignore */ }
      }

      if (wabaId) {
        // Get phone numbers
        const phones = await fbGet(`/${wabaId}/phone_numbers`, accessToken)
        const phoneList = phones.data || []
        console.log("[WHATSAPP OAUTH] Phone numbers:", phoneList.length)
        if (phoneList.length > 0) {
          phoneNumberId = phoneList[0].id
          phoneNumber = phoneList[0].display_phone_number || phoneList[0].phone_number || ""
          displayName = phoneList[0].verified_name || phoneList[0].display_phone_number || ""
        }
      }
    } catch (e: any) {
      console.error("[WHATSAPP OAUTH] WABA lookup failed:", e.message)
    }

    if (!phoneNumberId) {
      const errMsg = "No WhatsApp phone number found. Please set up a WhatsApp Business Account in Meta and add a phone number."
      if (popup) {
        return new NextResponse(
          `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:false,error:${JSON.stringify(errMsg)}},"*");window.close();</script>`,
          { headers: { "Content-Type": "text/html" } }
        )
      }
      return NextResponse.redirect(`${APP_URL}/channels?error=${encodeURIComponent(errMsg)}`)
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
      console.error("[WHATSAPP OAUTH] DB error:", dbErr.message)
      if (popup) {
        return new NextResponse(
          `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:false,error:${JSON.stringify(dbErr.message)}},"*");window.close();</script>`,
          { headers: { "Content-Type": "text/html" } }
        )
      }
      return NextResponse.redirect(`${APP_URL}/channels?error=${encodeURIComponent(dbErr.message)}`)
    }

    console.log("[WHATSAPP OAUTH] Connected:", { phoneNumberId, phoneNumber, displayName })
    if (popup) {
      return new NextResponse(
        `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:true,phoneNumber:${JSON.stringify(phoneNumber)},phoneNumberId:${JSON.stringify(phoneNumberId)},displayName:${JSON.stringify(displayName)}},"*");window.close();</script>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }
    return NextResponse.redirect(`${APP_URL}/channels?success=connected&whatsapp=1`)
  } catch (err: any) {
    console.error("[WHATSAPP OAUTH CALLBACK] Error:", err)
    const errMsg = err?.message || "WhatsApp OAuth failed"
    if (popup) {
      return new NextResponse(
        `<script>window.opener?.postMessage({type:"WHATSAPP_OAUTH",success:false,error:${JSON.stringify(errMsg)}},"*");window.close();</script>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }
    return NextResponse.redirect(`${APP_URL}/channels?error=${encodeURIComponent(errMsg)}`)
  }
}

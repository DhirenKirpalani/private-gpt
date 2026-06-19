import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "exploro-webhook-verify"

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("[WHATSAPP WEBHOOK] Verified")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 })
}

// POST — Incoming messages from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[WHATSAPP WEBHOOK] Received:", JSON.stringify(body, null, 2))

    // WhatsApp sends entries with changes
    const entries = body.entry || []
    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        const value = change.value
        if (!value) continue

        const phoneNumberId = value.metadata?.phone_number_id
        if (!phoneNumberId) continue

        // Find the connection by phone_number_id
        const { data: conn } = await supabase
          .from("whatsapp_connections")
          .select("*")
          .eq("phone_number_id", phoneNumberId)
          .single()

        if (!conn) {
          console.log("[WHATSAPP WEBHOOK] No connection for phone_number_id:", phoneNumberId)
          continue
        }

        // Process messages
        const messages = value.messages || []
        for (const msg of messages) {
          if (msg.type !== "text") continue

          const { error } = await supabase.from("whatsapp_messages").insert({
            user_id: conn.user_id,
            connection_id: conn.id,
            direction: "received",
            from_number: msg.from,
            to_number: value.metadata?.display_phone_number,
            wa_message_id: msg.id,
            body: msg.text?.body || "",
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            read: false,
          })

          if (error) {
            console.error("[WHATSAPP WEBHOOK] Insert failed:", error)
          }
        }

        // Mark webhook as verified on first message
        if (!conn.webhook_verified) {
          await supabase.from("whatsapp_connections").update({ webhook_verified: true }).eq("id", conn.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[WHATSAPP WEBHOOK] Error:", err)
    return NextResponse.json({ error: err?.message || "Webhook failed" }, { status: 500 })
  }
}

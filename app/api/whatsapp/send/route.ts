import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _POST(req: NextRequest) {
  try {
    const { userId, to, body } = await req.json()
    if (!userId || !to || !body) {
      return NextResponse.json({ error: "Missing userId, to, or body" }, { status: 400 })
    }

    // Try Evolution API first (whatsapp_sessions table)
    const { data: evoSession, error: evoErr } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (evoSession && !evoErr && EVOLUTION_URL && EVOLUTION_KEY) {
      // Send via Evolution API
      const evoRes = await fetch(
        `${EVOLUTION_URL}/message/sendText/${evoSession.instance_name}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EVOLUTION_KEY,
          },
          body: JSON.stringify({
            number: to,
            text: body,
          }),
        }
      )

      const evoData = await evoRes.json()
      if (!evoRes.ok) {
        console.error("[WA SEND] Evolution error:", evoData)
        return NextResponse.json({ error: evoData?.message || evoData?.error || "Evolution send failed" }, { status: 500 })
      }

      const messageId = evoData?.key?.id || evoData?.messageId || null

      // Store sent message
      await supabase.from("whatsapp_messages").insert({
        user_id: userId,
        session_id: evoSession.id,
        direction: "sent",
        from_number: evoSession.phone_number || "",
        to_number: to,
        wa_message_id: messageId,
        body,
        timestamp: new Date().toISOString(),
        read: true,
      })

      return NextResponse.json({ success: true, messageId })
    }

    // Fall back to Meta Cloud API (whatsapp_connections table)
    const { data: conn, error } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "No connected WhatsApp account found" }, { status: 404 })
    }

    // Send via WhatsApp Cloud API
    const waRes = await fetch(
      `https://graph.facebook.com/v18.0/${conn.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body },
        }),
      }
    )

    const waData = await waRes.json()
    if (!waRes.ok) {
      return NextResponse.json({ error: waData.error?.message || "WhatsApp send failed" }, { status: 500 })
    }

    const messageId = waData.messages?.[0]?.id

    // Store sent message
    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      connection_id: conn.id,
      direction: "sent",
      from_number: conn.phone_number,
      to_number: to,
      wa_message_id: messageId,
      body,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, messageId })
  } catch (err: any) {
    console.error("[WHATSAPP SEND]", err)
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/send")

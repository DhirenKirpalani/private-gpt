import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, to, body } = await req.json()
    if (!userId || !to || !body) {
      return NextResponse.json({ error: "Missing userId, to, or body" }, { status: 400 })
    }

    // Get the WhatsApp connection
    const { data: conn, error } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single()

    if (error || !conn) {
      return NextResponse.json({ error: "WhatsApp connection not found" }, { status: 404 })
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

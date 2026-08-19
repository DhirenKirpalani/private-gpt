import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { getEvolutionSessions, saveEvolutionMessage } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _POST(req: NextRequest) {
  try {
    const { userId, to, body } = await req.json()
    if (!userId || !to || !body) {
      return NextResponse.json({ error: "Missing userId, to, or body" }, { status: 400 })
    }

    const sessions = await getEvolutionSessions(userId)
    const session = sessions.find(s => s.status === "connected")

    if (!session) {
      return NextResponse.json({ error: "WhatsApp not connected" }, { status: 404 })
    }

    // Send via Evolution API
    const sendRes = await fetch(
      `${EVOLUTION_URL}/message/sendText/${session.instance_name}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({
          number: to,
          options: { delay: 200 },
          textMessage: { text: body },
        }),
      }
    )

    const sendData = await sendRes.json()

    if (!sendRes.ok) {
      console.error("[EVOLUTION SEND] Failed:", sendData)
      return NextResponse.json({ error: sendData?.message || "Send failed" }, { status: 500 })
    }

    // Save sent message
    await saveEvolutionMessage({
      user_id: userId,
      session_id: session.id,
      direction: "sent",
      from_number: session.phone_number || "",
      to_number: to,
      wa_message_id: sendData?.key?.id || null,
      body,
      media_url: null,
      media_type: null,
      timestamp: new Date().toISOString(),
      read: true,
    })

    return NextResponse.json({ success: true, messageId: sendData?.key?.id })
  } catch (err: any) {
    console.error("[WHATSAPP SEND]", err)
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/evolution/send")

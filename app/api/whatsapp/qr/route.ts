import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { createAdminClient, createEvolutionSession, getEvolutionSessions, updateEvolutionSession } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      return NextResponse.json({ error: "Evolution API not configured" }, { status: 500 })
    }

    const admin = createAdminClient()

    // Check for existing session
    const existing = await getEvolutionSessions(userId)
    const activeSession = existing.find(s => s.status === "connected" || s.status === "connecting")

    if (activeSession) {
      // Fetch QR from existing instance
      const qrRes = await fetch(
        `${EVOLUTION_URL}/instance/connect/${activeSession.instance_name}`,
        {
          headers: { apikey: EVOLUTION_KEY },
        }
      )
      const qrData = await qrRes.json()

      if (qrData?.instance?.state === "open") {
        await updateEvolutionSession(activeSession.id, { status: "connected" })
        return NextResponse.json({ status: "connected", session: activeSession })
      }

      // Get QR code (v2.3.7 returns base64 at top level)
      const qrCode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.base64?.image || null
      return NextResponse.json({
        status: "connecting",
        qr: qrCode,
        session: activeSession,
      })
    }

    // Create new instance
    const instanceName = `exploro_${userId.slice(0, 8)}_${Date.now()}`

    // Create instance in Evolution API
    const createRes = await fetch(
      `${EVOLUTION_URL}/instance/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          token: `exploro_${Date.now()}`,
        }),
      }
    )

    const createData = await createRes.json()

    if (!createRes.ok) {
      console.error("[EVOLUTION] Create instance failed:", createData)
      return NextResponse.json({ error: "Failed to create instance" }, { status: 500 })
    }

    // Save session in Supabase
    const session = await createEvolutionSession(userId, instanceName)

    // Fetch QR code from connect endpoint (v2.3.7 requires separate connect call)
    const connectRes = await fetch(
      `${EVOLUTION_URL}/instance/connect/${instanceName}`,
      { headers: { apikey: EVOLUTION_KEY } }
    )
    const connectData = await connectRes.json()
    const qrCode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.base64?.image || null

    return NextResponse.json({
      status: "connecting",
      qr: qrCode,
      session,
    })
  } catch (err: any) {
    console.error("[WHATSAPP QR]", err)
    return NextResponse.json({ error: err?.message || "Failed to get QR" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/qr")

import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { getEvolutionSessions, updateEvolutionSession } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const sessions = await getEvolutionSessions(userId)
    const active = sessions.find(s => s.status === "connected" || s.status === "connecting")

    if (!active) {
      return NextResponse.json({ status: "disconnected" })
    }

    // Use connectionState endpoint (not /connect) to check actual state
    const stateRes = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${active.instance_name}`,
      { headers: { apikey: EVOLUTION_KEY } }
    )
    const stateData = await stateRes.json()
    const state = stateData?.instance?.state

    if (state === "open") {
      if (active.status !== "connected") {
        try { await updateEvolutionSession(active.id, { status: "connected" }) } catch (e) { console.warn("[WHATSAPP STATUS] DB update failed:", e) }
      }
      return NextResponse.json({
        status: "connected",
        session: { ...active, status: "connected" },
        phone: active.phone_number || null,
      })
    }

    // Still connecting — fetch fresh QR via /instance/connect
    let qr: string | null = null
    try {
      const qrRes = await fetch(
        `${EVOLUTION_URL}/instance/connect/${active.instance_name}`,
        { headers: { apikey: EVOLUTION_KEY } }
      )
      const qrData = await qrRes.json()
      qr = qrData?.base64 || null
    } catch { /* ignore QR fetch error */ }

    return NextResponse.json({
      status: "connecting",
      session: active,
      qr,
    })
  } catch (err: any) {
    console.error("[WHATSAPP STATUS]", err)
    return NextResponse.json({ error: err?.message || "Status check failed" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/whatsapp/status")

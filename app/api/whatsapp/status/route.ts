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

    // Check instance state in Evolution API
    const stateRes = await fetch(
      `${EVOLUTION_URL}/instance/connect/${active.instance_name}`,
      { headers: { apikey: EVOLUTION_KEY } }
    )
    const stateData = await stateRes.json()

    // v2.3.7: check for open connection via base64 absence or instance state
    const state = stateData?.instance?.state
    const hasQr = !!stateData?.base64

    if (state === "open") {
      if (active.status !== "connected") {
        await updateEvolutionSession(active.id, { status: "connected" })
      }
      return NextResponse.json({
        status: "connected",
        session: active,
        phone: stateData?.instance?.wuid?.replace(/.*@/, "") || null,
      })
    }

    // Return connecting with QR code for auto-refresh
    return NextResponse.json({
      status: "connecting",
      session: active,
      qr: stateData?.base64 || null,
    })
  } catch (err: any) {
    console.error("[WHATSAPP STATUS]", err)
    return NextResponse.json({ error: err?.message || "Status check failed" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/whatsapp/status")

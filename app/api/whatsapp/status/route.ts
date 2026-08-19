import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { getEvolutionSessions, updateEvolutionSession, createEvolutionSession } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")
    const instanceName = req.nextUrl.searchParams.get("instanceName") // present before session created
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Case 1: instanceName provided — no session yet, check VPS directly
    if (instanceName) {
      const stateRes = await fetch(
        `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
        { headers: { apikey: EVOLUTION_KEY } }
      )
      const stateData = await stateRes.json()
      const state = stateData?.instance?.state

      if (state === "open") {
        // QR was scanned — now create the Supabase session
        const session = await createEvolutionSession(userId, instanceName)
        try { await updateEvolutionSession(session.id, { status: "connected" }) } catch {}
        return NextResponse.json({ status: "connected", session: { ...session, status: "connected" } })
      }
      return NextResponse.json({ status: "connecting", qr: null })
    }

    // Case 2: existing session — check its VPS state
    const sessions = await getEvolutionSessions(userId)
    const active = sessions.find(s => s.status === "connected" || s.status === "connecting")

    if (!active) {
      return NextResponse.json({ status: "disconnected" })
    }

    const stateRes = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${active.instance_name}`,
      { headers: { apikey: EVOLUTION_KEY } }
    )
    const stateData = await stateRes.json()
    const state = stateData?.instance?.state

    if (state === "open") {
      if (active.status !== "connected") {
        try { await updateEvolutionSession(active.id, { status: "connected" }) } catch {}
      }
      return NextResponse.json({
        status: "connected",
        session: { ...active, status: "connected" },
        phone: active.phone_number || null,
      })
    }

    return NextResponse.json({ status: "connecting", session: active, qr: null })
  } catch (err: any) {
    console.error("[WHATSAPP STATUS]", err)
    return NextResponse.json({ error: err?.message || "Status check failed" }, { status: 500 })
  }
}

export const GET = withApiLogging(_GET, "/api/whatsapp/status")

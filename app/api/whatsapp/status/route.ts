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
        { headers: { apikey: EVOLUTION_KEY }, cache: "no-store" }
      )
      const stateData = await stateRes.json()
      const state = stateData?.instance?.state

      if (state === "open") {
        // Fetch phone number from instance details
        let phoneNumber: string | null = null
        try {
          const instRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers: { apikey: EVOLUTION_KEY }, cache: "no-store" })
          const instances = await instRes.json()
          const inst = Array.isArray(instances) ? instances.find((i: any) => i.name === instanceName) : null
          phoneNumber = inst?.ownerJid?.replace(/@.+$/, "") || null
        } catch {}

        // Create the Supabase session now that QR was scanned
        const session = await createEvolutionSession(userId, instanceName)
        try { await updateEvolutionSession(session.id, { status: "connected", phone_number: phoneNumber } as any) } catch {}

        // Auto-configure webhook for real-time message delivery
        try {
          const webhookUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"
          await fetch(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
            body: JSON.stringify({
              webhook: {
                url: `${webhookUrl}/api/whatsapp/evolution/webhook`,
                enabled: true,
                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
              },
            }),
          })
          console.log(`[WA STATUS] Webhook configured for ${instanceName}`)
        } catch (e) { console.error("[WA STATUS] Webhook setup failed:", e) }

        return NextResponse.json({ status: "connected", session: { ...session, status: "connected", phone_number: phoneNumber } })
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
      { headers: { apikey: EVOLUTION_KEY }, cache: "no-store" }
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

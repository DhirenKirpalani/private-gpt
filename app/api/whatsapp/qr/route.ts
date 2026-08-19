import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { createAdminClient, createEvolutionSession, getEvolutionSessions, updateEvolutionSession, deleteEvolutionSession } from "@/lib/supabase"

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

    // Check for existing sessions — verify actual VPS state first
    const existing = await getEvolutionSessions(userId)
    const connectedSession = existing.find(s => s.status === "connected")

    if (connectedSession) {
      try {
        const stateRes = await fetch(
          `${EVOLUTION_URL}/instance/connectionState/${connectedSession.instance_name}`,
          { headers: { apikey: EVOLUTION_KEY } }
        )
        const stateData = await stateRes.json()
        if (stateData?.instance?.state === "open") {
          return NextResponse.json({ status: "connected", session: connectedSession })
        }
        // Stale connected session — clean it up
        await deleteEvolutionSession(userId, connectedSession.id)
        try { await fetch(`${EVOLUTION_URL}/instance/delete/${connectedSession.instance_name}`, { method: "DELETE", headers: { apikey: EVOLUTION_KEY } }) } catch {}
      } catch {}
    }

    // Clean up any stale connecting sessions in Supabase
    const staleSessions = existing.filter(s => s.status === "connecting")
    for (const s of staleSessions) {
      await deleteEvolutionSession(userId, s.id)
      try { await fetch(`${EVOLUTION_URL}/instance/delete/${s.instance_name}`, { method: "DELETE", headers: { apikey: EVOLUTION_KEY } }) } catch {}
    }

    // Clean up orphan VPS instances for this user (created but not tracked in Supabase)
    const userPrefix = `exploro_${userId.slice(0, 8)}_`
    try {
      const allInstancesRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers: { apikey: EVOLUTION_KEY } })
      const allInstances = await allInstancesRes.json()
      if (Array.isArray(allInstances)) {
        for (const inst of allInstances) {
          if (inst.name?.startsWith(userPrefix) && inst.connectionStatus !== "open") {
            try { await fetch(`${EVOLUTION_URL}/instance/delete/${inst.name}`, { method: "DELETE", headers: { apikey: EVOLUTION_KEY } }) } catch {}
          }
        }
      }
    } catch { /* ignore */ }

    // Create fresh instance — do NOT create Supabase session yet (only created after scan)
    const instanceName = `exploro_${userId.slice(0, 8)}_${Date.now()}`

    const createRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS", token: `exploro_${Date.now()}` }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) {
      console.error("[EVOLUTION] Create instance failed:", createData)
      return NextResponse.json({ error: "Failed to create instance" }, { status: 500 })
    }

    const connectRes = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, { headers: { apikey: EVOLUTION_KEY } })
    const connectData = await connectRes.json()
    const qrCode = connectData?.base64 || connectData?.qrcode?.base64 || null

    // Return instanceName so frontend can poll and create session only after scan
    return NextResponse.json({ status: "connecting", qr: qrCode, instanceName })
  } catch (err: any) {
    console.error("[WHATSAPP QR]", err)
    return NextResponse.json({ error: err?.message || "Failed to get QR" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/qr")

export async function DELETE(req: NextRequest) {
  try {
    const { instanceName } = await req.json()
    if (!instanceName || !EVOLUTION_URL || !EVOLUTION_KEY) return NextResponse.json({ ok: true })
    await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: EVOLUTION_KEY },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

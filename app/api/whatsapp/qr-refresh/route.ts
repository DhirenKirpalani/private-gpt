import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json()
    if (!instanceName || !EVOLUTION_URL || !EVOLUTION_KEY) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 })
    }

    // Only refresh if instance is still in connecting state (not open)
    const stateRes = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
      { headers: { apikey: EVOLUTION_KEY }, cache: "no-store" }
    )
    const stateData = await stateRes.json()
    const state = stateData?.instance?.state

    if (state === "open") {
      return NextResponse.json({ status: "connected" })
    }

    // Safe to refresh QR — instance is still connecting
    const qrRes = await fetch(
      `${EVOLUTION_URL}/instance/connect/${instanceName}`,
      { headers: { apikey: EVOLUTION_KEY } }
    )
    const qrData = await qrRes.json()
    const qr = qrData?.base64 || qrData?.qrcode?.base64 || null

    return NextResponse.json({ status: "connecting", qr })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Refresh failed" }, { status: 500 })
  }
}

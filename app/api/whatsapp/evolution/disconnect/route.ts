import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { getEvolutionSessions, deleteEvolutionSession } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await req.json()
    if (!userId || !sessionId) {
      return NextResponse.json({ error: "Missing userId or sessionId" }, { status: 400 })
    }

    const sessions = await getEvolutionSessions(userId)
    const session = sessions.find(s => s.id === sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Logout from Evolution API
    try {
      await fetch(
        `${EVOLUTION_URL}/instance/logout/${session.instance_name}`,
        {
          method: "DELETE",
          headers: { apikey: EVOLUTION_KEY },
        }
      )
    } catch {
      // Instance may already be gone
    }

    // Delete from Supabase
    await deleteEvolutionSession(userId, sessionId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[WHATSAPP DISCONNECT]", err)
    return NextResponse.json({ error: err?.message || "Disconnect failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/evolution/disconnect")

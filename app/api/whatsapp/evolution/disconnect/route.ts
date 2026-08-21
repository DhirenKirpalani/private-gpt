import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { getEvolutionSessions, deleteEvolutionSession, createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""

async function _POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await req.json()
    if (!userId || !sessionId) {
      return NextResponse.json({ error: "Missing userId or sessionId" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: sessionData } = await admin
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single()

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    const session = sessionData

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

    // Delete from Supabase (messages + session)
    await deleteEvolutionSession(userId, sessionId)

    // Remove WhatsApp-synced contacts (source=whatsapp_sync only — keeps manually added contacts)
    await admin.from("contacts").delete().eq("user_id", userId).eq("source", "whatsapp_sync")

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[WHATSAPP DISCONNECT]", err)
    return NextResponse.json({ error: err?.message || "Disconnect failed" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/whatsapp/evolution/disconnect")

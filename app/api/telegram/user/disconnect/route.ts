import { NextRequest, NextResponse } from "next/server"
import { deleteUserSession } from "@/lib/telegram-user"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    await deleteUserSession(userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[TG USER DISCONNECT]", err)
    return NextResponse.json({ error: err?.message || "Failed to disconnect" }, { status: 500 })
  }
}

export const POST = _POST

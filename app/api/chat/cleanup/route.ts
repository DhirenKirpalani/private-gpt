import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch all assistant messages that contain action blocks
    const { data: messages, error: fetchError } = await supabase
      .from("chat_messages")
      .select("id, content")
      .like("content", "%<!--ACTION:%")

    if (fetchError) throw fetchError

    let updated = 0
    for (const msg of messages || []) {
      const cleanContent = (msg.content || "")
        .replace(/<!--ACTION:{[\s\S]+?}-->/g, "")
        .trim()
      
      if (cleanContent !== msg.content) {
        const { error: updateError } = await supabase
          .from("chat_messages")
          .update({ content: cleanContent })
          .eq("id", msg.id)
        
        if (!updateError) updated++
      }
    }

    return NextResponse.json({ 
      success: true, 
      totalFound: messages?.length || 0,
      updated 
    })
  } catch (err: any) {
    console.error("[CLEANUP] Error:", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

async function _POST(req: NextRequest) {
  try {
    const { userId, conversationId, messages } = await req.json()
    if (!userId || !messages || !Array.isArray(messages) || messages.length < 4) {
      return NextResponse.json({ skipped: true, reason: "Not enough messages" })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ skipped: true, reason: "No API key" })
    }

    // Fetch existing memories to avoid duplicates
    const { data: existingMemories } = await supabase
      .from("ai_long_term_memories")
      .select("content")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50)

    const existingContent = (existingMemories || []).map((m: any) => m.content)

    // Build conversation summary for extraction
    const conversationText = messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n\n")
      .slice(-4000) // Last 4000 chars to stay within token limits

    const extractionPrompt = `You are a memory extraction system. Analyze the following conversation and extract important long-term memories about the user.

Existing memories (DO NOT duplicate these):
${existingContent.length > 0 ? existingContent.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n") : "(none yet)"}

Conversation:
${conversationText}

Extract NEW memories only. Focus on:
- "preference": User preferences (communication style, workflow, tools, formats)
- "contact": People the user interacts with (name, email, phone, role, company)
- "fact": Important facts about the user's business, projects, or situation
- "decision": Decisions the user has made
- "instruction": Standing instructions the user wants the AI to follow

Rules:
- Only extract genuinely useful, non-trivial information
- Skip greetings, small talk, and temporary context
- Be concise — each memory should be a single clear statement
- Do NOT duplicate or slightly rephrase existing memories

Respond in JSON format:
{"memories": [{"content": "User prefers emails in Spanish", "category": "preference", "importance": 7}, ...]}

If no new memories are worth extracting, respond with: {"memories": []}`

    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: extractionPrompt },
          { role: "user", content: "Extract memories from the conversation above." },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      console.error("[MEMORY EXTRACT] DeepSeek failed:", res.status)
      return NextResponse.json({ skipped: true, reason: "Extraction API failed" })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    let extracted: { memories: any[] }
    try {
      extracted = JSON.parse(content)
    } catch {
      console.error("[MEMORY EXTRACT] Failed to parse JSON:", content)
      return NextResponse.json({ skipped: true, reason: "Parse error" })
    }

    const memories = extracted.memories || []
    if (memories.length === 0) {
      return NextResponse.json({ extracted: 0, memories: [] })
    }

    // Insert new memories (dedup by checking existing content similarity)
    let inserted = 0
    for (const mem of memories) {
      const memContent = String(mem.content || "").trim()
      if (!memContent) continue

      // Skip if very similar to existing
      const isDuplicate = existingContent.some((existing: string) => {
        const existingLower = existing.toLowerCase()
        const newLower = memContent.toLowerCase()
        return existingLower === newLower ||
          (existingLower.length > 20 && newLower.length > 20 &&
           (existingLower.includes(newLower) || newLower.includes(existingLower)))
      })
      if (isDuplicate) continue

      const { error } = await supabase.from("ai_long_term_memories").insert({
        user_id: userId,
        conversation_id: conversationId || null,
        content: memContent,
        category: ["preference", "contact", "fact", "decision", "instruction", "general"].includes(mem.category) ? mem.category : "general",
        importance: Math.min(10, Math.max(1, parseInt(mem.importance) || 5)),
        is_active: true,
      })

      if (!error) {
        inserted++
        existingContent.push(memContent)
      }
    }

    return NextResponse.json({ extracted: inserted, memories })
  } catch (err: any) {
    console.error("[MEMORY EXTRACT]", err)
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export const POST = _POST

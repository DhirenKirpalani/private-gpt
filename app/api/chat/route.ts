import { NextRequest, NextResponse } from "next/server"

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

const MAX_TOKENS_MAP: Record<string, number> = {
  Standard: 4000,
  Detailed: 6000,
  Comprehensive: 8000,
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured. Add DEEPSEEK_API_KEY to your .env file." },
        { status: 500 }
      )
    }

    const { messages, systemPrompt, responseLength } = await req.json()

    const maxTokens = MAX_TOKENS_MAP[responseLength] ?? 2000

    const body = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful AI business assistant." },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""
    const finishReason = data.choices?.[0]?.finish_reason ?? "unknown"
    if (finishReason === "length") {
      console.warn("[CHAT] Response truncated (finish_reason=length) — action block may be missing. Consider increasing max_tokens.")
    }
    console.log(`[CHAT] finish_reason=${finishReason} content_length=${content.length} has_action=${content.includes("<!--ACTION:")}`)
    return NextResponse.json({ content })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 })
  }
}

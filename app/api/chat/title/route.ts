import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

async function _POST(req: NextRequest) {
  try {
    const { userMessage, assistantMessage } = await req.json()
    if (!userMessage) return NextResponse.json({ error: "Missing userMessage" }, { status: 400 })

    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        stream: false,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a conversation title generator. Respond with only a short 3-5 word title summarizing what the user asked. No quotes, no punctuation, no explanation.",
          },
          { role: "user", content: userMessage.slice(0, 500) },
          ...(assistantMessage ? [{ role: "assistant", content: assistantMessage.slice(0, 500) }] : []),
          { role: "user", content: "Title:" },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[CHAT TITLE] DeepSeek error:", err)
      return NextResponse.json({ error: "AI error" }, { status: 500 })
    }

    const data = await res.json()
    const title = (data.choices?.[0]?.message?.content ?? "")
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/^Title:\s*/i, "")
      .trim()
      .slice(0, 50)

    return NextResponse.json({ title })
  } catch (err: any) {
    console.error("[CHAT TITLE] Error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/chat/title")

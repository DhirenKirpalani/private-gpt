import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

const MAX_TOKENS_MAP: Record<string, number> = {
  Standard: 6000,
  Detailed: 8000,
  Comprehensive: 10000,
}

async function POST_handler(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured. Add DEEPSEEK_API_KEY to your .env file." },
        { status: 500 }
      )
    }

    const { messages, systemPrompt, responseLength, stream: wantStream } = await req.json()

    const maxTokens = MAX_TOKENS_MAP[responseLength] ?? 2000

    const body: Record<string, any> = {
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

    // ── Streaming mode ────────────────────────────────────────────
    if (wantStream) {
      body.stream = true
      body.stream_options = { include_usage: true }

      const response = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json({ error: errorText }, { status: response.status })
      }

      if (!response.body) {
        return NextResponse.json({ error: "No response body from AI service" }, { status: 500 })
      }

      // Create a ReadableStream that pipes SSE from DeepSeek to the client
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader()
          let buffer = ""
          let fullContent = ""
          let usage: any = null
          let finishReason = "unknown"

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith("data: ")) continue

                const data = trimmed.slice(6)
                if (data === "[DONE]") {
                  // Send final event with usage and full content
                  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ usage, finishReason, content: fullContent })}\n\n`))
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta?.content ?? ""
                  if (delta) {
                    fullContent += delta
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
                  }
                  if (parsed.choices?.[0]?.finish_reason) {
                    finishReason = parsed.choices[0].finish_reason
                  }
                  if (parsed.usage) {
                    usage = parsed.usage
                  }
                } catch {
                  // Skip malformed chunks
                }
              }
            }
          } catch (err: any) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: err?.message ?? "Stream error" })}\n\n`))
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }

    // ── Non-streaming mode (fallback) ─────────────────────────────
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""
    const finishReason = data.choices?.[0]?.finish_reason ?? "unknown"
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    if (finishReason === "length") {
      console.warn("[CHAT] Response truncated (finish_reason=length) — action block may be missing. Consider increasing max_tokens.")
    }
    console.log(`[CHAT] finish_reason=${finishReason} content_length=${content.length} has_action=${content.includes("<!--ACTION:")} tokens=${usage.total_tokens}`)
    return NextResponse.json({ content, usage })
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return NextResponse.json({ error: "The AI service took too long to respond. Please try again." }, { status: 504 })
    }
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 })
  }
}

export const POST = withApiLogging(POST_handler, "/api/chat")

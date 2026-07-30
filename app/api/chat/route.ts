import { NextRequest, NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"
import { createClient } from "@supabase/supabase-js"
import { checkUsage, TOKEN_LIMITS } from "@/lib/token-limits"

export const dynamic = "force-dynamic"

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_TOKENS_MAP: Record<string, number> = {
  Standard: 6000,
  Detailed: 8000,
  Comprehensive: 10000,
}

// Graceful degradation: when >80% token quota, reduce response length
const DEGRADED_MAX_TOKENS: Record<string, number> = {
  Standard: 3000,
  Detailed: 4000,
  Comprehensive: 5000,
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

    const { messages, systemPrompt, responseLength, stream: wantStream, userId } = await req.json()

    // ── Token usage guardrail ────────────────────────────────────
    if (!userId) {
      console.warn("[CHAT] Request received without userId — rejecting")
      return NextResponse.json({ error: "Unauthorized: userId is required" }, { status: 401 })
    }

    const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single()

      const usage = await checkUsage(userId, sub)

      if (!usage.allowed) {
        const message =
          usage.reason === "trial_expired"
            ? "Your free trial has ended. Please upgrade to continue using the AI assistant."
            : usage.reason === "token_limit"
            ? `You've reached your monthly token limit (${usage.tokensUsed.toLocaleString()} / ${usage.tokenLimit.toLocaleString()} tokens). Upgrade your plan for more usage.`
            : `You've reached your daily message limit (${usage.messagesUsedToday} / ${usage.messageLimit} messages). Please try again tomorrow.`
        return NextResponse.json(
          { error: message, quotaExceeded: true, reason: usage.reason, usage },
          { status: 429 }
        )
      }

      // Graceful degradation: if >80% of token quota, use shorter responses
      const maxTokens = usage.degradeToShorter
        ? (DEGRADED_MAX_TOKENS[responseLength] ?? 2000)
        : (MAX_TOKENS_MAP[responseLength] ?? 2000)

      // Include usage info in response headers for frontend
      const baseBody: Record<string, any> = {
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
        baseBody.stream = true
        baseBody.stream_options = { include_usage: true }

        const response = await fetch(DEEPSEEK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(baseBody),
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
            let usageData: any = null
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
                    controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ usage: usageData, finishReason, content: fullContent })}\n\n`))
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
                      usageData = parsed.usage
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

        // Add usage info as response headers
        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Usage-Tokens-Used": String(usage.tokensUsed),
            "X-Usage-Token-Limit": String(usage.tokenLimit),
            "X-Usage-Messages-Today": String(usage.messagesUsedToday),
            "X-Usage-Message-Limit": String(usage.messageLimit),
            "X-Usage-Plan": usage.plan,
            "X-Usage-Degraded": String(usage.degradeToShorter || false),
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
        body: JSON.stringify(baseBody),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json({ error: errorText }, { status: response.status })
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content ?? ""
      const finishReason = data.choices?.[0]?.finish_reason ?? "unknown"
      const usageData = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      if (finishReason === "length") {
        console.warn("[CHAT] Response truncated (finish_reason=length) — action block may be missing. Consider increasing max_tokens.")
      }
      console.log(`[CHAT] finish_reason=${finishReason} content_length=${content.length} has_action=${content.includes("<!--ACTION:")} tokens=${usageData.total_tokens} usage_check=${usage.tokensUsed}/${usage.tokenLimit} degraded=${usage.degradeToShorter}`)
      return NextResponse.json({ content, usage: usageData })
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return NextResponse.json({ error: "The AI service took too long to respond. Please try again." }, { status: 504 })
    }
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 })
  }
}

export const POST = withApiLogging(POST_handler, "/api/chat")

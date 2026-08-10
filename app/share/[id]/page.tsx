import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("title")
    .eq("id", params.id)
    .maybeSingle()
  return {
    title: conv?.title ? `${conv.title} · Exploro AI` : "Shared Conversation · Exploro AI",
  }
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("id, title, created_at")
    .eq("id", params.id)
    .maybeSingle()

  if (!conv) notFound()

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })

  const cleanContent = (content: string) =>
    content
      .replace(/<!--ACTION[^>]*-->/g, "")
      .replace(/<!--ACTION2_B64[^>]*-->/g, "")
      .replace(/<!--ACTION_B64[^>]*-->/g, "")
      .trim()

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0d1117]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/assets/images/exploro-logo.png" alt="Exploro" className="h-7 w-auto object-contain" />
            <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
          </Link>
          <Link
            href="/chat"
            className="rounded-lg bg-emerald-600/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/25 transition-colors"
          >
            Try Exploro AI
          </Link>
        </div>
      </header>

      {/* Conversation */}
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <h1 className="mb-1 text-xl font-semibold text-white">{conv.title || "Shared Conversation"}</h1>
        <p className="mb-8 text-xs text-muted-foreground">
          {new Date(conv.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          {" · Shared from Exploro AI"}
        </p>

        <div className="space-y-6">
          {(messages ?? []).map(msg => {
            const content = cleanContent(msg.content)
            if (!content) return null
            const isUser = msg.role === "user"
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-500/20 mt-0.5">
                    <img src="/assets/images/exploro-icon.svg" alt="" className="h-4 w-4 object-contain" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "rounded-tr-sm bg-emerald-600/20 text-white border border-emerald-500/20"
                      : "rounded-tl-sm bg-white/5 text-slate-200 border border-white/8"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{content}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/30">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0d1117]/95 backdrop-blur-md py-4 px-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-xs text-muted-foreground">This is a read-only shared conversation.</p>
          <Link
            href="/chat"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Start your own chat →
          </Link>
        </div>
      </div>
    </div>
  )
}

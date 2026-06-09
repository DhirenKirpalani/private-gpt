"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Plus, MessageSquare, Search, Send, Paperclip, Mic,
  Bot, Copy, RefreshCw, Share2,
  PanelLeftClose,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  confidence?: "high" | "medium" | "low"
  timestamp: Date
}

const recentChats = [
  { id: "1", title: "Sales Proposal Draft", time: "2h ago" },
  { id: "2", title: "Customer Support SOP", time: "5h ago" },
  { id: "3", title: "Marketing Strategy Q3", time: "Yesterday" },
  { id: "4", title: "Restaurant Operations", time: "2d ago" },
  { id: "5", title: "Contract Review", time: "3d ago" },
]

const loadingStates = [
  "Searching knowledge base...",
  "Analyzing documents...",
  "Reviewing sources...",
  "Generating response...",
]

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Close sidebars by default on mobile so they don't overlap
  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile) { setSidebarOpen(false) }
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const toggleSidebar = () => {
    setSidebarOpen(v => !v)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    let i = 0
    const iv = setInterval(() => { setLoadingText(loadingStates[i++ % loadingStates.length]) }, 900)
    await new Promise(r => setTimeout(r, 3600))
    clearInterval(iv)
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Based on your business knowledge, here is a detailed response to: "${userMsg.content}"\n\nYour indexed documents contain relevant information across multiple sources. Key findings:\n\n1. Your SOPs define a clear process for this scenario\n2. Previous communications align with this approach\n3. Based on your brand guidelines, proceed with the standard workflow\n\nAll information has been verified against your private knowledge base.`,
      sources: ["Company_SOP.pdf · Page 3", "Brand_Guidelines.docx · Page 7", "Knowledge Base"],
      confidence: "high",
      timestamp: new Date(),
    }])
    setLoading(false)
    setLoadingText("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* ── HEADER ── */}
      <header className="flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-visible border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-2 overflow-visible">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={70}
              priority
              className="w-auto object-contain"
              style={{ height: "140px" }}
            />
          </Link>
        </div>
        <div className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Search chats, documents, knowledge, files..."
            />
          </div>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2 md:gap-3 md:flex-none">
          <div className="flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[10px] md:text-xs font-bold text-white">
            E
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── NAV RAIL (desktop only) ── */}
        <div className="hidden md:block">
          <NavRail />
        </div>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-10 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── LEFT SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background overflow-hidden md:static md:bg-card/30 md:shrink-0">
            <div className="p-3 pb-2">
              <button
                onClick={() => setMessages([])}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
              {recentChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setMessages([])}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{chat.title}</div>
                    <div className="text-xs text-muted-foreground">{chat.time}</div>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* ── MAIN WORKSPACE ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-8">

              {/* Greeting */}
              <div className="mb-8 w-full max-w-3xl">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Good morning,</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Alex</h2>
              </div>

              <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
                Ask your AI anything about your business knowledge.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto p-3 sm:p-6">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    msg.role === "user" ? "bg-muted text-foreground" : "bg-emerald-600 text-white"
                  )}>
                    {msg.role === "user" ? "U" : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("max-w-[72%] space-y-2", msg.role === "user" && "flex flex-col items-end")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-tr-sm bg-emerald-600 text-white"
                        : "rounded-tl-sm border bg-card"
                    )}>
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className={cn("mt-0.5", line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') ? "ml-2" : "")}>
                          {line}
                        </p>
                      ))}
                    </div>
                    {msg.role === "assistant" && msg.sources && (
                      <div className="flex gap-0.5 pl-1">
                        {[Copy, RefreshCw, Share2].map((Icon, i) => (
                          <button key={i} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                      {loadingText}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── INPUT ── */}
          <div className="shrink-0 border-t bg-background px-3 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/25 transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="Ask your AI about your business..."
                  className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                  <div className="flex gap-0.5">
                    {[{ icon: Paperclip, label: "Attach" }, { icon: Mic, label: "Voice" }].map(a => (
                      <button key={a.label} title={a.label} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <a.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Exploro AI answers from your private business knowledge only.
              </p>
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}

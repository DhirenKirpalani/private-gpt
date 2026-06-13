"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Plus, MessageSquare, Search, Send, Paperclip, Mic,
  Bot, Copy, RefreshCw, Share2, Sparkles,
  PanelLeftClose, Palette, X, Check, User,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { getProfile } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  confidence?: "high" | "medium" | "low"
  timestamp: Date
}

const loadingStateKeys = [
  "chatLoading1",
  "chatLoading2",
  "chatLoading3",
  "chatLoading4",
] as const

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function ChatPage() {
  const { user } = useAuth()
  const { t, lang, setLang } = useI18n()
  const loadingStates = loadingStateKeys.map(k => t(k))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  const [colorPanelOpen, setColorPanelOpen] = useState(false)
  const [chatBg, setChatBg] = useState("bg-background")
  const [customSolid, setCustomSolid] = useState("#202733")
  const [customGradientFrom, setCustomGradientFrom] = useState("#1a2332")
  const [customGradientTo, setCustomGradientTo] = useState("#202733")
  const [userInitials, setUserInitials] = useState("")
  const [userName, setUserName] = useState("")
  const [greeting, setGreeting] = useState("")
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    // Determine greeting based on user's local time
    const hour = new Date().getHours()
    let key: Parameters<typeof t>[0]
    if (hour >= 5 && hour < 12) key = "greetingMorning"
    else if (hour >= 12 && hour < 17) key = "greetingAfternoon"
    else if (hour >= 17 && hour < 21) key = "greetingEvening"
    else key = "greetingNight"
    setGreeting(t(key))
  }, [t])

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
      } catch {
        const name = user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
      }
    }
    load()
  }, [user])

  const recentChats = [
    { id: "1", title: t("chatRecent1"), time: t("chatTime2h") },
    { id: "2", title: t("chatRecent2"), time: t("chatTime5h") },
    { id: "3", title: t("chatRecent3"), time: t("chatTimeYesterday") },
    { id: "4", title: t("chatRecent4"), time: t("chatTime2d") },
    { id: "5", title: t("chatRecent5"), time: t("chatTime3d") },
  ]

  const solidColors = [
    { label: t("chatColorDark"), value: "bg-background" },
    { label: t("chatColorNavy"), value: "bg-[#1a2332]" },
    { label: t("chatColorCharcoal"), value: "bg-[#252b36]" },
    { label: t("chatColorDeepGreen"), value: "bg-[#0f2417]" },
    { label: t("chatColorMidnight"), value: "bg-[#141b2d]" },
  ]

  const gradients = [
    { label: t("chatColorEmeraldMist"), value: "bg-gradient-to-br from-emerald-950/40 via-background to-background" },
    { label: t("chatColorVioletHaze"), value: "bg-gradient-to-br from-violet-950/30 via-background to-emerald-950/20" },
    { label: t("chatColorOceanDepth"), value: "bg-gradient-to-b from-[#1a2332] via-[#202733] to-background" },
    { label: t("chatColorForestGlow"), value: "bg-gradient-to-tr from-emerald-900/20 via-background to-emerald-950/40" },
    { label: t("chatColorSoftDark"), value: "bg-gradient-to-b from-[#252b36] to-[#1e2530]" },
  ]

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
      content: t("chatDemoResponse", { query: userMsg.content }),
      sources: [t("chatDemoSource1"), t("chatDemoSource2"), t("chatDemoSource3")],
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
              placeholder={t("chatSearchPlaceholder")}
            />
          </div>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2 md:gap-3 md:flex-none">
          {/* Language toggle */}
          <div className="hidden items-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:inline-flex">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                lang === "en"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("es")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                lang === "es"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              ES
            </button>
          </div>
          <button
            onClick={() => setColorPanelOpen(o => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              colorPanelOpen ? "bg-emerald-600/15 text-emerald-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={t("chatThemeTitle")}
          >
            <Palette className="h-5 w-5" />
            <span className="hidden sm:inline">{t("chatTheme")}</span>
          </button>
          <Link href="/profile" className="flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[10px] md:text-xs font-bold text-white hover:bg-emerald-500 transition-colors overflow-hidden">
            {userInitials || <User className="h-4 w-4 text-white" />}
          </Link>
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
          <aside className="absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-white/5 bg-[#2a3444] overflow-hidden md:static md:shrink-0">
            <div className="p-3 pb-2">
              <button
                onClick={() => setMessages([])}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> {t("chatNewConversation")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("chatRecent")}</p>
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
        <main className={cn("relative flex flex-1 flex-col overflow-hidden", chatBg)}>
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-10">

              {/* Greeting */}
              <div className="mb-2 text-center">
                <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
                <h2 className="pb-1 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{mounted ? (userName || user?.user_metadata?.full_name || "") : "\u00A0"}</h2>
              </div>

              <p className="mb-8 max-w-md text-center text-base text-muted-foreground">
                {t("chatEmptyPrompt")}
              </p>

              {/* Suggestion cards */}
              <div className="w-full max-w-2xl">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("chatTryAsking")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    t("chatSuggestion1"),
                    t("chatSuggestion2"),
                    t("chatSuggestion3"),
                    t("chatSuggestion4"),
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setInput(suggestion); }}
                      className="card-3d flex items-start gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4 text-left shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-900/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-white">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto p-3 sm:p-6">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    msg.role === "user" ? "bg-muted text-foreground" : "bg-emerald-600 text-white"
                  )}>
                    {msg.role === "user"
                      ? (userInitials || <User className="h-4 w-4" />)
                      : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("max-w-[72%] space-y-2", msg.role === "user" && "flex flex-col items-end")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-tr-sm bg-emerald-600 text-white"
                        : "rounded-tl-sm border border-white/5 bg-[#2a3444] shadow-lg shadow-emerald-900/5"
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
                  <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-[#2a3444] px-4 py-3 shadow-lg shadow-emerald-900/5">
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

          {/* Color Config Panel */}
          {colorPanelOpen && (
            <div className="absolute right-3 top-3 z-30 w-64 rounded-2xl border border-white/10 bg-[#2a3444] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{t("chatBgTitle")}</h3>
                <button onClick={() => setColorPanelOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("chatBgSolid")}</p>
              <div className="mb-4 grid grid-cols-5 gap-2">
                {solidColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setChatBg(c.value)}
                    title={c.label}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-lg border transition-all",
                      c.value === chatBg ? "border-emerald-400 ring-1 ring-emerald-400" : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <div className={cn("h-5 w-5 rounded", c.value)} />
                    {c.value === chatBg && <Check className="absolute h-3 w-3 text-emerald-400" />}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("chatBgGradients")}</p>
              <div className="space-y-1.5">
                {gradients.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setChatBg(g.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all",
                      g.value === chatBg ? "border-emerald-400/50 bg-emerald-600/10 text-emerald-400" : "border-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                    )}
                  >
                    <div className={cn("h-4 w-4 rounded-full", g.value)} />
                    {g.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("chatBgCustomSolid")}</p>
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="color"
                  value={customSolid}
                  onChange={e => { setCustomSolid(e.target.value); setChatBg(`bg-[${e.target.value}]`) }}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={customSolid}
                  onChange={e => { setCustomSolid(e.target.value); setChatBg(`bg-[${e.target.value}]`) }}
                  className="h-8 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="#202733"
                />
              </div>

              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("chatBgCustomGradient")}</p>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="color"
                  value={customGradientFrom}
                  onChange={e => { setCustomGradientFrom(e.target.value); setChatBg(`bg-gradient-to-b from-[${e.target.value}] to-[${customGradientTo}]`) }}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={customGradientFrom}
                  onChange={e => { setCustomGradientFrom(e.target.value); setChatBg(`bg-gradient-to-b from-[${e.target.value}] to-[${customGradientTo}]`) }}
                  className="h-8 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="#1a2332"
                />
              </div>
              <div className="mb-1 flex items-center gap-2">
                <input
                  type="color"
                  value={customGradientTo}
                  onChange={e => { setCustomGradientTo(e.target.value); setChatBg(`bg-gradient-to-b from-[${customGradientFrom}] to-[${e.target.value}]`) }}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={customGradientTo}
                  onChange={e => { setCustomGradientTo(e.target.value); setChatBg(`bg-gradient-to-b from-[${customGradientFrom}] to-[${e.target.value}]`) }}
                  className="h-8 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="#202733"
                />
              </div>
            </div>
          )}

          {/* ── INPUT ── */}
          <div className="shrink-0 border-t bg-background/80 backdrop-blur-md px-3 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-2xl border border-white/5 bg-[#2a3444] shadow-lg shadow-emerald-900/5 focus-within:ring-2 focus-within:ring-emerald-500/25 transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder={t("chatInputPlaceholder")}
                  className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                  <div className="flex gap-0.5">
                    {[{ icon: Paperclip, label: t("chatAttach") }, { icon: Mic, label: t("chatVoice") }].map(a => (
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
                {t("chatFooter")}
              </p>
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}

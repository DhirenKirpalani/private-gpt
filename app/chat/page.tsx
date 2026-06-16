"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Plus, MessageSquare, Search, Send, BookOpen, Globe, Radio,
  Bot, Copy, RefreshCw, Share2, Sparkles,
  PanelLeftClose, X, User, SunMoon,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { getProfile, fetchUserDocuments } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"
import { CinematicBackground } from "@/components/cinematic-background"
import { compileTheme, type ThemeStyle, type ThemeMood, getBrandInputColors } from "@/lib/theme-engine"
import { AnimatedPlaceholder } from "@/components/animated-placeholder"

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
  const { user, avatarUrl, loading: authLoading } = useAuth()
  const { t, lang, setLang } = useI18n()
  const loadingStates = loadingStateKeys.map(k => t(k))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  // Lazy-init from localStorage (synchronous before first render, avoids flash)
  const [themePrimary, setThemePrimary] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("exploro_theme_primary") || "#05060A" : "#05060A"
  )
  const [themeSecondary, setThemeSecondary] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("exploro_theme_secondary") || "" : ""
  )
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("exploro_theme_style") as ThemeStyle) || "cinematic" : "cinematic"
  )
  const [themeMood, setThemeMood] = useState<ThemeMood>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("exploro_theme_mood") as ThemeMood) || "futuristic" : "futuristic"
  )

  const theme = useMemo(
    () => compileTheme({ primaryColor: themePrimary, secondaryColor: themeSecondary, style: themeStyle, mood: themeMood }),
    [themePrimary, themeSecondary, themeStyle, themeMood]
  )
  const [inputDark, setInputDark] = useState(false)
  const brandInput = useMemo(() => getBrandInputColors(themePrimary, themeSecondary || undefined), [themePrimary, themeSecondary])
  const [userInitials, setUserInitials] = useState("")
  const [userName, setUserName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [greeting, setGreeting] = useState("")
  const [mounted, setMounted] = useState(false)
  const [activeInputTab, setActiveInputTab] = useState<"knowledge" | "channels" | "websearch" | null>(null)
  const [kbDocs, setKbDocs] = useState<{ id: string; index: number; name: string; category: string }[]>([])
  const [kbLoading, setKbLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const kbPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setGreeting("Hi")
    setInputDark(localStorage.getItem("exploro_input_dark") === "true")
  }, [])

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        console.log("[CHAT DEBUG] Raw profile:", profile)
        console.log("[CHAT DEBUG] logo_url:", profile?.logo_url)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
        localStorage.setItem("exploro_user_name", name)
        setLogoUrl(profile?.logo_url || "")
        console.log("[CHAT DEBUG] logoUrl state set to:", profile?.logo_url || "")
        // Always load theme from DB — DB is authoritative, only written by profile page Save button
        const colors = profile?.brand_colors
        const savedStyle = profile?.brand_style as ThemeStyle
        const savedMood = profile?.brand_mood as ThemeMood
        if (Array.isArray(colors) && colors.length >= 1 && colors[0]) {
          setThemePrimary(colors[0])
          localStorage.setItem("exploro_theme_primary", colors[0])
          setThemeSecondary(colors[1] || "")
          localStorage.setItem("exploro_theme_secondary", colors[1] || "")
        }
        if (savedStyle) {
          setThemeStyle(savedStyle)
          localStorage.setItem("exploro_theme_style", savedStyle)
        }
        if (savedMood) {
          setThemeMood(savedMood)
          localStorage.setItem("exploro_theme_mood", savedMood)
        }
      } catch {
        const name = user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
      }
    }
    load()
  }, [user])

  // Sync theme changes to localStorage (DB writes happen only via profile page Save button)
  useEffect(() => {
    localStorage.setItem("exploro_theme_primary", themePrimary)
    localStorage.setItem("exploro_theme_secondary", themeSecondary)
    localStorage.setItem("exploro_theme_style", themeStyle)
    localStorage.setItem("exploro_theme_mood", themeMood)
  }, [themePrimary, themeSecondary, themeStyle, themeMood])

  const recentChats = [
    { id: "1", title: t("chatRecent1"), time: t("chatTime2h") },
    { id: "2", title: t("chatRecent2"), time: t("chatTime5h") },
    { id: "3", title: t("chatRecent3"), time: t("chatTimeYesterday") },
    { id: "4", title: t("chatRecent4"), time: t("chatTime2d") },
    { id: "5", title: t("chatRecent5"), time: t("chatTime3d") },
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
    const docRefs = input.match(/#(\d+)/g)
    let docContext = ""
    if (docRefs && kbDocs.length > 0) {
      const refDocs = docRefs
        .map(ref => kbDocs.find(d => d.index === parseInt(ref.slice(1))))
        .filter(Boolean)
      if (refDocs.length > 0) {
        docContext = `\n\n📚 Referenced from your Knowledge Base: ${refDocs.map(d => `#${d!.index} "${d!.name}"`).join(", ")}`
      }
    }
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setActiveInputTab(null)
    setLoading(true)
    let i = 0
    const iv = setInterval(() => { setLoadingText(loadingStates[i++ % loadingStates.length]) }, 900)
    await new Promise(r => setTimeout(r, 3600))
    clearInterval(iv)
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: t("chatDemoResponse", { query: userMsg.content }) + docContext,
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

  useEffect(() => {
    if (activeInputTab !== "knowledge") return
    function handleClick(e: MouseEvent) {
      if (!kbPanelRef.current?.contains(e.target as Node)) setActiveInputTab(null)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [activeInputTab])

  async function loadKbDocs() {
    if (!user || kbDocs.length > 0) return
    setKbLoading(true)
    try {
      const docs = await fetchUserDocuments(user.id)
      setKbDocs(docs.map((d: any, i: number) => ({
        id: d.id,
        index: i + 1,
        name: d.original_filename,
        category: d.category || "Uncategorized",
      })))
    } catch { /* silent */ } finally {
      setKbLoading(false)
    }
  }

  function handleTabClick(tab: "knowledge" | "channels" | "websearch") {
    if (activeInputTab === tab) { setActiveInputTab(null); return }
    setActiveInputTab(tab)
    if (tab === "knowledge") loadKbDocs()
  }

  function insertDocRef(index: number) {
    setInput(prev => {
      const ref = `#${index} `
      return prev === "" || prev.endsWith(" ") ? prev + ref : prev + " " + ref
    })
    setActiveInputTab(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">

      {/* ── HEADER ── */}
      <header
        className="relative z-10 flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-hidden border-b border-white/5 px-3 md:px-4"
        style={{
          backgroundColor: theme.ui.surfaceBg,
          backdropFilter: `blur(${theme.ui.glassBlur}px)`,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-2 overflow-hidden">
            <img
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              className="w-auto object-contain"
              style={{ height: "40px" }}
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
          <Link href="/profile" className={cn(
            "relative flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full text-[10px] md:text-xs font-bold text-white transition-colors overflow-hidden",
            authLoading || avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600 hover:bg-emerald-500"
          )}>
            {!authLoading && !avatarUrl && (userInitials || <User className="h-4 w-4 text-white" />)}
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Cinematic background layers */}
        {mounted && (
          <CinematicBackground
            primaryColor={themePrimary}
            secondaryColor={themeSecondary}
            style={themeStyle}
            mood={themeMood}
          />
        )}

        {/* ── NAV RAIL (desktop only) ── */}
        <div className="relative z-10 hidden md:block">
          <NavRail />
        </div>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-10 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── LEFT SIDEBAR ── */}
        {sidebarOpen && (
          <aside
            className="absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-white/5 overflow-hidden md:static md:shrink-0"
            style={{
              backgroundColor: theme.ui.surfaceBg,
              backdropFilter: `blur(${theme.ui.glassBlur}px)`,
            }}
          >
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
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">

              {/* Logo & Greeting */}
              {(() => { console.log("[CHAT DEBUG] Rendering logo. logoUrl:", logoUrl); return null })()}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className="mb-6 h-28 w-auto object-contain"
                  onError={e => {
                    console.error("[CHAT DEBUG] Logo image failed to load:", logoUrl)
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              )}
              <div className="mb-6 text-center">
                <h2 className="pb-1 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                  {mounted ? `${greeting}, ${(userName || user?.user_metadata?.full_name || "").split(" ")[0]}. ${t("chatEmptyPrompt")}` : "\u00A0"}
                </h2>
              </div>

              {/* Input inline — centered with greeting */}
              <div className="w-full max-w-3xl">
                <div
                  className="relative rounded-2xl border focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all"
                  style={inputDark
                    ? { background: brandInput.bgGradient, borderColor: brandInput.border, boxShadow: brandInput.shadow }
                    : { background: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  {!input.trim() && (
                    <div className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400">
                      <AnimatedPlaceholder
                        messages={[
                          t("chatInputPlaceholder"),
                          t("chatSuggestion1"),
                          t("chatSuggestion2"),
                          t("chatSuggestion3"),
                          t("chatSuggestion4"),
                        ]}
                        interval={3500}
                      />
                    </div>
                  )}
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    rows={1}
                    className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm placeholder:text-slate-400 focus:outline-none"
                    style={{ color: inputDark ? brandInput.text : "#1e293b" }}
                  />
                  <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                    <div className="relative flex items-center gap-0.5" ref={kbPanelRef}>
                      {activeInputTab === "knowledge" && (
                        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                          <div className="border-b border-white/5 px-3 py-2">
                            <p className="text-xs font-semibold text-white">Knowledge Base</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Click a doc or type #N to reference it</p>
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {kbLoading && (
                              <div className="flex items-center justify-center py-6">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                              </div>
                            )}
                            {!kbLoading && kbDocs.length === 0 && (
                              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No documents uploaded yet.</p>
                            )}
                            {!kbLoading && kbDocs.map(doc => (
                              <button
                                key={doc.id}
                                onClick={() => insertDocRef(doc.index)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-600/10 transition-colors"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600/20 text-[10px] font-bold text-emerald-400">
                                  {doc.index}
                                </span>
                                <span className="flex-1 truncate text-white">{doc.name}</span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{doc.category}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {([
                        { id: "knowledge" as const, icon: BookOpen, label: "Knowledge Base" },
                        { id: "channels" as const, icon: Radio, label: "Channels" },
                        { id: "websearch" as const, icon: Globe, label: "Web Search" },
                      ]).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab.id)}
                          title={tab.label}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                            activeInputTab === tab.id
                              ? "bg-emerald-600/20 text-emerald-400"
                              : inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          )}
                        >
                          <tab.icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        title={inputDark ? "Switch to light" : "Switch to dark"}
                        onClick={() => setInputDark(v => { const next = !v; localStorage.setItem("exploro_input_dark", String(next)); return next })}
                        className="rounded-lg p-2 transition-colors"
                        style={inputDark ? { color: brandInput.iconAccent } : { color: "#94a3b8" }}
                      >
                        <SunMoon className="h-4 w-4" />
                      </button>
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
                        : "rounded-tl-sm border border-white/5 shadow-lg shadow-emerald-900/5"
                    )}
                    style={msg.role === "assistant" ? { backgroundColor: theme.ui.surfaceBg } : undefined}>
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
                  <div className="rounded-2xl rounded-tl-sm border border-white/5 px-4 py-3 shadow-lg shadow-emerald-900/5" style={{ backgroundColor: theme.ui.surfaceBg }}>
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


          {/* ── INPUT (only when messages exist) ── */}
          {messages.length > 0 && <div className="relative z-10 shrink-0 border-t border-white/5 px-3 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto max-w-3xl">
              <div
                className="relative rounded-2xl border focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all"
                style={inputDark
                  ? { background: brandInput.bgGradient, borderColor: brandInput.border, boxShadow: brandInput.shadow }
                  : { background: "#ffffff", borderColor: "#e2e8f0" }
                }
              >
                {!input.trim() && (
                  <div className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400">
                    <AnimatedPlaceholder
                      messages={[
                        t("chatInputPlaceholder"),
                        t("chatSuggestion1"),
                        t("chatSuggestion2"),
                        t("chatSuggestion3"),
                        t("chatSuggestion4"),
                      ]}
                      interval={3500}
                    />
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                  className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm placeholder:text-slate-400 focus:outline-none"
                  style={{ color: inputDark ? brandInput.text : "#1e293b" }}
                />
                <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                  <div className="relative flex items-center gap-0.5" ref={kbPanelRef}>
                    {activeInputTab === "knowledge" && (
                      <div className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                        <div className="border-b border-white/5 px-3 py-2">
                          <p className="text-xs font-semibold text-white">Knowledge Base</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Click a doc or type #N to reference it</p>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {kbLoading && (
                            <div className="flex items-center justify-center py-6">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            </div>
                          )}
                          {!kbLoading && kbDocs.length === 0 && (
                            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No documents uploaded yet.</p>
                          )}
                          {!kbLoading && kbDocs.map(doc => (
                            <button
                              key={doc.id}
                              onClick={() => insertDocRef(doc.index)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-600/10 transition-colors"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600/20 text-[10px] font-bold text-emerald-400">
                                {doc.index}
                              </span>
                              <span className="flex-1 truncate text-white">{doc.name}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{doc.category}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {([
                      { id: "knowledge" as const, icon: BookOpen, label: "Knowledge Base" },
                      { id: "channels" as const, icon: Radio, label: "Channels" },
                      { id: "websearch" as const, icon: Globe, label: "Web Search" },
                    ]).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.label}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                          activeInputTab === tab.id
                            ? "bg-emerald-600/20 text-emerald-400"
                            : inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        )}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      title={inputDark ? "Switch to light" : "Switch to dark"}
                      onClick={() => setInputDark(v => { const next = !v; localStorage.setItem("exploro_input_dark", String(next)); return next })}
                      className="rounded-lg p-2 transition-colors"
                      style={inputDark ? { color: brandInput.iconAccent } : { color: "#94a3b8" }}
                    >
                      <SunMoon className="h-4 w-4" />
                    </button>
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
          </div>}
        </main>

      </div>
    </div>
  )
}

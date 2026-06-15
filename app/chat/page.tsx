"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Plus, MessageSquare, Search, Send, Paperclip, Mic,
  Bot, Copy, RefreshCw, Share2, Sparkles,
  PanelLeftClose, X, User,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { getProfile, updateProfile } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"
import { CinematicBackground } from "@/components/cinematic-background"
import { compileTheme, type ThemeStyle, type ThemeMood } from "@/lib/theme-engine"
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
  const { user } = useAuth()
  const { t, lang, setLang } = useI18n()
  const loadingStates = loadingStateKeys.map(k => t(k))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  const [themePanelOpen, setThemePanelOpen] = useState(false)
  const [themePrimary, setThemePrimary] = useState("#05060A")
  const [themeSecondary, setThemeSecondary] = useState("")
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>("cinematic")
  const [themeMood, setThemeMood] = useState<ThemeMood>("futuristic")
  const themeInitRef = useRef(false)

  // Load theme from localStorage on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const savedPrimary = localStorage.getItem("exploro_theme_primary")
    const savedSecondary = localStorage.getItem("exploro_theme_secondary")
    const savedStyle = localStorage.getItem("exploro_theme_style")
    const savedMood = localStorage.getItem("exploro_theme_mood")
    if (savedPrimary) setThemePrimary(savedPrimary)
    if (savedSecondary) setThemeSecondary(savedSecondary)
    if (savedStyle) setThemeStyle(savedStyle as ThemeStyle)
    if (savedMood) setThemeMood(savedMood as ThemeMood)
  }, [])

  const theme = useMemo(
    () => compileTheme({ primaryColor: themePrimary, secondaryColor: themeSecondary, style: themeStyle, mood: themeMood }),
    [themePrimary, themeSecondary, themeStyle, themeMood]
  )
  const [userInitials, setUserInitials] = useState("")
  const [userName, setUserName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
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
        console.log("[CHAT DEBUG] Raw profile:", profile)
        console.log("[CHAT DEBUG] logo_url:", profile?.logo_url)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
        localStorage.setItem("exploro_user_name", name)
        setLogoUrl(profile?.logo_url || "")
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url)
          localStorage.setItem("exploro_avatar_url", profile.avatar_url)
        }
        console.log("[CHAT DEBUG] logoUrl state set to:", profile?.logo_url || "")
        // Only load theme from profile if localStorage doesn't have values yet
        // (prevents stale DB values from overwriting recent local changes before debounced save completes)
        const hasLocalTheme = !!localStorage.getItem("exploro_theme_primary")
        if (!hasLocalTheme) {
          const colors = profile?.brand_colors
          const savedStyle = profile?.brand_style as ThemeStyle
          const savedMood = profile?.brand_mood as ThemeMood
          if (Array.isArray(colors) && colors.length >= 1 && colors[0]) {
            setThemePrimary(colors[0])
            localStorage.setItem("exploro_theme_primary", colors[0])
            if (colors.length >= 2 && colors[1]) {
              setThemeSecondary(colors[1])
              localStorage.setItem("exploro_theme_secondary", colors[1])
            }
          }
          if (savedStyle) {
            setThemeStyle(savedStyle)
            localStorage.setItem("exploro_theme_style", savedStyle)
          }
          if (savedMood) {
            setThemeMood(savedMood)
            localStorage.setItem("exploro_theme_mood", savedMood)
          }
        }
      } catch {
        const name = user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
      }
    }
    load()
  }, [user])

  // Persist theme changes to localStorage + DB (debounced)
  useEffect(() => {
    if (!themeInitRef.current) {
      themeInitRef.current = true
      return
    }
    localStorage.setItem("exploro_theme_primary", themePrimary)
    localStorage.setItem("exploro_theme_secondary", themeSecondary)
    localStorage.setItem("exploro_theme_style", themeStyle)
    localStorage.setItem("exploro_theme_mood", themeMood)

    if (!user) return
    const timer = setTimeout(() => {
      updateProfile(user.id, {
        brand_colors: [themePrimary, themeSecondary].filter(Boolean),
        brand_style: themeStyle,
        brand_mood: themeMood,
      }).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [themePrimary, themeSecondary, themeStyle, themeMood, user])

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
          <Link href="/profile" className="relative flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[10px] md:text-xs font-bold text-white hover:bg-emerald-500 transition-colors overflow-hidden">
            <span className={avatarUrl ? "hidden" : ""}>{userInitials || <User className="h-4 w-4 text-white" />}</span>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Cinematic background layers */}
        <CinematicBackground
          primaryColor={themePrimary}
          secondaryColor={themeSecondary}
          style={themeStyle}
          mood={themeMood}
        />

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
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 pb-10 sm:p-10 sm:pb-12">

              {/* Logo & Greeting */}
              {(() => { console.log("[CHAT DEBUG] Rendering logo. logoUrl:", logoUrl); return null })()}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className="mb-6 h-20 w-auto object-contain"
                  onError={e => {
                    console.error("[CHAT DEBUG] Logo image failed to load:", logoUrl)
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              )}
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
                      className="card-3d flex items-start gap-3 rounded-xl border border-white/5 p-4 text-left shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-900/10"
                      style={{ backgroundColor: theme.ui.surfaceBg }}
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


          {/* ── INPUT ── */}
          <div className="relative z-10 shrink-0 border-t border-white/5 px-3 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
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
                  className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                  <div className="flex gap-0.5">
                    {[{ icon: Paperclip, label: t("chatAttach") }, { icon: Mic, label: t("chatVoice") }].map(a => (
                      <button key={a.label} title={a.label} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
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

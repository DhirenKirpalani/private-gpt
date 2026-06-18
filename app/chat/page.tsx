"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Plus, MessageSquare, Search, Send, BookOpen, Globe, Radio,
  Bot, Copy, RefreshCw, Share2, Sparkles,
  PanelLeftClose, X, User, Paperclip, File, CheckCircle2, ChevronDown,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import {
  getProfile, fetchUserDocuments, type Profile,
  getConversations, createConversation, updateConversationTitle,
  deleteConversation, getMessages, saveMessage, type ChatConversation,
  fetchDocumentContents, uploadDocument, updateDocumentText,
} from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"
import { CinematicBackground } from "@/components/cinematic-background"
import { compileTheme, type ThemeStyle, type ThemeMood, getBrandInputColors } from "@/lib/theme-engine"
import { AnimatedPlaceholder } from "@/components/animated-placeholder"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast, Toaster } from "@/components/ui/toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  confidence?: "high" | "medium" | "low"
  timestamp: Date
}

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (seconds < 60) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function ChatPage() {
  const { user, avatarUrl, loading: authLoading } = useAuth()
  const { t, lang, setLang } = useI18n()
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
  const [inputDark, setInputDark] = useState(true)
  const brandInput = useMemo(() => getBrandInputColors(themePrimary, themeSecondary || undefined), [themePrimary, themeSecondary])
  const [userInitials, setUserInitials] = useState("")
  const [userName, setUserName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [greeting, setGreeting] = useState("")
  const [mounted, setMounted] = useState(false)
  const [aiProfile, setAiProfile] = useState<Profile | null>(null)
  const [kbEnabled, setKbEnabled] = useState(false)
  const [channelsEnabled, setChannelsEnabled] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [showKbPanel, setShowKbPanel] = useState(false)
  const [kbDocs, setKbDocs] = useState<{ id: string; index: number; name: string; category: string }[]>([])
  const [kbDocContents, setKbDocContents] = useState<Record<string, string>>({})
  const [kbLoading, setKbLoading] = useState(false)
  const [chatError, setChatError] = useState("")
  const [websiteContent, setWebsiteContent] = useState("")
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const kbPanelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageCountRef = useRef(0)

  const [uploadPreview, setUploadPreview] = useState<{ file: File; category: string }[]>([])
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const DEFAULT_CATEGORIES = ["SOPs", "FAQs", "Training Material", "Policies", "Reports"]
  const ACCEPTED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "text/html",
    "application/json",
    "text/csv",
    "application/xml",
    "text/xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/epub+zip",
  ]

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  useEffect(() => {
    setMounted(true)
    setGreeting("Hi")
    const draft = localStorage.getItem("exploro_chat_draft")
    if (draft) setInput(draft)
    const stored = localStorage.getItem("exploro_input_dark")
    if (stored !== null) setInputDark(stored !== "false")
    const kb = localStorage.getItem("exploro_kb_enabled") === "true"
    const ch = localStorage.getItem("exploro_channels_enabled") === "true"
    const ws = localStorage.getItem("exploro_websearch_enabled") === "true"
    setKbEnabled(kb)
    setChannelsEnabled(ch)
    setWebSearchEnabled(ws)
  }, [])

  // Load KB docs and their contents on mount if toggle is enabled
  useEffect(() => {
    if (kbEnabled && user) loadKbDocs()
  }, [kbEnabled, user])

  // Reload KB docs when tab becomes visible or regains focus
  // (user may have deleted/added docs in another tab or navigated away and back)
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && kbEnabled && user) loadKbDocs()
    }
    function handleFocus() {
      if (kbEnabled && user) loadKbDocs()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleFocus)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleFocus)
    }
  }, [kbEnabled, user])

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        console.log("[CHAT DEBUG] Raw profile:", profile)
        console.log("[CHAT DEBUG] logo_url:", profile?.logo_url)
        setAiProfile(profile)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        setUserName(name)
        localStorage.setItem("exploro_user_name", name)
        setLogoUrl(profile?.logo_url || "")
        console.log("[CHAT DEBUG] logoUrl state set to:", profile?.logo_url || "")
        if (profile?.website) {
          fetch("/api/context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: profile.website }),
          }).then(r => r.json()).then(d => { if (d.content) setWebsiteContent(d.content) }).catch(() => {})
        }
        await loadConversations()
        // Restore last active conversation
        const storedConvId = localStorage.getItem("exploro_current_conv")
        if (storedConvId) {
          setCurrentConversationId(storedConvId)
          try {
            const dbMessages = await getMessages(storedConvId)
            setMessages(dbMessages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              sources: m.sources || undefined,
              timestamp: new Date(m.created_at),
            })))
          } catch { /* silent */ }
        }
        // Input style from profile
        const inputStyle = profile?.input_style
        if (inputStyle) {
          const dark = inputStyle !== "light"
          setInputDark(dark)
          localStorage.setItem("exploro_input_dark", String(dark))
        }
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
    const newCount = messages.length
    if (newCount > messageCountRef.current) {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
        }
      })
    }
    messageCountRef.current = newCount
  }, [messages])

  const toggleSidebar = () => {
    setSidebarOpen(v => !v)
  }

  async function ensureConversation(): Promise<string> {
    if (currentConversationId) return currentConversationId
    if (!user) throw new Error("Not authenticated")
    const conv = await createConversation(user.id, input.trim().slice(0, 40))
    setConversations(prev => [conv, ...prev])
    setCurrentConversationId(conv.id)
    return conv.id
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    setChatError("")

    let convId = currentConversationId
    try {
      convId = await ensureConversation()
    } catch (err: any) {
      setChatError(err?.message || "Failed to create conversation")
      return
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    localStorage.removeItem("exploro_chat_draft")
    if (textareaRef.current) { textareaRef.current.style.height = "auto" }
    setShowKbPanel(false)
    setLoading(true)

    // Save user message to DB
    saveMessage(convId, "user", userMsg.content).catch(() => {})

    // Detect if user is asking about internal documents — skip web search if so
    function isInternalQuery(query: string): boolean {
      const lower = query.toLowerCase()
      const internalSignals = [
        "my document", "my file", "my sop", "my kb", "my knowledge",
        "the document", "the file", "the sop", "the uploaded",
        "our document", "our file", "our sop", "our internal",
        "from my", "from the document", "from the file",
        "knowledge base", "uploaded file", "uploaded document",
        "any data from", "data from the", "taken from",
        "internal document", "internal file", "internal sop",
        "reference document", "reference file",
        "#1", "#2", "#3", "#4", "#5",
      ]
      return internalSignals.some(s => lower.includes(s))
    }
    const userAsksAboutInternal = isInternalQuery(input)

    // Build context-aware loading texts based on active toggles
    const hasKb = kbEnabled && kbDocs.length > 0
    const actuallySearchingWeb = webSearchEnabled && !userAsksAboutInternal
    let loadingStates: string[]
    if (hasKb && actuallySearchingWeb) {
      loadingStates = [t("chatLoadingKbWeb"), t("chatLoadingGenerating")]
    } else if (hasKb) {
      loadingStates = [t("chatLoadingKb"), t("chatLoadingGenerating")]
    } else if (actuallySearchingWeb) {
      loadingStates = [t("chatLoadingWeb"), t("chatLoadingGenerating")]
    } else {
      loadingStates = [t("chatLoadingThinking"), t("chatLoadingGenerating")]
    }
    let i = 0
    const iv = setInterval(() => { setLoadingText(loadingStates[i++ % loadingStates.length]) }, 900)
    try {
      const kbContext = kbEnabled && kbDocs.length > 0
        ? `\n# Knowledge Base\nThe following documents are available. You have full access to their contents. Cite them using their reference numbers (#1, #2, etc.).\n\n${kbDocs.map(d => {
          const content = kbDocContents[d.id]
          if (content) {
            return `---\n#${d.index} "${d.name}" (${d.category}):\n${content}\n---`
          }
          return `#${d.index} "${d.name}" (${d.category}) — [content not yet extracted]`
        }).join("\n\n")}`
        : ""
      const p = aiProfile
      const arr = (v: any) => Array.isArray(v) ? v.join(", ") : (v ? String(v) : "")
      const systemPrompt = [
        `LANGUAGE RULE — HIGHEST PRIORITY: You must respond in ${lang === "es" ? "Spanish" : "English"} only. The user wrote in ${lang === "es" ? "Spanish" : "English"}. Ignore any other language cues from the profile context. NEVER mix languages.`,
        ``,
        `# Identity`,
        `You are ${p?.ai_name || "Nira"}, an AI business operations assistant. You have been fully briefed on the user's profile, business, and goals before this conversation began. Treat this as context you already know — do not ask the user to re-explain it.`,
        ``,
        `# Role`,
        p?.ai_role || "",
        ``,
        `# User Profile`,
        p?.full_name ? `Name: ${p.full_name}` : "",
        p?.job_title ? `Job Title: ${p.job_title}` : "",
        p?.location ? `Location: ${p.location}` : "",
        p?.contact_email ? `Contact Email: ${p.contact_email}` : "",
        ``,
        `# Business Profile`,
        p?.company_name ? `Company: ${p.company_name}` : "",
        p?.industry ? `Industry: ${p.industry}` : "",
        p?.company_size ? `Company Size: ${p.company_size}` : "",
        p?.year_founded ? `Founded: ${p.year_founded}` : "",
        p?.website ? `Website: ${p.website}` : "",
        p?.contact_email ? `Business Email: ${p.contact_email}` : "",
        p?.slogan ? `Slogan: "${p.slogan}"` : "",
        ``,
        p?.business_description ? `# Business Description\n${p.business_description}` : "",
        ``,
        p?.target_audience ? `# Target Audience\n${p.target_audience}` : "",
        ``,
        p?.key_products ? `# Key Products & Services\n${p.key_products}` : "",
        ``,
        p?.competitors ? `# Competitors\n${typeof p.competitors === "string" ? p.competitors : JSON.stringify(p.competitors)}` : "",
        ``,
        `# Communication Guidelines`,
        p?.brand_voice ? `Voice: ${p.brand_voice}` : "",
        p?.communication_style ? `Style: ${p.communication_style}` : "",
        p?.tone_examples ? `Tone examples:\n${p.tone_examples}` : "",
        p?.words_to_avoid ? `Words/phrases to avoid: ${p.words_to_avoid}` : "",
        p?.response_length ? `Response length preference: ${p.response_length}` : "",
        ``,
        `User's preferred languages: ${p?.languages ? arr(p.languages) : "English"}.`,
        ``,
        p?.clarification_prompt ? `# Clarification Protocol\n${p.clarification_prompt}` : "",
        ``,
        kbContext ? `# Knowledge Base\n${kbContext}` : "",
        channelsEnabled ? `# Active Channel Context\nChannel integrations are active (email, WhatsApp, etc.). Consider business communication channels in responses.` : "",
        websiteContent ? `# Website Content (fetched from ${p?.website})\n${websiteContent}` : "",
        ``,
        `# Core Instructions`,
        `- You are ${p?.ai_name || "Nira"} — stay in character at all times`,
        `- You already know the user's full profile — proactively reference it where relevant`,
        `- Apply communication guidelines consistently in every response`,
        `- When using Knowledge Base content, cite references like #1 or #2`,
        `- Be accurate, direct, and practical — no hype language`,
        `- You are an AI assistant powered by DeepSeek. You do NOT have native internet access, web browsing, or real-time search capabilities.`,
        `- However, when the user enables Web Search, live search results are injected into your prompt as context.`,
        `- CITATION DISCIPLINE — WEB SEARCH: When web search results are provided, base your answer primarily on those sources. Cite every web fact with [1], [2], etc. matching the source numbers.`,
        `- DATE FLEXIBILITY: If the user asks about "2026" or "current" trends, do NOT refuse to answer just because the search results are dated 2024–2025. Information from the past 1–2 years is still highly relevant unless explicitly outdated. Use the sources and present them as the current state of the industry.`,
        `- CITATION DISCIPLINE — KNOWLEDGE BASE: When Knowledge Base documents are provided, cite every internal fact with #1, #2, etc. matching the document numbers in the KB context.`,
        `- WHEN BOTH KB AND WEB SEARCH ARE ACTIVE: You may combine both sources in your answer. Use [1], [2] for web sources and #1, #2 for KB sources. Clearly distinguish between internal company knowledge (KB) and external web information. Prioritize KB docs for company-specific answers; use web results for current/external data.`,
        `- NEVER fabricate data, statistics, or quotes that are not in the provided sources. If the sources genuinely do not contain relevant information (e.g., the topic is completely unrelated), say so clearly. Do not refuse to answer just because the sources lack a specific year or date.`,
        `- When NO web search results are provided in the prompt, you cannot look up current news, prices, or events.`,
        `- You do NOT know the current date or time. If asked, say you do not have access to real-time information.`,
        `- NEVER invent URLs, citations, sources, or facts. If you don't know something, say so clearly.`,
        `- NEVER claim you performed a web search, visited a website, or accessed external data. You only use the context provided in this prompt.`,
        ``,
        `# Proposal & Document Generation Protocol — CRITICAL`,
        `When the user asks you to generate, draft, or write a proposal, business plan, contract, or any similar formal deliverable:`,
        `1. FIRST check if the user has uploaded reference documents to the Knowledge Base that are relevant to the requested deliverable.`,
        `2. If NO relevant reference documents exist in the Knowledge Base, you MUST refuse to generate the deliverable.`,
        `3. Instead, politely explain that you need the user to upload 1-3 similar examples or reference proposals/documents to the Knowledge Base first, so you can match the format, tone, structure, and specific requirements.`,
        `4. Only AFTER the user confirms they have uploaded reference documents (or if you can see them in the Knowledge Base context above), you may proceed to generate the deliverable using those references as templates.`,
        `5. Do NOT generate any proposal, contract, or formal document from scratch without reference materials — this wastes output tokens and produces low-quality, generic results.`,
        `6. This rule applies to: proposals, business plans, contracts, pitches, SOWs, RFP responses, service agreements, and any other formal business documents.`,
      ].filter(Boolean).join("\n")

      // Fetch live web search results if enabled and user is not asking about internal docs
      let webSearchContext = ""
      let wsData: any = null
      if (actuallySearchingWeb) {
        const lastUserMsg = nextMessages.findLast(m => m.role === "user")
        if (lastUserMsg?.content) {
          try {
            const wsRes = await fetch("/api/web-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: lastUserMsg.content }),
            })
            if (wsRes.ok) {
              wsData = await wsRes.json()
              if (wsData.formatted) {
                webSearchContext = `\n# Live Web Search Results (queried: "${wsData.query}")\n${wsData.formatted}\n\nINSTRUCTION: Use the above sources as the basis for your answer. Cite facts with [1], [2], etc. matching the source numbers. Recent sources (past 1–2 years) are considered current even if the user mentions a specific year like 2026. Only say information is missing if the sources are completely unrelated to the topic — do not refuse to answer just because the sources lack a specific date.`
              }
            }
          } catch (err) {
            console.error("[WEB SEARCH] Failed:", err)
          }
        }
      }

      const finalSystemPrompt = webSearchContext ? systemPrompt + webSearchContext : systemPrompt

      const apiMessages = nextMessages.map((m, i) => {
        const isLastUser = m.role === "user" && i === nextMessages.length - 1
        return {
          role: m.role,
          content: isLastUser
            ? `${m.content}\n\n[INSTRUCTION: Respond in ${lang === "es" ? "Spanish" : "English"} only.]`
            : m.content,
        }
      })
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: finalSystemPrompt,
          responseLength: aiProfile?.response_length || "Standard",
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Request failed")
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        confidence: "high",
        timestamp: new Date(),
        sources: wsData?.sources?.map((s: any) => s.url).filter(Boolean) || undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
      // Save assistant message to DB
      saveMessage(convId, "assistant", assistantMsg.content, assistantMsg.sources).catch(() => {})
      // Generate title from AI after first exchange
      if (messages.length === 0) {
        generateTitle(convId, userMsg.content, assistantMsg.content).catch(() => {})
      }
    } catch (err: any) {
      setChatError(err?.message || "Something went wrong. Please try again.")
    } finally {
      clearInterval(iv)
      setLoading(false)
      setLoadingText("")
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const invalid = files.filter(f => !ACCEPTED_MIME_TYPES.includes(f.type))
    if (invalid.length > 0) {
      toast({ title: "Invalid file type", description: `File type "${invalid[0].type || "unknown"}" is not supported.`, variant: "error" })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setUploadPreview(files.map(file => ({ file, category: DEFAULT_CATEGORIES[0] })))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function confirmUpload() {
    if (uploadPreview.length === 0) return
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to upload documents.", variant: "error" })
      return
    }
    setIsUploading(true)
    try {
      for (const { file, category } of uploadPreview) {
        let pageCount = 0
        const countableTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ]
        if (countableTypes.includes(file.type)) {
          const formData = new FormData()
          formData.append("file", file)
          const res = await fetch("/api/count-pages", { method: "POST", body: formData })
          if (res.ok) {
            const data = await res.json()
            pageCount = data.pageCount || 0
          }
        }
        const doc = await uploadDocument(user.id, file, category, pageCount)
        try {
          const parseRes = await fetch("/api/parse-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, filename: doc.filename, mimeType: file.type }),
          })
          if (parseRes.ok) {
            const { text } = await parseRes.json()
            if (text) await updateDocumentText(doc.id, text)
          } else {
            const errText = await parseRes.text()
            console.error("[PARSE DOCUMENT] API error:", parseRes.status, errText)
          }
        } catch (err) {
          console.error("[PARSE DOCUMENT] Network/exception:", err)
        }
      }
      toast({ title: "Uploaded", description: `${uploadPreview.length} document(s) uploaded to Knowledge Base.`, variant: "default" })
      setUploadPreview([])
      setOpenCategoryIndex(null)
      // Refresh KB docs if panel might be open
      if (kbEnabled) loadKbDocs()
    } catch (err: any) {
      console.error("Upload failed:", err)
      toast({ title: "Upload failed", description: err.message || "Upload failed", variant: "error" })
    } finally {
      setIsUploading(false)
    }
  }

  async function loadConversations() {
    if (!user) return
    setConversationsLoading(true)
    try {
      const convs = await getConversations(user.id)
      setConversations(convs)
    } catch { /* silent */ } finally {
      setConversationsLoading(false)
    }
  }

  async function generateTitle(convId: string, userMsg: string, assistantMsg: string) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: userMsg },
            { role: "assistant", content: assistantMsg },
            { role: "user", content: "Generate a very short, concise 3-5 word title for this conversation. Only output the title, nothing else." },
          ],
          systemPrompt: "You are a title generator. Respond with only a short 3-5 word title. No quotes, no explanations.",
          responseLength: "Standard",
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) return
      const title = (data.content || "New conversation").replace(/^["']|["']$/g, "").trim().slice(0, 40)
      if (title) {
        await updateConversationTitle(convId, title)
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c))
      }
    } catch { /* silent */ }
  }

  async function handleNewConversation() {
    setMessages([])
    setCurrentConversationId(null)
    localStorage.removeItem("exploro_current_conv")
    setChatError("")
  }

  async function handleSelectConversation(convId: string) {
    if (convId === currentConversationId) return
    setChatError("")
    setCurrentConversationId(convId)
    localStorage.setItem("exploro_current_conv", convId)
    try {
      const dbMessages = await getMessages(convId)
      setMessages(dbMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || undefined,
        timestamp: new Date(m.created_at),
      })))
    } catch { /* silent */ }
  }

  async function handleDeleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    try {
      await deleteConversation(convId)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (currentConversationId === convId) {
        setCurrentConversationId(null)
        setMessages([])
        localStorage.removeItem("exploro_current_conv")
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!showKbPanel) return
    function handleClick(e: MouseEvent) {
      if (!kbPanelRef.current?.contains(e.target as Node)) setShowKbPanel(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showKbPanel])

  async function loadKbDocs() {
    if (!user) return
    setKbLoading(true)
    try {
      const docs = await fetchUserDocuments(user.id)
      setKbDocs(docs.map((d: any, i: number) => ({
        id: d.id,
        index: i + 1,
        name: d.original_filename,
        category: d.category || "Uncategorized",
      })))
      // Load actual parsed text for documents that have it
      try {
        const contents = await fetchDocumentContents(user.id)
        const map: Record<string, string> = {}
        for (const c of contents) map[c.id] = c.parsed_text
        setKbDocContents(map)
      } catch { /* silent */ }
    } catch { /* silent */ } finally {
      setKbLoading(false)
    }
  }

  function handleTabClick(tab: "knowledge" | "channels" | "websearch") {
    if (tab === "knowledge") {
      const next = !kbEnabled
      setKbEnabled(next)
      localStorage.setItem("exploro_kb_enabled", String(next))
      if (next) { loadKbDocs(); setShowKbPanel(true) } else { setShowKbPanel(false) }
    } else if (tab === "channels") {
      const next = !channelsEnabled
      setChannelsEnabled(next)
      localStorage.setItem("exploro_channels_enabled", String(next))
    } else if (tab === "websearch") {
      const next = !webSearchEnabled
      setWebSearchEnabled(next)
      localStorage.setItem("exploro_websearch_enabled", String(next))
    }
  }

  function insertDocRef(index: number) {
    setInput(prev => {
      const ref = `#${index} `
      return prev === "" || prev.endsWith(" ") ? prev + ref : prev + " " + ref
    })
    setShowKbPanel(false)
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
                onClick={handleNewConversation}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> {t("chatNewConversation")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("chatRecent")}</p>
              {conversationsLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
              {!conversationsLoading && conversations.length === 0 && (
                <p className="px-2 py-4 text-xs text-muted-foreground text-center">No conversations yet.</p>
              )}
              {!conversationsLoading && conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                    currentConversationId === conv.id ? "bg-emerald-600/10" : "hover:bg-muted/50"
                  )}
                >
                  <MessageSquare className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", currentConversationId === conv.id ? "text-emerald-400" : "text-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-sm font-medium", currentConversationId === conv.id ? "text-emerald-400" : "text-white")}>
                      {conv.title || "New conversation"}
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(conv.updated_at)}</div>
                  </div>
                  <X
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                    onClick={e => handleDeleteConversation(e, conv.id)}
                  />
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
                  className="mb-2 h-28 w-auto object-contain"
                  onError={e => {
                    console.error("[CHAT DEBUG] Logo image failed to load:", logoUrl)
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              )}
              {aiProfile?.slogan && (
                <p className="mb-6 text-center text-sm text-emerald-200/70 font-medium tracking-wide">
                  {aiProfile.slogan}
                </p>
              )}
              <div className="mb-6 text-center">
                <h2 className="pb-1 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                  {mounted ? `${greeting}, ${(userName || user?.user_metadata?.full_name || "").split(" ")[0]}. ${t("chatEmptyPrompt")}` : "\u00A0"}
                </h2>
              </div>

              {/* Input inline — centered with greeting */}
              <div className="w-full max-w-3xl">
                <div
                  className="rounded-2xl border focus-within:ring-2 transition-all flex flex-col"
                  style={inputDark
                    ? { background: brandInput.bgGradient, borderColor: brandInput.border, boxShadow: brandInput.shadow, outlineColor: `${themePrimary}4d` }
                    : { background: "#ffffff", borderColor: "#e2e8f0", outlineColor: `${themePrimary}4d` }
                  }
                >
                  <div className="relative">
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
                      ref={textareaRef}
                      value={input}
                      onChange={e => {
                        const val = e.target.value
                        setInput(val)
                        localStorage.setItem("exploro_chat_draft", val)
                        const el = e.target
                        el.style.height = "auto"
                        const newH = Math.min(el.scrollHeight, 160)
                        el.style.height = `${newH}px`
                      }}
                      onKeyDown={handleKey}
                      className="w-full min-h-[48px] max-h-[160px] resize-none overflow-y-auto bg-transparent px-4 pt-4 pb-2 text-sm placeholder:text-slate-400 focus:outline-none"
                      style={{ color: inputDark ? brandInput.text : "#1e293b" }}
                    />
                  </div>
                  <div className="flex w-full items-center justify-between px-3 pb-3 pt-1">
                    <div className="relative flex items-center gap-0.5" ref={kbPanelRef}>
                      {showKbPanel && (
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
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload document"
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                          inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        )}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Upload</span>
                      </button>
                      {([
                        { id: "knowledge" as const, icon: BookOpen, label: "Knowledge Base", active: kbEnabled },
                        { id: "channels" as const, icon: Radio, label: "Channels", active: channelsEnabled },
                        { id: "websearch" as const, icon: Globe, label: "Web Search", active: webSearchEnabled },
                      ]).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab.id)}
                          title={tab.label}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                            tab.active
                              ? "bg-emerald-600/20 text-emerald-400"
                              : inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          )}
                        >
                          <tab.icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
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
          ) : (
            <div ref={messagesContainerRef} className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto p-3 sm:p-6">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold overflow-hidden",
                    msg.role === "user" ? "bg-muted text-foreground" : "bg-transparent"
                  )}>
                    {msg.role === "user" ? (
                      avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      ) : (userInitials || <User className="h-4 w-4" />)
                    ) : (
                      <img src="/assets/images/exploro-icon.svg" alt="" className="h-8 w-8 object-contain" />
                    )}
                  </div>
                  <div className={cn("max-w-[72%] space-y-2", msg.role === "user" && "flex flex-col items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "rounded-tr-sm text-white"
                          : "rounded-tl-sm border border-white/15 shadow-xl"
                      )}
                      style={msg.role === "user"
                        ? { backgroundColor: themePrimary, color: "#fff" }
                        : { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#f1f5f9", boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }
                      }>
                      {msg.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mt-1.5 first:mt-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                            ul: ({ children }) => <ul className="mt-1.5 list-disc pl-5 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="mt-1.5 list-decimal pl-5 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            code: ({ children }) => <code className="rounded bg-black/20 px-1 py-0.5 text-xs font-mono text-slate-200">{children}</code>,
                            h1: ({ children }) => <h1 className="mt-3 text-lg font-bold text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="mt-2 text-base font-bold text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="mt-2 text-sm font-bold text-white">{children}</h3>,
                            blockquote: ({ children }) => <blockquote className="mt-1.5 border-l-2 border-white/20 pl-3 text-slate-300">{children}</blockquote>,
                            hr: () => <hr className="my-3 border-white/10" />,
                            table: ({ children }) => <div className="mt-2 overflow-x-auto rounded-lg border border-white/10"><table className="w-full text-sm border-collapse">{children}</table></div>,
                            thead: ({ children }) => <thead className="bg-white/10">{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border-b border-white/8 last:border-0">{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 text-slate-200 align-top">{children}</td>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                          <p key={i} className="mt-0.5">{line}</p>
                        ))
                      )}
                    </div>
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[200px] items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-emerald-300 transition-colors hover:bg-white/15 hover:text-emerald-200"
                              title={url}
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{new URL(url).hostname.replace(/^www\./, "")}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent overflow-hidden">
                    <img src="/assets/images/exploro-icon.svg" alt="" className="h-8 w-8 object-contain" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border px-4 py-3 shadow-xl" style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2.5 text-sm text-slate-200">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="h-2 w-2 rounded-full animate-bounce bg-white/80" style={{ animationDelay: `${i * 150}ms` }} />
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
                className="rounded-2xl border focus-within:ring-2 transition-all flex flex-col"
                style={inputDark
                  ? { background: brandInput.bgGradient, borderColor: brandInput.border, boxShadow: brandInput.shadow, outlineColor: `${themePrimary}4d` }
                  : { background: "#ffffff", borderColor: "#e2e8f0", outlineColor: `${themePrimary}4d` }
                }
              >
                <div className="relative">
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
                    ref={textareaRef}
                    value={input}
                    onChange={e => {
                      const val = e.target.value
                      setInput(val)
                      localStorage.setItem("exploro_chat_draft", val)
                      const el = e.target
                      el.style.height = "auto"
                      const newH = Math.min(el.scrollHeight, 160)
                      el.style.height = `${newH}px`
                    }}
                    onKeyDown={handleKey}
                    className="w-full min-h-[48px] max-h-[160px] resize-none overflow-y-auto bg-transparent px-4 pt-4 pb-2 text-sm placeholder:text-slate-400 focus:outline-none"
                    style={{ color: inputDark ? brandInput.text : "#1e293b" }}
                  />
                </div>
                <div className="flex w-full items-center justify-between px-3 pb-3 pt-1">
                  <div className="relative flex items-center gap-0.5" ref={kbPanelRef}>
                    {showKbPanel && (
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload document"
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                        inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      )}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    {([
                      { id: "knowledge" as const, icon: BookOpen, label: "Knowledge Base", active: kbEnabled },
                      { id: "channels" as const, icon: Radio, label: "Channels", active: channelsEnabled },
                      { id: "websearch" as const, icon: Globe, label: "Web Search", active: webSearchEnabled },
                    ]).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.label}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                          tab.active
                            ? "bg-emerald-600/20 text-emerald-400"
                            : inputDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        )}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
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
              {chatError && (
                <p className="mt-2 text-center text-xs text-red-400">{chatError}</p>
              )}
              {!chatError && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {t("chatFooter")}
                </p>
              )}
            </div>
          </div>}
        </main>

      </div>

      {/* Hidden file input for document upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv,.xml,.pptx,.xlsx,.epub"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Preview & Category Modal */}
      {uploadPreview.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-10" onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">Upload Document{uploadPreview.length > 1 ? "s" : ""} ({uploadPreview.length})</h3>
            <div className="mb-5 space-y-2 pr-1">
              {uploadPreview.map(({ file, category }, i) => {
                const dropdownOpen = openCategoryIndex === i
                return (
                  <div key={i} className="relative rounded-xl border border-white/5 bg-background p-3 overflow-visible">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <File className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {file.type || "Unknown"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = uploadPreview.filter((_, idx) => idx !== i)
                          setUploadPreview(next)
                          if (next.length === 0) setOpenCategoryIndex(null)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="relative overflow-visible">
                        <button
                          type="button"
                          onClick={() => setOpenCategoryIndex(dropdownOpen ? null : i)}
                          className="flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-[#2a3444] px-3 py-2 text-xs text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <span>{category}</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
                        </button>
                        {dropdownOpen && (
                          <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-emerald-500/30 bg-[#1e2533] p-1 shadow-2xl shadow-black/40">
                            {DEFAULT_CATEGORIES.map(cat => {
                              const selected = category === cat
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setUploadPreview(prev => prev.map((item, idx) => idx === i ? { ...item, category: cat } : item))
                                    setOpenCategoryIndex(null)
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-emerald-600/10",
                                    selected ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {cat}
                                  {selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={isUploading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  `Upload ${uploadPreview.length}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  )
}

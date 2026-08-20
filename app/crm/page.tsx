"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Search, Plus, Phone, Mail, MapPin, Building2,
  Filter, CircleDollarSign, ChevronDown, ChevronUp, X,
  ClipboardList, FileText, Send, Inbox,
  Star, StarOff, Shield, User, Loader2, Reply, Trash2, Check, Pencil, Menu, PanelLeft, Tag,
  LayoutDashboard, MessageSquare, Calendar, ImagePlus, Video,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { NotificationBell } from "@/components/notification-bell"
import { TrialPill } from "@/components/trial-pill"
import { TrialPaywall } from "@/components/trial-paywall"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { useI18n } from "@/lib/i18n"
import { toast, Toaster } from "@/components/ui/toast"
import { getProfile, upsertProfile, getEmailConnections, getEmailMessages, getContacts, importContactsFromEmails, importContactsFromWhatsApp, importContactsFromTelegram, importContactsFromSlack, markEmailAsRead, markMessageAsRead, getCalendarConnections, getCalendarEvents, getWhatsAppConnections, getWhatsAppMessages, getTelegramUserSession, getTelegramMessages, getSlackConnections, getSlackMessages, subscribeToEmailMessages, subscribeToCalendarEvents, subscribeToContacts, subscribeToSlackMessages, subscribeToWhatsAppMessages, subscribeToTelegramMessages, unsubscribeChannel, getKanbanCols, upsertKanbanCols, getKanbanCardCols, setKanbanCardCol, createNotification, deleteEmailMessagesByIds, getEvolutionSessions, getEvolutionContacts, getEvolutionMessages } from "@/lib/supabase"
import { formatTelegramSender } from "@/lib/telegram"

/* ─── real data ─── */
const stages = [
  { name: "Discovery", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { name: "Proposal", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { name: "Negotiation", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { name: "Closed Won", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
]

const tabs = ["Overview", "Email", "Messages", "Calendar"]

type KanbanCol = { id: string; label: string; color: string }
const COL_COLORS = [
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
]



function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function stripHtml(text: string): string {
  if (!text) return ""
  return text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
}

type Contact = { id: string; name: string; company: string | null; role: string | null; email: string | null; phone: string | null; location: string | null; tags: string[]; starred: boolean; lastContact: string; dealValue: number; dealStage: string | null }

export default function CRMPage() {
  const { user, subscription, role } = useAuth()
  const { t, lang, setLang } = useI18n()
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)
  const [crmSidebarOpen, setCrmSidebarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contactModalId, setContactModalId] = useState<string | null>(null)
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [contactsChannelFilter, setContactsChannelFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>("Overview")
  const [search, setSearch] = useState("")
  const [activeNav] = useState("Contacts")
  const [activeChannel, setActiveChannel] = useState("")
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [userName, setUserName] = useState("")

  // ── sessionStorage helpers (defined early so useState can lazily restore) ──
  const storageKey = (k: string) => `crm_${user?.id || "guest"}_${k}`
  const loadStored = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback
    try {
      const raw = sessionStorage.getItem(storageKey(key))
      return raw ? JSON.parse(raw) as T : fallback
    } catch { return fallback }
  }

  // Real data states — lazily restored from sessionStorage to avoid flash of empty data on remount
  const [contacts, setContacts] = useState<Contact[]>(() => loadStored("contacts", []))
  const [emailMessages, setEmailMessages] = useState<any[]>(() => loadStored("emailMessages", []))
  const [emailConnections, setEmailConnections] = useState<any[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState<any[]>(() => loadStored("inboxMessages", []))
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxFetched, setInboxFetched] = useState(() => loadStored("inboxFetched", false))
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  // Email composer state
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  // Email open/reply state
  const [openEmail, setOpenEmail] = useState<any>(null)
  const [replyBody, setReplyBody] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [replyCc, setReplyCc] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  // Pagination state
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchStep, setFetchStep] = useState<"scanning" | "filtering" | "importing" | "done" | null>(null)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [emailSyncModal, setEmailSyncModal] = useState<{
    visible: boolean
    step: "connecting" | "scanning" | "filtering" | "done"
    progress: number
    totalFetched: number
    totalScanned: number
    keptEmails: any[]
    droppedEmails: any[]
    dateRange: { from: string | null; to: string | null }
    isInitial: boolean
  } | null>(null)
  const [emailView, setEmailView] = useState<"kanban" | "table">("kanban")
  const [messagesView, setMessagesView] = useState<"kanban" | "table">("kanban")
  const [calendarView, setCalendarView] = useState<"kanban" | "table">("kanban")
  const [calendarSyncModal, setCalendarSyncModal] = useState<{
    visible: boolean
    step: "connecting" | "done"
    progress: number
    totalFetched: number
    totalScanned: number
    importedEvents: any[]
    droppedEvents: any[]
    alreadyImportedEvents: any[]
    dateRange: { from: string | null; to: string | null }
    isInitial: boolean
  } | null>(null)
  const TABLE_PAGE_SIZE = 10
  const [emailTablePage, setEmailTablePage] = useState(0)
  const [msgTablePage, setMsgTablePage] = useState(0)
  const [calTablePage, setCalTablePage] = useState(0)

  // Email search + filter
  const [emailSearch, setEmailSearch] = useState("")
  const [emailFilterOpen, setEmailFilterOpen] = useState(false)
  const [emailFilter, setEmailFilter] = useState<{ direction: "all" | "sent" | "received"; read: "all" | "read" | "unread" }>({ direction: "all", read: "all" })
  const [contactEmailFilter, setContactEmailFilter] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null)
  const [keywordFilterOpen, setKeywordFilterOpen] = useState(false)

  // Fetch keyword management
  const [fetchKeywords, setFetchKeywords] = useState<string[]>([])
  const [fetchKeywordsInput, setFetchKeywordsInput] = useState("")
  const [fetchKeywordsSaving, setFetchKeywordsSaving] = useState(false)

  // Calendar search + filter
  const [calSearch, setCalSearch] = useState("")
  const [calFilterOpen, setCalFilterOpen] = useState(false)
  const [calFilter, setCalFilter] = useState<{ range: "all" | "today" | "week" | "upcoming" }>({ range: "all" })
  const EMAIL_KEYWORDS = [
    "proposal", "invoice", "contract", "quote", "purchase order",
    "payment", "receipt", "agreement", "deal", "billing", "estimate",
    "refund", "opportunity", "sow", "rfp", "nda", "msa", "scope of work",
    "inquiry", "campaign", "marketing", "strategy", "meeting", "schedule",
    "consultation", "services", "partnership", "collaboration", "project",
    "pricing", "demo", "introduction", "follow up", "follow-up", "request",
    "question", "update", "report", "plan", "budget",
    "platform", "solution", "service", "offer", "offering",
    "intelligence", "compliance", "sustainability", "integration",
    "onboarding", "implementation", "support", "subscription",
    "renewal", "upgrade", "pilot", "trial", "evaluation",
    "presentation", "webinar", "workshop", "training",
    "invite", "invitation", "podcast", "speaker", "guest",
  ]

  // Load user's custom fetch keywords from profile
  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(p => {
      if (p?.email_keywords && Array.isArray(p.email_keywords) && p.email_keywords.length > 0) {
        setFetchKeywords(p.email_keywords)
      }
    }).catch(() => {})
  }, [user])

  // Keyword matching mirror of backend logic
  function kwMatches(text: string, kws: string[]) {
    const lower = text.toLowerCase()
    return kws.some(k => {
      if (k.includes(" ")) return lower.includes(k)
      return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
    })
  }

  async function pruneEmailsByKeywords(activeKws: string[]) {
    if (!user) return
    const allMsgs = await getEmailMessages(user.id)
    const toDelete = allMsgs
      .filter(m => m.direction === "received")
      .filter(m => !kwMatches(m.subject || "", activeKws))
      .map(m => m.id)
    if (toDelete.length > 0) {
      await deleteEmailMessagesByIds(user.id, toDelete)
      setEmailMessages(prev => prev.filter(m => !toDelete.includes(m.id)))
    }
  }

  async function saveFetchKeywords(kws: string[]) {
    if (!user) return
    setFetchKeywordsSaving(true)
    try {
      await upsertProfile({ user_id: user.id, email_keywords: kws.length > 0 ? kws : null } as any)
      // Prune emails that no longer match the new active keyword set
      const activeKws = kws.length > 0 ? kws : EMAIL_KEYWORDS.map(k => k.toLowerCase())
      await pruneEmailsByKeywords(activeKws)
      toast({ title: "Fetch keywords saved", description: kws.length > 0 ? `Fetching emails matching ${kws.length} keyword${kws.length === 1 ? "" : "s"}` : "Using default keyword list", variant: "success" })
      // Only trigger a new fetch if one isn't already running
      if (!emailFetchingRef.current && !inboxLoading) {
        setTimeout(() => fetchInbox(undefined, true, true), 100)
      }
    } catch {
      toast({ title: "Failed to save", variant: "error" } as any)
    } finally {
      setFetchKeywordsSaving(false)
    }
  }

  function addFetchKeyword() {
    const kw = fetchKeywordsInput.trim().toLowerCase()
    if (!kw || fetchKeywords.includes(kw)) { setFetchKeywordsInput(""); return }
    const next = [...fetchKeywords, kw]
    setFetchKeywords(next)
    setFetchKeywordsInput("")
    saveFetchKeywords(next)
  }

  function removeFetchKeyword(kw: string) {
    const next = fetchKeywords.filter(k => k !== kw)
    setFetchKeywords(next)
    saveFetchKeywords(next)
  }

  // Refresh emailMessages from DB when Email tab becomes active (catches emails sent from other pages)
  useEffect(() => {
    if (activeTab === "Email" && user) {
      getEmailMessages(user.id).then((msgs: any[]) => {
        if (msgs.length > 0) setEmailMessages(msgs)
      }).catch(() => {})
    }
  }, [activeTab, user])

  // Auto-sync Telegram when Messages tab becomes active
  useEffect(() => {
    if (activeTab !== "Messages" || !user) return
    // Load from DB first (instant display)
    getTelegramMessages(user.id).then((msgs: any[]) => {
      if (msgs.length > 0) { setTelegramMessages(msgs); setTelegramFetched(true) }
    }).catch(() => {})
    // Then trigger live sync in background — show spinner on Fetch Messages button
    if (!tgFetchingRef.current) {
      tgFetchingRef.current = true
      setTelegramLoading(true)
      fetch("/api/telegram/user/fetch-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).then(() => getTelegramMessages(user.id)).then((msgs: any[]) => {
        setTelegramMessages(msgs)
        setTelegramFetched(true)
      }).catch(() => {}).finally(() => { tgFetchingRef.current = false; setTelegramLoading(false) })
    }
  }, [activeTab, user])

  // Reset table pages when filters/search/channel change
  useEffect(() => { setEmailTablePage(0) }, [emailSearch, emailFilter, contactEmailFilter, keywordFilter, activeChannel])
  useEffect(() => { setMsgTablePage(0) }, [activeChannel])
  useEffect(() => { setCalTablePage(0) }, [activeChannel, calSearch, calFilter])

  // Email kanban state
  const [emailKanbanCols, setEmailKanbanCols] = useState<KanbanCol[]>([
    { id: "unread", label: "Unread", color: COL_COLORS[0] },
    { id: "read",   label: "Read",   color: COL_COLORS[1] },
    { id: "sent",   label: "Sent",   color: COL_COLORS[2] },
  ])
  const [emailCardCols, setEmailCardCols] = useState<Record<string, string>>({})
  const [editingEmailCol, setEditingEmailCol] = useState<string | null>(null)
  const [dragOverEmailCol, setDragOverEmailCol] = useState<string | null>(null)
  const dragEmailId = useRef<string | null>(null)

  // Messages kanban state
  const [msgKanbanCols, setMsgKanbanCols] = useState<KanbanCol[]>([
    { id: "unread", label: "Unread", color: COL_COLORS[0] },
    { id: "read",   label: "Read",   color: COL_COLORS[1] },
    { id: "sent",   label: "Sent",   color: COL_COLORS[2] },
  ])
  const [msgCardCols, setMsgCardCols] = useState<Record<string, string>>({})
  const [editingMsgCol, setEditingMsgCol] = useState<string | null>(null)
  const [dragOverMsgCol, setDragOverMsgCol] = useState<string | null>(null)
  const dragMsgId = useRef<string | null>(null)

  // Calendar kanban state
  const [calKanbanCols, setCalKanbanCols] = useState<KanbanCol[]>([
    { id: "today",    label: "Today",     color: COL_COLORS[0] },
    { id: "week",     label: "This Week", color: COL_COLORS[3] },
    { id: "upcoming", label: "Upcoming",  color: COL_COLORS[2] },
  ])
  const [calCardCols, setCalCardCols] = useState<Record<string, string>>({})
  const [editingCalCol, setEditingCalCol] = useState<string | null>(null)
  const [dragOverCalCol, setDragOverCalCol] = useState<string | null>(null)
  const dragCalId = useRef<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const emailSyncShownRef = useRef(false)
  const emailFetchingRef = useRef(false)
  const [silentFetching, setSilentFetching] = useState(false)
  const tgFetchingRef = useRef(false)

  // Table status dropdown state
  const [emailStatusOpen, setEmailStatusOpen] = useState<string | null>(null)
  const [msgStatusOpen, setMsgStatusOpen] = useState<string | null>(null)
  const [calStatusOpen, setCalStatusOpen] = useState<string | null>(null)

  // Inline label editing inside status dropdowns
  const [editingEmailLabel, setEditingEmailLabel] = useState<string | null>(null)
  const [editingMsgLabel, setEditingMsgLabel] = useState<string | null>(null)
  const [editingCalLabel, setEditingCalLabel] = useState<string | null>(null)

  // Calendar state
  const [calendarConnections, setCalendarConnections] = useState<any[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>(() => loadStored("calendarEvents", []))
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarFetched, setCalendarFetched] = useState(() => loadStored("calendarFetched", false))

  // WhatsApp state
  const [whatsappConnections, setWhatsAppConnections] = useState<any[]>([])
  const [whatsappMessages, setWhatsAppMessages] = useState<any[]>(() => loadStored("whatsappMessages", []))
  const [whatsappLoading, setWhatsAppLoading] = useState(false)
  const [whatsappFetched, setWhatsAppFetched] = useState(() => loadStored("whatsappFetched", false))
  const [waReplyBody, setWaReplyBody] = useState("")
  const [waReplyTo, setWaReplyTo] = useState<string | null>(null)
  const [sendingWaReply, setSendingWaReply] = useState(false)
  const [replySource, setReplySource] = useState<"whatsapp" | "telegram" | "slack">("whatsapp")
  const [pendingImage, setPendingImage] = useState<{ url: string; file: File } | null>(null)
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Telegram state
  const [telegramConnections, setTelegramConnections] = useState<any[]>([])
  const [telegramMessages, setTelegramMessages] = useState<any[]>(() => loadStored("telegramMessages", []))
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramFetched, setTelegramFetched] = useState(() => loadStored("telegramFetched", false))

  // Slack state
  const [slackConnections, setSlackConnections] = useState<any[]>([])
  const [slackMessages, setSlackMessages] = useState<any[]>(() => loadStored("slackMessages", []))
  const [slackLoading, setSlackLoading] = useState(false)
  const [slackFetched, setSlackFetched] = useState(() => loadStored("slackFetched", false))

  // Restore on mount
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !user) return
    try {
      const savedContacts = sessionStorage.getItem(storageKey("contacts"))
      if (savedContacts) setContacts(JSON.parse(savedContacts))
      const savedEmails = sessionStorage.getItem(storageKey("emailMessages"))
      if (savedEmails) setEmailMessages(JSON.parse(savedEmails))
      const savedInbox = sessionStorage.getItem(storageKey("inboxMessages"))
      if (savedInbox) setInboxMessages(JSON.parse(savedInbox))
      const savedInboxFetched = sessionStorage.getItem(storageKey("inboxFetched"))
      // Don't restore inboxFetched — let the real Supabase fetch set it, to prevent badge flashing
      const savedCalendar = sessionStorage.getItem(storageKey("calendarEvents"))
      if (savedCalendar) setCalendarEvents(JSON.parse(savedCalendar))
      const savedCalendarFetched = sessionStorage.getItem(storageKey("calendarFetched"))
      if (savedCalendarFetched) setCalendarFetched(JSON.parse(savedCalendarFetched))
      const savedWa = sessionStorage.getItem(storageKey("whatsappMessages"))
      if (savedWa) setWhatsAppMessages(JSON.parse(savedWa))
      const savedWaFetched = sessionStorage.getItem(storageKey("whatsappFetched"))
      if (savedWaFetched) setWhatsAppFetched(JSON.parse(savedWaFetched))
      const savedTg = sessionStorage.getItem(storageKey("telegramMessages"))
      if (savedTg) setTelegramMessages(JSON.parse(savedTg))
      const savedTgFetched = sessionStorage.getItem(storageKey("telegramFetched"))
      if (savedTgFetched) setTelegramFetched(JSON.parse(savedTgFetched))
      const savedSlack = sessionStorage.getItem(storageKey("slackMessages"))
      if (savedSlack) setSlackMessages(JSON.parse(savedSlack))
      const savedSlackFetched = sessionStorage.getItem(storageKey("slackFetched"))
      if (savedSlackFetched) setSlackFetched(JSON.parse(savedSlackFetched))
      const savedActiveChannel = sessionStorage.getItem(storageKey("activeChannel"))
      if (savedActiveChannel) setActiveChannel(savedActiveChannel)
      const savedActiveTab = sessionStorage.getItem(storageKey("activeTab"))
      if (savedActiveTab) setActiveTab(savedActiveTab)
    } catch { /* ignore corrupt storage */ }
  }, [user])

  // Save when data changes
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("contacts"), JSON.stringify(contacts)) } catch {} }, [contacts, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("emailMessages"), JSON.stringify(emailMessages)) } catch {} }, [emailMessages, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("inboxMessages"), JSON.stringify(inboxMessages)) } catch {} }, [inboxMessages, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("inboxFetched"), JSON.stringify(inboxFetched)) } catch {} }, [inboxFetched, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("calendarEvents"), JSON.stringify(calendarEvents)) } catch {} }, [calendarEvents, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("calendarFetched"), JSON.stringify(calendarFetched)) } catch {} }, [calendarFetched, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("whatsappMessages"), JSON.stringify(whatsappMessages)) } catch {} }, [whatsappMessages, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("whatsappFetched"), JSON.stringify(whatsappFetched)) } catch {} }, [whatsappFetched, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("telegramMessages"), JSON.stringify(telegramMessages)) } catch {} }, [telegramMessages, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("telegramFetched"), JSON.stringify(telegramFetched)) } catch {} }, [telegramFetched, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("slackMessages"), JSON.stringify(slackMessages)) } catch {} }, [slackMessages, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("slackFetched"), JSON.stringify(slackFetched)) } catch {} }, [slackFetched, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("activeChannel"), activeChannel) } catch {} }, [activeChannel, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("activeTab"), activeTab) } catch {} }, [activeTab, user])

  // Fetch media on-demand when opening a Telegram conversation thread
  useEffect(() => {
    if (!user || !activeThread || replySource !== "telegram") return
    const threadMsgs = threadedMessages.find(([tid]) => tid === activeThread)?.[1] || []
    const tgMsgsNeedingMedia = threadMsgs.filter((m: any) => m.media_type === "photo" && !m.media_url)
    if (tgMsgsNeedingMedia.length === 0) return
    const chatId = threadMsgs[0]?.chat_id
    if (!chatId) return
    const messageIds = tgMsgsNeedingMedia.map((m: any) => m.tg_message_id)
    fetch("/api/telegram/user/fetch-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, chatId, messageIds }),
    }).then(r => r.json()).then(async (data) => {
      if (data.downloaded > 0) {
        const tgMsgs = await getTelegramMessages(user.id)
        setTelegramMessages(tgMsgs)
      }
    }).catch(e => console.error("[CRM] Fetch media error:", e))
  }, [activeThread, replySource, user])

  // Build dynamic channels from actual connections
  const channels = useMemo(() => {
    const list: { id: string; label: string; color: string; type: string; connected: boolean }[] = []
    for (const conn of emailConnections) {
      if (conn.status === "connected") {
        list.push({
          id: conn.provider,
          label: conn.provider === "gmail" ? "Gmail" : conn.provider === "outlook" ? "Outlook" : conn.provider === "zoho" ? "Zoho Mail" : conn.provider === "icloud" ? "iCloud Mail" : conn.provider === "hostinger" ? "Hostinger Email" : conn.provider === "godaddy" ? "GoDaddy Email" : conn.email_address || conn.provider,
          color: conn.provider === "gmail" ? "bg-red-500" : conn.provider === "outlook" ? "bg-blue-500" : conn.provider === "hostinger" ? "bg-purple-500" : conn.provider === "zoho" ? "bg-red-600" : conn.provider === "icloud" ? "bg-sky-500" : conn.provider === "godaddy" ? "bg-teal-500" : "bg-slate-500",
          type: "email",
          connected: true,
        })
      }
    }
    for (const conn of calendarConnections) {
      if (conn.status === "connected" && (conn.provider === "google" || conn.provider === "calendly")) {
        list.push({
          id: conn.provider || conn.id,
          label: conn.provider === "google" ? "Google Calendar" : "Calendly",
          color: conn.provider === "google" ? "bg-blue-400" : "bg-indigo-500",
          type: "calendar",
          connected: true,
        })
      }
      if (conn.status === "connected" && conn.provider === "googlemeet") {
        list.push({
          id: "googlemeet",
          label: "Google Meet",
          color: "bg-green-500",
          type: "video",
          connected: true,
        })
      }
    }
    for (const conn of whatsappConnections) {
      list.push({
        id: conn.phone_number_id,
        label: "WhatsApp",
        color: "bg-green-500",
        type: "whatsapp",
        connected: true,
      })
    }
    for (const conn of telegramConnections) {
      list.push({
        id: `tg_${conn.user_id || conn.id || "personal"}`,
        label: conn.tg_username ? `Telegram (@${conn.tg_username})` : "Telegram",
        color: "bg-sky-500",
        type: "telegram",
        connected: conn.status === "connected",
      })
    }
    for (const conn of slackConnections) {
      list.push({
        id: `slack_${conn.id}`,
        label: "Slack",
        color: "bg-purple-500",
        type: "slack",
        connected: true,
      })
    }
    return list
  }, [emailConnections, calendarConnections, whatsappConnections, telegramConnections, slackConnections])

  // Default active channel to first connected one (filtered by current tab)
  const tabChannelType = activeTab === "Email" ? "email" : activeTab === "Calendar" ? "calendar" : activeTab === "Messages" ? "messaging" : ""
  const tabChannels = tabChannelType ? channels.filter(c => tabChannelType === "messaging" ? (c.type === "whatsapp" || c.type === "telegram" || c.type === "slack") : c.type === tabChannelType) : channels
  const activeCh = tabChannels.find((c) => c.id === activeChannel) || tabChannels[0] || { id: "", label: "No channels", color: "bg-slate-500", type: "", connected: false }

  // Initialize activeChannel to first available channel for the current tab
  useEffect(() => {
    if (tabChannels.length > 0 && !tabChannels.some(c => c.id === activeChannel)) {
      setActiveChannel(tabChannels[0].id)
    }
  }, [tabChannels, activeChannel])

  const contact = contacts.find((c: Contact) => c.id === selectedId)

  // Thread-deduped counts — match kanban column display (respect emailCardCols overrides + active channel)
  const prevUnreadRef = useRef(0)
  const { unreadCount, totalThreadCount } = useMemo(() => {
    // Same data source + filters as kanban
    const activeCh = channels.find(c => c.id === activeChannel && c.type === "email")
    const allMsgs = [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
      .filter((m: any) => !activeCh || activeCh.type !== "email" || m.provider === activeCh.id)
    const deduped = allMsgs.filter((m: any, i: number, arr: any[]) =>
      arr.findIndex((x: any) => x.message_id === m.message_id) === i
    )
    // Group by thread_id like the kanban does
    const threadGroups = new Map<string, any[]>()
    for (const m of deduped) {
      const tid = m.thread_id || m.id
      if (!threadGroups.has(tid)) threadGroups.set(tid, [])
      threadGroups.get(tid)!.push(m)
    }
    let unread = 0
    for (const [tid, msgs] of Array.from(threadGroups)) {
      // Check if any message in this thread has a custom column mapping
      const customColId = msgs.find(m => emailCardCols[m.id])?.id
      if (customColId) {
        // Thread is in a custom column — only count as unread if mapped to "unread"
        if (emailCardCols[customColId] === "unread") unread++
      } else {
        // No custom mapping — use default logic: skip sent-only threads, unread if any received message is unread
        if (msgs.some(m => m.direction === "sent") && !msgs.some(m => m.direction === "received")) continue
        if (msgs.some(m => !m.read)) unread++
      }
    }
    // During loading, preserve previous count to prevent badge flashing
    if (inboxLoading && unread === 0 && prevUnreadRef.current > 0) {
      unread = prevUnreadRef.current
    } else {
      prevUnreadRef.current = unread
    }
    return { unreadCount: unread, totalThreadCount: threadGroups.size }
  }, [inboxMessages, emailMessages, emailCardCols, activeChannel, channels, inboxLoading])

  // Helper: display name for a message based on source
  const msgDisplayName = (msg: any) => {
    if (msg.direction === "sent") {
      if (msg._source === "slack") return `To: ${msg.channel_name || msg.channel_id}`
      return `To: ${msg.to_number || msg.chat_title || msg.chat_id}`
    }
    if (msg._source === "slack") return msg.slack_user_name || msg.slack_user_id || "Slack user"
    if (msg._source === "telegram") {
      if (msg.chat_type === "group" || msg.chat_type === "channel") return msg.chat_title || "Group"
      return formatTelegramSender(msg)
    }
    return msg.from_number
  }

  // Helper: reply target for a message
  const msgReplyTarget = (msg: any) => {
    if (msg._source === "slack") return msg.channel_id
    if (msg._source === "telegram") return msg.chat_id
    return msg.from_number
  }

  // Helper: thread ID for grouping messages by conversation
  const msgThreadId = (msg: any) => {
    if (msg._source === "slack") return `slack_${msg.channel_id}`
    if (msg._source === "telegram") return `tg_${msg.chat_id}`
    return `wa_${msg.direction === "sent" ? msg.to_number : msg.from_number}`
  }

  // Helper: format timestamp for display
  const msgTimeStr = (msg: any) => {
    if (!msg.timestamp) return ""
    const d = new Date(msg.timestamp)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // Helper: icon for message source
  const msgSourceIcon = (msg: any) => {
    if (msg._source === "telegram") return <Send className="h-3 w-3 text-sky-400" />
    if (msg._source === "slack") return <MessageSquare className="h-3 w-3 text-purple-400" />
    return <Phone className="h-3 w-3" />
  }

  const [msgFilter, setMsgFilter] = useState<"whatsapp" | "telegram" | "slack">("whatsapp")
  const [msgFilterOpen, setMsgFilterOpen] = useState(false)

  // Auto-set msgFilter to first connected messaging channel
  useEffect(() => {
    const msgChannels = channels.filter(c => c.type === "whatsapp" || c.type === "telegram" || c.type === "slack")
    if (msgChannels.length > 0) {
      const currentConnected = msgChannels.find(c => c.type === msgFilter)
      if (!currentConnected) {
        setMsgFilter(msgChannels[0].type as any)
      }
    }
  }, [channels, msgFilter])

  // Combined WhatsApp + Telegram messages for the Messages tab
  const combinedMessages = useMemo(() => {
    const wa = whatsappMessages.map((m: any) => ({ ...m, _source: "whatsapp" as const }))
    const tg = telegramMessages.map((m: any) => ({ ...m, _source: "telegram" as const }))
    const sl = slackMessages.map((m: any) => ({ ...m, _source: "slack" as const }))
    return [...wa, ...tg, ...sl].sort((a: any, b: any) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })
  }, [whatsappMessages, telegramMessages, slackMessages])

  // Filtered messages based on source filter
  const filteredCombinedMessages = useMemo(() => {
    return combinedMessages.filter(m => m._source === msgFilter)
  }, [combinedMessages, msgFilter])

  // Group messages by thread (conversation) — one card per recipient
  const threadedMessages = useMemo(() => {
    const threads = new Map<string, any[]>()
    for (const msg of filteredCombinedMessages) {
      const tid = msgThreadId(msg)
      if (!threads.has(tid)) threads.set(tid, [])
      threads.get(tid)!.push(msg)
    }
    // Deduplicate messages within each thread (by id)
    for (const [, msgs] of Array.from(threads.entries())) {
      const seen = new Set()
      const deduped = msgs.filter((m: any) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      msgs.length = 0
      msgs.push(...deduped)
      msgs.sort((a: any, b: any) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return ta - tb
      })
    }
    return Array.from(threads.entries()).sort((a, b) => {
      const ta = a[1][a[1].length - 1]?.timestamp ? new Date(a[1][a[1].length - 1].timestamp).getTime() : 0
      const tb = b[1][b[1].length - 1]?.timestamp ? new Date(b[1][b[1].length - 1].timestamp).getTime() : 0
      return tb - ta
    })
  }, [filteredCombinedMessages])

  // Assign each thread to exactly one kanban column (based on latest message)
  const threadColumnMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const [tid, msgs] of Array.from(threadedMessages)) {
      const lastMsg = msgs[msgs.length - 1]
      const colId = msgCardCols[lastMsg?.id] || (lastMsg?.direction === "sent" ? "sent" : lastMsg?.read ? "read" : "unread")
      map.set(tid, colId)
    }
    return map
  }, [threadedMessages, msgCardCols])

  // Messages unread count — count threads in the "unread" column
  const msgUnreadCount = useMemo(() => {
    let count = 0
    for (const [, colId] of Array.from(threadColumnMap)) {
      if (colId === "unread") count++
    }
    return count
  }, [threadColumnMap])

  // Upcoming calendar events — exclude events that have already ended
  const upcomingCalendarEvents = useMemo(() => {
    const now = new Date()
    return calendarEvents
      .filter((e: any) => e.end_time && new Date(e.end_time) > now)
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [calendarEvents])

  const upcomingEventsCount = upcomingCalendarEvents.length

  // Filtered calendar events based on search + filter
  const filteredCalendarEvents = useMemo(() => {
    const now = new Date()
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
    return upcomingCalendarEvents.filter((e: any) => {
      if (calSearch) {
        const q = calSearch.toLowerCase()
        if (!e.summary?.toLowerCase().includes(q) && !e.location?.toLowerCase().includes(q)) return false
      }
      if (calFilter.range === "today") {
        const t = new Date(e.start_time)
        if (t < now || t > todayEnd) return false
      }
      if (calFilter.range === "week") {
        const t = new Date(e.start_time)
        if (t < now || t > weekEnd) return false
      }
      if (calFilter.range === "upcoming") {
        const t = new Date(e.start_time)
        if (t <= weekEnd) return false
      }
      return true
    })
  }, [upcomingCalendarEvents, calSearch, calFilter])

  const filtered = contacts.filter((c: Contact) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  )


  // Safety timeout: never block the UI for more than 1s
  useEffect(() => {
    if (!channelsLoading) return
    const t = setTimeout(() => setChannelsLoading(false), 1000)
    return () => clearTimeout(t)
  }, [channelsLoading])

  // Build activities from real email messages
  const activities = emailMessages.map((msg: any) => ({
    id: msg.id,
    type: msg.direction === "sent" ? "email" : "email",
    text: msg.subject || "(No subject)",
    time: new Date(msg.created_at).toLocaleDateString(),
    contact: msg.direction === "sent" ? msg.to_address : msg.from_address,
    body: msg.body,
    direction: msg.direction,
  }))

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserName(name)
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      } catch {
        const name = user.user_metadata?.full_name || ""
        setUserName(name)
      }

      // Parallel fetch for core metadata (connections + contacts)
      const [emailConnsRes, calConnsRes, waConnsRes, tgConnsRes, slConnsRes, contactsRes, evolutionRes] = await Promise.allSettled([
        getEmailConnections(user.id),
        getCalendarConnections(user.id),
        getWhatsAppConnections(user.id),
        getTelegramUserSession(user.id),
        getSlackConnections(user.id),
        getContacts(user.id),
        getEvolutionSessions(user.id),
      ])

      if (emailConnsRes.status === "fulfilled") setEmailConnections(emailConnsRes.value)
      if (calConnsRes.status === "fulfilled") setCalendarConnections(calConnsRes.value)

      // Merge Meta Cloud API + Evolution API WhatsApp connections
      const metaConns = waConnsRes.status === "fulfilled" ? waConnsRes.value : []
      const evolutionSessions = evolutionRes.status === "fulfilled" ? evolutionRes.value.filter((s: any) => s.status === "connected") : []
      const evolutionAsConns = evolutionSessions.map((s: any) => ({ phone_number_id: `evolution_${s.id}`, phone_number: s.phone_number || s.instance_name, status: "connected", _provider: "evolution", _session: s }))
      setWhatsAppConnections([...metaConns, ...evolutionAsConns])

      // Load Evolution messages and merge into whatsappMessages
      if (evolutionSessions.length > 0) {
        try {
          const waMsgs = await getWhatsAppMessages(user.id)
          const evolutionMsgs = waMsgs.map((m: any) => ({
            ...m,
            _provider: "evolution",
          }))
          if (evolutionMsgs.length > 0) {
            setWhatsAppMessages(prev => {
              const existingIds = new Set(prev.map((m: any) => m.id))
              const newMsgs = evolutionMsgs.filter(m => !existingIds.has(m.id))
              return [...prev, ...newMsgs]
            })
            setWhatsAppFetched(true)
          }
        } catch (e) { console.error("[CRM] Failed to load Evolution messages:", e) }
      }
      if (tgConnsRes.status === "fulfilled") setTelegramConnections(tgConnsRes.value ? [tgConnsRes.value] : [])
      if (slConnsRes.status === "fulfilled") setSlackConnections(slConnsRes.value)
      if (contactsRes.status === "fulfilled") {
        const list = contactsRes.value
        console.log("[DEBUG] Loaded contacts:", list.length)
        setContacts(list.map((c: any) => ({
          id: c.id,
          name: c.name,
          company: c.company || "",
          role: c.role || "",
          email: c.email || "",
          phone: c.phone || "",
          location: c.location || "",
          tags: c.tags || [],
          starred: c.starred,
          lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
          dealValue: c.deal_value || 0,
          dealStage: c.deal_stage || "",
        })))
      } else {
        console.error("[DEBUG] Failed to load contacts:", contactsRes.reason)
      }

      // Core metadata loaded — show CRM
      setChannelsLoading(false)

      // Set loading states for message channels so the refresh button shows a spinner
      if (waConnsRes.status === "fulfilled" && waConnsRes.value.length > 0) setWhatsAppLoading(true)
      if (tgConnsRes.status === "fulfilled" && tgConnsRes.value) setTelegramLoading(true)
      if (slConnsRes.status === "fulfilled" && slConnsRes.value.length > 0) setSlackLoading(true)

      // Then fetch heavy message/event data in parallel (non-blocking)
      await Promise.allSettled([
        emailConnsRes.status === "fulfilled" && emailConnsRes.value.length > 0
          ? getEmailMessages(user.id).then((msgs: any[]) => {
              if (msgs.length > 0) {
                setEmailMessages(msgs)
                const received = msgs.filter((m: any) => m.direction === "received")
                setInboxMessages(received)
                if (received.length > 0) setInboxFetched(true)
              } else {
                setEmailMessages([])
                setInboxMessages([])
                setInboxFetched(false)
              }
            }).catch((err) => { console.error("[LOAD] getEmailMessages failed:", err) })
          : (() => { setEmailMessages([]); setInboxMessages([]); setInboxFetched(false); return Promise.resolve() })(),
        calConnsRes.status === "fulfilled" && calConnsRes.value.length > 0
          ? (async () => {
              // Check if this is a first-time connection (no events in DB yet)
              const existingEvents = await getCalendarEvents(user.id)
              if (existingEvents.length === 0) {
                // First sync — show modal
                await fetchCalendar(true)
              } else {
                // Not first — load from DB, then background fetch
                setCalendarEvents(existingEvents)
                setCalendarFetched(true)
                fetchCalendar()
              }
            })()
          : (() => { setCalendarEvents([]); setCalendarFetched(false); return Promise.resolve() })(),
        waConnsRes.status === "fulfilled" && waConnsRes.value.length > 0
          ? getWhatsAppMessages(user.id).then((msgs: any[]) => {
              setWhatsAppMessages(msgs)
              if (msgs.length > 0) setWhatsAppFetched(true)
            }).catch(() => {})
          : (() => { setWhatsAppMessages([]); setWhatsAppFetched(false); return Promise.resolve() })(),
        tgConnsRes.status === "fulfilled" && tgConnsRes.value
          ? (() => {
              // Load from DB immediately, then sync live in background
              return getTelegramMessages(user.id).then((cached: any[]) => {
                if (cached.length > 0) { setTelegramMessages(cached); setTelegramFetched(true) }
                if (!tgFetchingRef.current) {
                  tgFetchingRef.current = true
                  fetch("/api/telegram/user/fetch-chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id }),
                  }).then(() => getTelegramMessages(user.id)).then((msgs: any[]) => {
                    setTelegramMessages(msgs)
                    setTelegramFetched(true)
                  }).catch(() => {}).finally(() => { tgFetchingRef.current = false })
                }
              }).catch(() => {})
            })()
          : (() => { setTelegramMessages([]); setTelegramFetched(false); return Promise.resolve() })(),
        slConnsRes.status === "fulfilled" && slConnsRes.value.length > 0
          ? fetch("/api/slack/fetch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            }).then(() => getSlackMessages(user.id)).then((msgs: any[]) => {
              setSlackMessages(msgs)
              setSlackFetched(true)
            }).catch(() => {})
          : (() => { setSlackMessages([]); setSlackFetched(false); return Promise.resolve() })(),
      ])
      setWhatsAppLoading(false)
      setTelegramLoading(false)
      setSlackLoading(false)

      // Auto-import contacts from all connected channels
      Promise.allSettled([
        importContactsFromEmails(user.id),
        importContactsFromWhatsApp(user.id),
        importContactsFromTelegram(user.id),
        importContactsFromSlack(user.id),
      ]).then(async () => {
        try {
          const contactList = await getContacts(user.id)
          setContacts(contactList.map((c: any) => ({
            id: c.id, name: c.name, company: c.company || "", role: c.role || "",
            email: c.email || "", phone: c.phone || "", location: c.location || "",
            tags: c.tags || [], starred: c.starred,
            lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
            dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
          })))
        } catch {}
      }).catch(() => {})
    }
    load()
  }, [user, pathname])

  // Live sync via Supabase Realtime
  useEffect(() => {
    if (!user) return

    const emailChannel = subscribeToEmailMessages(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const msg = payload.new
        setEmailMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        if (msg.direction === "received") {
          setInboxMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [msg, ...prev]
          })
          setInboxFetched(true)
          // Auto-import contacts from email + WhatsApp + Telegram
          Promise.allSettled([
            importContactsFromEmails(user.id),
            importContactsFromWhatsApp(user.id),
            importContactsFromTelegram(user.id),
          ]).then(async () => {
            const contactList = await getContacts(user.id)
            setContacts(contactList.map((c: any) => ({
              id: c.id, name: c.name, company: c.company || "", role: c.role || "",
              email: c.email || "", phone: c.phone || "", location: c.location || "",
              tags: c.tags || [], starred: c.starred,
              lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
              dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
            })))
          }).catch(() => {})
        }
      } else if (payload.eventType === "UPDATE") {
        const msg = payload.new
        setEmailMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
        if (msg.direction === "received") {
          setInboxMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
        }
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setEmailMessages((prev) => prev.filter((m) => m.id !== id))
        setInboxMessages((prev) => prev.filter((m) => m.id !== id))
      }
    })

    const calendarChannel = subscribeToCalendarEvents(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const evt = payload.new
        setCalendarEvents((prev) => {
          if (prev.some((e) => e.id === evt.id)) return prev
          return [...prev, evt].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        })
        setCalendarFetched(true)
      } else if (payload.eventType === "UPDATE") {
        const evt = payload.new
        setCalendarEvents((prev) => prev.map((e) => (e.id === evt.id ? evt : e)))
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setCalendarEvents((prev) => prev.filter((e) => e.id !== id))
      }
    })

    const contactsChannel = subscribeToContacts(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const c = payload.new
        setContacts((prev) => {
          if (prev.some((contact) => contact.id === c.id)) return prev
          return [
            {
              id: c.id,
              name: c.name,
              company: c.company || "",
              role: c.role || "",
              email: c.email || "",
              phone: c.phone || "",
              location: c.location || "",
              tags: c.tags || [],
              starred: c.starred,
              lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
              dealValue: c.deal_value || 0,
              dealStage: c.deal_stage || "",
            },
            ...prev,
          ]
        })
      } else if (payload.eventType === "UPDATE") {
        const c = payload.new
        setContacts((prev) =>
          prev.map((contact) =>
            contact.id === c.id
              ? {
                  id: c.id,
                  name: c.name,
                  company: c.company || "",
                  role: c.role || "",
                  email: c.email || "",
                  phone: c.phone || "",
                  location: c.location || "",
                  tags: c.tags || [],
                  starred: c.starred,
                  lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
                  dealValue: c.deal_value || 0,
                  dealStage: c.deal_stage || "",
                }
              : contact
          )
        )
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setContacts((prev) => prev.filter((c) => c.id !== id))
      }
    })

    const slackChannel = subscribeToSlackMessages(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const msg = payload.new
        setSlackMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        setSlackFetched(true)
        if (msg.direction === "received") {
          importContactsFromSlack(user.id).then(async () => {
            const contactList = await getContacts(user.id)
            setContacts(contactList.map((c: any) => ({
              id: c.id, name: c.name, company: c.company || "", role: c.role || "",
              email: c.email || "", phone: c.phone || "", location: c.location || "",
              tags: c.tags || [], starred: c.starred,
              lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
              dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
            })))
          }).catch(() => {})
        }
      } else if (payload.eventType === "UPDATE") {
        const msg = payload.new
        setSlackMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setSlackMessages((prev) => prev.filter((m) => m.id !== id))
      }
    })

    const whatsappChannel = subscribeToWhatsAppMessages(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const msg = payload.new
        setWhatsAppMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        setWhatsAppFetched(true)
        if (msg.direction === "received") {
          importContactsFromWhatsApp(user.id).then(async () => {
            const contactList = await getContacts(user.id)
            setContacts(contactList.map((c: any) => ({
              id: c.id, name: c.name, company: c.company || "", role: c.role || "",
              email: c.email || "", phone: c.phone || "", location: c.location || "",
              tags: c.tags || [], starred: c.starred,
              lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
              dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
            })))
          }).catch(() => {})
        }
      } else if (payload.eventType === "UPDATE") {
        const msg = payload.new
        setWhatsAppMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setWhatsAppMessages((prev) => prev.filter((m) => m.id !== id))
      }
    })

    const telegramChannel = subscribeToTelegramMessages(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const msg = payload.new
        setTelegramMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        setTelegramFetched(true)
        if (msg.direction === "received") {
          importContactsFromTelegram(user.id).then(async () => {
            const contactList = await getContacts(user.id)
            setContacts(contactList.map((c: any) => ({
              id: c.id, name: c.name, company: c.company || "", role: c.role || "",
              email: c.email || "", phone: c.phone || "", location: c.location || "",
              tags: c.tags || [], starred: c.starred,
              lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
              dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
            })))
          }).catch(() => {})
        }
      } else if (payload.eventType === "UPDATE") {
        const msg = payload.new
        setTelegramMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
      } else if (payload.eventType === "DELETE") {
        const id = payload.old.id
        setTelegramMessages((prev) => prev.filter((m) => m.id !== id))
      }
    })

    return () => {
      unsubscribeChannel(emailChannel)
      unsubscribeChannel(calendarChannel)
      unsubscribeChannel(contactsChannel)
      unsubscribeChannel(slackChannel)
      unsubscribeChannel(whatsappChannel)
      unsubscribeChannel(telegramChannel)
    }
  }, [user?.id])

  // ── Auto-poll inbox every 2 minutes ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes
    const interval = setInterval(() => {
      const providerId = activeChannel || emailConnections.find((c: any) => c.status === "connected")?.provider
      if (providerId && !inboxLoading) {
        console.log("[AUTO-POLL] Fetching inbox for new emails...")
        fetchInbox()
      }
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user?.id, activeChannel, emailConnections, inboxLoading])

  // ── Load kanban cols from Supabase ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    Promise.allSettled([
      getKanbanCols(user.id, "email"),
      getKanbanCols(user.id, "messages"),
      getKanbanCols(user.id, "calendar"),
      getKanbanCardCols(user.id, "email"),
      getKanbanCardCols(user.id, "messages"),
    ]).then(([eRes, mRes, cRes, eCardRes, mCardRes]) => {
      if (eRes.status === "fulfilled" && eRes.value.length > 0) {
        const seen = new Set<string>()
        const deduped = eRes.value.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
        setEmailKanbanCols(deduped)
      }
      if (mRes.status === "fulfilled" && mRes.value.length > 0) {
        const seen = new Set<string>()
        const deduped = mRes.value.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
        setMsgKanbanCols(deduped)
      }
      if (cRes.status === "fulfilled" && cRes.value.length > 0) {
        const seen = new Set<string>()
        const deduped = cRes.value.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
        setCalKanbanCols(deduped)
      }
      if (eCardRes.status === "fulfilled") setEmailCardCols(eCardRes.value)
      if (mCardRes.status === "fulfilled") setMsgCardCols(mCardRes.value)
    })
  }, [user])

  // ── Auto-save kanban cols to Supabase whenever they change ──────────────────
  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => { upsertKanbanCols(user.id, "email", emailKanbanCols).catch(() => {}) }, 600)
    return () => clearTimeout(t)
  }, [user, emailKanbanCols])

  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => { upsertKanbanCols(user.id, "messages", msgKanbanCols).catch(() => {}) }, 600)
    return () => clearTimeout(t)
  }, [user, msgKanbanCols])

  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => { upsertKanbanCols(user.id, "calendar", calKanbanCols).catch(() => {}) }, 600)
    return () => clearTimeout(t)
  }, [user, calKanbanCols])

  // Clear email sync modal when leaving Email tab
  useEffect(() => {
    if (activeTab !== "Email" && emailSyncModal) {
      setEmailSyncModal(null)
    }
  }, [activeTab])

  // Clear calendar sync modal when leaving Calendar tab
  useEffect(() => {
    if (activeTab !== "Calendar" && calendarSyncModal) {
      setCalendarSyncModal(null)
    }
  }, [activeTab])

  // Reload calendar connections when Calendar or Overview tab is activated
  useEffect(() => {
    if (!user || (activeTab !== "Calendar" && activeTab !== "Overview")) return
    getCalendarConnections(user.id).then((conns: any[]) => {
      setCalendarConnections(conns)
      const hasCalendarProvider = conns.some((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")
      if (!hasCalendarProvider) {
        setCalendarEvents([])
        setCalendarFetched(false)
      }
    }).catch(() => {})
  }, [user, activeTab])

  // Reload email data when Email tab is activated
  useEffect(() => {
    if (!user || activeTab !== "Email") return
    getEmailConnections(user.id).then(async (conns: any[]) => {
      setEmailConnections(conns)
      if (conns.length === 0) {
        setEmailMessages([])
        setInboxMessages([])
        setInboxFetched(false)
        // Reload contacts to reflect email disconnect cleanup
        getContacts(user.id).then((cs: any[]) => {
          setContacts(cs.map((c: any) => ({
            id: c.id, name: c.name, email: c.email, phone: c.phone,
            company: c.company, tags: c.tags || [], starred: c.starred,
            role: c.role || "", location: c.location || "",
            lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
            dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
          })))
        }).catch(() => {})
      } else {
        // Load from DB first (instant display)
        const loadFromDB = () => getEmailMessages(user.id).then((msgs: any[]) => {
          // Dedup by message_id in case DB still has stale duplicates
          const deduped = msgs.filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.message_id === m.message_id) === i)
          setEmailMessages(deduped)
          const received = deduped.filter((m: any) => m.direction === "received")
          setInboxMessages(received)
          setInboxFetched(received.length > 0 || deduped.some((m: any) => m.direction === "sent"))
        }).catch(() => {})

        await loadFromDB()

        // Auto-fetch from email provider in background, then reload from DB
        // Trigger for new connections (no last_fetched_at) OR returning to Email tab (silent refresh)
        const newConn = conns.find((c: any) => c.status === "connected" && !c.last_fetched_at)
        const existingConn = !newConn && conns.find((c: any) => c.status === "connected")
        if (existingConn && !emailFetchingRef.current) {
          emailFetchingRef.current = true
          setSilentFetching(true)
          try {
            const res = await fetch("/api/email/fetch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, providerId: existingConn.provider, since: existingConn.last_fetched_at || undefined }),
            })
            if (res.ok) await loadFromDB()
          } catch {} finally {
            emailFetchingRef.current = false
            setSilentFetching(false)
          }
        }
        if (newConn && !emailFetchingRef.current) {
          emailFetchingRef.current = true
          setInboxLoading(true)
          setEmailSyncModal({
            visible: true,
            step: "connecting",
            progress: 0,
            totalFetched: 0,
            totalScanned: 0,
            keptEmails: [],
            droppedEmails: [],
            dateRange: { from: null, to: null },
            isInitial: true,
          })

          // Animate progress linearly to 95% over ~15 seconds, then wait for API
          let progressVal = 0
          const progressTimer = setInterval(() => {
            progressVal = Math.min(progressVal + 0.7, 95)
            setEmailSyncModal(prev => prev ? { ...prev, progress: Math.round(progressVal) } : null)
          }, 100)

          try {
            const fetchRes = await fetch("/api/email/fetch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, providerId: newConn.provider, since: newConn.last_fetched_at || undefined }),
            })
            const fetchData = await fetchRes.json()
            const fetchedMsgs = fetchData.messages || []
            const droppedMsgs = fetchData.dropped || []
            const apiDateRange = fetchData.dateRange || { from: null, to: null }

            clearInterval(progressTimer)

            setEmailSyncModal({
              visible: true,
              step: "done",
              progress: 100,
              totalFetched: fetchedMsgs.length,
              totalScanned: fetchedMsgs.length + droppedMsgs.length,
              keptEmails: fetchedMsgs,
              droppedEmails: droppedMsgs,
              dateRange: { from: apiDateRange.from, to: apiDateRange.to },
              isInitial: true,
            })

            await loadFromDB()
            // Reload connections so last_fetched_at is updated in state
            const updatedConns = await getEmailConnections(user.id)
            setEmailConnections(updatedConns)
          } catch (e) {
            console.error("[EMAIL TAB] Auto-fetch failed:", e)
            clearInterval(progressTimer)
            setEmailSyncModal(null)
          } finally {
            setInboxLoading(false)
            emailFetchingRef.current = false
          }
        }
      }
    }).catch(() => {})
  }, [user, activeTab])

  // Fetch inbox emails + auto-import contacts
  const fetchInbox = async (pageToken?: string, showSyncModal?: boolean, forceFull?: boolean) => {
    if (!user) return
    const providerId = activeChannel || emailConnections.find((c: any) => c.status === "connected")?.provider
    if (!providerId) { setFetchError("No email provider selected."); return }
    const conn = emailConnections.find((c: any) => c.provider === providerId && c.status === "connected")
    if (!conn) { setFetchError("No connected email account found. Connect Gmail in Channels."); return }

    const isLoadMore = !!pageToken
    if (isLoadMore) setLoadingMore(true)
    else { setInboxLoading(true); setFetchStep("scanning") }
    setFetchError(null)

    // Show modal with progress for manual fetch
    let progressTimer: any = null
    if (showSyncModal && !isLoadMore) {
      let progressVal = 0
      progressTimer = setInterval(() => {
        progressVal = Math.min(progressVal + 0.7, 95)
        setEmailSyncModal(prev => prev ? { ...prev, progress: Math.round(progressVal) } : null)
      }, 100)
      setEmailSyncModal({
        visible: true,
        step: "connecting",
        progress: 0,
        totalFetched: 0,
        totalScanned: 0,
        keptEmails: [],
        droppedEmails: [],
        dateRange: { from: null, to: null },
        isInitial: false,
      })
    }

    try {
      const res = await fetch("/api/email/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, providerId, pageToken, since: !isLoadMore && !forceFull && fetchKeywords.length === 0 ? (conn as any)?.last_fetched_at || undefined : undefined }),
      })
      if (!isLoadMore) setFetchStep("filtering")
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || "Failed to fetch emails")
        if (progressTimer) clearInterval(progressTimer)
        setEmailSyncModal(null)
        return
      }

      setNextPageToken(data.nextPageToken || null)

      // Merge API-returned messages directly into state (no extra DB reload)
      const fetched = data.messages || []
      const droppedEmails = data.dropped || []
      const apiDateRange = data.dateRange || { from: null, to: null }
      setFetchedCount(fetched.length)

      // Update modal with results
      if (showSyncModal && !isLoadMore && progressTimer) {
        clearInterval(progressTimer)
        setEmailSyncModal({
          visible: true,
          step: "done",
          progress: 100,
          totalFetched: fetched.length,
          totalScanned: fetched.length + droppedEmails.length,
          keptEmails: fetched,
          droppedEmails: droppedEmails,
          dateRange: apiDateRange,
          isInitial: false,
        })
      }
      const merge = (prev: any[]) => {
        const map = new Map(prev.map(m => [m.message_id || m.id, m]))
        for (const m of fetched) map.set(m.message_id || m.id, m)
        return Array.from(map.values()).sort((a, b) => {
          const da = a.received_at ? new Date(a.received_at).getTime() : 0
          const db = b.received_at ? new Date(b.received_at).getTime() : 0
          return db - da
        })
      }
      setEmailMessages(prev => merge(prev))
      setInboxMessages(prev => merge(prev).filter((m: any) => m.direction === "received"))
      setInboxFetched(true)

      // Fire contact import in background — don't block UI
      if (!isLoadMore) setFetchStep("importing")
      const prevContactCount = contacts.length
      Promise.allSettled([
        importContactsFromEmails(user.id),
        importContactsFromWhatsApp(user.id),
        importContactsFromTelegram(user.id),
      ]).then(async () => {
        const contactList = await getContacts(user.id)
        setContacts(contactList.map((c: any) => ({
          id: c.id, name: c.name, company: c.company || "", role: c.role || "",
          email: c.email || "", phone: c.phone || "", location: c.location || "",
          tags: c.tags || [], starred: c.starred,
          lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
          dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
        })))
        if (!isLoadMore) {
          setFetchStep("done")
          setTimeout(() => setFetchStep(null), 2500)
          // Notify: new emails synced
          if (fetched.length > 0) {
            createNotification(
              user.id,
              "email_sync",
              `Inbox synced — ${fetched.length} new email${fetched.length === 1 ? "" : "s"}`,
              `Latest: "${fetched[0]?.subject || "(no subject)"}"`,
              { count: fetched.length }
            ).catch(() => {})
          }
          // Notify: new contacts imported
          const newContacts = contactList.length - prevContactCount
          if (newContacts > 0) {
            createNotification(
              user.id,
              "contact_import",
              `${newContacts} new contact${newContacts === 1 ? "" : "s"} imported`,
              "Contacts have been auto-imported from your emails.",
              { count: newContacts }
            ).catch(() => {})
          }
        }
      }).catch(() => { if (!isLoadMore) setFetchStep(null) })
    } catch (e: any) {
      setFetchError(e?.message || "Network error fetching emails")
      setFetchStep(null)
      if (progressTimer) clearInterval(progressTimer)
      setEmailSyncModal(null)
    } finally {
      if (isLoadMore) setLoadingMore(false)
      else setInboxLoading(false)
    }
  }

  // ── Auto-poll for calendar events every 2 minutes (client-side) ─────────────
  useEffect(() => {
    if (!user) return
    const hasConnectedCalendar = calendarConnections.some((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")
    if (!hasConnectedCalendar) return
    // Only auto-poll on interval, not on tab switch (to avoid blocking manual sync)
    const interval = setInterval(() => {
      console.log("[CRM] Auto-polling calendar...")
      fetchCalendar()
    }, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [user?.id, calendarConnections, activeTab])

  // Fetch calendar events
  const fetchCalendar = async (showSyncModal?: boolean) => {
    if (!user) return
    const conn = calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")
    if (!conn) return
    setCalendarLoading(true)

    let progressTimer: any = null
    if (showSyncModal) {
      let progressVal = 0
      progressTimer = setInterval(() => {
        progressVal = Math.min(progressVal + 1, 95)
        setCalendarSyncModal(prev => prev ? { ...prev, progress: Math.round(progressVal) } : null)
      }, 100)
      setCalendarSyncModal({
        visible: true,
        step: "connecting",
        progress: 0,
        totalFetched: 0,
        totalScanned: 0,
        importedEvents: [],
        droppedEvents: [],
        alreadyImportedEvents: [],
        dateRange: { from: null, to: null },
        isInitial: false,
      })
    }

    try {
      const res = await fetch("/api/calendar/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("[CALENDAR FETCH]", data.error)
        if (progressTimer) clearInterval(progressTimer)
        if (showSyncModal) {
          setCalendarSyncModal({
            visible: true,
            step: "done",
            progress: 100,
            totalFetched: 0,
            totalScanned: 0,
            importedEvents: [],
            droppedEvents: [],
            alreadyImportedEvents: [],
            dateRange: { from: null, to: null },
            isInitial: false,
          })
        }
        return
      }

      // Reload from DB
      const events = await getCalendarEvents(user.id)
      setCalendarEvents(events)
      setCalendarFetched(true)

      if (showSyncModal && progressTimer) {
        clearInterval(progressTimer)
        const fetchedEvents = data.events || []
        const droppedEvs = data.dropped || []
        const apiDateRange = data.dateRange || { from: null, to: null }
        const apiTotalScanned = data.totalScanned || (fetchedEvents.length + droppedEvs.length)
        const alreadyImportedEvs = data.alreadyImported || []
        setCalendarSyncModal({
          visible: true,
          step: "done",
          progress: 100,
          totalFetched: fetchedEvents.length,
          totalScanned: apiTotalScanned,
          importedEvents: fetchedEvents,
          droppedEvents: droppedEvs,
          alreadyImportedEvents: alreadyImportedEvs,
          dateRange: { from: apiDateRange.from, to: apiDateRange.to },
          isInitial: false,
        })
      }
    } catch (e) {
      console.error("[CALENDAR FETCH]", e)
      if (progressTimer) clearInterval(progressTimer)
      setCalendarSyncModal(null)
    } finally {
      setCalendarLoading(false)
    }
  }

  // Auto-sync Calendar when Calendar tab becomes active
  useEffect(() => {
    if (activeTab !== "Calendar" || !user) return
    const hasConn = calendarConnections.some((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")
    if (!hasConn) return
    fetchCalendar()
  }, [activeTab, user, calendarConnections])

  // Send email
  const handleSendEmail = async () => {
    if (!user || !composeTo || !composeSubject) return
    const conn = emailConnections.find((c: any) => c.provider === activeChannel && c.status === "connected")
    if (!conn) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          providerId: activeChannel,
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")
      // Refresh messages
      const msgs = await getEmailMessages(user.id)
      setEmailMessages(msgs)
      setComposerOpen(false)
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
    } catch (e: any) {
      console.error("[SEND EMAIL]", e)
      toast({ title: "Error", description: e?.message || "Failed to send email", variant: "error" })
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* ── HEADER ── */}
      <header className="relative z-40 flex h-16 md:h-16 shrink-0 items-center gap-2 md:gap-4 border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <div className="flex items-center gap-2 sm:gap-2">
          <button
            onClick={() => setNavOpen(true)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2 overflow-visible">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={70}
              priority
              className="h-[36px] w-auto object-contain sm:h-[38px] md:h-[40px]"
            />
            <span className="inline-block rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
          </Link>
        </div>
        <div className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder={t("crmSearchPlaceholder")}
            />
          </div>
        </div>
        <div className="flex flex-1 justify-end items-center gap-1.5 sm:gap-2 md:gap-3 md:flex-none">
          {/* Language toggle */}
          <div className="hidden md:inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all sm:px-2.5 sm:text-xs",
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
                "rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all sm:px-2.5 sm:text-xs",
                lang === "es"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              ES
            </button>
          </div>
          <TrialPill className="hidden md:flex" />
          <NotificationBell />
          <Link href="/profile" className={cn("relative flex h-9 w-9 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full text-[10px] md:text-xs font-bold text-white transition-colors overflow-hidden", avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600 hover:bg-emerald-500")}>
            <span className={avatarUrl ? "hidden" : ""}>{getInitials(userName) || <User className="h-5 w-5 md:h-4 md:w-4 text-white" />}</span>
            {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />}
          </Link>
        </div>
      </header>

      <AnnouncementBanner />
      <TrialPaywall />

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        <NavRail mobileOpen={navOpen} onClose={() => setNavOpen(false)} />

        {/* Mobile CRM sidebar backdrop */}
        {crmSidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setCrmSidebarOpen(false)} />
        )}

        {/* ── CRM OBJECT NAV + CONTACTS ── */}
        <aside className={cn(
          "flex w-64 shrink-0 flex-col border-r bg-[#1e2533] md:bg-card/30 shadow-2xl md:shadow-none",
          "absolute inset-y-0 left-0 z-30 md:static md:z-auto",
          !crmSidebarOpen && "hidden md:flex"
        )}>
          {/* Object nav */}
          <div className="flex flex-1 flex-col p-4">
            <div className="mb-4 flex items-center justify-between md:block">
              <h2 className="text-sm font-semibold">CRM</h2>
              <button
                onClick={() => setCrmSidebarOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sidebar nav tabs */}
            <div className="flex-1 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCrmSidebarOpen(false) }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    activeTab === tab ? "bg-emerald-600/10 text-emerald-400 font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>{tab === "Overview" ? t("crmOverviewTab") : tab === "Email" ? t("crmEmailTab") : tab === "Messages" ? t("crmMessages") : tab === "Calendar" ? t("crmCalendarTab") : tab}</span>
                  {tab === "Email" && inboxFetched && unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {tab === "Messages" && (telegramFetched || whatsappFetched || slackFetched) && msgUnreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                      {msgUnreadCount > 99 ? "99+" : msgUnreadCount}
                    </span>
                  )}
                  {tab === "Calendar" && upcomingEventsCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                      {upcomingEventsCount > 99 ? "99+" : upcomingEventsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Privacy notice — below Calendar tab */}
            <div className="mt-2 border-t border-border pt-2">
              <button
                onClick={() => setPrivacyOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>{t("crmPrivacy")}</span>
              </button>
            </div>

          </div>

        </aside>

        {/* ── MAIN ── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">

          {/* Contact header - hidden on communication tabs */}
          {contact && activeTab !== "Email" && activeTab !== "Messages" && activeTab !== "Calendar" && (
            <>
          <div className="flex items-start gap-4 border-b p-4 md:p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
              {contact.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{contact.name}</h1>
                <button className="text-muted-foreground hover:text-amber-400 transition-colors">
                  {contact.starred ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{contact.role} at {contact.company}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contact.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {/* Channel selector */}
              <div className="relative">
                <button
                  onClick={() => setShowChannelMenu(v => !v)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
                >
                  <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                  {activeCh.label}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showChannelMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                      <div className="border-b border-white/5 px-3 py-2">
                        <p className="text-xs font-semibold text-white">{t("crmChannels")}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t("crmSelectChannel")}</p>
                      </div>
                      <div className="py-1">
                        {channels.map((ch, i) => (
                          <button
                            key={ch.id}
                            onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-600/10 transition-colors"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600/20 text-[10px] font-bold text-emerald-400">
                              {i + 1}
                            </span>
                            <span className="flex-1 truncate text-white">{ch.label}</span>
                            <span className={cn("shrink-0 text-[10px] font-medium", ch.connected ? "text-emerald-400" : "text-muted-foreground")}>
                              {ch.connected ? t("crmConnected") : ch.id === "email" ? t("crmConnect") : t("crmSoon")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  if (activeCh.type === "email" && contact?.email) {
                    setComposeTo(contact.email)
                  }
                  setComposerOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> {t("crmSend")}
              </button>
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 border-b px-4 pb-3 md:hidden">
            <div className="relative flex-1">
              <button
                onClick={() => setShowChannelMenu(v => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                  {activeCh.label === "No channels" ? t("crmNoChannels") : activeCh.label}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showChannelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                    <div className="border-b border-white/5 px-3 py-2">
                      <p className="text-xs font-semibold text-white">{t("crmChannels")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("crmSelectChannel")}</p>
                    </div>
                    <div className="py-1">
                      {channels.map((ch, i) => (
                        <button
                          key={ch.id}
                          onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-600/10 transition-colors"
                        >
                          <span className="flex-1 truncate text-white">{ch.label}</span>
                          <span className="shrink-0 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                if (activeCh.type === "email" && contact?.email) {
                  setComposeTo(contact.email)
                }
                setComposerOpen(true)
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <Send className="h-3.5 w-3.5" /> {t("crmSend")}
            </button>
          </div>
          </>
        )}


          {/* Tab content */}
          <div className={cn("flex-1", (activeTab === "Email" || activeTab === "Messages" || activeTab === "Calendar") ? "flex flex-col overflow-hidden" : "overflow-y-auto p-4 sm:p-6")}>

            {/* Mobile CRM tabs */}
            <div className="sticky top-0 z-10 -mx-4 -mt-4 flex md:hidden overflow-x-auto border-b bg-background/95 px-3 py-2 scrollbar-hide backdrop-blur-md sm:-mx-6 sm:-mt-6">
              <div className="flex w-full items-center">
                {tabs.map(tab => {
                  const label = tab === "Overview" ? t("crmOverviewTab") : tab === "Email" ? t("crmEmailTab") : tab === "Messages" ? t("crmMessages") : tab === "Calendar" ? t("crmCalendarTab") : tab
                  const Icon = tab === "Overview" ? LayoutDashboard : tab === "Email" ? Mail : tab === "Messages" ? MessageSquare : Calendar
                  const count = tab === "Email" ? (inboxFetched ? unreadCount : 0) : tab === "Messages" ? (telegramFetched || whatsappFetched || slackFetched ? msgUnreadCount : 0) : tab === "Calendar" ? upcomingEventsCount : 0
                  const active = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-2 sm:text-xs",
                        active
                          ? "bg-emerald-600/15 text-emerald-400"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{label}</span>
                      {count > 0 && (
                        <span className={cn(
                          "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
                          active ? "bg-emerald-600" : "bg-emerald-600/70"
                        )}>
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* No channels connected — show empty state with CTA */}
            {!channelsLoading && channels.length === 0 && (activeTab === "Email" || activeTab === "Messages" || activeTab === "Calendar") && (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 px-6 text-center max-w-md">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-bold">No channels connected</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Connect your email, messaging, and calendar channels to start managing your communications in one place.</p>
                  <Link href="/channels" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                    Connect Channels
                  </Link>
                </div>
              </div>
            )}

            {/* No email connected — show empty state with CTA */}
            {!channelsLoading && channels.length > 0 && activeTab === "Email" && !emailConnections.find((c: any) => c.status === "connected") && (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 px-6 text-center max-w-md">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-bold">No email connected</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Connect your email account to start sending and receiving emails from the CRM.</p>
                  <Link href="/channels" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                    Connect Email
                  </Link>
                </div>
              </div>
            )}

            {/* No messaging channels connected — show empty state with CTA */}
            {!channelsLoading && channels.length > 0 && activeTab === "Messages" && whatsappConnections.length === 0 && telegramConnections.length === 0 && slackConnections.length === 0 && (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 px-6 text-center max-w-md">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-bold">No messaging channels connected</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Connect WhatsApp, Telegram, or Slack to start managing your messages in one place.</p>
                  <Link href="/channels" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                    Connect Messaging
                  </Link>
                </div>
              </div>
            )}

            {/* No calendar connected — show empty state with CTA */}
            {!channelsLoading && channels.length > 0 && activeTab === "Calendar" && !calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected") && (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 px-6 text-center max-w-md">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-bold">No calendar connected</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Connect your calendar to start managing events and meetings from the CRM.</p>
                  <Link href="/channels" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                    Connect Calendar
                  </Link>
                </div>
              </div>
            )}

            {/* Empty state for overview when no contact selected */}
            {activeTab === "Overview" && !contact && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-5xl space-y-8">

                  {/* Header */}
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("crmOverviewTitle")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("crmOverviewSubtitle")}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {[
                      {
                        label: "crmInbox",
                        value: totalThreadCount,
                        sub: `${unreadCount} ${t("crmUnread")}`,
                        icon: Mail,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        action: () => setActiveTab("Email"),
                      },
                      {
                        label: "crmMessages",
                        value: whatsappMessages.length + telegramMessages.length + slackMessages.length,
                        sub: `${msgUnreadCount} ${t("crmUnread")}`,
                        icon: MessageSquare,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/10",
                        action: () => setActiveTab("Messages"),
                      },
                      {
                        label: "crmEvents",
                        value: upcomingCalendarEvents.length,
                        sub: t("crmUpcoming"),
                        icon: Calendar,
                        color: "text-amber-400",
                        bg: "bg-amber-500/10",
                        action: () => setActiveTab("Calendar"),
                      },
                      {
                        label: "crmContacts",
                        value: contacts.length,
                        sub: `${contacts.filter((c: any) => c.starred).length} ${t("crmStarred")}`,
                        icon: User,
                        color: "text-purple-400",
                        bg: "bg-purple-500/10",
                        action: () => setContactsModalOpen(true),
                      },
                    ].map(({ label, value, sub, icon: Icon, color, bg, action }) => (
                      <button key={label} onClick={action}
                        className="group rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                        <div className="flex items-start justify-between">
                          <div className={cn("flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg", bg)}>
                            <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", color)} />
                          </div>
                          <span className="text-xl sm:text-2xl font-bold tabular-nums">{value >= 99 ? "99+" : value}</span>
                        </div>
                        <div className="mt-2 sm:mt-3">
                          <p className="text-xs sm:text-sm font-semibold">{t(label as any)}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Connected Channels */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("crmConnectedChannels")}</h2>
                      <Link href="/channels" className="text-xs text-emerald-400 hover:underline">Manage →</Link>
                    </div>
                    {channels.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-10 text-center">
                        <p className="text-sm text-muted-foreground">No channels connected yet.</p>
                        <Link href="/channels" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                          Connect Channels
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                        {/* Email — one card per connected provider */}
                        {emailConnections.filter((c: any) => c.status === "connected").map((conn: any) => {
                          const providerLabel = conn.provider === "gmail" ? "Gmail" : conn.provider === "outlook" ? "Outlook" : conn.provider === "zoho" ? "Zoho Mail" : conn.provider === "icloud" ? "iCloud Mail" : conn.provider === "hostinger" ? "Hostinger Email" : conn.provider === "godaddy" ? "GoDaddy Email" : conn.email_address || conn.provider
                          return (
                          <button key={conn.provider} onClick={() => { setActiveChannel(conn.provider); setActiveTab("Email") }}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                              <Mail className="h-4 w-4 sm:h-5 w-5 text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{providerLabel}</p>
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 shrink-0">{t("crmConnected")}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {conn.email_address || ""}
                              </p>
                            </div>
                          </button>
                          )
                        })}
                        {/* WhatsApp */}
                        {whatsappConnections.length > 0 && (
                          <button onClick={() => setActiveTab("Messages")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">WhatsApp</p>
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {whatsappMessages.filter((m: any) => !m.read && m.direction === "received").length} {t("crmUnread")} · {whatsappMessages.length} {t("crmTotal")}
                              </p>
                            </div>
                          </button>
                        )}
                        {/* Telegram */}
                        {telegramConnections.length > 0 && (
                          <button onClick={() => setActiveTab("Messages")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Telegram</p>
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {telegramMessages.filter((m: any) => !m.read && m.direction === "received").length} {t("crmUnread")} · {telegramMessages.length} {t("crmTotal")}
                              </p>
                            </div>
                          </button>
                        )}
                        {/* Slack */}
                        {slackConnections.length > 0 && (
                          <button onClick={() => setActiveTab("Messages")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Slack</p>
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {slackMessages.filter((m: any) => !m.read && m.direction === "received").length} {t("crmUnread")} · {slackMessages.length} {t("crmTotal")}
                              </p>
                            </div>
                          </button>
                        )}
                        {/* Google Meet */}
                        {calendarConnections.find((c: any) => c.provider === "googlemeet" && c.status === "connected") && (
                          <button onClick={() => setActiveTab("Calendar")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                              <Video className="h-4 w-4 sm:h-5 w-5 text-green-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Google Meet</p>
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 shrink-0">{t("crmConnected")}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {calendarConnections.find((c: any) => c.provider === "googlemeet" && c.status === "connected")?.calendar_email || ""}
                              </p>
                            </div>
                          </button>
                        )}
                        {/* Calendar */}
                        {calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected") && (() => {
                          const nextEvent = upcomingCalendarEvents[0]
                          return (
                            <button onClick={() => setActiveTab("Calendar")}
                              className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold">{calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")?.provider === "calendly" ? "Calendly" : "Google Calendar"}</p>
                                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {nextEvent ? `${t("crmNext")} ${nextEvent.summary?.slice(0, 28) || "—"}` : `${upcomingCalendarEvents.length} ${t("crmEventsCount")}`}
                                </p>
                              </div>
                            </button>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Recent emails + upcoming events */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Recent emails */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between border-b px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-400" />
                          <h3 className="text-sm font-semibold">{t("crmRecentEmails")}</h3>
                        </div>
                        <button onClick={() => setActiveTab("Email")} className="text-xs text-emerald-400 hover:underline">{t("crmViewAll")}</button>
                      </div>
                      {inboxMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Mail className="mb-2 h-5 w-5 text-muted-foreground opacity-40" />
                          <p className="text-xs text-muted-foreground">{t("crmNoEmailsYet")}</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {[...inboxMessages].sort((a: any, b: any) => new Date(b.received_at || 0).getTime() - new Date(a.received_at || 0).getTime()).slice(0, 5).map((m: any) => (
                            <button key={m.id} onClick={() => { setActiveTab("Email"); setOpenEmail(m) }}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: m.read ? "transparent" : "#10b981" }} />
                              <div className="min-w-0 flex-1">
                                <p className={cn("truncate text-xs", !m.read && "font-semibold")}>{m.from_address || "Unknown"}</p>
                                <p className="truncate text-xs text-muted-foreground">{m.subject || "(No subject)"}</p>
                              </div>
                              <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                {m.received_at ? new Date(m.received_at).toLocaleDateString() : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Upcoming events */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between border-b px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          <h3 className="text-sm font-semibold">{t("crmUpcomingEvents")}</h3>
                        </div>
                        <button onClick={() => setActiveTab("Calendar")} className="text-xs text-emerald-400 hover:underline">{t("crmViewAll")}</button>
                      </div>
                      {upcomingCalendarEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <ClipboardList className="mb-2 h-5 w-5 text-muted-foreground opacity-40" />
                          <p className="text-xs text-muted-foreground">{t("crmNoUpcomingEvents")}</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {upcomingCalendarEvents.slice(0, 5).map((ev: any) => (
                            <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                              <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                                <span className="text-[10px] font-bold leading-none uppercase">{new Date(ev.start_time).toLocaleDateString("en", { month: "short" })}</span>
                                <span className="text-sm font-bold leading-none">{new Date(ev.start_time).getDate()}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">{ev.summary}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                  {ev.location ? ` · ${ev.location}` : ""}
                                </p>
                              </div>
                              {ev.is_online && <span className="shrink-0 rounded-full bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">Online</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── OVERVIEW (contact selected) ── */}
            {activeTab === "Overview" && contact && (
              <div className="overflow-y-auto p-4 sm:p-6">
                <button
                  onClick={() => setSelectedId(null)}
                  className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                  Back to dashboard
                </button>
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Contact info */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Contact Info</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: Mail, label: "Email", value: contact.email },
                        { icon: Phone, label: "Phone", value: contact.phone },
                        { icon: Building2, label: "Company", value: contact.company },
                        { icon: MapPin, label: "Location", value: contact.location },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Icon className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                            <div className="text-sm font-medium">{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Active Deal</h3>
                    {contact.dealValue > 0 ? (
                      <div className="flex items-center justify-between rounded-lg border bg-card/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
                            <CircleDollarSign className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Exploro AI Workspace</div>
                            <div className="text-xs text-muted-foreground">Updated {contact.lastContact}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">${contact.dealValue.toLocaleString()}</div>
                          <span className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            stages.find(s => s.name === contact.dealStage)?.color
                          )}>
                            {contact.dealStage}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-8 text-center">
                        <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No active deals</p>
                        <button className="mt-2 text-xs font-medium text-emerald-400 hover:underline">Create a deal</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Recent Activity</h3>
                    {contact.email && (
                      <button
                        onClick={() => {
                          setContactEmailFilter(contact.email)
                          setActiveTab("Email")
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        View Email Thread
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {activities.filter(a => a.contact === contact.email || a.contact === contact.name).slice(0, 4).map(a => (
                      <div key={a.id} className="flex gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-400">
                          {a.type === "email" && <Mail className="h-3 w-3" />}
                          {a.type === "call" && <Phone className="h-3 w-3" />}
                          {a.type === "note" && <FileText className="h-3 w-3" />}
                          {a.type === "deal" && <CircleDollarSign className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-xs leading-relaxed">{a.text}</p>
                          <p className="text-[10px] text-muted-foreground">{a.time}</p>
                        </div>
                      </div>
                    ))}
                    {activities.filter(a => a.contact === contact.email || a.contact === contact.name).length === 0 && (
                      <p className="text-xs text-muted-foreground">No recent activity.</p>
                    )}
                  </div>
                </div>
              </div>
              </div>
            )}


            {/* ── EMAIL ── */}
            {activeTab === "Email" && channels.length > 0 && emailConnections.find((c: any) => c.status === "connected") && (
              <div className="flex flex-1 flex-col min-h-0">
                {/* Contact filter banner */}
                {contactEmailFilter && (
                  <div className="flex items-center justify-between bg-blue-600/10 border-b border-blue-500/20 px-6 py-2">
                    <span className="text-xs font-medium text-blue-400">
                      Filtered by contact: {contactEmailFilter}
                    </span>
                    <button
                      onClick={() => setContactEmailFilter(null)}
                      className="text-xs text-muted-foreground hover:text-white transition-colors"
                    >
                      Clear filter ✕
                    </button>
                  </div>
                )}
                {/* Email Toolbar */}
                <div className="flex flex-col gap-2 border-b bg-card/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-base font-bold sm:text-lg">{t("crmEmailTabTitle")}</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setEmailView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", emailView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmKanban")}</button>
                      <button onClick={() => setEmailView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", emailView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmTable")}</button>
                    </div>
                    {/* Channel selector */}
                    {channels.filter(c => c.type === "email").length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowChannelMenu(v => !v)}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                          <span className="text-foreground">{activeCh.label}</span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                        {showChannelMenu && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                            <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                              {channels.filter(c => c.type === "email").map(ch => (
                                <button
                                  key={ch.id}
                                  onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                                  className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-emerald-600/10 transition-colors", activeChannel === ch.id && "text-emerald-400")}
                                >
                                  <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                                  <span className="flex-1 truncate">{ch.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative min-w-0 flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={emailSearch}
                        onChange={e => setEmailSearch(e.target.value)}
                        className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-56"
                        placeholder={t("crmSearchEmails")}
                      />
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setEmailFilterOpen(v => !v)}
                        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", emailFilterOpen || emailFilter.direction !== "all" || emailFilter.read !== "all" ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-400" : "hover:bg-accent")}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {t("crmFilter")}
                        {(emailFilter.direction !== "all" || emailFilter.read !== "all") && (
                          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            {(emailFilter.direction !== "all" ? 1 : 0) + (emailFilter.read !== "all" ? 1 : 0)}
                          </span>
                        )}
                      </button>
                      {emailFilterOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl p-3 space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("crmDirection")}</p>
                            <div className="flex gap-1">
                              {(["all", "received", "sent"] as const).map(d => (
                                <button key={d} onClick={() => setEmailFilter(f => ({ ...f, direction: d }))}
                                  className={cn("flex-1 rounded-lg py-1 text-[11px] font-medium capitalize border transition-colors", emailFilter.direction === d ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}>
                                  {d === "all" ? t("crmDirectionAll") : d === "received" ? t("crmDirectionInbox") : t("crmDirectionSent")}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("crmReadStatus")}</p>
                            <div className="flex gap-1">
                              {(["all", "unread", "read"] as const).map(r => (
                                <button key={r} onClick={() => setEmailFilter(f => ({ ...f, read: r }))}
                                  className={cn("flex-1 rounded-lg py-1 text-[11px] font-medium capitalize border transition-colors", emailFilter.read === r ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}>
                                  {r === "all" ? t("crmReadAll") : r === "unread" ? t("crmColUnread") : t("crmColRead")}
                                </button>
                              ))}
                            </div>
                          </div>
                          {(emailFilter.direction !== "all" || emailFilter.read !== "all") && (
                            <button onClick={() => setEmailFilter({ direction: "all", read: "all" })} className="w-full rounded-lg border border-white/10 py-1.5 text-[11px] text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                              Clear filters
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setKeywordFilterOpen(v => !v)}
                        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors", keywordFilter ? "bg-amber-600/10 border-amber-500/30 text-amber-400" : "hover:bg-accent")}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {keywordFilter ? keywordFilter : t("crmKeyword")}
                      </button>
                      {keywordFilterOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                          {/* View filter section */}
                          <div className="p-3 space-y-1 max-h-56 overflow-y-auto">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filter view by keyword</p>
                            <button
                              onClick={() => { setKeywordFilter(null); setKeywordFilterOpen(false) }}
                              className={cn("w-full rounded-lg py-1.5 text-[11px] font-medium border transition-colors", !keywordFilter ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}
                            >
                              All
                            </button>
                            {fetchKeywords.length > 0 && (<>
                              <p className="pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400/60">Custom</p>
                              {fetchKeywords.map(kw => (
                                <button
                                  key={`custom-${kw}`}
                                  onClick={() => { setKeywordFilter(kw); setKeywordFilterOpen(false) }}
                                  className={cn("w-full rounded-lg py-1.5 text-[11px] font-medium capitalize border transition-colors text-left px-2.5", keywordFilter === kw ? "bg-amber-600/20 border-amber-500/40 text-amber-400" : "border-emerald-500/10 hover:bg-white/5 text-emerald-300/80")}
                                >
                                  {kw}
                                </button>
                              ))}
                              <p className="pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Default</p>
                            </>)}
                            {EMAIL_KEYWORDS.map(kw => (
                              <button
                                key={kw}
                                onClick={() => { setKeywordFilter(kw); setKeywordFilterOpen(false) }}
                                className={cn("w-full rounded-lg py-1.5 text-[11px] font-medium capitalize border transition-colors text-left px-2.5", keywordFilter === kw ? "bg-amber-600/20 border-amber-500/40 text-amber-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                          {/* Fetch keyword management section */}
                          <div className="border-t border-white/10 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fetch keywords</p>
                              {fetchKeywords.length > 0 && (
                                <button onClick={() => { setFetchKeywords([]); saveFetchKeywords([]) }} className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors">Clear all</button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">Only emails whose subject contains one of these keywords will be fetched. Leave empty to use defaults.</p>
                            {fetchKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {fetchKeywords.map(kw => (
                                  <span key={kw} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-2.5 pr-1.5 py-0.5 text-[11px] font-medium">
                                    {kw}
                                    <button onClick={() => removeFetchKeyword(kw)} className="rounded-full p-0.5 text-muted-foreground hover:text-white transition-colors"><X className="h-2.5 w-2.5" /></button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={fetchKeywordsInput}
                                onChange={e => setFetchKeywordsInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFetchKeyword() } }}
                                placeholder="Add keyword…"
                                className="h-7 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] placeholder:text-muted-foreground focus:border-emerald-500/40 focus:outline-none"
                              />
                              <button
                                onClick={addFetchKeyword}
                                disabled={!fetchKeywordsInput.trim() || fetchKeywordsSaving}
                                className="flex h-7 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-40 transition-colors"
                              >
                                {fetchKeywordsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "+"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const conn = emailConnections.find((c: any) => c.provider === (activeChannel || emailConnections.find((c: any) => c.status === "connected")?.provider) && c.status === "connected")
                        console.log("[FETCH EMAILS] Manual fetch — last_fetched_at:", conn?.last_fetched_at || "none (full 15-day)", "→ now:", new Date().toISOString())
                        fetchInbox(undefined, true)
                      }}
                      disabled={inboxLoading || silentFetching}
                      className={cn(
                        "relative overflow-hidden flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed",
                        fetchStep === "done"
                          ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                          : (inboxLoading || silentFetching)
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300"
                      )}
                    >
                      {/* animated shimmer bar while loading */}
                      {(inboxLoading || silentFetching) && (
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
                      )}
                      {fetchStep === "done" ? (
                        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (inboxLoading || silentFetching) ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="whitespace-nowrap">
                        {fetchStep === "scanning" && "Fetching Emails..."}
                        {fetchStep === "filtering" && "Fetching Emails..."}
                        {fetchStep === "importing" && "Fetching Emails..."}
                        {fetchStep === "done" && `Done · ${fetchedCount} new`}
                        {!fetchStep && silentFetching && "Fetching Emails..."}
                        {!fetchStep && !silentFetching && t("crmFetchEmails")}
                      </span>
                    </button>
                  </div>
                </div>
                {emailView === "kanban" ? (
                  /* ── DRAGGABLE KANBAN ── */
                  <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0" onClick={() => { setEmailFilterOpen(false); setKeywordFilterOpen(false) }}>
                    <div className="flex h-full gap-5 p-6">
                      {emailKanbanCols.map(col => {
                        const q = emailSearch.toLowerCase()
                        const allMsgs = [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
                          .filter((m: any) => !activeCh.id || activeCh.type !== "email" || m.provider === activeCh.id)
                          .filter((m: any) => !q || (m.subject || "").toLowerCase().includes(q) || (m.from_address || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q))
                          .filter((m: any) => emailFilter.direction === "all" || m.direction === emailFilter.direction)
                          .filter((m: any) => emailFilter.read === "all" || (emailFilter.read === "read" ? m.read : !m.read))
                          .filter((m: any) => !contactEmailFilter || (m.from_address || "").includes(contactEmailFilter) || (m.to_address || "").includes(contactEmailFilter))
                          .filter((m: any) => !keywordFilter || (m.subject || "").toLowerCase().includes(keywordFilter) || (m.body || "").toLowerCase().includes(keywordFilter))
                        // Group by thread_id — one card per thread (dedupe by message_id)
                        const dedupedMsgs = allMsgs.filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.message_id === m.message_id) === i)
                        const threadGroups = new Map<string, any[]>()
                        for (const m of dedupedMsgs) {
                          const tid = m.thread_id || m.id
                          if (!threadGroups.has(tid)) threadGroups.set(tid, [])
                          threadGroups.get(tid)!.push(m)
                        }
                        const getColId = (m: any) => emailCardCols[m.id] || (m.direction === "sent" ? "sent" : m.read ? "read" : "unread")
                        const getThreadColId = (msgs: any[]) => {
                          const custom = msgs.find(m => emailCardCols[m.id])?.id
                          if (custom) return emailCardCols[custom]
                          if (msgs.some(m => m.direction === "sent") && !msgs.some(m => m.direction === "received")) return "sent"
                          if (msgs.some(m => !m.read)) return "unread"
                          return "read"
                        }
                        const threadItems = Array.from(threadGroups.entries()).map(([tid, msgs]) => {
                          msgs.sort((a: any, b: any) => {
                            const da = a.received_at ? new Date(a.received_at).getTime() : a.sent_at ? new Date(a.sent_at).getTime() : 0
                            const db = b.received_at ? new Date(b.received_at).getTime() : b.sent_at ? new Date(b.sent_at).getTime() : 0
                            return db - da
                          })
                          return { threadId: tid, msgs, latest: msgs[0] }
                        }).sort((a: any, b: any) => {
                          const da = a.latest?.received_at ? new Date(a.latest.received_at).getTime() : a.latest?.sent_at ? new Date(a.latest.sent_at).getTime() : 0
                          const db = b.latest?.received_at ? new Date(b.latest.received_at).getTime() : b.latest?.sent_at ? new Date(b.latest.sent_at).getTime() : 0
                          return db - da
                        })
                        const items = threadItems.filter(t => getThreadColId(t.msgs) === col.id)
                        return (
                          <div
                            key={col.id}
                            className={cn("group flex w-80 shrink-0 flex-col h-full rounded-xl transition-all", dragOverEmailCol === col.id && "ring-2 ring-emerald-500/40 bg-emerald-500/5")}
                            onDragOver={e => { e.preventDefault(); setDragOverEmailCol(col.id) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverEmailCol(null) }}
                            onDrop={e => {
                              e.preventDefault()
                              if (dragEmailId.current) {
                                const cardId = dragEmailId.current
                                const colId = col.id
                                setEmailCardCols(prev => ({ ...prev, [cardId]: colId }))
                                if (user) setKanbanCardCol(user.id, "email", cardId, colId).catch(() => {})
                                // Sync read flag when moving to read/unread columns
                                if (colId === "read") {
                                  setEmailMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: true } : m))
                                  setInboxMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: true } : m))
                                  if (user) markEmailAsRead(user.id, cardId).catch(() => {})
                                } else if (colId === "unread") {
                                  setEmailMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: false } : m))
                                  setInboxMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: false } : m))
                                }
                              }
                              dragEmailId.current = null; setDragOverEmailCol(null)
                            }}
                          >
                            {/* Column header */}
                            <div className="mb-3 flex items-center gap-2">
                              {editingEmailCol === col.id ? (
                                <input
                                  autoFocus
                                  defaultValue={col.label}
                                  className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold bg-transparent focus:outline-none flex-1", col.color)}
                                  onBlur={e => { setEmailKanbanCols(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value || col.label } : c)); setEditingEmailCol(null) }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingEmailCol(null) }}
                                />
                              ) : (
                                <span
                                  title="Click to rename"
                                  className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-75 transition-opacity", col.color)}
                                  onClick={() => setEditingEmailCol(col.id)}
                                >{col.id === "unread" ? t("crmColUnread") : col.id === "read" ? t("crmColRead") : col.id === "sent" ? t("crmColSent") : col.label}</span>
                              )}
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{items.length}</span>
                              <button
                                title="Delete column"
                                onClick={() => emailKanbanCols.length > 1 && setEmailKanbanCols(prev => prev.filter(c => c.id !== col.id))}
                                className="ml-auto p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                              ><Trash2 className="h-3 w-3" /></button>
                            </div>
                            {/* Cards */}
                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 pb-4">
                              {items.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">{t("crmDropEmails")}</p></div>
                              ) : items.map((item: any) => {
                                const msg = item.latest
                                const replyCount = item.msgs.length
                                const isCardExpanded = expandedThreads.has(item.threadId)
                                return (
                                <div
                                  key={item.threadId}
                                  draggable
                                  onDragStart={e => { dragEmailId.current = msg.id; e.dataTransfer.effectAllowed = "move" }}
                                  className="w-full rounded-xl border bg-card p-4 text-left shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95"
                                >
                                  <button className="w-full text-left" onClick={async () => {
                                    setOpenEmail(msg); setReplyBody(""); setReplyTo(msg.direction === "sent" ? msg.to_address : msg.from_address); setReplyCc(msg.cc_address || ""); setSendingReply(false)
                                    if (!msg.read && user) {
                                      try {
                                        await markEmailAsRead(user.id, msg.id)
                                        setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                        setEmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                      } catch { /* ignore */ }
                                    }
                                  }}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-semibold truncate flex-1">{msg.subject || "(No subject)"}</p>
                                      {replyCount > 1 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setExpandedThreads(prev => {
                                              const next = new Set(prev)
                                              if (next.has(item.threadId)) next.delete(item.threadId)
                                              else next.add(item.threadId)
                                              return next
                                            })
                                          }}
                                          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                        >
                                          {isCardExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                                          {replyCount}
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{msg.direction === "sent" ? `To: ${msg.to_address}` : msg.from_address}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">{stripHtml(msg.body)?.slice(0, 80) || ""}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      <span>{msg.received_at ? new Date(msg.received_at).toLocaleDateString() : msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ""}</span>
                                    </div>
                                  </button>
                                  {/* Expandable thread preview */}
                                  {isCardExpanded && replyCount > 1 && (
                                    <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                                      {item.msgs.map((m: any) => (
                                        <div
                                          key={m.id}
                                          className={cn(
                                            "rounded-lg px-2.5 py-2 text-[11px]",
                                            m.direction === "sent" ? "bg-emerald-950/20 border border-emerald-500/10" : "bg-white/[0.03] border border-white/5"
                                          )}
                                        >
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-medium text-white/80 truncate">{m.direction === "sent" ? `To: ${m.to_address}` : m.from_address}</span>
                                            <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                                              {m.received_at ? new Date(m.received_at).toLocaleDateString() : m.sent_at ? new Date(m.sent_at).toLocaleDateString() : ""}
                                            </span>
                                          </div>
                                          <p className="text-muted-foreground truncate">{stripHtml(m.body)?.slice(0, 100) || "(No content)"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {/* Add column */}
                      <button
                        onClick={() => {
                          const newId = `col-${Date.now()}`
                          const nextColor = COL_COLORS[emailKanbanCols.length % COL_COLORS.length]
                          setEmailKanbanCols(prev => [...prev, { id: newId, label: "New Column", color: nextColor }])
                          setTimeout(() => setEditingEmailCol(newId), 50)
                        }}
                        className="flex h-10 w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors px-4 self-start"
                      >
                        <Plus className="h-4 w-4" /> {t("crmAddColumn")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                  <div className="mx-auto max-w-5xl">
                  {fetchError && (
                    <div className="mb-4 rounded-lg border border-red-500/20 bg-red-600/10 p-3 text-xs text-red-400">
                      {fetchError}
                    </div>
                  )}
                {!activeCh.connected && inboxMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Mail className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("crmNoEmailAccount")}</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">
                      {t("crmGoToChannelsConnect")}
                    </Link>
                  </div>
                ) : [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")].filter((m: any) => !activeCh.id || activeCh.type !== "email" || m.provider === activeCh.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Mail className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {inboxFetched ? t("crmNoEmails") : t("crmClickFetch")}
                    </p>
                  </div>
                ) : emailView === "table" ? (
                  <div className="rounded-xl border overflow-x-auto" onClick={() => { setEmailStatusOpen(null); setKeywordFilterOpen(false) }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8"></th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">From</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Subject</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-32">Status</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-28">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const q = emailSearch.toLowerCase()
                          const allMsgs = [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
                            .filter((m: any) => !activeCh.id || activeCh.type !== "email" || m.provider === activeCh.id)
                            .filter((m: any) => !q || (m.subject || "").toLowerCase().includes(q) || (m.from_address || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q))
                            .filter((m: any) => emailFilter.direction === "all" || m.direction === emailFilter.direction)
                            .filter((m: any) => emailFilter.read === "all" || (emailFilter.read === "read" ? m.read : !m.read))
                            .filter((m: any) => !contactEmailFilter || (m.from_address || "").includes(contactEmailFilter) || (m.to_address || "").includes(contactEmailFilter))
                            .filter((m: any) => !keywordFilter || (m.subject || "").toLowerCase().includes(keywordFilter) || (m.body || "").toLowerCase().includes(keywordFilter))
                          // Group by thread_id
                          const threadGroups = new Map<string, any[]>()
                          for (const m of allMsgs) {
                            const tid = m.thread_id || m.id
                            if (!threadGroups.has(tid)) threadGroups.set(tid, [])
                            threadGroups.get(tid)!.push(m)
                          }
                          return Array.from(threadGroups.entries()).map(([tid, msgs]) => {
                            msgs.sort((a: any, b: any) => {
                              const da = a.received_at ? new Date(a.received_at).getTime() : a.sent_at ? new Date(a.sent_at).getTime() : 0
                              const db = b.received_at ? new Date(b.received_at).getTime() : b.sent_at ? new Date(b.sent_at).getTime() : 0
                              return db - da
                            })
                            return { threadId: tid, msgs, latest: msgs[0] }
                          }).sort((a, b) => {
                            const da = a.latest.received_at ? new Date(a.latest.received_at).getTime() : a.latest.sent_at ? new Date(a.latest.sent_at).getTime() : 0
                            const db = b.latest.received_at ? new Date(b.latest.received_at).getTime() : b.latest.sent_at ? new Date(b.latest.sent_at).getTime() : 0
                            return db - da
                          })
                        })().slice(emailTablePage * TABLE_PAGE_SIZE, (emailTablePage + 1) * TABLE_PAGE_SIZE).map((item: any) => {
                          const msg = item.latest
                          const replyCount = item.msgs.length
                          const colId = emailCardCols[msg.id] || (msg.direction === "sent" ? "sent" : msg.read ? "read" : "unread")
                          const col = emailKanbanCols.find(c => c.id === colId) || emailKanbanCols[0]
                          return (
                          <tr
                            key={item.threadId}
                            onClick={async () => {
                              setOpenEmail(msg); setReplyBody(""); setReplyTo(msg.direction === "sent" ? msg.to_address : msg.from_address); setReplyCc(msg.cc_address || ""); setSendingReply(false)
                              if (!msg.read && user) {
                                try {
                                  await markEmailAsRead(user.id, msg.id)
                                  setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                  setEmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                } catch { /* ignore */ }
                              }
                            }}
                            className={cn("border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors", !msg.read && msg.direction !== "sent" && "bg-emerald-500/5")}
                          >
                            <td className="px-4 py-2.5">
                              {!msg.read && msg.direction !== "sent" && <span className="block h-2 w-2 rounded-full bg-emerald-500" />}
                            </td>
                            <td className="px-4 py-2.5 font-medium truncate max-w-[180px]">{msg.direction === "sent" ? `To: ${msg.to_address}` : msg.from_address}</td>
                            <td className="px-4 py-2.5 truncate max-w-[360px]">
                              <span className={cn(!msg.read && msg.direction !== "sent" && "font-semibold")}>{msg.subject || "(No subject)"}</span>
                              {replyCount > 1 && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">{replyCount}</span>
                              )}
                              <span className="text-muted-foreground ml-2 font-normal">{stripHtml(msg.body)?.slice(0, 60) || ""}</span>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setEmailStatusOpen(emailStatusOpen === msg.id ? null : msg.id) }}
                                  className={cn("w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-1.5 border transition-all hover:brightness-110", col?.color)}
                                >
                                  <span>{col?.label}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", emailStatusOpen === msg.id && "rotate-180")} />
                                </button>
                                {emailStatusOpen === msg.id && (
                                  <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[160px] rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to / Rename</p>
                                    {emailKanbanCols.map(c => (
                                      <div key={c.id} className={cn("flex items-center gap-1 px-2 py-1 hover:bg-white/5 transition-colors", c.id === colId && "bg-white/5")}>
                                        {editingEmailLabel === c.id ? (
                                          <input autoFocus defaultValue={c.label}
                                            className={cn("flex-1 rounded-md border px-2 py-1 text-xs bg-transparent focus:outline-none", c.color)}
                                            onClick={e => e.stopPropagation()}
                                            onBlur={e => { const v = e.target.value.trim(); if (v) setEmailKanbanCols(prev => prev.map(col => col.id === c.id ? { ...col, label: v } : col)); setEditingEmailLabel(null) }}
                                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingEmailLabel(null) }}
                                          />
                                        ) : (
                                          <button onClick={e => { e.stopPropagation(); const cardId = msg.id; const colId = c.id; setEmailCardCols(prev => ({ ...prev, [cardId]: colId })); if (user) setKanbanCardCol(user.id, "email", cardId, colId).catch(() => {}); if (colId === "read") { setEmailMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: true } : m)); setInboxMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: true } : m)); if (user) markEmailAsRead(user.id, cardId).catch(() => {}) } else if (colId === "unread") { setEmailMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: false } : m)); setInboxMessages(prev => prev.map(m => m.id === cardId ? { ...m, read: false } : m)) } setEmailStatusOpen(null) }}
                                            className="flex flex-1 items-center gap-2 py-1 text-left text-xs">
                                            <span className="flex-1">{c.label}</span>
                                            {c.id === colId && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                                          </button>
                                        )}
                                        {editingEmailLabel !== c.id && (
                                          <button onClick={e => { e.stopPropagation(); setEditingEmailLabel(c.id) }}
                                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors shrink-0">
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {msg.received_at ? new Date(msg.received_at).toLocaleDateString() : msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ""}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {(() => {
                      const q = emailSearch.toLowerCase()
                      const allMsgs = [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
                        .filter((m: any) => !activeCh.id || activeCh.type !== "email" || m.provider === activeCh.id)
                        .filter((m: any) => !q || (m.subject || "").toLowerCase().includes(q) || (m.from_address || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q))
                        .filter((m: any) => emailFilter.direction === "all" || m.direction === emailFilter.direction)
                        .filter((m: any) => emailFilter.read === "all" || (emailFilter.read === "read" ? m.read : !m.read))
                        .filter((m: any) => !contactEmailFilter || (m.from_address || "").includes(contactEmailFilter) || (m.to_address || "").includes(contactEmailFilter))
                        .filter((m: any) => !keywordFilter || (m.subject || "").toLowerCase().includes(keywordFilter) || (m.body || "").toLowerCase().includes(keywordFilter))
                      const threadGroups = new Map<string, any[]>()
                      for (const m of allMsgs) { const tid = m.thread_id || m.id; if (!threadGroups.has(tid)) threadGroups.set(tid, []); threadGroups.get(tid)!.push(m) }
                      const totalItems = threadGroups.size
                      const totalPages = Math.ceil(totalItems / TABLE_PAGE_SIZE)
                      if (totalPages <= 1) return null
                      const pages: number[] = []
                      for (let i = 0; i < totalPages; i++) pages.push(i)
                      const visiblePages = pages.filter(p => p === 0 || p === totalPages - 1 || Math.abs(p - emailTablePage) <= 1)
                      return (
                        <div className="flex items-center justify-between border-t px-4 py-2.5">
                          <span className="text-[10px] text-muted-foreground">Showing {Math.min(emailTablePage * TABLE_PAGE_SIZE + 1, totalItems)}–{Math.min((emailTablePage + 1) * TABLE_PAGE_SIZE, totalItems)} of {totalItems}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEmailTablePage(0)} disabled={emailTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">First</button>
                            <button onClick={() => setEmailTablePage(p => Math.max(0, p - 1))} disabled={emailTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                            {visiblePages.map((p, i) => (
                              <span key={i} className="flex items-center">
                                {i > 0 && p - visiblePages[i - 1] > 1 && <span className="px-1 text-[10px] text-muted-foreground">…</span>}
                                <button onClick={() => setEmailTablePage(p)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors", p === emailTablePage ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "border border-white/10 text-muted-foreground hover:text-white hover:border-white/20")}>{p + 1}</button>
                              </span>
                            ))}
                            <button onClick={() => setEmailTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={emailTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
                            <button onClick={() => setEmailTablePage(totalPages - 1)} disabled={emailTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Last</button>
                          </div>
                        </div>
                      )
                    })()}
                    {nextPageToken && (
                      <div className="flex justify-center p-3 border-t">
                        <button onClick={() => fetchInbox(nextPageToken)} disabled={loadingMore} className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-40">
                          {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          {loadingMore ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...inboxMessages].filter((m: any) => !activeCh.id || activeCh.type !== "email" || m.provider === activeCh.id).sort((a: any, b: any) => {
                      const da = a.received_at ? new Date(a.received_at).getTime() : 0
                      const db = b.received_at ? new Date(b.received_at).getTime() : 0
                      return db - da
                    }).map((msg: any) => (
                      <button
                        key={msg.id}
                        onClick={async () => {
                          setOpenEmail(msg); setReplyBody(""); setReplyTo(msg.direction === "sent" ? msg.to_address : msg.from_address); setReplyCc(msg.cc_address || ""); setSendingReply(false)
                          if (!msg.read && user) {
                            try {
                              await markEmailAsRead(user.id, msg.id)
                              setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                              setEmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                            } catch { /* ignore */ }
                          }
                        }}
                        className={cn("w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-emerald-500/30", !msg.read && "border-l-2 border-l-emerald-500")}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[60%]">{msg.from_address}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.received_at ? new Date(msg.received_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{msg.subject || "(No subject)"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{stripHtml(msg.body)?.slice(0, 120) || ""}...</p>
                      </button>
                    ))}
                    {nextPageToken && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => fetchInbox(nextPageToken)}
                          disabled={loadingMore}
                          className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
                        >
                          {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          {loadingMore ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
                </div>
                )}
              </div>
            )}

            {/* Email sync modal — rendered at outer scope so it works on Email tab */}
            {mounted && emailSyncModal?.visible && activeTab === "Email" && createPortal(
              <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEmailSyncModal(prev => prev ? { ...prev, visible: false } : null)}>
                <div
                  className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl animate-fade-in-up overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 bg-[length:200%_100%] animate-[shimmer-slide_2s_ease-in-out_infinite]" />
                  <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {emailSyncModal.step === "connecting" && (
                      <div className="flex flex-col items-center text-center py-4">
                        <div className="relative mb-4">
                          <div className="h-14 w-14 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                          <Mail className="absolute inset-0 m-auto h-6 w-6 text-emerald-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white">Syncing inbox &amp; sent</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {emailSyncModal.progress < 20
                            ? "Connecting to your email provider..."
                            : emailSyncModal.progress < 50
                            ? "Fetching inbox & sent emails from the last 15 days..."
                            : emailSyncModal.progress < 80
                            ? "Filtering and categorizing emails..."
                            : "Almost done..."}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-4 w-full max-w-xs">
                          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-[width] duration-150 ease-out"
                              style={{ width: `${emailSyncModal.progress}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-emerald-400">{emailSyncModal.progress}%</p>
                        </div>
                      </div>
                    )}
                    {emailSyncModal.step === "done" && (
                      <div className="flex flex-col">
                        {/* Header */}
                        <div className="flex flex-col items-center text-center mb-4">
                          <div className="relative mb-3">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/40">
                              <Check className="h-6 w-6 text-emerald-400" />
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-white">
                            {emailSyncModal.totalFetched > 0
                              ? `${emailSyncModal.totalFetched} email${emailSyncModal.totalFetched === 1 ? "" : "s"} imported`
                              : "No new emails"}
                          </h3>
                        </div>

                        {/* Period */}
                        {emailSyncModal.dateRange.from && emailSyncModal.dateRange.to && (
                          <div className="mb-4 flex flex-col items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(emailSyncModal.dateRange.from).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {" → "}
                                {new Date(emailSyncModal.dateRange.to).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60">
                              {emailSyncModal.droppedEmails.length === 0 && emailSyncModal.totalFetched === 0
                                ? "Incremental sync — no new emails since last fetch"
                                : `${emailSyncModal.totalScanned} emails scanned in this period`}
                            </span>
                          </div>
                        )}

                        {/* Kept emails */}
                        {emailSyncModal.keptEmails.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-400">Imported ({emailSyncModal.totalFetched})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {emailSyncModal.keptEmails.map((email: any, i: number) => (
                                <div
                                  key={email.id || i}
                                  className="flex items-start gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5 text-left animate-fade-in-up"
                                  style={{ animationDelay: `${i * 60}ms` }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                                    {(email.from_address || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white truncate">
                                      {email.subject || "(No subject)"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {email.from_address || "Unknown"}
                                    </p>
                                  </div>
                                  {email.received_at && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {new Date(email.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Already imported emails — only on initial connection */}
                        {emailSyncModal.isInitial && (() => {
                          const alreadyImported = emailSyncModal.droppedEmails.filter((e: any) => e.reason === "already imported")
                          if (alreadyImported.length === 0) return null
                          return (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="h-2 w-2 rounded-full bg-sky-500/60" />
                                <span className="text-xs font-semibold text-sky-400/80">Already imported ({alreadyImported.length})</span>
                              </div>
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {alreadyImported.map((email: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2.5 rounded-lg border border-sky-500/10 bg-sky-500/[0.02] p-2.5 text-left animate-fade-in-up"
                                    style={{ animationDelay: `${i * 30}ms` }}
                                  >
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[10px] font-bold text-sky-400/60">
                                      {(email.from || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-muted-foreground truncate">
                                        {email.subject || "(No subject)"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground/60 truncate">
                                        {email.from || "Unknown"}
                                      </p>
                                    </div>
                                    {email.date && (
                                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                        {new Date(email.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Filtered out emails — only on initial connection */}
                        {emailSyncModal.isInitial && (() => {
                          const filtered = emailSyncModal.droppedEmails.filter((e: any) => e.reason !== "already imported")
                          if (filtered.length === 0) return null
                          return (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="h-2 w-2 rounded-full bg-red-500/60" />
                                <span className="text-xs font-semibold text-red-400/80">Filtered out ({filtered.length})</span>
                              </div>
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {filtered.map((email: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-left animate-fade-in-up"
                                    style={{ animationDelay: `${i * 40}ms` }}
                                  >
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-400/60">
                                      {(email.from || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-muted-foreground truncate">
                                        {email.subject || "(No subject)"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground/60 truncate">
                                        {email.from || "Unknown"} · <span className="text-red-400/50">{email.reason}</span>
                                      </p>
                                    </div>
                                    {email.date && (
                                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                        {new Date(email.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        <button
                          onClick={() => setEmailSyncModal(prev => prev ? { ...prev, visible: false } : null)}
                          className="mx-auto mt-2 rounded-lg bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* Calendar sync modal — rendered at outer scope so it works on Calendar tab */}
            {mounted && calendarSyncModal?.visible && activeTab === "Calendar" && createPortal(
              <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCalendarSyncModal(prev => prev ? { ...prev, visible: false } : null)}>
                <div
                  className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl animate-fade-in-up overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer-slide_2s_ease-in-out_infinite]" />
                  <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {calendarSyncModal.step === "connecting" && (
                      <div className="flex flex-col items-center text-center py-4">
                        <div className="relative mb-4">
                          <div className="h-14 w-14 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                          <Calendar className="absolute inset-0 m-auto h-6 w-6 text-amber-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white">Syncing your calendar</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {calendarSyncModal.progress < 30
                            ? "Connecting to your calendar provider..."
                            : calendarSyncModal.progress < 60
                            ? "Fetching events..."
                            : calendarSyncModal.progress < 85
                            ? "Filtering and categorizing events..."
                            : "Almost done..."}
                        </p>
                        <div className="mt-4 w-full max-w-xs">
                          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-sky-500 transition-[width] duration-150 ease-out"
                              style={{ width: `${calendarSyncModal.progress}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-amber-400">{calendarSyncModal.progress}%</p>
                        </div>
                      </div>
                    )}
                    {calendarSyncModal.step === "done" && (
                      <div className="flex flex-col">
                        <div className="flex flex-col items-center text-center mb-4">
                          <div className="relative mb-3">
                            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 border-2 border-amber-500/40">
                              <Check className="h-6 w-6 text-amber-400" />
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-white">
                            {calendarSyncModal.totalFetched > 0
                              ? `${calendarSyncModal.totalFetched} event${calendarSyncModal.totalFetched === 1 ? "" : "s"} imported`
                              : "No new events"}
                          </h3>
                        </div>

                        {calendarSyncModal.dateRange.from && calendarSyncModal.dateRange.to && (
                          <div className="mb-4 flex flex-col items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(calendarSyncModal.dateRange.from).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                {" → "}
                                {new Date(calendarSyncModal.dateRange.to).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60">
                              {calendarSyncModal.totalScanned} events scanned in this period
                            </span>
                          </div>
                        )}

                        {calendarSyncModal.importedEvents.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-400">Imported ({calendarSyncModal.totalFetched})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {calendarSyncModal.importedEvents.map((ev: any, i: number) => (
                                <div
                                  key={ev.id || i}
                                  className="flex items-start gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5 text-left animate-fade-in-up"
                                  style={{ animationDelay: `${i * 60}ms` }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-400">
                                    <Calendar className="h-3 w-3" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white truncate">
                                      {ev.summary || "(No title)"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {ev.start_time ? new Date(ev.start_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Already imported events */}
                        {calendarSyncModal.alreadyImportedEvents.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-2 w-2 rounded-full bg-sky-500/60" />
                              <span className="text-xs font-semibold text-sky-400/80">Already imported ({calendarSyncModal.alreadyImportedEvents.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {calendarSyncModal.alreadyImportedEvents.map((ev: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2.5 rounded-lg border border-sky-500/10 bg-sky-500/[0.02] p-2.5 text-left animate-fade-in-up"
                                  style={{ animationDelay: `${i * 30}ms` }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[10px] font-bold text-sky-400/60">
                                    <Calendar className="h-3 w-3" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground truncate">
                                      {ev.summary || "(No title)"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate">
                                      {ev.start_time ? new Date(ev.start_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dropped/filtered events */}
                        {calendarSyncModal.droppedEvents.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-2 w-2 rounded-full bg-red-500/60" />
                              <span className="text-xs font-semibold text-red-400/80">Filtered out ({calendarSyncModal.droppedEvents.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {calendarSyncModal.droppedEvents.map((ev: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-left animate-fade-in-up"
                                  style={{ animationDelay: `${i * 40}ms` }}
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-400/60">
                                    <Calendar className="h-3 w-3" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground truncate">
                                      {ev.summary || "(No title)"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate">
                                      {ev.start_time ? new Date(ev.start_time).toLocaleString(undefined, { month: "short", day: "numeric" }) : ""} · <span className="text-red-400/50">{ev.reason}</span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => setCalendarSyncModal(prev => prev ? { ...prev, visible: false } : null)}
                          className="mx-auto mt-2 rounded-lg bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* ── MESSAGES ── */}
            {activeTab === "Messages" && channels.length > 0 && (whatsappConnections.length > 0 || telegramConnections.length > 0 || slackConnections.length > 0) && (
              <div className="flex flex-1 flex-col min-h-0">
                {/* Messages Toolbar */}
                <div className="flex flex-col gap-2 border-b bg-card/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-base font-bold sm:text-lg">{t("crmMessagesTitle")}</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setMessagesView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", messagesView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmKanban")}</button>
                      <button onClick={() => setMessagesView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", messagesView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmTable")}</button>
                    </div>
                    {(() => {
                      const msgChannels = channels.filter(c => c.type === "whatsapp" || c.type === "telegram" || c.type === "slack")
                      if (msgChannels.length === 0) return null
                      const active = msgChannels.find(c => c.type === msgFilter) || msgChannels[0]
                      return (
                        <div className="relative">
                          <button
                            onClick={() => setMsgFilterOpen(v => !v)}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                          >
                            <span className={cn("h-2 w-2 rounded-full", active.color)} />
                            <span className="text-foreground">{active.label}</span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                          {msgFilterOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMsgFilterOpen(false)} />
                              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                                {msgChannels.map(ch => (
                                  <button
                                    key={ch.id}
                                    onClick={() => { setMsgFilter(ch.type as any); setMsgFilterOpen(false) }}
                                    className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-emerald-600/10 transition-colors", msgFilter === ch.type && "text-emerald-400")}
                                  >
                                    <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                                    <span className="flex-1 truncate">{ch.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                  <button
                    onClick={async () => {
                      if (!user) return
                      setWhatsAppLoading(true)
                      setTelegramLoading(true)
                      setSlackLoading(true)
                      try {
                        // Sync Evolution messages from VPS first (if Evolution session connected)
                        try {
                          await fetch("/api/whatsapp/evolution/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user.id }),
                          })
                        } catch { /* ignore sync errors */ }

                        const [waMsgs, tgRes, slMsgs] = await Promise.allSettled([
                          getWhatsAppMessages(user.id),
                          tgFetchingRef.current ? Promise.resolve([]) : (tgFetchingRef.current = true, fetch("/api/telegram/user/fetch-chats", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user.id }),
                          }).then(r => r.json()).then(() => getTelegramMessages(user.id)).finally(() => { tgFetchingRef.current = false })),
                          fetch("/api/slack/fetch", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user.id }),
                          }).then(r => r.json()).then(() => getSlackMessages(user.id)),
                        ])
                        if (waMsgs.status === "fulfilled") {
                          setWhatsAppMessages(waMsgs.value)
                          setWhatsAppFetched(true)
                        }
                        if (tgRes.status === "fulfilled") {
                          setTelegramMessages(tgRes.value)
                          setTelegramFetched(true)
                        }
                        if (slMsgs.status === "fulfilled") {
                          setSlackMessages(slMsgs.value)
                          setSlackFetched(true)
                        }
                      } catch (e) { console.error(e) }
                      finally { setWhatsAppLoading(false); setTelegramLoading(false); setSlackLoading(false) }
                    }}
                    disabled={whatsappLoading || telegramLoading || slackLoading || (whatsappConnections.length === 0 && telegramConnections.length === 0 && slackConnections.length === 0)}
                    className={cn(
                      "relative overflow-hidden flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed",
                      (whatsappLoading || telegramLoading || slackLoading)
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300"
                    )}
                  >
                    {(whatsappLoading || telegramLoading || slackLoading) && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
                    )}
                    {(whatsappLoading || telegramLoading || slackLoading) ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Phone className="h-3.5 w-3.5 shrink-0" />}
                    <span className="whitespace-nowrap">{whatsappLoading || telegramLoading || slackLoading ? t("crmRefreshing") : t("crmRefresh")}</span>
                  </button>
                  </div>
                </div>
                {messagesView === "kanban" ? (
                  <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0">
                    <div className="flex h-full gap-5 p-6">
                      {msgKanbanCols.map(col => {
                        const items = threadedMessages.filter(([tid]) => threadColumnMap.get(tid) === col.id)
                        return (
                          <div
                            key={col.id}
                            className={cn("group flex w-72 shrink-0 flex-col h-full rounded-xl transition-all", dragOverMsgCol === col.id && "ring-2 ring-emerald-500/40 bg-emerald-500/5")}
                            onDragOver={e => { e.preventDefault(); setDragOverMsgCol(col.id) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverMsgCol(null) }}
                            onDrop={e => { e.preventDefault(); if (dragMsgId.current) { const cardId = dragMsgId.current; const colId = col.id; setMsgCardCols(prev => ({ ...prev, [cardId]: colId })); if (user) setKanbanCardCol(user.id, "messages", cardId, colId).catch(() => {}) } dragMsgId.current = null; setDragOverMsgCol(null) }}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              {editingMsgCol === col.id ? (
                                <input autoFocus defaultValue={col.label}
                                  className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold bg-transparent focus:outline-none flex-1", col.color)}
                                  onBlur={e => { setMsgKanbanCols(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value || col.label } : c)); setEditingMsgCol(null) }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingMsgCol(null) }}
                                />
                              ) : (
                                <span title="Click to rename" className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-75", col.color)} onClick={() => setEditingMsgCol(col.id)}>{col.id === "unread" ? t("crmColUnread") : col.id === "read" ? t("crmColRead") : col.id === "sent" ? t("crmColSent") : col.label}</span>
                              )}
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{items.length}</span>
                              <button title="Delete column" onClick={() => msgKanbanCols.length > 1 && setMsgKanbanCols(prev => prev.filter(c => c.id !== col.id))}
                                className="ml-auto p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 pb-4">
                              {items.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">{t("crmDropMessages")}</p></div>
                              ) : items.map(([tid, msgs]: [string, any[]]) => {
                                const lastMsg = msgs[msgs.length - 1]
                                const firstMsg = msgs[0]
                                return (
                                <div key={tid} draggable
                                  onDragStart={e => { dragMsgId.current = lastMsg.id; e.dataTransfer.effectAllowed = "move" }}
                                  onClick={() => {
                                    setActiveThread(tid); setWaReplyTo(msgReplyTarget(lastMsg)); setReplySource(lastMsg._source); setWaReplyBody(""); setSendingWaReply(false)
                                    if (!lastMsg.read && lastMsg.direction === "received" && lastMsg._source && user) {
                                      const src = lastMsg._source as "whatsapp" | "telegram" | "slack"
                                      markMessageAsRead(src, lastMsg.id).catch(() => {})
                                      if (src === "whatsapp") setWhatsAppMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                                      if (src === "telegram") setTelegramMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                                      if (src === "slack") setSlackMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                                    }
                                  }}
                                  className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer active:cursor-grabbing active:opacity-60 active:scale-95"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold truncate">{msgDisplayName(firstMsg)}</p>
                                    {msgs.length > 1 && <span className="ml-1 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{msgs.length}</span>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-1">{lastMsg.body || ""}</p>
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                    {msgSourceIcon(lastMsg)}
                                    <span>{msgTimeStr(lastMsg)}</span>
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => { const id = `col-${Date.now()}`; setMsgKanbanCols(prev => [...prev, { id, label: "New Column", color: COL_COLORS[msgKanbanCols.length % COL_COLORS.length] }]); setTimeout(() => setEditingMsgCol(id), 50) }}
                        className="flex h-10 w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors px-4 self-start">
                        <Plus className="h-4 w-4" /> {t("crmAddColumn")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                  <div className="mx-auto max-w-5xl">
                {whatsappConnections.length === 0 && telegramConnections.length === 0 && slackConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("crmNoWhatsAppAccount")}</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">{t("crmGoToChannelsConnect")}</Link>
                  </div>
                ) : filteredCombinedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{whatsappFetched ? t("crmNoMessages") : t("crmClickRefresh")}</p>
                  </div>
                ) : messagesView === "table" ? (
                  <div className="rounded-xl border overflow-x-auto" onClick={() => setMsgStatusOpen(null)}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">From / To</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Last Message</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-20">Msgs</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-28">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {threadedMessages.slice(msgTablePage * TABLE_PAGE_SIZE, (msgTablePage + 1) * TABLE_PAGE_SIZE).map(([tid, msgs]: [string, any[]]) => {
                          const lastMsg = msgs[msgs.length - 1]
                          const firstMsg = msgs[0]
                          return (
                          <tr
                            key={tid}
                            onClick={() => {
                              setActiveThread(tid); setWaReplyTo(msgReplyTarget(lastMsg)); setReplySource(lastMsg._source); setWaReplyBody(""); setSendingWaReply(false)
                              if (!lastMsg.read && lastMsg.direction === "received" && lastMsg._source && user) {
                                const src = lastMsg._source as "whatsapp" | "telegram" | "slack"
                                markMessageAsRead(src, lastMsg.id).catch(() => {})
                                if (src === "whatsapp") setWhatsAppMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                                if (src === "telegram") setTelegramMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                                if (src === "slack") setSlackMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m))
                              }
                            }}
                            className={cn("border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors", lastMsg.direction === "received" && !lastMsg.read && "bg-emerald-500/5")}
                          >
                            <td className="px-4 py-2.5 font-medium">
                              <div className="flex items-center gap-1.5">
                                {msgSourceIcon(lastMsg)}
                                <span className="truncate">{msgDisplayName(firstMsg)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-[360px] text-muted-foreground">{lastMsg.body || ""}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{msgs.length}</span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{msgTimeStr(lastMsg)}</td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {(() => {
                      const totalItems = threadedMessages.length
                      const totalPages = Math.ceil(totalItems / TABLE_PAGE_SIZE)
                      if (totalPages <= 1) return null
                      const pages: number[] = []
                      for (let i = 0; i < totalPages; i++) pages.push(i)
                      const visiblePages = pages.filter(p => p === 0 || p === totalPages - 1 || Math.abs(p - msgTablePage) <= 1)
                      return (
                        <div className="flex items-center justify-between border-t px-4 py-2.5">
                          <span className="text-[10px] text-muted-foreground">Showing {Math.min(msgTablePage * TABLE_PAGE_SIZE + 1, totalItems)}–{Math.min((msgTablePage + 1) * TABLE_PAGE_SIZE, totalItems)} of {totalItems}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setMsgTablePage(0)} disabled={msgTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">First</button>
                            <button onClick={() => setMsgTablePage(p => Math.max(0, p - 1))} disabled={msgTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                            {visiblePages.map((p, i) => (
                              <span key={i} className="flex items-center">
                                {i > 0 && p - visiblePages[i - 1] > 1 && <span className="px-1 text-[10px] text-muted-foreground">…</span>}
                                <button onClick={() => setMsgTablePage(p)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors", p === msgTablePage ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "border border-white/10 text-muted-foreground hover:text-white hover:border-white/20")}>{p + 1}</button>
                              </span>
                            ))}
                            <button onClick={() => setMsgTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={msgTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
                            <button onClick={() => setMsgTablePage(totalPages - 1)} disabled={msgTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Last</button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threadedMessages.map(([tid, msgs]: [string, any[]]) => {
                      const lastMsg = msgs[msgs.length - 1]
                      const firstMsg = msgs[0]
                      return (
                      <div
                        key={tid}
                        onClick={() => { setActiveThread(tid); setWaReplyTo(msgReplyTarget(lastMsg)); setReplySource(lastMsg._source); setWaReplyBody(""); setSendingWaReply(false) }}
                        className={cn("w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-emerald-500/30 cursor-pointer", lastMsg.direction === "received" && !lastMsg.read && "border-l-2 border-l-emerald-500")}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {msgSourceIcon(lastMsg)}
                            <span className="text-xs font-medium truncate max-w-[50%]">
                              {msgDisplayName(firstMsg)}
                            </span>
                            {msgs.length > 1 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground shrink-0">{msgs.length}</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {msgTimeStr(lastMsg)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{lastMsg.body || ""}</p>
                      </div>
                      )
                    })}
                  </div>
                )}

                </div>
                </div>
                )}

                {/* Thread detail modal overlay */}
                {mounted && activeThread && (() => {
                  const threadMsgs = threadedMessages.find(([tid]) => tid === activeThread)?.[1] || []
                  const firstMsg = threadMsgs[0]
                  const threadId = activeThread
                  const isExpanded = expandedThreads.has(threadId)
                  const visibleMessages = isExpanded ? threadMsgs : threadMsgs.slice(-3)
                  const hiddenCount = threadMsgs.length - visibleMessages.length
                  const sourceLabel = replySource === "telegram" ? "Telegram" : replySource === "slack" ? "Slack" : "WhatsApp"
                  const sourceColor = replySource === "telegram" ? "text-sky-400 bg-sky-500/15" : replySource === "slack" ? "text-purple-400 bg-purple-500/15" : "text-emerald-400 bg-emerald-500/15"
                  const SourceIcon = replySource === "telegram" ? Send : replySource === "slack" ? MessageSquare : Phone
                  const displayName = firstMsg ? msgDisplayName(firstMsg) : "Unknown"
                  const initials = getInitials(displayName.replace(/^To:\s*/i, ""))
                  const close = () => { setActiveThread(null); setWaReplyTo(null); setWaReplyBody(""); setPendingImage(null); if (imageInputRef.current) imageInputRef.current.value = "" }
                  return createPortal(
                  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={close}>
                    <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-white truncate">{displayName}</h3>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", sourceColor)}>
                                <SourceIcon className="h-2.5 w-2.5" />
                                {sourceLabel}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{threadMsgs.length} message{threadMsgs.length > 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Thread messages — scrollable area */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                        <div className="space-y-3">
                          {hiddenCount > 0 && (
                            <button
                              onClick={() => setExpandedThreads(prev => { const next = new Set(prev); next.add(threadId); return next })}
                              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Show {hiddenCount} previous message{hiddenCount > 1 ? "s" : ""}
                            </button>
                          )}
                          {isExpanded && threadMsgs.length > 3 && (
                            <button
                              onClick={() => setExpandedThreads(prev => { const next = new Set(prev); next.delete(threadId); return next })}
                              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-white/70 transition-colors"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Hide previous messages
                            </button>
                          )}
                          {visibleMessages.map((m: any) => {
                            const isSent = m.direction === "sent"
                            const senderName = msgDisplayName(m)
                            return (
                            <div key={m.id} className={cn("flex", isSent ? "justify-end" : "justify-start")}>
                              <div className={cn("max-w-[75%] min-w-0")}>
                                <div className={cn(
                                  "rounded-2xl px-3.5 py-2.5 text-sm",
                                  isSent
                                    ? "bg-emerald-600/20 text-emerald-50 rounded-tr-sm border border-emerald-500/15"
                                    : "bg-white/[0.04] text-white/90 rounded-tl-sm border border-white/5"
                                )}>
                                  {m.media_url && m.media_type === "photo" && (
                                    <img
                                      src={m.media_url}
                                      alt="Photo"
                                      className="mb-2 max-w-full rounded-lg object-cover"
                                      style={{ maxHeight: "300px" }}
                                      onClick={() => window.open(m.media_url, "_blank")}
                                    />
                                  )}
                                  <p className="whitespace-pre-wrap break-words">{m.body || m.caption || ""}</p>
                                </div>
                                <p className={cn("mt-1 text-[10px] text-muted-foreground", isSent ? "text-right" : "text-left")}>
                                  {isSent ? "You" : senderName} · {msgTimeStr(m)}
                                </p>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Reply section — sticky bottom */}
                      <div className="border-t border-white/5 px-6 py-4">
                        {/* Image preview */}
                        {pendingImage && (
                          <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                            <img src={pendingImage.url} alt="Preview" className="h-12 w-12 rounded object-cover" />
                            <span className="text-xs text-muted-foreground truncate flex-1">{pendingImage.file.name}</span>
                            <button
                              onClick={() => { setPendingImage(null); if (imageInputRef.current) imageInputRef.current.value = "" }}
                              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          {replySource === "telegram" && (
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 10 * 1024 * 1024) {
                                  toast({ title: "File too large", description: "Max 10MB for images", variant: "error" })
                                  return
                                }
                                setPendingImage({ url: URL.createObjectURL(file), file })
                              }}
                            />
                          )}
                          {replySource === "telegram" && (
                            <button
                              onClick={() => imageInputRef.current?.click()}
                              disabled={sendingWaReply}
                              title="Attach image"
                              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-3 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 shrink-0"
                            >
                              <ImagePlus className="h-4 w-4" />
                            </button>
                          )}
                          <textarea
                            value={waReplyBody}
                            onChange={e => setWaReplyBody(e.target.value)}
                            placeholder={pendingImage ? "Add a caption (optional)..." : "Type your message..."}
                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                            rows={2}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.parentElement?.querySelector("button.send-btn") as HTMLButtonElement)?.click() } }}
                          />
                          <button
                            className="send-btn flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            disabled={sendingWaReply || (!waReplyBody.trim() && !pendingImage)}
                            onClick={async () => {
                              if (!user || !waReplyTo || (!waReplyBody.trim() && !pendingImage)) return
                              setSendingWaReply(true)
                              try {
                                let mediaUrl: string | undefined
                                // If there's a pending image, upload to Supabase storage first
                                if (pendingImage) {
                                  const formData = new FormData()
                                  formData.append("file", pendingImage.file)
                                  formData.append("userId", user.id)
                                  const uploadRes = await fetch("/api/telegram/user/upload-media", {
                                    method: "POST",
                                    body: formData,
                                  })
                                  const uploadData = await uploadRes.json()
                                  if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload image")
                                  mediaUrl = uploadData.mediaUrl
                                }
                                const endpoint = replySource === "telegram" ? "/api/telegram/user/send" : replySource === "slack" ? "/api/slack/send" : "/api/whatsapp/send"
                                const payload = replySource === "telegram"
                                  ? { userId: user.id, chatId: waReplyTo, body: waReplyBody, mediaUrl }
                                  : replySource === "slack"
                                  ? { userId: user.id, channelId: waReplyTo, text: waReplyBody }
                                  : { userId: user.id, to: waReplyTo, body: waReplyBody }
                                const res = await fetch(endpoint, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || "Failed to send")
                                if (replySource === "telegram") {
                                  const tgMsgs = await getTelegramMessages(user.id)
                                  setTelegramMessages(tgMsgs)
                                } else if (replySource === "slack") {
                                  const slMsgs = await getSlackMessages(user.id)
                                  setSlackMessages(slMsgs)
                                } else {
                                  const msgs = await getWhatsAppMessages(user.id)
                                  setWhatsAppMessages(msgs)
                                }
                                setWaReplyBody("")
                                setPendingImage(null)
                                if (imageInputRef.current) imageInputRef.current.value = ""
                              } catch (e: any) {
                                toast({ title: "Error", description: e?.message || "Failed to send message", variant: "error" })
                              } finally {
                                setSendingWaReply(false)
                              }
                            }}
                          >
                            {sendingWaReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {sendingWaReply ? "Sending..." : "Send"}
                          </button>
                        </div>
                        {!waReplyTo && (
                          <p className="mt-1.5 text-[10px] text-amber-400/70">No reply target available for this message.</p>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                  )
                })()}
              </div>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === "Calendar" && channels.length > 0 && calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected") && (
              <div className="flex flex-1 flex-col min-h-0">
                {/* Calendar Toolbar */}
                <div className="flex flex-col gap-2 border-b bg-card/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-base font-bold sm:text-lg">{t("crmCalendarTitle")}</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setCalendarView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", calendarView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmKanban")}</button>
                      <button onClick={() => setCalendarView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", calendarView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t("crmTable")}</button>
                    </div>
                    {/* Channel selector */}
                    {channels.filter(c => c.type === "calendar").length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowChannelMenu(v => !v)}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <span className={cn("h-2 w-2 rounded-full", (tabChannels.find(c => c.id === activeChannel) || tabChannels[0])?.color || "bg-slate-500")} />
                          <span className="text-foreground">{(tabChannels.find(c => c.id === activeChannel) || tabChannels[0])?.label || "Calendar"}</span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                        {showChannelMenu && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                            <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                              {channels.filter(c => c.type === "calendar").map(ch => (
                                <button
                                  key={ch.id}
                                  onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                                  className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-emerald-600/10 transition-colors", activeChannel === ch.id && "text-emerald-400")}
                                >
                                  <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                                  <span className="flex-1 truncate">{ch.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={calSearch}
                        onChange={e => setCalSearch(e.target.value)}
                        className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-48"
                        placeholder={t("crmSearchEmails")}
                      />
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setCalFilterOpen(v => !v)}
                        className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors sm:px-3", calFilterOpen || calFilter.range !== "all" ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-400" : "hover:bg-accent")}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("crmFilter")}</span>
                        {calFilter.range !== "all" && (
                          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                        )}
                      </button>
                      {calFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setCalFilterOpen(false)} />
                          <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl p-3 space-y-3">
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Time</p>
                              <div className="grid grid-cols-2 gap-1">
                                {(["all", "today", "week", "upcoming"] as const).map(r => (
                                  <button key={r} onClick={() => setCalFilter(f => ({ ...f, range: r }))}
                                    className={cn("rounded-lg py-1.5 text-[11px] font-medium border transition-colors", calFilter.range === r ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}>
                                    {r === "all" ? "All" : r === "today" ? "Today" : r === "week" ? "This Week" : "Later"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {(calSearch || calFilter.range !== "all") && (
                              <button onClick={() => { setCalSearch(""); setCalFilter({ range: "all" }); setCalFilterOpen(false) }}
                                className="w-full rounded-lg border border-white/10 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-white/5 transition-colors">
                                Clear filters
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => fetchCalendar(true)}
                      disabled={calendarLoading || !calendarConnections.find((c: any) => (c.provider === "google" || c.provider === "calendly") && c.status === "connected")}
                      className={cn(
                        "relative overflow-hidden flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-300 disabled:cursor-not-allowed",
                        calendarLoading
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300"
                      )}
                    >
                      {calendarLoading && (
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
                      )}
                      {calendarLoading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5 shrink-0" />}
                      <span className="whitespace-nowrap">{calendarLoading ? t("crmFetchingCalendar") : t("crmFetchCalendar")}</span>
                    </button>
                  </div>
                </div>
                {calendarView === "kanban" ? (
                  <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0">
                    <div className="flex h-full gap-5 p-6">
                      {calKanbanCols.map(col => {
                        const now = new Date(); const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999)
                        const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
                        const naturalCol = (ev: any) => {
                          if (!ev.start_time) return "upcoming"
                          const t = new Date(ev.start_time)
                          if (t >= now && t <= todayEnd) return "today"
                          if (t > todayEnd && t <= weekEnd) return "week"
                          return "upcoming"
                        }
                        const getColId = (ev: any) => calCardCols[ev.id] || naturalCol(ev)
                        const items = filteredCalendarEvents.filter(ev => getColId(ev) === col.id)
                        return (
                          <div key={col.id}
                            className={cn("group flex w-80 shrink-0 flex-col h-full rounded-xl transition-all", dragOverCalCol === col.id && "ring-2 ring-emerald-500/40 bg-emerald-500/5")}
                            onDragOver={e => { e.preventDefault(); setDragOverCalCol(col.id) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCalCol(null) }}
                            onDrop={e => { e.preventDefault(); if (dragCalId.current) setCalCardCols(prev => ({ ...prev, [dragCalId.current!]: col.id })); dragCalId.current = null; setDragOverCalCol(null) }}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              {editingCalCol === col.id ? (
                                <input autoFocus defaultValue={col.label}
                                  className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold bg-transparent focus:outline-none flex-1", col.color)}
                                  onBlur={e => { setCalKanbanCols(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value || col.label } : c)); setEditingCalCol(null) }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingCalCol(null) }}
                                />
                              ) : (
                                <span title="Click to rename" className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-75", col.color)} onClick={() => setEditingCalCol(col.id)}>{col.id === "today" ? t("crmColToday") : col.id === "week" ? t("crmColThisWeek") : col.id === "upcoming" ? t("crmColUpcoming") : col.label}</span>
                              )}
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{items.length}</span>
                              <button title="Delete column" onClick={() => calKanbanCols.length > 1 && setCalKanbanCols(prev => prev.filter(c => c.id !== col.id))}
                                className="ml-auto p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 pb-4">
                              {items.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">{t("crmDropEvents")}</p></div>
                              ) : items.map((ev: any) => (
                                <div key={ev.id} draggable
                                  onDragStart={e => { dragCalId.current = ev.id; e.dataTransfer.effectAllowed = "move" }}
                                  className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95"
                                >
                                  <a href={ev.event_link || "#"} target="_blank" rel="noopener noreferrer" className="block">
                                    <p className="text-sm font-semibold mb-1 truncate">{ev.summary}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {ev.start_time ? new Date(ev.start_time).toLocaleDateString() : ""} {ev.start_time ? new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                                      {ev.location && ` · ${ev.location}`}
                                    </p>
                                    {ev.attendees?.length > 0 && <p className="text-[10px] text-muted-foreground mt-1 truncate">{ev.attendees.slice(0,2).map((a: any) => a.email || a.displayName).join(", ")}{ev.attendees.length > 2 && ` +${ev.attendees.length - 2}`}</p>}
                                    {ev.is_online && <span className="mt-2 inline-block rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Online</span>}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => { const id = `col-${Date.now()}`; setCalKanbanCols(prev => [...prev, { id, label: "New Column", color: COL_COLORS[calKanbanCols.length % COL_COLORS.length] }]); setTimeout(() => setEditingCalCol(id), 50) }}
                        className="flex h-10 w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors px-4 self-start">
                        <Plus className="h-4 w-4" /> {t("crmAddColumn")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                  <div className="mx-auto max-w-5xl">
                {filteredCalendarEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{calendarFetched ? t("crmNoUpcomingEvents") : t("crmSyncCalendar")}</p>
                  </div>
                ) : calendarView === "table" ? (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground sm:px-4">Event</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground sm:px-4">Date &amp; Time</th>
                          <th className="hidden sm:table-cell px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground sm:px-4">Status</th>
                          <th className="hidden md:table-cell px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCalendarEvents.slice(calTablePage * TABLE_PAGE_SIZE, (calTablePage + 1) * TABLE_PAGE_SIZE).map((ev: any) => {
                          const now = new Date(); const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999)
                          const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
                          const natural = (e: any) => { if (!e.start_time) return "upcoming"; const t = new Date(e.start_time); if (t >= now && t <= todayEnd) return "today"; if (t > todayEnd && t <= weekEnd) return "week"; return "upcoming" }
                          const colId = calCardCols[ev.id] || natural(ev)
                          const col = calKanbanCols.find(c => c.id === colId) || calKanbanCols[0]
                          const evDate = ev.start_time ? new Date(ev.start_time) : null
                          return (
                          <tr key={ev.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-3 sm:px-4">
                              <a href={ev.event_link || "#"} target="_blank" rel="noopener noreferrer" className="font-medium truncate max-w-[140px] sm:max-w-[200px] block hover:text-emerald-400 transition-colors">{ev.summary}</a>
                              <span className="sm:hidden text-[10px] text-muted-foreground mt-0.5 block">
                                {evDate ? evDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                                {ev.is_online && " · Online"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground whitespace-nowrap sm:px-4">
                              {evDate ? evDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                              <span className="hidden sm:inline">{evDate ? " " + evDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground truncate max-w-[140px]">{ev.location || "—"}</td>
                            <td className="px-3 py-3 sm:px-4" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setCalStatusOpen(calStatusOpen === ev.id ? null : ev.id) }}
                                  className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1 border transition-all hover:brightness-110", col?.color)}
                                >
                                  <span className="hidden sm:inline">{col?.label}</span>
                                  <span className="sm:hidden">{col?.label?.[0]}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", calStatusOpen === ev.id && "rotate-180")} />
                                </button>
                                {calStatusOpen === ev.id && (
                                  <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[160px] rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to / Rename</p>
                                    {calKanbanCols.map(c => (
                                      <div key={c.id} className={cn("flex items-center gap-1 px-2 py-1 hover:bg-white/5 transition-colors", c.id === colId && "bg-white/5")}>
                                        {editingCalLabel === c.id ? (
                                          <input autoFocus defaultValue={c.label}
                                            className={cn("flex-1 rounded-md border px-2 py-1 text-xs bg-transparent focus:outline-none", c.color)}
                                            onClick={e => e.stopPropagation()}
                                            onBlur={e => { const v = e.target.value.trim(); if (v) setCalKanbanCols(prev => prev.map(col => col.id === c.id ? { ...col, label: v } : col)); setEditingCalLabel(null) }}
                                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingCalLabel(null) }}
                                          />
                                        ) : (
                                          <button onClick={e => { e.stopPropagation(); setCalCardCols(prev => ({ ...prev, [ev.id]: c.id })); setCalStatusOpen(null) }}
                                            className="flex flex-1 items-center gap-2 py-1 text-left text-xs">
                                            <span className="flex-1">{c.label}</span>
                                            {c.id === colId && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                                          </button>
                                        )}
                                        {editingCalLabel !== c.id && (
                                          <button onClick={e => { e.stopPropagation(); setEditingCalLabel(c.id) }}
                                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors shrink-0">
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-4 py-3">
                              {ev.is_online ? <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Online</span> : <span className="text-muted-foreground text-[10px]">In-person</span>}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {(() => {
                      const totalItems = filteredCalendarEvents.length
                      const totalPages = Math.ceil(totalItems / TABLE_PAGE_SIZE)
                      if (totalPages <= 1) return null
                      const pages: number[] = []
                      for (let i = 0; i < totalPages; i++) pages.push(i)
                      const visiblePages = pages.filter(p => p === 0 || p === totalPages - 1 || Math.abs(p - calTablePage) <= 1)
                      return (
                        <div className="flex items-center justify-between border-t px-4 py-2.5">
                          <span className="text-[10px] text-muted-foreground">Showing {Math.min(calTablePage * TABLE_PAGE_SIZE + 1, totalItems)}–{Math.min((calTablePage + 1) * TABLE_PAGE_SIZE, totalItems)} of {totalItems}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setCalTablePage(0)} disabled={calTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">First</button>
                            <button onClick={() => setCalTablePage(p => Math.max(0, p - 1))} disabled={calTablePage === 0} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
                            {visiblePages.map((p, i) => (
                              <span key={i} className="flex items-center">
                                {i > 0 && p - visiblePages[i - 1] > 1 && <span className="px-1 text-[10px] text-muted-foreground">…</span>}
                                <button onClick={() => setCalTablePage(p)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors", p === calTablePage ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "border border-white/10 text-muted-foreground hover:text-white hover:border-white/20")}>{p + 1}</button>
                              </span>
                            ))}
                            <button onClick={() => setCalTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={calTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
                            <button onClick={() => setCalTablePage(totalPages - 1)} disabled={calTablePage >= totalPages - 1} className="rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Last</button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {calendarEvents.map((ev: any) => (
                      <a
                        key={ev.id}
                        href={ev.event_link || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-emerald-500/30"
                      >
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-500/10">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">
                            {ev.start_time ? new Date(ev.start_time).toLocaleDateString("en-US", { month: "short" }) : ""}
                          </span>
                          <span className="text-sm font-bold text-emerald-400">
                            {ev.start_time ? new Date(ev.start_time).getDate() : ""}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ev.summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {ev.start_time ? new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                            {ev.location && ` · ${ev.location}`}
                          </p>
                          {ev.attendees && ev.attendees.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {ev.attendees.slice(0, 3).map((a: any) => a.email || a.displayName).join(", ")}
                              {ev.attendees.length > 3 && ` +${ev.attendees.length - 3} more`}
                            </p>
                          )}
                        </div>
                        {ev.is_online && (
                          <span className="shrink-0 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Online</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
                </div>
                </div>
                )}
              </div>
            )}

          </div>

          {/* ── COMPOSER ── */}
          {composerOpen && (
            <>
              <div className="absolute inset-0 z-10 bg-black/30" onClick={() => setComposerOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 z-20 border-t bg-card p-4 shadow-xl">
                <div className="mx-auto max-w-2xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                      <span className="text-xs font-medium">Send via {activeCh.label}</span>
                      {!activeCh.connected && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                          Not connected
                        </span>
                      )}
                    </div>
                    <button onClick={() => setComposerOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {activeCh.type === "email" ? (
                    /* Email composer */
                    <div className="space-y-2">
                      <input
                        value={composeTo}
                        onChange={e => setComposeTo(e.target.value)}
                        placeholder="To: recipient@example.com, another@example.com"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <input
                        value={composeSubject}
                        onChange={e => setComposeSubject(e.target.value)}
                        placeholder="Subject"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <textarea
                        value={composeBody}
                        onChange={e => setComposeBody(e.target.value)}
                        placeholder="Type your email message..."
                        className="w-full rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                        rows={4}
                      />
                      <div className="flex items-center justify-end">
                        <button
                          onClick={handleSendEmail}
                          disabled={!composeTo.trim() || !composeSubject.trim() || !activeCh.connected || sendingEmail}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                        >
                          {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          {sendingEmail ? "Sending..." : "Send Email"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Generic composer for other channels */
                    <>
                      <textarea
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        placeholder={`Type your ${activeCh.label.toLowerCase()} message to ${contact?.name || ""}...`}
                        className="w-full rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                        rows={3}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          disabled={!messageText.trim() || !activeCh.connected}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                        >
                          <Send className="h-3.5 w-3.5" /> {t("crmSend")} {activeCh.label}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
    </main>
      </div>

      {/* ── EMAIL OPEN / REPLY MODAL ── */}
      {openEmail && (() => {
        const threadMessages = emailMessages
          .filter((m: any) => m.thread_id === openEmail.thread_id)
          .filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.message_id === m.message_id) === i)
          .sort((a: any, b: any) => {
            const da = a.received_at ? new Date(a.received_at).getTime() : a.sent_at ? new Date(a.sent_at).getTime() : 0
            const db = b.received_at ? new Date(b.received_at).getTime() : b.sent_at ? new Date(b.sent_at).getTime() : 0
            return da - db
          })
        return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setOpenEmail(null); setReplyTo(""); setReplyCc("") }}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{openEmail.subject || "(No subject)"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{threadMessages.length} message{threadMessages.length > 1 ? "s" : ""} in this thread</p>
              </div>
              <button onClick={() => { setOpenEmail(null); setReplyTo(""); setReplyCc("") }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Thread messages */}
            <div className="space-y-2 mb-4">
              {(() => {
                const threadId = openEmail.thread_id || openEmail.id
                const isExpanded = expandedThreads.has(threadId)
                const visibleMessages = isExpanded ? threadMessages : threadMessages.slice(-1)
                const hiddenCount = threadMessages.length - visibleMessages.length
                return (
                <>
              {/* Collapsed: show "Show N previous messages" button */}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setExpandedThreads(prev => { const next = new Set(prev); next.add(threadId); return next })}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show {hiddenCount} previous message{hiddenCount > 1 ? "s" : ""}
                </button>
              )}

              {/* Expanded: show "Hide" button at top */}
              {isExpanded && threadMessages.length > 1 && (
                <button
                  onClick={() => setExpandedThreads(prev => { const next = new Set(prev); next.delete(threadId); return next })}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-white/70 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide previous messages
                </button>
              )}

              {visibleMessages.map((msg: any, idx: number) => {
                const cleanBody = (() => {
                  const hasHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text || "")
                  const sanitizeHtml = (html: string) => html
                    .replace(/<div style="border-left:[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
                    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "")
                    .replace(/<div class="gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
                    .replace(/<div class="moz-cite-prefix[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
                    .replace(/On .* wrote:[\s\S]*$/i, "")
                    .replace(/Pada .* menulis:[\s\S]*$/i, "")
                    .replace(/^---$/gm, "")
                    .replace(/\*+/g, "")
                    // Remove tracking pixels only (1x1 images)
                    .replace(/<img[^>]*width=["']?1["']?[^>]*height=["']?1["']?[^>]*>/gi, "")
                    .replace(/<img[^>]*height=["']?1["']?[^>]*width=["']?1["']?[^>]*>/gi, "")
                    // Make all remaining images lazy-loaded with error handling
                    .replace(/<img([^>]*?)>/gi, (match, attrs) => {
                      // Skip if already has loading attr
                      if (/loading=/i.test(attrs)) return match
                      // Add loading=lazy and max-width style; do NOT add referrerpolicy=no-referrer
                      // as many email CDNs require a referrer to serve images
                      return `<img${attrs} loading="lazy" onerror="this.style.display='none'" style="max-width:100%;height:auto;border-radius:6px;margin:4px 0">`
                    })
                    .trim()
                  if (msg.html_body) {
                    return sanitizeHtml(msg.html_body)
                  }
                  // If body contains HTML tags, treat as HTML
                  if (hasHtml(msg.body)) {
                    return sanitizeHtml(msg.body || "")
                  }
                  const raw = msg.body || "(No content)"
                  return raw
                    .split("\n")
                    .filter((l: string) => !l.startsWith(">") && !l.startsWith("    "))
                    .join("\n")
                    .replace(/^On .* wrote:\s*$/gm, "")
                    .replace(/^Pada .* menulis:\s*$/gm, "")
                    .replace(/\*+/g, "")
                    .replace(/^---$/gm, "")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim() || "(No content)"
                })()
                const rawFrom = msg.from_address || ""
                const nameMatch = rawFrom.match(/^"?([^"<]+?)"?\s*<.*>$/)
                const emailMatch = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/([^\s]+@[^\s]+)/)
                const emailOnly = emailMatch ? emailMatch[1] : rawFrom
                const senderName = (nameMatch ? nameMatch[1].trim() : "") || emailOnly.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || rawFrom
                const initials = senderName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                return (
                <div key={msg.id} className={cn(
                  "rounded-xl border p-4 text-sm transition-colors",
                  msg.direction === "sent"
                    ? "border-emerald-500/20 bg-emerald-950/10"
                    : "border-white/5 bg-white/[0.03]"
                )}>
                  <div className="flex items-start gap-3">
                    {msg.direction === "sent" && avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    ) : (
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        msg.direction === "sent" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                      )}>
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/90">{senderName}</span>
                          <span className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold",
                            msg.direction === "sent" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
                          )}>
                            {msg.direction === "sent" ? "SENT" : "RECEIVED"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {msg.received_at ? new Date(msg.received_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : msg.sent_at ? new Date(msg.sent_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      {(msg.to_address || msg.cc_address) && (
                        <div className="text-[10px] text-muted-foreground mb-1.5 space-y-0.5">
                          {msg.to_address && <p><span className="text-muted-foreground/60">To:</span> {msg.to_address}</p>}
                          {msg.cc_address && <p><span className="text-muted-foreground/60">Cc:</span> {msg.cc_address}</p>}
                        </div>
                      )}
                      <div className={cn((msg.html_body || /<[a-z][\s\S]*>/i.test(msg.body || "")) ? "prose prose-invert prose-sm max-w-none" : "")}>
                        {(msg.html_body || /<[a-z][\s\S]*>/i.test(msg.body || "")) ? (
                          <div dangerouslySetInnerHTML={{ __html: cleanBody }} />
                        ) : (
                          <p className="whitespace-pre-wrap text-white/80 text-[13px] leading-relaxed">{cleanBody}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
                </>
                )
              })()}
            </div>

            {/* Reply section */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center gap-2">
                <Reply className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Reply</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={replyTo}
                  onChange={e => setReplyTo(e.target.value)}
                  placeholder="To:"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <input
                  type="text"
                  value={replyCc}
                  onChange={e => setReplyCc(e.target.value)}
                  placeholder="Cc:"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Type your reply..."
                className="w-full rounded-lg border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                rows={4}
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={async () => {
                    if (!user || !replyBody.trim()) return
                    const providerId = openEmail?.provider || activeChannel
                    const conn = emailConnections.find((c: any) => c.provider === providerId && c.status === "connected")
                    if (!conn) return
                    setSendingReply(true)
                    try {
                      // Build quoted reply — nested conversation history, clean and readable
                      let plainQuote = ""
                      let htmlQuote = ""
                      for (let i = 0; i < threadMessages.length; i++) {
                        const m = threadMessages[i]
                        const mDate = m.received_at || m.sent_at
                        const mFrom = m.from_address || ""
                        const mText = (m.body || "").replace(/^>+ /gm, "").replace(/\*+/g, "").replace(/^---$/gm, "").trim()
                        const header = `On ${mDate ? new Date(mDate).toLocaleString() : ""}, ${mFrom} wrote:`
                        const indentedText = mText.split("\n").map((l: string) => `    ${l}`).join("\n")
                        plainQuote = `${header}\n\n${indentedText}${plainQuote ? "\n\n" + plainQuote.split("\n").map((l: string) => `    ${l}`).join("\n") : ""}`
                        htmlQuote = `<div style="border-left:3px solid #e0e0e0;padding-left:14px;margin:10px 0;color:#555;"><div style="font-size:12px;color:#999;margin-bottom:6px;">On ${mDate ? new Date(mDate).toLocaleString() : ""}, ${mFrom} wrote:</div><div style="font-size:14px;line-height:1.5;">${(mText || "").replace(/\n/g, "<br>")}</div>${htmlQuote ? `<div style="margin-top:10px;">${htmlQuote}</div>` : ""}</div>`
                      }
                      const quotedReply = `${replyBody}\n\n${plainQuote}`
                      const quotedHtml = `<div style="font-size:14px;line-height:1.5;">${replyBody.replace(/\n/g, "<br>")}</div><br>${htmlQuote}`
                      const res = await fetch("/api/email/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          providerId,
                          to: replyTo || openEmail.from_address,
                          cc: replyCc || undefined,
                          subject: openEmail.subject?.startsWith("Re:") ? openEmail.subject : `Re: ${openEmail.subject || ""}`,
                          body: quotedReply,
                          html: quotedHtml,
                          threadId: openEmail.thread_id || undefined,
                          originalMessageId: openEmail.message_id_header || openEmail.message_id || undefined,
                        }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || "Failed to send")
                      // Refresh messages
                      const msgs = await getEmailMessages(user.id)
                      setEmailMessages(msgs)
                      setOpenEmail(null)
                      setReplyBody("")
                      setReplyTo("")
                      setReplyCc("")
                    } catch (e: any) {
                      console.error("[REPLY]", e)
                      toast({ title: "Error", description: e?.message || "Failed to send reply", variant: "error" })
                    } finally {
                      setSendingReply(false)
                    }
                  }}
                  disabled={!replyBody.trim() || sendingReply}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                >
                  {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── PRIVACY MODAL ── */}
      {privacyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPrivacyOpen(false)}>
          <div className="relative mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPrivacyOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">{t("crmLegalTitle")}</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{t("crmLegalIntro")}</p>
            <div className="mb-4 grid gap-2">
              {[
                { j: "Mexico", l: "LFPDPPP" },
                { j: "European Union", l: "GDPR (Regulation EU 2016/679)" },
                { j: "California, USA", l: "CCPA/CPRA" },
                { j: "Canada", l: "PIPEDA" },
                { j: "Brazil", l: "LGPD" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="text-muted-foreground">{row.j}: <span className="text-white">{row.l}</span></span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">{t("crmLegalRights")}</h4>
                <ul className="space-y-1">
                  {[t("crmLegalRight1"), t("crmLegalRight2"), t("crmLegalRight3")].map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">{t("crmLegalObligations")}</h4>
                <ul className="space-y-1">
                  {[t("crmLegalObligation1"), t("crmLegalObligation2"), t("crmLegalObligation3")].map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">{t("crmLegalTransparency")}</h4>
                <ul className="space-y-1">
                  {[t("crmLegalTransparency1"), t("crmLegalTransparency2"), t("crmLegalTransparency3")].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">{t("crmLegalLiability")}</h4>
                <ul className="space-y-1">
                  {[t("crmLegalLiability1"), t("crmLegalLiability2")].map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-600/5 p-4">
              <p className="text-sm text-emerald-400">{t("crmLegalAccept")}</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <Link href="/privacy" className="underline hover:text-emerald-400 transition-colors">{t("crmPrivacyPolicy")}</Link>
              <span className="text-white/20">|</span>
              <Link href="/terms" className="underline hover:text-emerald-400 transition-colors">{t("crmTermsOfService")}</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTACTS PICKER MODAL ── */}
      {contactsModalOpen && (() => {
        const channelCounts = {
          all: contacts.length,
          whatsapp: contacts.filter((c: Contact) => c.tags.includes("whatsapp")).length,
          email: contacts.filter((c: Contact) => c.email).length,
          telegram: contacts.filter((c: Contact) => c.tags.includes("telegram")).length,
          slack: contacts.filter((c: Contact) => c.tags.includes("slack")).length,
        }
        const channelFiltered = contactsChannelFilter === "all" ? filtered
          : contactsChannelFilter === "whatsapp" ? filtered.filter((c: Contact) => c.tags.includes("whatsapp"))
          : contactsChannelFilter === "email" ? filtered.filter((c: Contact) => c.email)
          : contactsChannelFilter === "telegram" ? filtered.filter((c: Contact) => c.tags.includes("telegram"))
          : contactsChannelFilter === "slack" ? filtered.filter((c: Contact) => c.tags.includes("slack"))
          : filtered
        return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setContactsModalOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setContactsModalOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-1 text-lg font-bold text-white">{t('crmContacts')}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{channelFiltered.length} {t('crmTotal')}</p>
            {/* Channel filter tabs */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {([
                { id: "all", label: "All", count: channelCounts.all, color: "bg-white/10 text-white" },
                { id: "whatsapp", label: "WhatsApp", count: channelCounts.whatsapp, color: "bg-emerald-500/10 text-emerald-400" },
                { id: "email", label: "Email", count: channelCounts.email, color: "bg-blue-500/10 text-blue-400" },
                { id: "telegram", label: "Telegram", count: channelCounts.telegram, color: "bg-sky-500/10 text-sky-400" },
                { id: "slack", label: "Slack", count: channelCounts.slack, color: "bg-purple-500/10 text-purple-400" },
              ] as const).map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setContactsChannelFilter(ch.id)}
                  className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all", contactsChannelFilter === ch.id ? ch.color + " ring-1 ring-white/10" : "bg-white/5 text-muted-foreground hover:bg-white/10")}
                >
                  {ch.label}
                  <span className="rounded-full bg-black/20 px-1.5 text-[9px] font-bold">{ch.count}</span>
                </button>
              ))}
            </div>
            {channelFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <User className="mb-2 h-6 w-6 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">{t('crmNoContactsYet')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {channelFiltered.map((c: Contact) => (
                  <button
                    key={c.id}
                    onClick={() => { setContactModalId(c.id); setContactsModalOpen(false) }}
                    className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-emerald-500/30 hover:bg-emerald-600/5 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                      <div className="flex items-center gap-2">
                        {c.email && (
                          <span className="flex items-center gap-1 truncate text-[10px] text-blue-400">
                            <Mail className="h-2.5 w-2.5" />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1 truncate text-[10px] text-emerald-400">
                            <Phone className="h-2.5 w-2.5" />
                            {c.phone}
                          </span>
                        )}
                        {!c.email && !c.phone && (
                          <span className="text-[10px] text-muted-foreground">{c.company || t('crmNoContactInfo')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {c.tags.includes("whatsapp") && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">WA</span>}
                        {c.tags.includes("telegram") && <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-400">TG</span>}
                        {c.tags.includes("slack") && <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">SL</span>}
                        {c.email && !c.tags.includes("whatsapp") && !c.tags.includes("telegram") && !c.tags.includes("slack") && <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">EMAIL</span>}
                      </div>
                      {c.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      })()}

      {/* ── CONTACT DETAIL MODAL ── */}
      {contactModalId && (() => {
        const c = contacts.find((ct: Contact) => ct.id === contactModalId)
        if (!c) return null
        const contactEmails = [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
          .filter((m: any) => (m.from_address || "").includes(c.email || c.phone || "") || (m.to_address || "").includes(c.email || c.phone || ""))
          .sort((a: any, b: any) => {
            const da = a.received_at ? new Date(a.received_at).getTime() : a.sent_at ? new Date(a.sent_at).getTime() : 0
            const db = b.received_at ? new Date(b.received_at).getTime() : b.sent_at ? new Date(b.sent_at).getTime() : 0
            return db - da
          })
        const contactActivities = activities.filter(a => a.contact === c.email || a.contact === c.name || a.contact === c.phone)
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setContactModalId(null)}>
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setContactModalId(null)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>

              {/* Contact header */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{c.name}</h2>
                    {c.tags.includes("whatsapp") && <Phone className="h-4 w-4 text-emerald-400" />}
                    {c.starred && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.role ? `${c.role} at ` : ""}{c.company || ""}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact info grid */}
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Mail, label: t('crmEmail'), value: c.email },
                  { icon: Phone, label: t('crmPhone'), value: c.phone },
                  { icon: Building2, label: t('crmCompany'), value: c.company },
                  { icon: MapPin, label: t('crmLocation'), value: c.location },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                      <div className="truncate text-sm text-white">{value || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Deal info */}
              {(c.dealValue > 0 || c.dealStage) && (
                <div className="mb-6 rounded-xl border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">{t('crmDealInfo')}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('crmStage')}: <span className="text-white">{c.dealStage || "—"}</span></span>
                    <span className="text-muted-foreground">{t('crmValue')}: <span className="text-emerald-400 font-semibold">${c.dealValue.toLocaleString()}</span></span>
                  </div>
                </div>
              )}

              {/* Email thread */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('crmEmailThread')} ({contactEmails.length})</h3>
                  {c.email && (
                    <button
                      onClick={() => {
                        setContactEmailFilter(c.email || c.phone || "")
                        setContactModalId(null)
                        setActiveTab("Email")
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {t('crmViewInEmailTab')}
                    </button>
                  )}
                </div>
                {contactEmails.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-6 text-center">
                    <Mail className="mx-auto mb-2 h-5 w-5 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">{t('crmNoEmailThread')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contactEmails.slice(0, 10).map((m: any) => (
                      <div key={m.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", m.direction === "sent" ? "bg-blue-500/15" : "bg-emerald-500/15")}>
                          {m.direction === "sent" ? <Send className="h-3 w-3 text-blue-400" /> : <Mail className="h-3 w-3 text-emerald-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold">{m.subject || t('crmNoSubject')}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {m.received_at ? new Date(m.received_at).toLocaleDateString() : m.sent_at ? new Date(m.sent_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">{stripHtml(m.body)?.slice(0, 100) || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">{t('crmRecentActivity')}</h3>
                {contactActivities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('crmNoRecentActivity')}</p>
                ) : (
                  <div className="space-y-2">
                    {contactActivities.slice(0, 5).map(a => (
                      <div key={a.id} className="flex gap-3 rounded-lg border bg-card p-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-400">
                          {a.type === "email" && <Mail className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-xs leading-relaxed">{a.text}</p>
                          <p className="text-[10px] text-muted-foreground">{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex gap-2">
                {c.email && (
                  <button
                    onClick={() => {
                      if (activeCh.type === "email") {
                        setComposeTo(c.email || "")
                      }
                      setComposerOpen(true)
                      setContactModalId(null)
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('crmSendEmail')}
                  </button>
                )}
                <button
                  onClick={() => { setSelectedId(c.id); setContactModalId(null); setActiveTab("Overview") }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  {t('crmOpenFullProfile')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      <Toaster />
    </div>
  )
}

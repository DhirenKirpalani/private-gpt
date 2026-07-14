"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Search, Plus, Phone, Mail, MapPin, Building2,
  Filter, CircleDollarSign, ChevronDown, X,
  ClipboardList, FileText, Send, Inbox,
  Star, StarOff, Shield, User, Loader2, Reply, Trash2, Check, Pencil, Menu, PanelLeft, Tag,
  LayoutDashboard, MessageSquare, Calendar,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { TrialPill } from "@/components/trial-pill"
import { TrialPaywall } from "@/components/trial-paywall"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { toast, Toaster } from "@/components/ui/toast"
import { getProfile, getEmailConnections, getEmailMessages, getContacts, importContactsFromEmails, importContactsFromWhatsApp, markEmailAsRead, getCalendarConnections, getCalendarEvents, getWhatsAppConnections, getWhatsAppMessages, subscribeToEmailMessages, subscribeToCalendarEvents, subscribeToContacts, unsubscribeChannel, getKanbanCols, upsertKanbanCols } from "@/lib/supabase"

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

type Contact = { id: string; name: string; company: string | null; role: string | null; email: string | null; phone: string | null; location: string | null; tags: string[]; starred: boolean; lastContact: string; dealValue: number; dealStage: string | null }

export default function CRMPage() {
  const { user } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [navOpen, setNavOpen] = useState(false)
  const [crmSidebarOpen, setCrmSidebarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contactModalId, setContactModalId] = useState<string | null>(null)
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("Overview")
  const [search, setSearch] = useState("")
  const [activeNav] = useState("Contacts")
  const [activeChannel, setActiveChannel] = useState("")
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [userName, setUserName] = useState("")

  // Real data states
  const [contacts, setContacts] = useState<Contact[]>([])
  const [emailMessages, setEmailMessages] = useState<any[]>([])
  const [emailConnections, setEmailConnections] = useState<any[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState<any[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxFetched, setInboxFetched] = useState(false)

  // Email composer state
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  // Email open/reply state
  const [openEmail, setOpenEmail] = useState<any>(null)
  const [replyBody, setReplyBody] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  // Pagination state
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [emailView, setEmailView] = useState<"kanban" | "table">("kanban")
  const [messagesView, setMessagesView] = useState<"kanban" | "table">("kanban")
  const [calendarView, setCalendarView] = useState<"kanban" | "table">("kanban")

  // Email search + filter
  const [emailSearch, setEmailSearch] = useState("")
  const [emailFilterOpen, setEmailFilterOpen] = useState(false)
  const [emailFilter, setEmailFilter] = useState<{ direction: "all" | "sent" | "received"; read: "all" | "read" | "unread" }>({ direction: "all", read: "all" })
  const [contactEmailFilter, setContactEmailFilter] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null)
  const [keywordFilterOpen, setKeywordFilterOpen] = useState(false)
  const EMAIL_KEYWORDS = ["proposal", "invoice", "contract", "quote", "purchase order", "po", "payment", "receipt", "agreement", "deal", "billing", "estimate", "refund", "opportunity", "milestone", "deliverable", "deadline", "legal", "sow", "rfp", "nda", "msa", "scope of work"]

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
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarFetched, setCalendarFetched] = useState(false)

  // WhatsApp state
  const [whatsappConnections, setWhatsAppConnections] = useState<any[]>([])
  const [whatsappMessages, setWhatsAppMessages] = useState<any[]>([])
  const [whatsappLoading, setWhatsAppLoading] = useState(false)
  const [whatsappFetched, setWhatsAppFetched] = useState(false)
  const [waReplyBody, setWaReplyBody] = useState("")
  const [waReplyTo, setWaReplyTo] = useState<string | null>(null)
  const [sendingWaReply, setSendingWaReply] = useState(false)

  // ── Persist CRM data to sessionStorage so it survives page navigation ──
  const storageKey = (k: string) => `crm_${user?.id || "guest"}_${k}`

  // Restore on mount
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
      if (savedInboxFetched) setInboxFetched(JSON.parse(savedInboxFetched))
      const savedCalendar = sessionStorage.getItem(storageKey("calendarEvents"))
      if (savedCalendar) setCalendarEvents(JSON.parse(savedCalendar))
      const savedCalendarFetched = sessionStorage.getItem(storageKey("calendarFetched"))
      if (savedCalendarFetched) setCalendarFetched(JSON.parse(savedCalendarFetched))
      const savedWa = sessionStorage.getItem(storageKey("whatsappMessages"))
      if (savedWa) setWhatsAppMessages(JSON.parse(savedWa))
      const savedWaFetched = sessionStorage.getItem(storageKey("whatsappFetched"))
      if (savedWaFetched) setWhatsAppFetched(JSON.parse(savedWaFetched))
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
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("activeChannel"), activeChannel) } catch {} }, [activeChannel, user])
  useEffect(() => { if (user) try { sessionStorage.setItem(storageKey("activeTab"), activeTab) } catch {} }, [activeTab, user])

  // Build dynamic channels from actual connections
  const channels = useMemo(() => {
    const list: { id: string; label: string; color: string; type: string; connected: boolean }[] = []
    for (const conn of emailConnections) {
      if (conn.status === "connected") {
        list.push({
          id: conn.provider,
          label: conn.provider === "gmail" ? "Gmail" : conn.provider === "outlook" ? "Outlook" : conn.email_address || conn.provider,
          color: conn.provider === "gmail" ? "bg-red-500" : conn.provider === "outlook" ? "bg-blue-500" : "bg-slate-500",
          type: "email",
          connected: true,
        })
      }
    }
    for (const conn of calendarConnections) {
      if (conn.status === "connected" && conn.provider === "google") {
        list.push({
          id: conn.provider || conn.id,
          label: "Google Calendar",
          color: "bg-blue-400",
          type: "calendar",
          connected: true,
        })
      }
    }
    for (const conn of whatsappConnections) {
      list.push({
        id: conn.phone_number_id,
        label: conn.display_name || conn.phone_number || "WhatsApp",
        color: "bg-green-500",
        type: "whatsapp",
        connected: true,
      })
    }
    return list
  }, [emailConnections, calendarConnections, whatsappConnections])

  // Default active channel to first connected one
  const activeCh = channels.find((c) => c.id === activeChannel) || channels[0] || { id: "", label: "No channels", color: "bg-slate-500", type: "", connected: false }

  // Initialize activeChannel to first available channel on load
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      setActiveChannel(channels[0].id)
    }
  }, [channels, activeChannel])

  const contact = contacts.find((c: Contact) => c.id === selectedId)

  // Unread email count (received emails with read=false)
  const unreadCount = inboxMessages.filter((m: any) => !m.read).length

  // Upcoming calendar events count (events with start_time in the future)
  const upcomingEventsCount = calendarEvents.filter((e: any) => e.start_time && new Date(e.start_time) > new Date()).length

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
      const [emailConnsRes, calConnsRes, waConnsRes, contactsRes] = await Promise.allSettled([
        getEmailConnections(user.id),
        getCalendarConnections(user.id),
        getWhatsAppConnections(user.id),
        getContacts(user.id),
      ])

      if (emailConnsRes.status === "fulfilled") setEmailConnections(emailConnsRes.value)
      if (calConnsRes.status === "fulfilled") setCalendarConnections(calConnsRes.value)
      if (waConnsRes.status === "fulfilled") setWhatsAppConnections(waConnsRes.value)
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

      // Then fetch heavy message/event data in parallel (non-blocking)
      await Promise.allSettled([
        emailConnsRes.status === "fulfilled" && emailConnsRes.value.length > 0
          ? getEmailMessages(user.id).then((msgs: any[]) => {
              if (msgs.length > 0) {
                setEmailMessages(msgs)
                const received = msgs.filter((m: any) => m.direction === "received")
                setInboxMessages(received)
                if (received.length > 0) setInboxFetched(true)
              }
            }).catch((err) => { console.error("[LOAD] getEmailMessages failed:", err) })
          : Promise.resolve(),
        calConnsRes.status === "fulfilled" && calConnsRes.value.length > 0
          ? getCalendarEvents(user.id).then((events: any[]) => {
              setCalendarEvents(events)
              if (events.length > 0) setCalendarFetched(true)
            }).catch(() => {})
          : Promise.resolve(),
        waConnsRes.status === "fulfilled" && waConnsRes.value.length > 0
          ? getWhatsAppMessages(user.id).then((msgs: any[]) => {
              setWhatsAppMessages(msgs)
              if (msgs.length > 0) setWhatsAppFetched(true)
            }).catch(() => {})
          : Promise.resolve(),
      ])
    }
    load()
  }, [user])

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
          // Auto-import contacts from email + WhatsApp
          Promise.allSettled([
            importContactsFromEmails(user.id),
            importContactsFromWhatsApp(user.id),
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

    return () => {
      unsubscribeChannel(emailChannel)
      unsubscribeChannel(calendarChannel)
      unsubscribeChannel(contactsChannel)
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
    ]).then(([eRes, mRes, cRes]) => {
      if (eRes.status === "fulfilled" && eRes.value.length > 0) setEmailKanbanCols(eRes.value)
      if (mRes.status === "fulfilled" && mRes.value.length > 0) setMsgKanbanCols(mRes.value)
      if (cRes.status === "fulfilled" && cRes.value.length > 0) setCalKanbanCols(cRes.value)
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

  // Fetch inbox emails + auto-import contacts
  const fetchInbox = async (pageToken?: string) => {
    if (!user) return
    const providerId = activeChannel || emailConnections.find((c: any) => c.status === "connected")?.provider
    if (!providerId) { setFetchError("No email provider selected."); return }
    const conn = emailConnections.find((c: any) => c.provider === providerId && c.status === "connected")
    if (!conn) { setFetchError("No connected email account found. Connect Gmail in Channels."); return }

    const isLoadMore = !!pageToken
    if (isLoadMore) setLoadingMore(true)
    else setInboxLoading(true)
    setFetchError(null)

    try {
      const res = await fetch("/api/email/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, providerId, pageToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || "Failed to fetch emails")
        return
      }
      setNextPageToken(data.nextPageToken || null)

      // Merge API-returned messages directly into state (no extra DB reload)
      const fetched = data.messages || []
      const merge = (prev: any[]) => {
        const map = new Map(prev.map(m => [m.id, m]))
        for (const m of fetched) map.set(m.id, m)
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
      Promise.allSettled([
        importContactsFromEmails(user.id),
        importContactsFromWhatsApp(user.id),
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
    } catch (e: any) {
      setFetchError(e?.message || "Network error fetching emails")
    } finally {
      if (isLoadMore) setLoadingMore(false)
      else setInboxLoading(false)
    }
  }

  // ── Auto-poll for new emails every 2 minutes (client-side, no cron) ────────
  useEffect(() => {
    if (!user) return
    const hasConnectedEmail = emailConnections.some((c: any) => c.status === "connected")
    if (!hasConnectedEmail) return
    const interval = setInterval(() => {
      console.log("[CRM] Auto-polling emails...")
      fetchInbox()
    }, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [user?.id, emailConnections.length, activeChannel])

  // ── Auto-poll for calendar events every 2 minutes (client-side) ─────────────
  useEffect(() => {
    if (!user) return
    const hasConnectedCalendar = calendarConnections.some((c: any) => c.status === "connected")
    if (!hasConnectedCalendar) return
    const interval = setInterval(() => {
      console.log("[CRM] Auto-polling calendar...")
      fetchCalendar()
    }, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [user?.id, calendarConnections.length])

  // Fetch calendar events
  const fetchCalendar = async () => {
    if (!user) return
    const conn = calendarConnections.find((c: any) => c.status === "connected")
    if (!conn) return
    setCalendarLoading(true)
    try {
      const res = await fetch("/api/calendar/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("[CALENDAR FETCH]", data.error)
        return
      }
      // Reload from DB
      const events = await getCalendarEvents(user.id)
      setCalendarEvents(events)
      setCalendarFetched(true)
    } catch (e) {
      console.error("[CALENDAR FETCH]", e)
    } finally {
      setCalendarLoading(false)
    }
  }

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
      <header className="flex h-16 md:h-16 shrink-0 items-center gap-2 md:gap-4 overflow-hidden border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
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
          <button
            onClick={() => setPrivacyOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Privacy Notice"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t("crmPrivacy")}</span>
          </button>
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
                  {tab === "Email" && unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
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
                  const count = tab === "Email" ? unreadCount : tab === "Calendar" ? upcomingEventsCount : 0
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

            {/* Empty state for overview when no contact selected */}
            {activeTab === "Overview" && !contact && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-4xl space-y-6">

                  {/* Header */}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">{t("crmOverviewTitle")}</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t("crmOverviewSubtitle")}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {[
                      {
                        label: "crmInbox",
                        value: inboxMessages.length,
                        sub: `${inboxMessages.filter((m: any) => !m.read).length} ${t("crmUnread")}`,
                        icon: Mail,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        action: () => setActiveTab("Email"),
                      },
                      {
                        label: "crmMessages",
                        value: whatsappMessages.length,
                        sub: `${whatsappMessages.filter((m: any) => !m.read && m.direction === "received").length} ${t("crmUnread")}`,
                        icon: Phone,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/10",
                        action: () => setActiveTab("Messages"),
                      },
                      {
                        label: "crmEvents",
                        value: calendarEvents.length,
                        sub: t("crmUpcoming"),
                        icon: ClipboardList,
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
                    <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("crmConnectedChannels")}</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 min-w-0">
                      {/* Email */}
                      {(() => {
                        const conn = emailConnections.find((c: any) => c.status === "connected")
                        return (
                          <button onClick={() => setActiveTab("Email")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Gmail</p>
                                {conn
                                  ? <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                                  : <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t("crmNotConnected")}</span>
                                }
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {conn ? `${inboxMessages.filter((m: any) => !m.read).length} ${t("crmUnread")} · ${inboxMessages.length} ${t("crmTotal")}` : t("crmGoToChannels")}
                              </p>
                            </div>
                          </button>
                        )
                      })()}
                      {/* WhatsApp */}
                      {(() => {
                        const conn = whatsappConnections.length > 0 ? whatsappConnections[0] : null
                        return (
                          <button onClick={() => setActiveTab("Messages")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">WhatsApp</p>
                                {conn
                                  ? <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                                  : <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t("crmNotConnected")}</span>
                                }
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {conn ? `${whatsappMessages.filter((m: any) => !m.read && m.direction === "received").length} ${t("crmUnread")} · ${whatsappMessages.length} ${t("crmTotal")}` : t("crmGoToChannels")}
                              </p>
                            </div>
                          </button>
                        )
                      })()}
                      {/* Calendar */}
                      {(() => {
                        const conn = calendarConnections.find((c: any) => c.status === "connected")
                        const nextEvent = [...calendarEvents].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]
                        return (
                          <button onClick={() => setActiveTab("Calendar")}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 text-left hover:border-white/20 transition-all hover:shadow-md">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">Google Calendar</p>
                                {conn
                                  ? <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{t("crmConnected")}</span>
                                  : <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t("crmNotConnected")}</span>
                                }
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {conn && nextEvent ? `${t("crmNext")} ${nextEvent.summary?.slice(0, 28) || "—"}` : conn ? `${calendarEvents.length} ${t("crmEventsCount")}` : t("crmGoToChannels")}
                              </p>
                            </div>
                          </button>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Recent emails + upcoming events */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Recent emails */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <h3 className="text-sm font-semibold">{t("crmRecentEmails")}</h3>
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
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <h3 className="text-sm font-semibold">{t("crmUpcomingEvents")}</h3>
                        <button onClick={() => setActiveTab("Calendar")} className="text-xs text-emerald-400 hover:underline">{t("crmViewAll")}</button>
                      </div>
                      {calendarEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <ClipboardList className="mb-2 h-5 w-5 text-muted-foreground opacity-40" />
                          <p className="text-xs text-muted-foreground">{t("crmNoUpcomingEvents")}</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {[...calendarEvents].filter((e: any) => e.start_time && new Date(e.start_time) >= new Date())
                            .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .slice(0, 5).map((ev: any) => (
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
            {activeTab === "Email" && (
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
                    <h1 className="text-base font-bold sm:text-lg">Email</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setEmailView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", emailView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Kanban</button>
                      <button onClick={() => setEmailView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", emailView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Table</button>
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
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="relative min-w-0 flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={emailSearch}
                        onChange={e => setEmailSearch(e.target.value)}
                        className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-56"
                        placeholder="Search emails..."
                      />
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setEmailFilterOpen(v => !v)}
                        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", emailFilterOpen || emailFilter.direction !== "all" || emailFilter.read !== "all" ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-400" : "hover:bg-accent")}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        Filter
                        {(emailFilter.direction !== "all" || emailFilter.read !== "all") && (
                          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            {(emailFilter.direction !== "all" ? 1 : 0) + (emailFilter.read !== "all" ? 1 : 0)}
                          </span>
                        )}
                      </button>
                      {emailFilterOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl p-3 space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Direction</p>
                            <div className="flex gap-1">
                              {(["all", "received", "sent"] as const).map(d => (
                                <button key={d} onClick={() => setEmailFilter(f => ({ ...f, direction: d }))}
                                  className={cn("flex-1 rounded-lg py-1 text-[11px] font-medium capitalize border transition-colors", emailFilter.direction === d ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}>
                                  {d === "all" ? "All" : d === "received" ? "Inbox" : "Sent"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Read status</p>
                            <div className="flex gap-1">
                              {(["all", "unread", "read"] as const).map(r => (
                                <button key={r} onClick={() => setEmailFilter(f => ({ ...f, read: r }))}
                                  className={cn("flex-1 rounded-lg py-1 text-[11px] font-medium capitalize border transition-colors", emailFilter.read === r ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}>
                                  {r === "all" ? "All" : r}
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
                        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", keywordFilter ? "bg-amber-600/10 border-amber-500/30 text-amber-400" : "hover:bg-accent")}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {keywordFilter ? keywordFilter : "Keyword"}
                      </button>
                      {keywordFilterOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl p-3 space-y-2 max-h-80 overflow-y-auto">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filter by keyword</p>
                          <button
                            onClick={() => { setKeywordFilter(null); setKeywordFilterOpen(false) }}
                            className={cn("w-full rounded-lg py-1.5 text-[11px] font-medium border transition-colors", !keywordFilter ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "border-transparent hover:bg-white/5 text-muted-foreground")}
                          >
                            All keywords
                          </button>
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
                      )}
                    </div>
                    <button
                      onClick={() => fetchInbox()}
                      disabled={inboxLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 sm:px-3"
                    >
                      {inboxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{inboxLoading ? "Fetching..." : "Fetch Emails"}</span>
                      <span className="sm:hidden">{inboxLoading ? "..." : "Fetch"}</span>
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
                          .filter((m: any) => !activeCh.id || m.provider === activeCh.id)
                          .filter((m: any) => !q || (m.subject || "").toLowerCase().includes(q) || (m.from_address || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q))
                          .filter((m: any) => emailFilter.direction === "all" || m.direction === emailFilter.direction)
                          .filter((m: any) => emailFilter.read === "all" || (emailFilter.read === "read" ? m.read : !m.read))
                          .filter((m: any) => !contactEmailFilter || (m.from_address || "").includes(contactEmailFilter) || (m.to_address || "").includes(contactEmailFilter))
                          .filter((m: any) => !keywordFilter || (m.subject || "").toLowerCase().includes(keywordFilter) || (m.body || "").toLowerCase().includes(keywordFilter))
                        const getColId = (m: any) => emailCardCols[m.id] || (m.direction === "sent" ? "sent" : m.read ? "read" : "unread")
                        const items = allMsgs.filter(m => getColId(m) === col.id)
                        return (
                          <div
                            key={col.id}
                            className={cn("group flex w-80 shrink-0 flex-col h-full rounded-xl transition-all", dragOverEmailCol === col.id && "ring-2 ring-emerald-500/40 bg-emerald-500/5")}
                            onDragOver={e => { e.preventDefault(); setDragOverEmailCol(col.id) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverEmailCol(null) }}
                            onDrop={e => {
                              e.preventDefault()
                              if (dragEmailId.current) setEmailCardCols(prev => ({ ...prev, [dragEmailId.current!]: col.id }))
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
                                >{col.label}</span>
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
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">Drop emails here</p></div>
                              ) : items.map((msg: any) => (
                                <div
                                  key={msg.id}
                                  draggable
                                  onDragStart={e => { dragEmailId.current = msg.id; e.dataTransfer.effectAllowed = "move" }}
                                  className="w-full rounded-xl border bg-card p-4 text-left shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95"
                                >
                                  <button className="w-full text-left" onClick={async () => {
                                    setOpenEmail(msg); setReplyBody(""); setSendingReply(false)
                                    if (!msg.read && user) {
                                      try {
                                        await markEmailAsRead(user.id, msg.id)
                                        setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                        setEmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
                                      } catch { /* ignore */ }
                                    }
                                  }}>
                                    <p className="text-sm font-semibold mb-1 truncate">{msg.subject || "(No subject)"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{msg.direction === "sent" ? `To: ${msg.to_address}` : msg.from_address}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">{msg.body?.slice(0, 80) || ""}</p>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      <span>{msg.received_at ? new Date(msg.received_at).toLocaleDateString() : msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ""}</span>
                                    </div>
                                  </button>
                                </div>
                              ))}
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
                        <Plus className="h-4 w-4" /> Add Column
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
                    <p className="text-sm text-muted-foreground">No email account connected</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">
                      Go to Channels to connect →
                    </Link>
                  </div>
                ) : inboxMessages.filter((m: any) => !activeCh.id || m.provider === activeCh.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Mail className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {inboxFetched ? "No emails found" : "Click Fetch Emails to load your inbox"}
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
                          return [...inboxMessages, ...emailMessages.filter((m: any) => m.direction === "sent")]
                            .filter((m: any) => !activeCh.id || m.provider === activeCh.id)
                            .filter((m: any) => !q || (m.subject || "").toLowerCase().includes(q) || (m.from_address || "").toLowerCase().includes(q) || (m.body || "").toLowerCase().includes(q))
                            .filter((m: any) => emailFilter.direction === "all" || m.direction === emailFilter.direction)
                            .filter((m: any) => emailFilter.read === "all" || (emailFilter.read === "read" ? m.read : !m.read))
                            .filter((m: any) => !contactEmailFilter || (m.from_address || "").includes(contactEmailFilter) || (m.to_address || "").includes(contactEmailFilter))
                            .filter((m: any) => !keywordFilter || (m.subject || "").toLowerCase().includes(keywordFilter) || (m.body || "").toLowerCase().includes(keywordFilter))
                        })().sort((a: any, b: any) => {
                            const da = a.received_at ? new Date(a.received_at).getTime() : a.sent_at ? new Date(a.sent_at).getTime() : 0
                            const db = b.received_at ? new Date(b.received_at).getTime() : b.sent_at ? new Date(b.sent_at).getTime() : 0
                            return db - da
                          }).map((msg: any) => {
                          const colId = emailCardCols[msg.id] || (msg.direction === "sent" ? "sent" : msg.read ? "read" : "unread")
                          const col = emailKanbanCols.find(c => c.id === colId) || emailKanbanCols[0]
                          return (
                          <tr
                            key={msg.id}
                            onClick={async () => {
                              setOpenEmail(msg); setReplyBody(""); setSendingReply(false)
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
                              <span className="text-muted-foreground ml-2 font-normal">{msg.body?.slice(0, 60) || ""}</span>
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
                                          <button onClick={e => { e.stopPropagation(); setEmailCardCols(prev => ({ ...prev, [msg.id]: c.id })); setEmailStatusOpen(null) }}
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
                    {[...inboxMessages].filter((m: any) => !activeCh.id || m.provider === activeCh.id).sort((a: any, b: any) => {
                      const da = a.received_at ? new Date(a.received_at).getTime() : 0
                      const db = b.received_at ? new Date(b.received_at).getTime() : 0
                      return db - da
                    }).map((msg: any) => (
                      <button
                        key={msg.id}
                        onClick={async () => {
                          setOpenEmail(msg); setReplyBody(""); setSendingReply(false)
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
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body?.slice(0, 120) || ""}...</p>
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

            {/* ── MESSAGES ── */}
            {activeTab === "Messages" && (
              <div className="flex flex-1 flex-col min-h-0">
                {/* Messages Toolbar */}
                <div className="flex flex-col gap-2 border-b bg-card/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-base font-bold sm:text-lg">Messages</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setMessagesView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", messagesView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Kanban</button>
                      <button onClick={() => setMessagesView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", messagesView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Table</button>
                    </div>
                    {channels.filter(c => c.type === "whatsapp").map(ch => (
                      <span key={ch.id} className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-3 py-1.5 text-xs font-medium">
                        <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                        {ch.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                  <button
                    onClick={async () => {
                      if (!user) return
                      setWhatsAppLoading(true)
                      try {
                        const msgs = await getWhatsAppMessages(user.id)
                        setWhatsAppMessages(msgs)
                        setWhatsAppFetched(true)
                      } catch (e) { console.error(e) }
                      finally { setWhatsAppLoading(false) }
                    }}
                    disabled={whatsappLoading || whatsappConnections.length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 sm:px-3"
                  >
                    {whatsappLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{whatsappLoading ? "Refreshing..." : "Refresh"}</span>
                    <span className="sm:hidden">{whatsappLoading ? "..." : "Refresh"}</span>
                  </button>
                  </div>
                </div>
                {messagesView === "kanban" ? (
                  <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0">
                    <div className="flex h-full gap-5 p-6">
                      {msgKanbanCols.map(col => {
                        const getColId = (m: any) => msgCardCols[m.id] || (m.direction === "sent" ? "sent" : m.read ? "read" : "unread")
                        const items = whatsappMessages.filter(m => getColId(m) === col.id)
                        return (
                          <div
                            key={col.id}
                            className={cn("group flex w-72 shrink-0 flex-col h-full rounded-xl transition-all", dragOverMsgCol === col.id && "ring-2 ring-emerald-500/40 bg-emerald-500/5")}
                            onDragOver={e => { e.preventDefault(); setDragOverMsgCol(col.id) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverMsgCol(null) }}
                            onDrop={e => { e.preventDefault(); if (dragMsgId.current) setMsgCardCols(prev => ({ ...prev, [dragMsgId.current!]: col.id })); dragMsgId.current = null; setDragOverMsgCol(null) }}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              {editingMsgCol === col.id ? (
                                <input autoFocus defaultValue={col.label}
                                  className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold bg-transparent focus:outline-none flex-1", col.color)}
                                  onBlur={e => { setMsgKanbanCols(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value || col.label } : c)); setEditingMsgCol(null) }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingMsgCol(null) }}
                                />
                              ) : (
                                <span title="Click to rename" className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-75", col.color)} onClick={() => setEditingMsgCol(col.id)}>{col.label}</span>
                              )}
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{items.length}</span>
                              <button title="Delete column" onClick={() => msgKanbanCols.length > 1 && setMsgKanbanCols(prev => prev.filter(c => c.id !== col.id))}
                                className="ml-auto p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 pb-4">
                              {items.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">Drop messages here</p></div>
                              ) : items.map((msg: any) => (
                                <div key={msg.id} draggable
                                  onDragStart={e => { dragMsgId.current = msg.id; e.dataTransfer.effectAllowed = "move" }}
                                  onClick={() => { setWaReplyTo(msg.from_number); setWaReplyBody(""); setSendingWaReply(false) }}
                                  className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95"
                                >
                                  <p className="text-sm font-semibold mb-1 truncate">{msg.direction === "sent" ? `To: ${msg.to_number}` : msg.from_number}</p>
                                  <p className="text-xs text-muted-foreground truncate mt-1">{msg.body || ""}</p>
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-3 w-3" /><span>{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : ""}</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => { const id = `col-${Date.now()}`; setMsgKanbanCols(prev => [...prev, { id, label: "New Column", color: COL_COLORS[msgKanbanCols.length % COL_COLORS.length] }]); setTimeout(() => setEditingMsgCol(id), 50) }}
                        className="flex h-10 w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors px-4 self-start">
                        <Plus className="h-4 w-4" /> Add Column
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                  <div className="mx-auto max-w-5xl">
                {whatsappConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No WhatsApp account connected</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">Go to Channels to connect →</Link>
                  </div>
                ) : whatsappMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{whatsappFetched ? "No messages yet" : "Click Refresh to load messages"}</p>
                  </div>
                ) : messagesView === "table" ? (
                  <div className="rounded-xl border overflow-x-auto" onClick={() => setMsgStatusOpen(null)}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">From / To</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Message</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-32">Status</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-28">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...whatsappMessages].sort((a: any, b: any) => {
                          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
                          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
                          return tb - ta
                        }).map((msg: any) => {
                          const colId = msgCardCols[msg.id] || (msg.direction === "sent" ? "sent" : msg.read ? "read" : "unread")
                          const col = msgKanbanCols.find(c => c.id === colId) || msgKanbanCols[0]
                          return (
                          <tr
                            key={msg.id}
                            onClick={() => { setWaReplyTo(msg.from_number); setWaReplyBody(""); setSendingWaReply(false) }}
                            className={cn("border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors", msg.direction === "received" && !msg.read && "bg-emerald-500/5")}
                          >
                            <td className="px-4 py-2.5 font-medium">{msg.direction === "received" ? msg.from_number : `To: ${msg.to_number}`}</td>
                            <td className="px-4 py-2.5 truncate max-w-[360px] text-muted-foreground">{msg.body || ""}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setMsgStatusOpen(msgStatusOpen === msg.id ? null : msg.id) }}
                                  className={cn("w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-1.5 border transition-all hover:brightness-110", col?.color)}
                                >
                                  <span>{col?.label}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", msgStatusOpen === msg.id && "rotate-180")} />
                                </button>
                                {msgStatusOpen === msg.id && (
                                  <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[160px] rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to / Rename</p>
                                    {msgKanbanCols.map(c => (
                                      <div key={c.id} className={cn("flex items-center gap-1 px-2 py-1 hover:bg-white/5 transition-colors", c.id === colId && "bg-white/5")}>
                                        {editingMsgLabel === c.id ? (
                                          <input autoFocus defaultValue={c.label}
                                            className={cn("flex-1 rounded-md border px-2 py-1 text-xs bg-transparent focus:outline-none", c.color)}
                                            onClick={e => e.stopPropagation()}
                                            onBlur={e => { const v = e.target.value.trim(); if (v) setMsgKanbanCols(prev => prev.map(col => col.id === c.id ? { ...col, label: v } : col)); setEditingMsgLabel(null) }}
                                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingMsgLabel(null) }}
                                          />
                                        ) : (
                                          <button onClick={e => { e.stopPropagation(); setMsgCardCols(prev => ({ ...prev, [msg.id]: c.id })); setMsgStatusOpen(null) }}
                                            className="flex flex-1 items-center gap-2 py-1 text-left text-xs">
                                            <span className="flex-1">{c.label}</span>
                                            {c.id === colId && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                                          </button>
                                        )}
                                        {editingMsgLabel !== c.id && (
                                          <button onClick={e => { e.stopPropagation(); setEditingMsgLabel(c.id) }}
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
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : ""}</td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...whatsappMessages].sort((a: any, b: any) => {
                      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
                      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
                      return tb - ta
                    }).map((msg: any) => (
                      <div
                        key={msg.id}
                        onClick={() => { setWaReplyTo(msg.from_number); setWaReplyBody(""); setSendingWaReply(false) }}
                        className={cn("w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-emerald-500/30 cursor-pointer", msg.direction === "received" && !msg.read && "border-l-2 border-l-emerald-500")}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[60%]">
                            {msg.direction === "received" ? msg.from_number : `To: ${msg.to_number}`}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-sm truncate">{msg.body || ""}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* WhatsApp Reply */}
                {waReplyTo && (
                  <div className="mt-4 rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground mb-2">Reply to {waReplyTo}</p>
                    <textarea
                      value={waReplyBody}
                      onChange={e => setWaReplyBody(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full rounded-lg border bg-transparent p-2 text-sm resize-none focus:outline-none focus:border-emerald-500/50"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={async () => {
                          if (!user || !waReplyBody.trim() || !waReplyTo) return
                          setSendingWaReply(true)
                          try {
                            const res = await fetch("/api/whatsapp/send", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: user.id, to: waReplyTo, body: waReplyBody }),
                            })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || "Failed to send")
                            const msgs = await getWhatsAppMessages(user.id)
                            setWhatsAppMessages(msgs)
                            setWaReplyTo(null)
                            setWaReplyBody("")
                          } catch (e: any) {
                            toast({ title: "Error", description: e?.message || "Failed to send WhatsApp message", variant: "error" })
                          } finally {
                            setSendingWaReply(false)
                          }
                        }}
                        disabled={sendingWaReply || !waReplyBody.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
                      >
                        {sendingWaReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {sendingWaReply ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}
                </div>
                </div>
                )}
              </div>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === "Calendar" && (
              <div className="flex flex-1 flex-col min-h-0">
                {/* Calendar Toolbar */}
                <div className="flex flex-col gap-2 border-b bg-card/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-base font-bold sm:text-lg">Calendar</h1>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button onClick={() => setCalendarView("kanban")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", calendarView === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Kanban</button>
                      <button onClick={() => setCalendarView("table")} className={cn("px-2 py-1 text-[11px] font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-xs", calendarView === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Table</button>
                    </div>
                    {channels.filter(c => c.type === "calendar").map(ch => (
                      <span key={ch.id} className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-muted/50 px-3 py-1.5 text-xs font-medium">
                        <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                        {ch.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                    <button className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium hover:bg-accent transition-colors sm:px-3">
                      <Filter className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Filter</span>
                    </button>
                    <button
                      onClick={fetchCalendar}
                      disabled={calendarLoading || calendarConnections.length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 sm:px-3"
                    >
                      {calendarLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{calendarLoading ? "Syncing..." : "Sync Calendar"}</span>
                      <span className="sm:hidden">{calendarLoading ? "..." : "Sync"}</span>
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
                        const items = calendarEvents.filter(ev => getColId(ev) === col.id)
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
                                <span title="Click to rename" className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-75", col.color)} onClick={() => setEditingCalCol(col.id)}>{col.label}</span>
                              )}
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{items.length}</span>
                              <button title="Delete column" onClick={() => calKanbanCols.length > 1 && setCalKanbanCols(prev => prev.filter(c => c.id !== col.id))}
                                className="ml-auto p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 pb-4">
                              {items.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-xs text-muted-foreground">Drop events here</p></div>
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
                        <Plus className="h-4 w-4" /> Add Column
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                  <div className="mx-auto max-w-5xl">
                {calendarConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("crmNotConnected")}</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">{t("crmGoToChannels")} →</Link>
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{calendarFetched ? t("crmNoUpcomingEvents") : t("crmSyncCalendar")}</p>
                  </div>
                ) : calendarView === "table" ? (
                  <div className="rounded-xl border overflow-x-auto" onClick={() => setCalStatusOpen(null)}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Event</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date &amp; Time</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-32">Status</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-20">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calendarEvents.map((ev: any) => {
                          const now = new Date(); const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999)
                          const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
                          const natural = (e: any) => { if (!e.start_time) return "upcoming"; const t = new Date(e.start_time); if (t >= now && t <= todayEnd) return "today"; if (t > todayEnd && t <= weekEnd) return "week"; return "upcoming" }
                          const colId = calCardCols[ev.id] || natural(ev)
                          const col = calKanbanCols.find(c => c.id === colId) || calKanbanCols[0]
                          return (
                          <tr key={ev.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium truncate max-w-[200px]">
                              <a href={ev.event_link || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">{ev.summary}</a>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {ev.start_time ? new Date(ev.start_time).toLocaleDateString() : ""} {ev.start_time ? new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[140px]">{ev.location || "—"}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={e => { e.stopPropagation(); setCalStatusOpen(calStatusOpen === ev.id ? null : ev.id) }}
                                  className={cn("w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-1.5 border transition-all hover:brightness-110", col?.color)}
                                >
                                  <span>{col?.label}</span>
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
                            <td className="px-4 py-2.5">
                              {ev.is_online ? <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Online</span> : <span className="text-muted-foreground">In-person</span>}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
                        placeholder="To: recipient@example.com"
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
      {openEmail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpenEmail(null)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{openEmail.subject || "(No subject)"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{openEmail.from_address}</p>
                <p className="text-[10px] text-muted-foreground">
                  {openEmail.received_at ? new Date(openEmail.received_at).toLocaleString() : ""}
                </p>
              </div>
              <button onClick={() => setOpenEmail(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email body */}
            <div className={cn("rounded-lg border border-white/5 bg-white/5 p-4 text-sm text-white/90 mb-4", openEmail.html_body ? "prose prose-invert max-w-none" : "")}>
              {openEmail.html_body ? (
                <div dangerouslySetInnerHTML={{ __html: openEmail.html_body }} />
              ) : (
                <p className="whitespace-pre-wrap">{openEmail.body || "(No content)"}</p>
              )}
            </div>

            {/* Reply section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Reply className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Reply</span>
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
                      const res = await fetch("/api/email/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          providerId,
                          to: openEmail.from_address,
                          subject: `Re: ${openEmail.subject || ""}`,
                          body: replyBody,
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
      )}

      {/* ── PRIVACY MODAL ── */}
      {privacyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPrivacyOpen(false)}>
          <div className="relative mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPrivacyOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Private Data Legal Notice</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">Your customer data is protected under the following applicable laws:</p>
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
                <h4 className="mb-1.5 text-sm font-semibold text-white">Your rights (GDPR Art. 17 & 20 / LFPDPPP Art. 22-26):</h4>
                <ul className="space-y-1">
                  {["Full ownership of your data", "Export your data at any time", "Request permanent deletion within 30 days of cancellation"].map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">Platform obligations:</h4>
                <ul className="space-y-1">
                  {["We act exclusively as Data Processor", "You remain the Data Controller", "Your data never trains public AI models"].map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">Source transparency:</h4>
                <ul className="space-y-1">
                  {["Every response cites internal vs external sources", "External web research includes citations", "Minimum hallucinated data — you verify before use"].map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">Limitation of liability:</h4>
                <ul className="space-y-1">
                  {["We are not liable for decisions you make based on AI-generated outputs", "We are not liable for third-party platform interruptions"].map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-600/5 p-4">
              <p className="text-sm text-emerald-400">By continuing to use this CRM dashboard, you confirm acceptance of these legal terms.</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <Link href="/privacy" className="underline hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              <span className="text-white/20">|</span>
              <Link href="/terms" className="underline hover:text-emerald-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTACTS PICKER MODAL ── */}
      {contactsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setContactsModalOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e2330] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setContactsModalOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-1 text-lg font-bold text-white">Contacts</h2>
            <p className="mb-4 text-xs text-muted-foreground">{filtered.length} total · {filtered.filter((c: Contact) => c.tags.includes("whatsapp")).length} WhatsApp · {filtered.filter((c: Contact) => c.email).length} Email</p>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <User className="mb-2 h-6 w-6 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No contacts yet. Send an email and replies will auto-import contacts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.map((c: Contact) => (
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
                          <span className="text-[10px] text-muted-foreground">{c.company || "No contact info"}</span>
                        )}
                      </div>
                    </div>
                    {c.tags.includes("whatsapp") && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">WA</span>}
                    {c.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                  { icon: Mail, label: "Email", value: c.email },
                  { icon: Phone, label: "Phone", value: c.phone },
                  { icon: Building2, label: "Company", value: c.company },
                  { icon: MapPin, label: "Location", value: c.location },
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
                  <h3 className="mb-2 text-sm font-semibold">Deal Info</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stage: <span className="text-white">{c.dealStage || "—"}</span></span>
                    <span className="text-muted-foreground">Value: <span className="text-emerald-400 font-semibold">${c.dealValue.toLocaleString()}</span></span>
                  </div>
                </div>
              )}

              {/* Email thread */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Email Thread ({contactEmails.length})</h3>
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
                      View in Email Tab
                    </button>
                  )}
                </div>
                {contactEmails.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-6 text-center">
                    <Mail className="mx-auto mb-2 h-5 w-5 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">No email thread with this contact</p>
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
                            <p className="truncate text-xs font-semibold">{m.subject || "(No subject)"}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {m.received_at ? new Date(m.received_at).toLocaleDateString() : m.sent_at ? new Date(m.sent_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">{m.body?.slice(0, 100) || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
                {contactActivities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent activity.</p>
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
                    Send Email
                  </button>
                )}
                <button
                  onClick={() => { setSelectedId(c.id); setContactModalId(null); setActiveTab("Overview") }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Open Full Profile
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

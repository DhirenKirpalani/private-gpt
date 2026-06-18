"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Search, Plus, Phone, Mail, MapPin, Building2,
  Filter, CircleDollarSign, ChevronDown, X,
  ClipboardList, FileText, Send, Inbox,
  Star, StarOff, Shield, User, Loader2, Reply,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { getProfile, getEmailConnections, getEmailMessages, getContacts, importContactsFromEmails, markEmailAsRead, getCalendarConnections, getCalendarEvents, getWhatsAppConnections, getWhatsAppMessages } from "@/lib/supabase"

/* ─── real data ─── */
const stages = [
  { name: "Discovery", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { name: "Proposal", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { name: "Negotiation", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { name: "Closed Won", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
]

const tabs = ["Overview", "Deals", "Activity", "Notes", "Inbox", "Calendar"]


const baseChannels = [
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-600" },
  { id: "email",    label: "Email",    color: "bg-blue-600" },
  { id: "sms",      label: "SMS",      color: "bg-purple-600" },
  { id: "call",     label: "Call",     color: "bg-orange-600" },
]

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

type Contact = { id: string; name: string; company: string | null; role: string | null; email: string | null; phone: string | null; location: string | null; tags: string[]; starred: boolean; lastContact: string; dealValue: number; dealStage: string | null }

export default function CRMPage() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("Overview")
  const [search, setSearch] = useState("")
  const [activeNav, setActiveNav] = useState("Contacts")
  const [activeChannel, setActiveChannel] = useState("email")
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

  // Build channels array with real connection status
  const channels = baseChannels.map((ch: any) => ({
    ...ch,
    connected: ch.id === "email"
      ? emailConnections.some((conn: any) => conn.status === "connected")
      : ch.id === "whatsapp"
        ? whatsappConnections.length > 0
        : false,
  }))

  const contact = contacts.find((c: Contact) => c.id === selectedId)
  const activeCh = channels.find((c: any) => c.id === activeChannel) || channels[0]

  // Unread email count (received emails with read=false)
  const unreadCount = inboxMessages.filter((m: any) => !m.read).length

  // Upcoming calendar events count (events with start_time in the future)
  const upcomingEventsCount = calendarEvents.filter((e: any) => e.start_time && new Date(e.start_time) > new Date()).length

  const filtered = contacts.filter((c: Contact) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  )

  // Dynamic nav counts
  const crmNav = [
    { label: "Contacts", count: contacts.length },
    { label: "Companies", count: new Set(contacts.map((c: Contact) => c.company).filter(Boolean)).size },
    { label: "Deals", count: contacts.filter((c: Contact) => (c.dealValue || 0) > 0).length },
    { label: "Tasks", count: 0 },
    { label: "Tickets", count: 0 },
  ]

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

      // Load real email data
      try {
        const conns = await getEmailConnections(user.id)
        setEmailConnections(conns)
        const msgs = await getEmailMessages(user.id)
        setEmailMessages(msgs)
        // Load inbox from DB on mount (persistent)
        const received = msgs.filter((m: any) => m.direction === "received")
        setInboxMessages(received)
        if (received.length > 0) setInboxFetched(true)
      } catch { /* ignore */ }

      // Load calendar data
      try {
        const calConns = await getCalendarConnections(user.id)
        setCalendarConnections(calConns)
        if (calConns.length > 0) {
          const events = await getCalendarEvents(user.id)
          setCalendarEvents(events)
          if (events.length > 0) setCalendarFetched(true)
        }
      } catch { /* ignore */ }

      // Load WhatsApp data
      try {
        const waConns = await getWhatsAppConnections(user.id)
        setWhatsAppConnections(waConns)
        if (waConns.length > 0) {
          const waMsgs = await getWhatsAppMessages(user.id)
          setWhatsAppMessages(waMsgs)
          if (waMsgs.length > 0) setWhatsAppFetched(true)
        }
      } catch { /* ignore */ }

      // Load contacts
      try {
        console.log("[DEBUG] Loading contacts for user:", user.id)
        const contactList = await getContacts(user.id)
        console.log("[DEBUG] Loaded contacts:", contactList.length)
        setContacts(contactList.map((c: any) => ({
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
      } catch (e) {
        console.error("[DEBUG] Failed to load contacts:", e)
      }
      setChannelsLoading(false)
    }
    load()
  }, [user])

  // Poll for new emails every 60 seconds
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      fetchInbox()
    }, 60000)
    return () => clearInterval(interval)
  }, [user, emailConnections])

  // Fetch inbox emails + auto-import contacts
  const fetchInbox = async (pageToken?: string) => {
    console.log("[DEBUG] fetchInbox called", { pageToken })
    if (!user) { console.log("[DEBUG] No user, returning"); return }
    const conn = emailConnections.find((c: any) => c.status === "connected")
    if (!conn) { console.log("[DEBUG] No connected email, returning"); return }

    const isLoadMore = !!pageToken
    if (isLoadMore) setLoadingMore(true)
    else setInboxLoading(true)

    try {
      const res = await fetch("/api/email/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, providerId: conn.provider, pageToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("[DEBUG] Fetch failed:", data.error)
        return
      }
      // Store next page token
      setNextPageToken(data.nextPageToken || null)
      // Reload from DB
      const msgs = await getEmailMessages(user.id)
      setEmailMessages(msgs)
      setInboxMessages(msgs.filter((m: any) => m.direction === "received"))
      setInboxFetched(true)

      // Auto-import contacts
      const imported = await importContactsFromEmails(user.id)
      if (imported > 0) {
        const contactList = await getContacts(user.id)
        setContacts(contactList.map((c: any) => ({
          id: c.id, name: c.name, company: c.company || "", role: c.role || "",
          email: c.email || "", phone: c.phone || "", location: c.location || "",
          tags: c.tags || [], starred: c.starred,
          lastContact: c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "",
          dealValue: c.deal_value || 0, dealStage: c.deal_stage || "",
        })))
      }
    } catch (e) {
      console.error("[INBOX FETCH]", e)
    } finally {
      if (isLoadMore) setLoadingMore(false)
      else setInboxLoading(false)
    }
  }

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
    const conn = emailConnections.find((c: any) => c.status === "connected")
    if (!conn) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          providerId: conn.provider,
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
      alert(e?.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* ── HEADER ── */}
      <header className="flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-hidden border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 overflow-visible">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={70}
              priority
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
              placeholder="Search contacts, deals, companies..."
            />
          </div>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2 md:gap-3 md:flex-none">
          <button
            onClick={() => setPrivacyOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Privacy Notice"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </button>
          <Link href="/profile" className="relative flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[10px] md:text-xs font-bold text-white hover:bg-emerald-500 transition-colors overflow-hidden">
            <span className={avatarUrl ? "hidden" : ""}>{getInitials(userName) || <User className="h-4 w-4 text-white" />}</span>
            {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />}
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        <NavRail />

        {/* ── CRM OBJECT NAV + CONTACTS ── */}
        <aside className="flex w-80 shrink-0 flex-col border-r bg-card/30">
          {/* Object nav */}
          <div className="p-3 pb-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">CRM</h2>
              {/* Channel selector */}
              <div className="relative">
                <button
                  onClick={() => setShowChannelMenu(v => !v)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-medium hover:bg-white/5 transition-colors"
                >
                  <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                  <span className={activeCh.connected ? "text-emerald-400" : "text-muted-foreground"}>{activeCh.label}</span>
                  <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
                {showChannelMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                      <div className="border-b border-white/5 px-3 py-2">
                        <p className="text-xs font-semibold text-white">Channels</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Select a channel to view messages</p>
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
                              {ch.connected ? "Connected" : ch.id === "email" ? "Connect" : "Soon"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-0.5">
              {crmNav.map(item => (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    activeNav === item.label ? "bg-emerald-600/10 text-emerald-400 font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-3 my-2 h-px bg-border" />

          {/* Contact list */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-muted/50 py-2 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder={`Search ${activeNav.toLowerCase()}...`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 px-2 pb-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <User className="h-6 w-6 mb-2 opacity-30" />
                <p className="text-xs">No contacts</p>
                {emailConnections.some((c: any) => c.status === "connected") ? (
                  <p className="text-[10px] mt-0.5">Go to Inbox tab → Fetch Emails</p>
                ) : (
                  <p className="text-[10px] mt-0.5">Connect email to auto-import</p>
                )}
              </div>
            ) : (
              filtered.map((c: Contact) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                    selectedId === c.id ? "bg-emerald-600/10" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    selectedId === c.id ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                  )}>
                    {c.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {c.starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{c.company}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-muted-foreground">{c.lastContact}</div>
                    {c.dealValue > 0 && (
                      <div className="text-[10px] font-medium text-emerald-400">${(c.dealValue / 1000).toFixed(0)}k</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">

          {/* Contact header - only for non-Inbox tabs when contact exists */}
          {contact && activeTab !== "Inbox" && (
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
                        <p className="text-xs font-semibold text-white">Channels</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Select a channel to view messages</p>
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
                              {ch.connected ? "Connected" : ch.id === "email" ? "Connect" : "Soon"}
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
                  if (activeChannel === "email" && contact?.email) {
                    setComposeTo(contact.email)
                  }
                  setComposerOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> Send
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
                  {activeCh.label}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showChannelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/10 bg-[#1e2533] shadow-2xl overflow-hidden">
                    <div className="border-b border-white/5 px-3 py-2">
                      <p className="text-xs font-semibold text-white">Channels</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Select a channel to view messages</p>
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
                            {ch.connected ? "Connected" : ch.id === "email" ? "Connect" : "Soon"}
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
                if (activeChannel === "email" && contact?.email) {
                  setComposeTo(contact.email)
                }
                setComposerOpen(true)
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
          </>
        )}

        {/* Tabs */}
          <div className="flex border-b px-4 md:px-6">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeTab === tab ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {tab === "Inbox" && unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {tab === "Calendar" && upcomingEventsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                    {upcomingEventsCount > 99 ? "99+" : upcomingEventsCount}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">

            {/* Empty state for non-Inbox tabs when no contact selected */}
            {activeTab !== "Inbox" && !contact && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Select a contact to view details</p>
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {activeTab === "Overview" && contact && (
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
                  <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
                  <div className="space-y-3">
                    {activities.filter(a => a.contact === contact.name).slice(0, 4).map(a => (
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
                    {activities.filter(a => a.contact === contact.name).length === 0 && (
                      <p className="text-xs text-muted-foreground">No recent activity.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── DEALS ── */}
            {activeTab === "Deals" && contact && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Pipeline</h3>
                  <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                    <Filter className="h-3.5 w-3.5" /> Filter
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stages.map(stage => {
                    const stageContacts = contacts.filter(c => c.dealStage === stage.name && c.dealValue > 0)
                    return (
                      <div key={stage.name} className="rounded-xl border bg-card/50 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", stage.color)}>
                            {stage.name}
                          </span>
                          <span className="text-xs font-semibold">
                            ${stageContacts.reduce((sum, c) => sum + c.dealValue, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {stageContacts.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedId(c.id); setActiveTab("Overview") }}
                              className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left hover:border-emerald-500/30 transition-colors"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                {c.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-medium">{c.name}</div>
                                <div className="text-[10px] text-emerald-400 font-medium">${c.dealValue.toLocaleString()}</div>
                              </div>
                            </button>
                          ))}
                          {stageContacts.length === 0 && (
                            <div className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
                              No deals
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {activeTab === "Activity" && contact && (
              <div className="mx-auto max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Activity Timeline</h3>
                  <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Log Activity
                  </button>
                </div>
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {activities.map(a => (
                    <div key={a.id} className="relative">
                      <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                        {a.type === "email" && <Mail className="h-2.5 w-2.5 text-emerald-400" />}
                        {a.type === "call" && <Phone className="h-2.5 w-2.5 text-blue-400" />}
                        {a.type === "note" && <FileText className="h-2.5 w-2.5 text-amber-400" />}
                        {a.type === "deal" && <CircleDollarSign className="h-2.5 w-2.5 text-purple-400" />}
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{a.contact}</span>
                          <span className="text-[10px] text-muted-foreground">{a.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── NOTES ── */}
            {activeTab === "Notes" && contact && (
              <div className="mx-auto max-w-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Note
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                  <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs mt-1 text-muted-foreground">Add notes about this contact</p>
                </div>
              </div>
            )}

            {/* ── INBOX ── */}
            {activeTab === "Inbox" && (
              <div className="mx-auto max-w-3xl">
                {activeChannel === "email" ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Email Inbox</h3>
                      <button
                        onClick={() => fetchInbox()}
                        disabled={inboxLoading || !emailConnections.some((c: any) => c.status === "connected")}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
                      >
                        {inboxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
                        {inboxLoading ? "Fetching..." : "Fetch Emails"}
                      </button>
                    </div>

                    {!emailConnections.some((c: any) => c.status === "connected") ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                        <Mail className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No email account connected</p>
                        <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">
                          Go to Channels to connect →
                        </Link>
                      </div>
                    ) : inboxMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                        <Inbox className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {inboxFetched ? "No emails found" : "Click Fetch Emails to load your inbox"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...inboxMessages].sort((a: any, b: any) => {
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
                              {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
                              {loadingMore ? "Loading..." : "Load More"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : activeChannel === "whatsapp" ? (
                  /* WhatsApp messages */
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">WhatsApp Messages</h3>
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
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
                      >
                        {whatsappLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
                        {whatsappLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>

                    {whatsappConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                        <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No WhatsApp account connected</p>
                        <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">
                          Go to Channels to connect →
                        </Link>
                      </div>
                    ) : whatsappMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                        <Phone className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {whatsappFetched ? "No messages yet" : "Click Refresh to load messages"}
                        </p>
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
                                alert(e?.message || "Failed to send WhatsApp message")
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
                  </>
                ) : (
                  /* SMS / Call — Coming soon */
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <span className={cn("mb-2 h-6 w-6 rounded-full", activeCh.color)} />
                    <p className="text-sm font-semibold">{activeCh.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                  </div>
                )}
              </div>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === "Calendar" && (
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Upcoming Events</h3>
                  <button
                    onClick={fetchCalendar}
                    disabled={calendarLoading || calendarConnections.length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  >
                    {calendarLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                    {calendarLoading ? "Syncing..." : "Sync Calendar"}
                  </button>
                </div>

                {calendarConnections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No calendar connected</p>
                    <Link href="/channels" className="mt-2 text-xs text-emerald-400 hover:underline">
                      Go to Channels to connect →
                    </Link>
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 py-12 text-center">
                    <ClipboardList className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {calendarFetched ? "No upcoming events" : "Click Sync Calendar to load events"}
                    </p>
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

                  {activeChannel === "email" ? (
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
                          <Send className="h-3.5 w-3.5" /> Send {activeCh.label}
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
                    const conn = emailConnections.find((c: any) => c.status === "connected")
                    if (!conn) return
                    setSendingReply(true)
                    try {
                      const res = await fetch("/api/email/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          providerId: conn.provider,
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
                      alert(e?.message || "Failed to send reply")
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
          </div>
        </div>
      )}
    </div>
  )
}

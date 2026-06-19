"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Check, X, MessageSquare, User, Globe, Mail, Eye, EyeOff, Loader2, AlertCircle, ExternalLink } from "lucide-react"
import { FaWhatsapp, FaTelegram, FaSlack, FaInstagram, FaFacebookMessenger, FaSms, FaMicrosoft } from "react-icons/fa"
import { SiGmail, SiIcloud, SiGooglecalendar, SiZoho } from "react-icons/si"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { getProfile, getEmailConnections, saveEmailConnection, deleteEmailConnection, type EmailConnection, getCalendarConnections, deleteCalendarConnection, getWhatsAppConnections, saveWhatsAppConnection, deleteWhatsAppConnection } from "@/lib/supabase"

type SmtpDefaults = { smtp_host: string; smtp_port: number; imap_host: string; imap_port: number; smtp_secure?: boolean }
type EmailProvider = { id: string; name: string; icon: React.ReactNode; defaults: SmtpDefaults; note: string; noteLink?: string; descKey: string; isOAuth?: boolean }

const EMAIL_PROVIDERS: EmailProvider[] = [
  { id: "gmail", name: "Gmail / Google Workspace", icon: <SiGmail className="h-6 w-6" style={{ color: "#EA4335" }} />, defaults: { smtp_host: "smtp.gmail.com", smtp_port: 587, imap_host: "imap.gmail.com", imap_port: 993 }, note: "One-click sign in with your Google account.", descKey: "channelDescGmail", isOAuth: true },
  { id: "outlook", name: "Microsoft 365 / Outlook", icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#0078D4" }} />, defaults: { smtp_host: "smtp.office365.com", smtp_port: 587, imap_host: "outlook.office365.com", imap_port: 993 }, note: "One-click sign in with your Microsoft account.", descKey: "channelDescOutlook", isOAuth: true },
  { id: "zoho", name: "Zoho Mail", icon: <SiZoho className="h-6 w-6" style={{ color: "#E42527" }} />, defaults: { smtp_host: "smtp.zoho.com", smtp_port: 587, imap_host: "imap.zoho.com", imap_port: 993 }, note: "Generate an App Password in Zoho Mail → Settings → Security.", noteLink: "https://accounts.zoho.com/home", descKey: "channelDescZoho" },
  { id: "icloud", name: "iCloud Mail", icon: <SiIcloud className="h-6 w-6" style={{ color: "#3693F3" }} />, defaults: { smtp_host: "smtp.mail.me.com", smtp_port: 587, imap_host: "imap.mail.me.com", imap_port: 993 }, note: "Apple requires an App-Specific Password — your regular Apple ID password won't work.", noteLink: "https://appleid.apple.com/account/manage", descKey: "channelDescIcloud" },
  { id: "hostinger", name: "Hostinger Email", icon: <Globe className="h-6 w-6" style={{ color: "#673DE6" }} />, defaults: { smtp_host: "smtp.hostinger.com", smtp_port: 587, imap_host: "imap.hostinger.com", imap_port: 993 }, note: "Use your Hostinger email address and the password from Hostinger hPanel.", descKey: "channelDescHostinger" },
  { id: "godaddy", name: "GoDaddy Email", icon: <Mail className="h-6 w-6" style={{ color: "#1BDBDB" }} />, defaults: { smtp_host: "smtpout.secureserver.net", smtp_port: 465, imap_host: "imap.secureserver.net", imap_port: 993, smtp_secure: true }, note: "Use your GoDaddy Workspace Email address and password.", descKey: "channelDescGodaddy" },
]

const MESSAGING_CHANNELS = [
  { id: "whatsapp", name: "WhatsApp Business", icon: <FaWhatsapp className="h-6 w-6" style={{ color: "#25D366" }} />, descKey: "channelDescWhatsapp", connectable: true },
  { id: "telegram", name: "Telegram", icon: <FaTelegram className="h-6 w-6" style={{ color: "#26A5E4" }} />, descKey: "channelDescTelegram", connectable: false },
  { id: "webchat", name: "Website Chat", icon: <MessageSquare className="h-5 w-5 text-emerald-400" />, descKey: "channelDescWebchat", connectable: false },
  { id: "slack", name: "Slack", icon: <FaSlack className="h-6 w-6" style={{ color: "#4A154B" }} />, descKey: "channelDescSlack", connectable: false },
  { id: "teams", name: "Microsoft Teams", icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#6264A7" }} />, descKey: "channelDescTeams", connectable: false },
  { id: "instagram", name: "Instagram DM", icon: <FaInstagram className="h-6 w-6" style={{ color: "#E4405F" }} />, descKey: "channelDescInstagram", connectable: false },
  { id: "messenger", name: "Facebook Messenger", icon: <FaFacebookMessenger className="h-6 w-6" style={{ color: "#0084FF" }} />, descKey: "channelDescMessenger", connectable: false },
  { id: "sms", name: "SMS / Text Messages", icon: <FaSms className="h-6 w-6" style={{ color: "#34C759" }} />, descKey: "channelDescSms", connectable: false },
]

const CALENDAR_CHANNELS = [
  { id: "googlecalendar", name: "Google Calendar", icon: <SiGooglecalendar className="h-6 w-6" style={{ color: "#4285F4" }} />, descKey: "channelDescGoogleCalendar", connectable: true },
]

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

type SmtpForm = { email_address: string; smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string; imap_host: string; imap_port: string; smtp_secure: boolean }

function ChannelsPageContent() {
  const { user, avatarUrl, loading: authLoading } = useAuth()
  const { t, lang, setLang } = useI18n()
  const searchParams = useSearchParams()
  const [userInitials, setUserInitials] = useState("")
  const [emailConnections, setEmailConnections] = useState<Record<string, EmailConnection>>({})
  const [calendarConnections, setCalendarConnections] = useState<Record<string, any>>({})
  const [whatsappConnections, setWhatsAppConnections] = useState<Record<string, any>>({})
  const [modalProvider, setModalProvider] = useState<EmailProvider | null>(null)
  const [smtpForm, setSmtpForm] = useState<SmtpForm>({ email_address: "", smtp_host: "", smtp_port: "", smtp_user: "", smtp_pass: "", imap_host: "", imap_port: "", smtp_secure: true })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [testing, setTesting] = useState(false)
  const [oauthMsg, setOauthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Compose email modal
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeProvider, setComposeProvider] = useState<EmailProvider | null>(null)
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "" })
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sent, setSent] = useState(false)

  // Inbox view
  const [inboxProvider, setInboxProvider] = useState<EmailProvider | null>(null)
  const [inboxMessages, setInboxMessages] = useState<any[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)

  // WhatsApp connect modal
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [waForm, setWaForm] = useState({ phoneNumberId: "", accessToken: "", phoneNumber: "" })
  const [waSaving, setWaSaving] = useState(false)
  const [waConnecting, setWaConnecting] = useState(false)

  const loadConnections = useCallback(async () => {
    if (!user) return
    try {
      const conns = await getEmailConnections(user.id)
      const map: Record<string, EmailConnection> = {}
      conns.forEach(c => { map[c.provider] = c })
      setEmailConnections(map)
    } catch { /* ignore */ }
    try {
      const calConns = await getCalendarConnections(user.id)
      const calMap: Record<string, any> = {}
      calConns.forEach(c => { calMap[c.provider] = c })
      setCalendarConnections(calMap)
    } catch { /* ignore */ }
    try {
      const waConns = await getWhatsAppConnections(user.id)
      const waMap: Record<string, any> = {}
      waConns.forEach(c => { waMap[c.phone_number_id] = c })
      setWhatsAppConnections(waMap)
    } catch { /* ignore */ }
  }, [user])

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
      } catch {
        setUserInitials(getInitials(user.user_metadata?.full_name || ""))
      }
    }
    load()
    loadConnections()
  }, [user, loadConnections])

  // Load Meta FB SDK for WhatsApp Embedded Signup
  useEffect(() => {
    if (typeof window === "undefined") return
    if ((window as any).FB) return
    let cancelled = false
    async function init() {
      try {
        const config = await fetch("/api/meta/config").then(r => r.json())
        if (cancelled) return
        if (!config.appId) return
        const script = document.createElement("script")
        script.id = "facebook-jssdk"
        script.src = "https://connect.facebook.net/en_US/sdk.js"
        script.crossOrigin = "anonymous"
        script.async = true
        script.defer = true
        document.body.appendChild(script)
        script.onload = () => {
          const FB = (window as any).FB
          if (FB) {
            FB.init({
              appId: config.appId,
              autoLogAppEvents: true,
              xfbml: true,
              version: "v18.0",
            })
          }
        }
      } catch { /* ignore */ }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Handle OAuth callback query params (non-WhatsApp)
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    const email = searchParams.get("email")
    const calendar = searchParams.get("calendar")
    if (success === "connected" || calendar === "connected") {
      setOauthMsg({ type: "success", text: `Connected ${email ? email + " " : ""}successfully` })
      loadConnections()
      window.history.replaceState({}, "", window.location.pathname)
    } else if (error) {
      setOauthMsg({ type: "error", text: error })
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [searchParams, loadConnections])

  const openModal = (provider: EmailProvider) => {
    const existing = emailConnections[provider.id]
    setSmtpForm({
      email_address: existing?.email_address || "",
      smtp_host: existing?.smtp_host || provider.defaults.smtp_host,
      smtp_port: String(existing?.smtp_port || provider.defaults.smtp_port),
      smtp_user: existing?.smtp_user || existing?.email_address || "",
      smtp_pass: "",
      imap_host: existing?.imap_host || provider.defaults.imap_host,
      imap_port: String(existing?.imap_port || provider.defaults.imap_port),
      smtp_secure: existing?.smtp_secure ?? (provider.defaults.smtp_secure ?? true),
    })
    setSaveError("")
    setShowPass(false)
    setModalProvider(provider)
  }

  const handleSave = async () => {
    if (!user || !modalProvider) return
    console.log(`[CHANNELS SAVE] Starting save for provider=${modalProvider.id}`)
    if (!smtpForm.email_address || !smtpForm.smtp_pass) { setSaveError("Email address and password are required."); return }
    setSaving(true); setSaveError("")
    try {
      // 1. Save connection first
      const connPayload = {
        user_id: user.id,
        provider: modalProvider.id,
        email_address: smtpForm.email_address,
        smtp_host: smtpForm.smtp_host,
        smtp_port: parseInt(smtpForm.smtp_port),
        smtp_secure: smtpForm.smtp_secure,
        smtp_user: smtpForm.smtp_user || smtpForm.email_address,
        smtp_pass: smtpForm.smtp_pass,
        imap_host: smtpForm.imap_host,
        imap_port: parseInt(smtpForm.imap_port),
        status: "pending",
      }
      console.log(`[CHANNELS SAVE] Saving connection:`, { provider: connPayload.provider, email: connPayload.email_address, smtp_host: connPayload.smtp_host, imap_host: connPayload.imap_host })
      await saveEmailConnection(connPayload)
      console.log(`[CHANNELS SAVE] Connection saved to DB`)

      // 2. Test SMTP connection
      setTesting(true)
      console.log(`[CHANNELS SAVE] Calling /api/email/test for provider=${modalProvider.id}`)
      const testRes = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, providerId: modalProvider.id }),
      })
      setTesting(false)
      console.log(`[CHANNELS SAVE] Test response status=${testRes.status} ok=${testRes.ok}`)

      if (!testRes.ok) {
        const testData = await testRes.json()
        console.error(`[CHANNELS SAVE] Test failed:`, testData.error)
        setSaveError(testData.error || "SMTP verification failed. Please check your credentials.")
        setSaving(false)
        return
      }

      console.log(`[CHANNELS SAVE] Test passed, reloading connections`)
      await loadConnections()
      setModalProvider(null)
      console.log(`[CHANNELS SAVE] SUCCESS for provider=${modalProvider.id}`)
    } catch (e: any) {
      console.error(`[CHANNELS SAVE] Error:`, e?.message)
      setSaveError(e?.message || "Failed to save. Please try again.")
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    if (!user) return
    console.log(`[CHANNELS DISCONNECT] Disconnecting provider=${providerId}`)
    try {
      await deleteEmailConnection(user.id, providerId)
      console.log(`[CHANNELS DISCONNECT] Deleted from DB`)
      setEmailConnections(prev => { const next = { ...prev }; delete next[providerId]; return next })
      console.log(`[CHANNELS DISCONNECT] Updated local state`)
    } catch (e: any) {
      console.error(`[CHANNELS DISCONNECT] Error:`, e?.message)
    }
  }

  const handleDisconnectCalendar = async (providerId: string) => {
    if (!user) return
    try {
      const conn = calendarConnections[providerId]
      if (conn) {
        await deleteCalendarConnection(user.id, conn.id)
        setCalendarConnections(prev => { const next = { ...prev }; delete next[providerId]; return next })
      }
    } catch { /* ignore */ }
  }

  const handleConnectWhatsApp = async (phoneNumberId: string, accessToken: string, phoneNumber?: string) => {
    if (!user) return
    try {
      await saveWhatsAppConnection(user.id, phoneNumberId, accessToken, phoneNumber)
      const waConns = await getWhatsAppConnections(user.id)
      const waMap: Record<string, any> = {}
      waConns.forEach(c => { waMap[c.phone_number_id] = c })
      setWhatsAppConnections(waMap)
    } catch (e: any) {
      alert(e?.message || "Failed to connect WhatsApp")
    }
  }

  const handleWhatsAppEmbeddedSignup = async () => {
    if (!user) return
    const FB = (window as any).FB
    if (!FB) {
      setOauthMsg({ type: "error", text: "Meta SDK not loaded yet. Please try again in a moment." })
      return
    }
    setWaConnecting(true)
    FB.login(
      async (response: any) => {
        if (response.authResponse) {
          const shortToken = response.authResponse.accessToken
          try {
            const res = await fetch("/api/whatsapp/embedded-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, token: shortToken }),
            })
            const data = await res.json()
            if (!res.ok) {
              setOauthMsg({ type: "error", text: data.error || "WhatsApp setup failed" })
            } else {
              setOauthMsg({ type: "success", text: `WhatsApp connected: ${data.phoneNumber || ""}` })
              loadConnections()
            }
          } catch (e: any) {
            setOauthMsg({ type: "error", text: e?.message || "Connection failed" })
          }
        } else {
          setOauthMsg({ type: "error", text: "WhatsApp authorization cancelled or failed" })
        }
        setWaConnecting(false)
      },
      {
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
      }
    )
  }

  const handleDisconnectWhatsApp = async (phoneNumberId: string) => {
    if (!user) return
    try {
      const conn = whatsappConnections[phoneNumberId]
      if (conn) {
        await deleteWhatsAppConnection(user.id, conn.id)
        setWhatsAppConnections(prev => { const next = { ...prev }; delete next[phoneNumberId]; return next })
      }
    } catch { /* ignore */ }
  }

  const openCompose = (provider: EmailProvider) => {
    setComposeProvider(provider)
    setComposeForm({ to: "", subject: "", body: "" })
    setSendError("")
    setSent(false)
    setComposeOpen(true)
  }

  const handleSendEmail = async () => {
    if (!user || !composeProvider) return
    if (!composeForm.to || !composeForm.subject) {
      setSendError("Recipient and subject are required.")
      return
    }
    console.log(`[CHANNELS SEND] Sending email via provider=${composeProvider.id} to=${composeForm.to}`)
    setSending(true)
    setSendError("")
    setSent(false)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          providerId: composeProvider.id,
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      })
      const data = await res.json()
      console.log(`[CHANNELS SEND] Response status=${res.status} ok=${res.ok}`, data)
      if (!res.ok) throw new Error(data.error || "Failed to send")
      setSent(true)
      setComposeForm({ to: "", subject: "", body: "" })
      console.log(`[CHANNELS SEND] SUCCESS`)
    } catch (e: any) {
      console.error(`[CHANNELS SEND] Error:`, e?.message)
      setSendError(e?.message || "Failed to send email.")
    } finally {
      setSending(false)
    }
  }

  const openInbox = async (provider: EmailProvider) => {
    console.log(`[CHANNELS INBOX] Opening inbox for provider=${provider.id}`)
    setInboxProvider(provider)
    setInboxLoading(true)
    try {
      const { data } = await fetch(`/api/email/messages?userId=${user?.id}&provider=${provider.id}`).then(r => r.json())
      console.log(`[CHANNELS INBOX] Loaded ${data?.messages?.length || 0} messages from DB`)
      setInboxMessages(data?.messages || [])
    } catch (e: any) {
      console.error(`[CHANNELS INBOX] Error loading from DB:`, e?.message)
    }
    setInboxLoading(false)
  }

  const handleFetchEmails = async (provider: EmailProvider) => {
    if (!user) return
    console.log(`[CHANNELS FETCH] Fetching emails for provider=${provider.id}`)
    setInboxLoading(true)
    try {
      const res = await fetch("/api/email/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, providerId: provider.id }),
      })
      const data = await res.json()
      console.log(`[CHANNELS FETCH] Response status=${res.status} fetched=${data.fetched || 0}`)
      if (!res.ok) {
        console.error(`[CHANNELS FETCH] API error:`, data.error)
        throw new Error(data.error || "Fetch failed")
      }
      if (data.messages) {
        console.log(`[CHANNELS FETCH] Setting ${data.messages.length} messages into inbox`)
        setInboxMessages(prev => [...data.messages, ...prev])
      }
    } catch (e: any) {
      console.error(`[CHANNELS FETCH] Error:`, e?.message)
    } finally {
      setInboxLoading(false)
    }
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* Header */}
      <header className="flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-hidden border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <Link href="/" className="flex shrink-0 items-center overflow-hidden">
          <img src="/assets/images/exploro-logo.png" alt="Exploro" className="w-auto object-contain" style={{ height: "40px" }} />
        </Link>
        <div className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder={t("channelsSearchPlaceholder")} />
          </div>
        </div>
        <div className="flex flex-1 justify-end items-center gap-2 md:gap-3 md:flex-none">
          <div className="hidden items-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:inline-flex">
            {(["en", "es"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition-all", lang === l ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-white")}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/profile" className={cn("relative flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full text-[10px] md:text-xs font-bold text-white transition-colors overflow-hidden", authLoading || avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600 hover:bg-emerald-500")}>
            {!authLoading && !avatarUrl && (userInitials || <User className="h-4 w-4 text-white" />)}
            {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />}
          </Link>
        </div>
      </header>

      {/* OAuth callback toast */}
      {oauthMsg && (
        <div className={cn("fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all", oauthMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
          {oauthMsg.text}
          <button onClick={() => setOauthMsg(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="inline h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-2xl space-y-10">

            {/* Email providers */}
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">{t("channelsTitle")}</h1>
                <p className="mt-1 text-muted-foreground">{t("channelsSubtitle")}</p>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Emails</span>
              </div>
              <div className="space-y-3">
                {EMAIL_PROVIDERS.map(provider => {
                  const conn = emailConnections[provider.id]
                  const connected = !!conn
                  const hasError = connected && conn.status === "error"
                  return (
                    <div key={provider.id} className={cn("card-3d flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5", connected ? (hasError ? "border-red-500/30 bg-[#2a3444]" : "border-emerald-500/30 bg-[#2a3444]") : "border-white/5 bg-[#2a3444]")}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center">{provider.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{provider.name}</p>
                          {connected && !hasError && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <Check className="h-3 w-3" /> {t("channelsConnected")}
                            </span>
                          )}
                          {hasError && (
                            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400" title={conn.last_error || ""}>
                              <AlertCircle className="h-3 w-3" /> Error
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t(provider.descKey as any)}</p>
                        {connected && conn.email_address && (
                          <p className={cn("mt-0.5 text-xs", hasError ? "text-red-400/80" : "text-emerald-400/80")}>{conn.email_address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {provider.isOAuth && !connected && (
                          <button
                            onClick={() => {
                              if (!user) return
                              window.location.href = `/api/email/oauth/${provider.id}/connect?userId=${user.id}`
                            }}
                            className="rounded-lg px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            Sign In
                          </button>
                        )}
                        {(!provider.isOAuth || connected) && (
                          <button
                            onClick={() => connected ? handleDisconnect(provider.id) : openModal(provider)}
                            className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition-colors", connected ? "border border-red-500/30 text-red-400 hover:bg-red-500/10" : "bg-emerald-600 text-white hover:bg-emerald-700")}
                          >
                            {connected ? t("channelsDisconnect") : t("channelsConnect")}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Messages */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Messages</span>
              </div>
              <div className="space-y-3">
                {MESSAGING_CHANNELS.map(ch => {
                  const isWhatsApp = ch.id === "whatsapp"
                  const waConnected = isWhatsApp && Object.keys(whatsappConnections).length > 0
                  const waConn = waConnected ? Object.values(whatsappConnections)[0] : null
                  return (
                    <div key={ch.id} className={cn("card-3d flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5", waConn ? "border-emerald-500/30 bg-[#2a3444]" : "border-white/5 bg-[#2a3444]")}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center">{ch.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{ch.name}</p>
                          {waConn && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <Check className="h-3 w-3" /> {t("channelsConnected")}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t(ch.descKey as any)}</p>
                        {waConn && (
                          <p className="mt-0.5 text-[10px] text-emerald-400">{waConn.phone_number || waConn.phone_number_id}</p>
                        )}
                      </div>
                      {isWhatsApp ? (
                        waConn ? (
                          <button
                            onClick={() => handleDisconnectWhatsApp(waConn.phone_number_id)}
                            className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (!user) return
                              handleWhatsAppEmbeddedSignup()
                            }}
                            disabled={waConnecting}
                            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {waConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {waConnecting ? "Connecting..." : "Connect"}
                          </button>
                        )
                      ) : (
                        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">Coming soon</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Calendars */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <SiGooglecalendar className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Calendars</span>
              </div>
              <div className="space-y-3">
                {CALENDAR_CHANNELS.map(ch => {
                  const calConnected = ch.id === "googlecalendar" && calendarConnections["google"]
                  return (
                    <div key={ch.id} className={cn("card-3d flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5", calConnected ? "border-emerald-500/30 bg-[#2a3444]" : "border-white/5 bg-[#2a3444]")}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center">{ch.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{ch.name}</p>
                          {calConnected && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <Check className="h-3 w-3" /> {t("channelsConnected")}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t(ch.descKey as any)}</p>
                        {calConnected && (
                          <p className="mt-0.5 text-xs text-emerald-400/80">{calConnected.calendar_email}</p>
                        )}
                      </div>
                      {calConnected ? (
                        <button
                          onClick={() => handleDisconnectCalendar("google")}
                          className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!user) return
                            window.location.href = `/api/calendar/oauth/google/connect?userId=${user.id}`
                          }}
                          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* SMTP Connect Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {modalProvider.icon}
                <div>
                  <h2 className="font-semibold text-white">{modalProvider.name}</h2>
                  <p className="text-xs text-muted-foreground">SMTP / IMAP connection</p>
                </div>
              </div>
              <button onClick={() => setModalProvider(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Provider note */}
            <div className="mb-5 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-300/80 leading-relaxed">
                {modalProvider.note}
                {modalProvider.noteLink && (
                  <a href={modalProvider.noteLink} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-amber-400 underline underline-offset-2 hover:text-amber-300">
                    Get App Password <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email Address *</label>
                <input className={field} type="email" placeholder="you@example.com" value={smtpForm.email_address} onChange={e => setSmtpForm(p => ({ ...p, email_address: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Password / App Password *</label>
                <div className="relative">
                  <input className={cn(field, "pr-10")} type={showPass ? "text" : "password"} placeholder="••••••••••••" value={smtpForm.smtp_pass} onChange={e => setSmtpForm(p => ({ ...p, smtp_pass: e.target.value }))} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Advanced settings (collapsible via details) */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-white transition-colors select-none">
                  Advanced settings (SMTP / IMAP)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">SMTP Host</label>
                    <input className={field} value={smtpForm.smtp_host} onChange={e => setSmtpForm(p => ({ ...p, smtp_host: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">SMTP Port</label>
                    <input className={field} type="number" value={smtpForm.smtp_port} onChange={e => setSmtpForm(p => ({ ...p, smtp_port: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">IMAP Host</label>
                    <input className={field} value={smtpForm.imap_host} onChange={e => setSmtpForm(p => ({ ...p, imap_host: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">IMAP Port</label>
                    <input className={field} type="number" value={smtpForm.imap_port} onChange={e => setSmtpForm(p => ({ ...p, imap_port: e.target.value }))} />
                  </div>
                </div>
              </details>

              {saveError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {saveError}
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setModalProvider(null)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || testing} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {(saving || testing) && <Loader2 className="h-4 w-4 animate-spin" />}
                {testing ? "Verifying…" : saving ? "Saving…" : "Save Connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {composeOpen && composeProvider && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {composeProvider.icon}
                <div>
                  <h2 className="font-semibold text-white">Compose Email</h2>
                  <p className="text-xs text-muted-foreground">via {composeProvider.name}</p>
                </div>
              </div>
              <button onClick={() => setComposeOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <Check className="h-4 w-4 shrink-0" /> Email sent successfully!
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">To *</label>
                <input className={field} type="email" placeholder="recipient@example.com" value={composeForm.to} onChange={e => setComposeForm(p => ({ ...p, to: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject *</label>
                <input className={field} placeholder="Subject" value={composeForm.subject} onChange={e => setComposeForm(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Message</label>
                <textarea className={cn(field, "min-h-[120px] resize-none")} placeholder="Write your message..." value={composeForm.body} onChange={e => setComposeForm(p => ({ ...p, body: e.target.value }))} />
              </div>
              {sendError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {sendError}
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setComposeOpen(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
                Cancel
              </button>
              <button onClick={handleSendEmail} disabled={sending} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {inboxProvider && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                {inboxProvider.icon}
                <div>
                  <h2 className="font-semibold text-white">Inbox</h2>
                  <p className="text-xs text-muted-foreground">{inboxProvider.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleFetchEmails(inboxProvider)} disabled={inboxLoading} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-white disabled:opacity-50 flex items-center gap-1.5">
                  {inboxLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Refresh
                </button>
                <button onClick={() => setInboxProvider(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto p-4">
              {inboxMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Mail className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No emails yet</p>
                  <p className="text-xs mt-1">Click Refresh to fetch from your mailbox</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inboxMessages.map((msg: any) => (
                    <div key={msg.id} className={cn("rounded-xl border p-3 transition-colors", msg.direction === "sent" ? "border-emerald-500/10 bg-emerald-500/5" : "border-white/5 bg-white/5")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{msg.subject || "(No subject)"}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", msg.direction === "sent" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400")}>
                              {msg.direction}
                            </span>
                            <span className="truncate">{msg.direction === "sent" ? `To: ${msg.to_address}` : `From: ${msg.from_address}`}</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {msg.body && (
                        <p className="mt-2 text-xs text-slate-300 line-clamp-2">{msg.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connect Modal */}
      {waModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaWhatsapp className="h-6 w-6" style={{ color: "#25D366" }} />
                <div>
                  <h2 className="font-semibold text-white">Connect WhatsApp</h2>
                  <p className="text-xs text-muted-foreground">Enter your WhatsApp Business API credentials</p>
                </div>
              </div>
              <button onClick={() => setWaModalOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number ID *</label>
                <input
                  type="text"
                  value={waForm.phoneNumberId}
                  onChange={e => setWaForm(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  placeholder="123456789012345"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Find this in your Meta Developer Console → WhatsApp → API Setup</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Access Token *</label>
                <input
                  type="password"
                  value={waForm.accessToken}
                  onChange={e => setWaForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="EAA..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Generate a permanent token in Meta Business → System Users</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number (optional)</label>
                <input
                  type="text"
                  value={waForm.phoneNumber}
                  onChange={e => setWaForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1234567890"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setWaModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!waForm.phoneNumberId || !waForm.accessToken) return
                  setWaSaving(true)
                  try {
                    await handleConnectWhatsApp(waForm.phoneNumberId, waForm.accessToken, waForm.phoneNumber || undefined)
                    setWaModalOpen(false)
                    setWaForm({ phoneNumberId: "", accessToken: "", phoneNumber: "" })
                  } finally {
                    setWaSaving(false)
                  }
                }}
                disabled={waSaving || !waForm.phoneNumberId || !waForm.accessToken}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
              >
                {waSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[60] flex flex-col bg-background">
        <div className="flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-hidden border-b bg-background/80 backdrop-blur-md px-3 md:px-4" />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r bg-background py-3" />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    }>
      <ChannelsPageContent />
    </Suspense>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search, Check, X, MessageSquare, User, Globe, Mail, Eye, EyeOff, Loader2, AlertCircle, ExternalLink } from "lucide-react"
import { FaWhatsapp, FaTelegram, FaSlack, FaInstagram, FaFacebookMessenger, FaSms, FaMicrosoft } from "react-icons/fa"
import { SiGmail, SiIcloud, SiGooglecalendar, SiZoho } from "react-icons/si"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { getProfile, getEmailConnections, saveEmailConnection, deleteEmailConnection, type EmailConnection } from "@/lib/supabase"

type SmtpDefaults = { smtp_host: string; smtp_port: number; imap_host: string; imap_port: number; smtp_secure?: boolean }
type EmailProvider = { id: string; name: string; icon: React.ReactNode; defaults: SmtpDefaults; note: string; noteLink?: string; descKey: string }

const EMAIL_PROVIDERS: EmailProvider[] = [
  { id: "gmail", name: "Gmail / Google Workspace", icon: <SiGmail className="h-6 w-6" style={{ color: "#EA4335" }} />, defaults: { smtp_host: "smtp.gmail.com", smtp_port: 587, imap_host: "imap.gmail.com", imap_port: 993 }, note: "Requires an App Password from your Google Account. Your regular password won't work.", noteLink: "https://myaccount.google.com/apppasswords", descKey: "channelDescGmail" },
  { id: "outlook", name: "Microsoft 365 / Outlook", icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#0078D4" }} />, defaults: { smtp_host: "smtp.office365.com", smtp_port: 587, imap_host: "outlook.office365.com", imap_port: 993 }, note: "Use your Microsoft 365 email address and account password.", descKey: "channelDescOutlook" },
  { id: "zoho", name: "Zoho Mail", icon: <SiZoho className="h-6 w-6" style={{ color: "#E42527" }} />, defaults: { smtp_host: "smtp.zoho.com", smtp_port: 587, imap_host: "imap.zoho.com", imap_port: 993 }, note: "Generate an App Password in Zoho Mail → Settings → Security.", noteLink: "https://accounts.zoho.com/home", descKey: "channelDescZoho" },
  { id: "icloud", name: "iCloud Mail", icon: <SiIcloud className="h-6 w-6" style={{ color: "#3693F3" }} />, defaults: { smtp_host: "smtp.mail.me.com", smtp_port: 587, imap_host: "imap.mail.me.com", imap_port: 993 }, note: "Apple requires an App-Specific Password — your regular Apple ID password won't work.", noteLink: "https://appleid.apple.com/account/manage", descKey: "channelDescIcloud" },
  { id: "hostinger", name: "Hostinger Email", icon: <Globe className="h-6 w-6" style={{ color: "#673DE6" }} />, defaults: { smtp_host: "smtp.hostinger.com", smtp_port: 587, imap_host: "imap.hostinger.com", imap_port: 993 }, note: "Use your Hostinger email address and the password from Hostinger hPanel.", descKey: "channelDescHostinger" },
  { id: "godaddy", name: "GoDaddy Email", icon: <Mail className="h-6 w-6" style={{ color: "#1BDBDB" }} />, defaults: { smtp_host: "smtpout.secureserver.net", smtp_port: 465, imap_host: "imap.secureserver.net", imap_port: 993, smtp_secure: true }, note: "Use your GoDaddy Workspace Email address and password.", descKey: "channelDescGodaddy" },
]

const OTHER_CHANNELS = [
  { id: "whatsapp", name: "WhatsApp Business", icon: <FaWhatsapp className="h-6 w-6" style={{ color: "#25D366" }} />, descKey: "channelDescWhatsapp" },
  { id: "telegram", name: "Telegram", icon: <FaTelegram className="h-6 w-6" style={{ color: "#26A5E4" }} />, descKey: "channelDescTelegram" },
  { id: "webchat", name: "Website Chat", icon: <MessageSquare className="h-5 w-5 text-emerald-400" />, descKey: "channelDescWebchat" },
  { id: "slack", name: "Slack", icon: <FaSlack className="h-6 w-6" style={{ color: "#4A154B" }} />, descKey: "channelDescSlack" },
  { id: "teams", name: "Microsoft Teams", icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#6264A7" }} />, descKey: "channelDescTeams" },
  { id: "instagram", name: "Instagram DM", icon: <FaInstagram className="h-6 w-6" style={{ color: "#E4405F" }} />, descKey: "channelDescInstagram" },
  { id: "messenger", name: "Facebook Messenger", icon: <FaFacebookMessenger className="h-6 w-6" style={{ color: "#0084FF" }} />, descKey: "channelDescMessenger" },
  { id: "sms", name: "SMS / Text Messages", icon: <FaSms className="h-6 w-6" style={{ color: "#34C759" }} />, descKey: "channelDescSms" },
  { id: "googlecalendar", name: "Google Calendar", icon: <SiGooglecalendar className="h-6 w-6" style={{ color: "#4285F4" }} />, descKey: "channelDescGoogleCalendar" },
]

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

type SmtpForm = { email_address: string; smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string; imap_host: string; imap_port: string; smtp_secure: boolean }

export default function ChannelsPage() {
  const { user, avatarUrl, loading: authLoading } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [userInitials, setUserInitials] = useState("")
  const [emailConnections, setEmailConnections] = useState<Record<string, EmailConnection>>({})
  const [modalProvider, setModalProvider] = useState<EmailProvider | null>(null)
  const [smtpForm, setSmtpForm] = useState<SmtpForm>({ email_address: "", smtp_host: "", smtp_port: "", smtp_user: "", smtp_pass: "", imap_host: "", imap_port: "", smtp_secure: true })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const loadConnections = useCallback(async () => {
    if (!user) return
    try {
      const conns = await getEmailConnections(user.id)
      const map: Record<string, EmailConnection> = {}
      conns.forEach(c => { map[c.provider] = c })
      setEmailConnections(map)
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
    if (!smtpForm.email_address || !smtpForm.smtp_pass) { setSaveError("Email address and password are required."); return }
    setSaving(true); setSaveError("")
    try {
      await saveEmailConnection({
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
        status: "connected",
      })
      await loadConnections()
      setModalProvider(null)
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    if (!user) return
    try {
      await deleteEmailConnection(user.id, providerId)
      setEmailConnections(prev => { const next = { ...prev }; delete next[providerId]; return next })
    } catch { /* ignore */ }
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
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Email Accounts</span>
              </div>
              <div className="space-y-3">
                {EMAIL_PROVIDERS.map(provider => {
                  const conn = emailConnections[provider.id]
                  const connected = !!conn
                  return (
                    <div key={provider.id} className={cn("card-3d flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5", connected ? "border-emerald-500/30 bg-[#2a3444]" : "border-white/5 bg-[#2a3444]")}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center">{provider.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{provider.name}</p>
                          {connected && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <Check className="h-3 w-3" /> {t("channelsConnected")}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t(provider.descKey as any)}</p>
                        {connected && conn.email_address && (
                          <p className="mt-0.5 text-xs text-emerald-400/80">{conn.email_address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {connected && (
                          <button onClick={() => openModal(provider)} className="rounded-lg px-3 py-2 text-xs font-semibold border border-white/10 text-muted-foreground hover:text-white transition-colors">
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => connected ? handleDisconnect(provider.id) : openModal(provider)}
                          className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition-colors", connected ? "border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-500/30" : "bg-emerald-600 text-white hover:bg-emerald-700")}
                        >
                          {connected ? t("channelsDisconnect") : t("channelsConnect")}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Other channels */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Messaging & Social</span>
              </div>
              <div className="space-y-3">
                {OTHER_CHANNELS.map(ch => (
                  <div key={ch.id} className="card-3d flex items-center gap-4 rounded-2xl border border-white/5 bg-[#2a3444] p-5 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center">{ch.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{ch.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{t(ch.descKey as any)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">Coming soon</span>
                  </div>
                ))}
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
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : "Save Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Check, RefreshCw, MessageSquare, User, Globe } from "lucide-react"
import { FaWhatsapp, FaTelegram, FaSlack, FaInstagram, FaFacebookMessenger, FaSms, FaMicrosoft } from "react-icons/fa"
import { SiGmail, SiIcloud, SiGooglecalendar } from "react-icons/si"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { getProfile } from "@/lib/supabase"

const channels = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Let your AI respond to WhatsApp messages from customers and staff.",
    status: "connected",
    icon: <FaWhatsapp className="h-6 w-6" style={{ color: "#25D366" }} />,
  },
  {
    id: "gmail",
    name: "Gmail",
    desc: "Connect Gmail so your AI can draft and respond to emails.",
    status: "disconnected",
    icon: <SiGmail className="h-6 w-6" style={{ color: "#EA4335" }} />,
  },
  {
    id: "outlook",
    name: "Outlook",
    desc: "Connect Microsoft Outlook for email automation and drafting.",
    status: "disconnected",
    icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#0078D4" }} />,
  },
  {
    id: "telegram",
    name: "Telegram",
    desc: "Deploy your AI as a Telegram bot for your team or customers.",
    status: "disconnected",
    icon: <FaTelegram className="h-6 w-6" style={{ color: "#26A5E4" }} />,
  },
  {
    id: "webchat",
    name: "Website Chat",
    desc: "Embed a chat widget on your website powered by your AI.",
    status: "disconnected",
    icon: <MessageSquare className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: "slack",
    name: "Slack",
    desc: "Connect Slack so your AI can respond to DMs and channel mentions.",
    status: "disconnected",
    icon: <FaSlack className="h-6 w-6" style={{ color: "#4A154B" }} />,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    desc: "Deploy your AI in Teams channels and group chats.",
    status: "disconnected",
    icon: <FaMicrosoft className="h-6 w-6" style={{ color: "#6264A7" }} />,
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Let your AI respond to DMs and comments on Instagram.",
    status: "disconnected",
    icon: <FaInstagram className="h-6 w-6" style={{ color: "#E4405F" }} />,
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    desc: "Connect Messenger so your AI can chat with customers on Facebook.",
    status: "disconnected",
    icon: <FaFacebookMessenger className="h-6 w-6" style={{ color: "#0084FF" }} />,
  },
  {
    id: "icloud",
    name: "iCloud Email",
    desc: "Connect your iCloud email so your AI can manage messages.",
    status: "disconnected",
    icon: <SiIcloud className="h-6 w-6" style={{ color: "#3693F3" }} />,
  },
  {
    id: "sms",
    name: "SMS / Text Messages",
    desc: "Enable SMS so your AI can send and receive text messages.",
    status: "disconnected",
    icon: <FaSms className="h-6 w-6" style={{ color: "#34C759" }} />,
  },
  {
    id: "googlecalendar",
    name: "Google Calendar",
    desc: "Connect Google Calendar so your AI can schedule meetings and manage events.",
    status: "disconnected",
    icon: <SiGooglecalendar className="h-6 w-6" style={{ color: "#4285F4" }} />,
  },
  {
    id: "hostinger",
    name: "Hostinger",
    desc: "Deploy your AI on your Hostinger website to engage visitors in real-time.",
    status: "disconnected",
    icon: <Globe className="h-6 w-6" style={{ color: "#673DE6" }} />,
  },
]

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function ChannelsPage() {
  const { user } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [channelStates, setChannelStates] = useState<Record<string, string>>(
    Object.fromEntries(channels.map(c => [c.id, c.status]))
  )
  const [userInitials, setUserInitials] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  const channelDescriptions: Record<string, string> = {
    whatsapp: t("channelDescWhatsapp"),
    gmail: t("channelDescGmail"),
    outlook: t("channelDescOutlook"),
    telegram: t("channelDescTelegram"),
    webchat: t("channelDescWebchat"),
    slack: t("channelDescSlack"),
    teams: t("channelDescTeams"),
    instagram: t("channelDescInstagram"),
    messenger: t("channelDescMessenger"),
    icloud: t("channelDescIcloud"),
    sms: t("channelDescSms"),
    googlecalendar: t("channelDescGoogleCalendar"),
    hostinger: t("channelDescHostinger"),
  }

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const profile = await getProfile(user.id)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      } catch {
        const name = user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
      }
    }
    load()
  }, [user])

  const toggle = (id: string) => {
    setChannelStates(prev => ({
      ...prev,
      [id]: prev[id] === "connected" ? "disconnected" : "connected",
    }))
  }

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
            {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail />

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">{t("channelsTitle")}</h1>
              <p className="mt-2 text-muted-foreground">{t("channelsSubtitle")}</p>
            </div>

            <div className="space-y-4">
              {channels.map(channel => {
                const connected = channelStates[channel.id] === "connected"
                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "card-3d flex items-center gap-4 rounded-2xl border p-5 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10",
                      connected ? "border-emerald-500/30 bg-[#2a3444]" : "border-white/5 bg-[#2a3444]"
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center p-2">
                      {channel.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{channel.name}</p>
                        {connected && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <Check className="h-3 w-3" /> {t("channelsConnected")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{channelDescriptions[channel.id] || channel.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {connected && (
                        <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggle(channel.id)}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                          connected
                            ? "border text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        )}
                      >
                        {connected ? t("channelsDisconnect") : t("channelsConnect")}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card-3d mt-8 rounded-xl border border-white/5 bg-[#2a3444] p-6 text-center shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <p className="text-sm font-medium">{t("channelsComingSoon")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("channelsComingSoonDesc")}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

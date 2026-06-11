"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Check, RefreshCw, MessageSquare } from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"

const channels = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Let your AI respond to WhatsApp messages from customers and staff.",
    status: "connected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L.057 23.882l6.197-1.624A11.957 11.957 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.851 0-3.587-.504-5.079-1.379l-.361-.214-3.781.991 1.01-3.688-.235-.375A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    ),
  },
  {
    id: "gmail",
    name: "Gmail",
    desc: "Connect Gmail so your AI can draft and respond to emails.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.75l8.073-6.257C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "outlook",
    name: "Outlook",
    desc: "Connect Microsoft Outlook for email automation and drafting.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M24 7.387v10.478c0 .23-.08.427-.241.59a.803.803 0 01-.59.242h-9.931V9.931l-2.069 1.517-2.069-1.517V18.697H.831a.803.803 0 01-.59-.242A.803.803 0 010 17.865V7.387c0-.23.08-.427.241-.59A.803.803 0 01.831 6.556h3.9l6.507 4.772 6.507-4.772h3.924c.23 0 .427.08.59.241A.803.803 0 0124 7.387z" fill="#0078D4"/>
      </svg>
    ),
  },
  {
    id: "telegram",
    name: "Telegram",
    desc: "Deploy your AI as a Telegram bot for your team or customers.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#26A5E4">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.837l-2.97-.924c-.644-.203-.658-.644.136-.953l11.578-4.467c.538-.194 1.006.131.99.728z"/>
      </svg>
    ),
  },
  {
    id: "webchat",
    name: "Website Chat",
    desc: "Embed a chat widget on your website powered by your AI.",
    status: "disconnected",
    icon: (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600">
        <MessageSquare className="h-3.5 w-3.5 text-white" />
      </div>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    desc: "Connect Slack so your AI can respond to DMs and channel mentions.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#4A154B">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.024 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zM15.165 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 12.643 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.024a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 12.643 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zM12.643 15.165a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 21.478 12.9a2.528 2.528 0 0 1-2.522 2.265h-6.313z"/>
      </svg>
    ),
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    desc: "Deploy your AI in Teams channels and group chats.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#6264A7">
        <path d="M20.625 8.25h-4.875a1.125 1.125 0 0 0-1.125 1.125v4.875h5.25a1.875 1.875 0 0 0 1.875-1.875v-3a1.125 1.125 0 0 0-1.125-1.125zM20.625 15.75h-5.25V21h5.25a1.875 1.875 0 0 0 1.875-1.875v-3a1.125 1.125 0 0 0-1.125-1.125h-.75zM10.125 15h-5.25a1.875 1.875 0 0 0-1.875 1.875v3a1.125 1.125 0 0 0 1.125 1.125h6a1.125 1.125 0 0 0 1.125-1.125v-3.75A1.875 1.875 0 0 0 10.125 15zM8.625 0A3.375 3.375 0 0 0 5.25 3.375V9h6.75V3.375A3.375 3.375 0 0 0 8.625 0zM3.75 9A3.375 3.375 0 0 0 .375 12.375v3A1.125 1.125 0 0 0 1.5 16.5h6a1.125 1.125 0 0 0 1.125-1.125v-3A3.375 3.375 0 0 0 5.25 9H3.75z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Let your AI respond to DMs and comments on Instagram.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <rect width="20" height="20" x="2" y="2" rx="5.5" ry="5.5" fill="none" stroke="#E4405F" strokeWidth="2"/>
        <circle cx="12" cy="12" r="5" fill="none" stroke="#E4405F" strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1.5" fill="#E4405F"/>
      </svg>
    ),
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    desc: "Connect Messenger so your AI can chat with customers on Facebook.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#0084FF">
        <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.744 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.26-5.955 3.26 6.559-6.963 3.13 3.26 5.892-3.26-6.57 6.963z"/>
      </svg>
    ),
  },
  {
    id: "icloud",
    name: "iCloud Email",
    desc: "Connect your iCloud email so your AI can manage messages.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#3693F3">
        <path d="M12.015 7.227c-.87-.884-2.224-1.09-3.42-.56-1.587.693-2.388 2.65-1.74 4.336.37.957 1.21 1.676 2.18 1.92.28.072.57.084.855.055-.27.41-.66.77-1.14 1.02-.59.31-1.27.42-1.94.33-1.13-.16-2.11-.87-2.59-1.86-.71-1.43-.37-3.21.83-4.21.83-.69 1.89-1 2.96-.83.44.07.87.23 1.25.46.24.15.46.34.65.56.18-.21.4-.4.64-.55.38-.23.81-.39 1.25-.46 1.07-.17 2.13.14 2.96.83 1.2 1 1.54 2.78.83 4.21-.48.99-1.46 1.7-2.59 1.86-.67.09-1.35-.02-1.94-.33-.48-.25-.87-.61-1.14-1.02.29.03.58.02.86-.06.96-.24 1.81-.96 2.18-1.92.65-1.69-.15-3.64-1.74-4.33-1.2-.53-2.55-.32-3.42.56z"/>
      </svg>
    ),
  },
  {
    id: "sms",
    name: "SMS / Text Messages",
    desc: "Enable SMS so your AI can send and receive text messages.",
    status: "disconnected",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#34C759">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <circle cx="9" cy="10" r="1" fill="#fff"/>
        <circle cx="12" cy="10" r="1" fill="#fff"/>
        <circle cx="15" cy="10" r="1" fill="#fff"/>
      </svg>
    ),
  },
]

export default function ChannelsPage() {
  const [channelStates, setChannelStates] = useState<Record<string, string>>(
    Object.fromEntries(channels.map(c => [c.id, c.status]))
  )

  const toggle = (id: string) => {
    setChannelStates(prev => ({
      ...prev,
      [id]: prev[id] === "connected" ? "disconnected" : "connected",
    }))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-4 overflow-visible border-b bg-background/80 backdrop-blur-md px-4">
        <Link href="/" className="flex shrink-0 items-center overflow-visible">
          <img src="/assets/images/exploro-logo.png" alt="Exploro" className="w-auto object-contain" style={{ height: "140px" }} />
        </Link>
        <div className="flex flex-1 justify-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none" placeholder="Search channels..." />
          </div>
        </div>
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">E</div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail />

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">Connect Channels</h1>
              <p className="mt-2 text-muted-foreground">Deploy your AI to the channels your team and customers already use.</p>
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                      {channel.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{channel.name}</p>
                        {connected && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <Check className="h-3 w-3" /> Connected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{channel.desc}</p>
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
                        {connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card-3d mt-8 rounded-xl border border-white/5 bg-[#2a3444] p-6 text-center shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <p className="text-sm font-medium">More integrations coming soon</p>
              <p className="mt-1 text-xs text-muted-foreground">Google Drive, Notion, HubSpot, Salesforce, and more.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

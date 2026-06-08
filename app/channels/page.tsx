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
      <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/assets/images/exploro-logo.png" alt="Exploro" className="h-9 w-9 object-contain" />
          <span className="text-base font-bold tracking-tight">EXPLORO</span>
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
                      "flex items-center gap-4 rounded-2xl border p-5 transition-colors",
                      connected ? "border-emerald-500/30 bg-emerald-950/10" : "bg-card"
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

            <div className="mt-8 rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm font-medium">More integrations coming soon</p>
              <p className="mt-1 text-xs text-muted-foreground">Slack, Teams, Instagram, Facebook Messenger, and more.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

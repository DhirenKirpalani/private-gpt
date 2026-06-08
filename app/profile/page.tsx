"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Save } from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    companyName: "Us+ AI Bureau",
    industry: "Consulting",
    website: "https://urbanbureau.net",
    email: "alex@urbanbureau.net",
    aiName: "Exploro Agent",
    brandVoice: "Professional, concise, and knowledgeable",
    communicationStyle: "Formal",
    languages: "English",
  })

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            <input className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none" placeholder="Search..." />
          </div>
        </div>
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">E</div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail />

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-2xl space-y-8">

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Business Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">Configure how your AI understands and represents your business.</p>
              </div>
              <button
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  saved ? "bg-emerald-600/20 text-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <Save className="h-4 w-4" />
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>

            {/* Company */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Company</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={form.companyName} onChange={e => update("companyName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={form.industry}
                    onChange={e => update("industry", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {["Consulting","Agencies","Real Estate","Healthcare","Education","Wellness","Restaurants","Technology","Legal","Finance","SMB"].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" value={form.website} onChange={e => update("website", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} />
                </div>
              </div>
            </section>

            {/* AI Configuration */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Configuration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="aiName">AI Name</Label>
                  <Input id="aiName" value={form.aiName} onChange={e => update("aiName", e.target.value)} placeholder="e.g. Alex, Support Bot, CompanyAI" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="communicationStyle">Communication Style</Label>
                  <select
                    id="communicationStyle"
                    value={form.communicationStyle}
                    onChange={e => update("communicationStyle", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {["Formal","Professional","Friendly","Casual","Concise"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="brandVoice">Brand Voice</Label>
                  <textarea
                    id="brandVoice"
                    rows={3}
                    value={form.brandVoice}
                    onChange={e => update("brandVoice", e.target.value)}
                    placeholder="Describe how your AI should sound and communicate..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="languages">Languages</Label>
                  <Input id="languages" value={form.languages} onChange={e => update("languages", e.target.value)} placeholder="e.g. English, Spanish" />
                </div>
              </div>
            </section>

            {/* Connected Channels summary */}
            <section className="rounded-2xl border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Connected Channels</h2>
                <Link href="/channels" className="text-xs text-emerald-400 hover:underline">Manage →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "WhatsApp Business", connected: true },
                  { name: "Gmail", connected: false },
                  { name: "Outlook", connected: false },
                  { name: "Website Chat", connected: false },
                  { name: "Telegram", connected: false },
                ].map(ch => (
                  <span
                    key={ch.name}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      ch.connected
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {ch.name}{ch.connected ? " ✓" : ""}
                  </span>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}

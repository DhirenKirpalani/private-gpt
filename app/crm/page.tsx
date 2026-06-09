"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Search, Plus, Phone, Mail, MapPin, Building2,
  Filter, CircleDollarSign, ChevronDown, X,
  ClipboardList, FileText, Send,
  Star, StarOff,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"

/* ─── demo data ─── */
const contacts = [
  { id: "1", name: "Sarah Chen", company: "BrightWave Agency", role: "Marketing Director", email: "sarah@brightwave.co", phone: "+1 555 0123", location: "San Francisco, CA", tags: ["VIP", "Agency"], starred: true, lastContact: "2h ago", dealValue: 24000, dealStage: "Proposal" },
  { id: "2", name: "Marcus Johnson", company: "GreenLeaf Restaurants", role: "Operations Manager", email: "marcus@greenleaf.com", phone: "+1 555 0456", location: "Austin, TX", tags: ["Restaurant"], starred: false, lastContact: "5h ago", dealValue: 8900, dealStage: "Discovery" },
  { id: "3", name: "Elena Rodriguez", company: "Horizon Realty", role: "Broker", email: "elena@horizon.com", phone: "+1 555 0789", location: "Miami, FL", tags: ["Real Estate", "Hot Lead"], starred: true, lastContact: "Yesterday", dealValue: 15000, dealStage: "Negotiation" },
  { id: "4", name: "David Park", company: "Vitality Wellness", role: "Owner", email: "david@vitality.com", phone: "+1 555 0321", location: "Seattle, WA", tags: ["Wellness"], starred: false, lastContact: "2d ago", dealValue: 0, dealStage: "None" },
  { id: "5", name: "Amira Hassan", company: "EduLearn Academy", role: "CEO", email: "amira@edulearn.org", phone: "+1 555 0654", location: "New York, NY", tags: ["Education", "Enterprise"], starred: true, lastContact: "3d ago", dealValue: 45000, dealStage: "Closed Won" },
  { id: "6", name: "Tom Williams", company: "Stark Consulting", role: "Partner", email: "tom@stark.co", phone: "+1 555 0987", location: "Chicago, IL", tags: ["Consulting"], starred: false, lastContact: "1w ago", dealValue: 12000, dealStage: "Discovery" },
]

const activities = [
  { id: "a1", type: "email", text: "Sent proposal for AI onboarding package", time: "2h ago", contact: "Sarah Chen" },
  { id: "a2", type: "call", text: "Discussed SOP integration requirements", time: "5h ago", contact: "Marcus Johnson" },
  { id: "a3", type: "note", text: "Follow up on contract terms next week", time: "Yesterday", contact: "Elena Rodriguez" },
  { id: "a4", type: "deal", text: "Deal moved to Negotiation — $15,000", time: "Yesterday", contact: "Elena Rodriguez" },
  { id: "a5", type: "email", text: "Shared knowledge base setup guide", time: "2d ago", contact: "David Park" },
]

const stages = [
  { name: "Discovery", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { name: "Proposal", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { name: "Negotiation", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { name: "Closed Won", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
]

const tabs = ["Overview", "Deals", "Activity", "Notes"]

const crmNav = [
  { label: "Contacts", count: 142 },
  { label: "Companies", count: 38 },
  { label: "Deals", count: 24 },
  { label: "Tasks", count: 12 },
  { label: "Tickets", count: 5 },
]

const channels = [
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-600", connected: true },
  { id: "email",    label: "Email",    color: "bg-blue-600",  connected: true },
  { id: "sms",      label: "SMS",      color: "bg-purple-600", connected: false },
  { id: "call",     label: "Call",     color: "bg-orange-600", connected: true },
]

export default function CRMPage() {
  const [selectedId, setSelectedId] = useState("1")
  const [activeTab, setActiveTab] = useState("Overview")
  const [search, setSearch] = useState("")
  const [activeNav, setActiveNav] = useState("Contacts")
  const [activeChannel, setActiveChannel] = useState("whatsapp")
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [messageText, setMessageText] = useState("")
  const contact = contacts.find(c => c.id === selectedId)!
  const activeCh = channels.find(c => c.id === activeChannel)!

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* ── HEADER ── */}
      <header className="flex h-14 md:h-16 shrink-0 items-center gap-3 md:gap-4 overflow-visible border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 overflow-visible">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={70}
              priority
              className="w-auto object-contain"
              style={{ height: "140px" }}
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
          <button className="flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[10px] md:text-xs font-bold text-white">
            E
          </button>
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
              <button className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 transition-colors">
                <Plus className="h-3 w-3" /> Create
              </button>
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
            {filtered.map(c => (
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
                  {c.name.split(" ").map(n => n[0]).join("")}
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
            ))}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">

          {/* Contact header */}
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
                {contact.tags.map(tag => (
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
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                >
                  <span className={cn("h-2 w-2 rounded-full", activeCh.color)} />
                  {activeCh.label}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showChannelMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border bg-card py-1 shadow-lg">
                      {channels.map(ch => (
                        <button
                          key={ch.id}
                          onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                          className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                            {ch.label}
                          </div>
                          {ch.connected ? (
                            <span className="text-[10px] font-medium text-emerald-400">Connected</span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">Connect</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setComposerOpen(true)}
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
                className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
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
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-card py-1 shadow-lg">
                    {channels.map(ch => (
                      <button
                        key={ch.id}
                        onClick={() => { setActiveChannel(ch.id); setShowChannelMenu(false) }}
                        className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", ch.color)} />
                          {ch.label}
                        </div>
                        {ch.connected ? (
                          <span className="text-[10px] text-emerald-400">Connected</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Connect</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b px-4 md:px-6">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-3 text-xs font-medium transition-colors",
                  activeTab === tab ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">

            {/* ── OVERVIEW ── */}
            {activeTab === "Overview" && (
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
            {activeTab === "Deals" && (
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
            {activeTab === "Activity" && (
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
            {activeTab === "Notes" && (
              <div className="mx-auto max-w-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Note
                  </button>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Onboarding preferences</span>
                    <span className="text-[10px] text-muted-foreground">2d ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sarah prefers WhatsApp for team updates and wants the AI trained on their brand guidelines first. She mentioned a Q3 rollout target.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Pricing discussion</span>
                    <span className="text-[10px] text-muted-foreground">5d ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Interested in Professional tier. Wants to start with 3 workspaces and scale up. Needs approval from finance — follow up next Monday.
                  </p>
                </div>
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
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder={`Type your ${activeCh.label.toLowerCase()} message to ${contact.name}...`}
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
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

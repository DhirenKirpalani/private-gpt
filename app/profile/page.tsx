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
    fullName: "Alex Rivera",
    jobTitle: "Founder",
    phone: "+1 (555) 000-0000",
    location: "New York, NY",
    companyName: "Us+ AI Bureau",
    industry: "Consulting",
    companySize: "1-10",
    yearFounded: "2022",
    website: "https://urbanbureau.net",
    email: "alex@urbanbureau.net",
    businessDescription: "We help small and medium businesses implement AI solutions to streamline operations, improve customer support, and scale knowledge management.",
    targetAudience: "SMBs, agencies, and consultants looking to automate repetitive tasks using private AI.",
    keyProducts: "AI consulting, custom agent development, knowledge base setup, workflow automation",
    competitors: "Traditional consulting firms, generic chatbot platforms",
    aiName: "Exploro Agent",
    aiRole: "Business assistant that answers questions, drafts documents, and helps onboard new team members using our internal knowledge.",
    brandVoice: "Professional, concise, and knowledgeable",
    communicationStyle: "Formal",
    toneExamples: "We say 'let us help you' instead of 'we can help you'. We use active voice and avoid jargon unless necessary.",
    wordsToAvoid: "cheap, guaranteed, miracle, instantly",
    clarificationPrompt: "If the user's request is vague, lacks context, or refers to a past situation without details, ask a concise clarifying question. Example: If they do not share a source or example, ask: 'Do you want to share a source that I can use as an example?' Never guess. Always ask before generating.",
    responseLength: "Medium",
    languages: "English, Spanish",
    logoUrl: "",
    brandColors: "#10b981, #202733",
    slogan: "Your business. Your knowledge. Your AI.",
    docCategories: "SOPs, FAQs, Sales Playbooks, Onboarding Guides, Compliance Docs",
    preferredSources: "Internal PDFs, Google Drive, Notion, Website pages",
  })

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

            {/* Personal */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personal</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={e => update("fullName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" value={form.jobTitle} onChange={e => update("jobTitle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={e => update("location", e.target.value)} />
                </div>
              </div>
            </section>

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
                    {["Consulting","Agencies","Real Estate","Healthcare","Education","Wellness","Restaurants","Technology","Legal","Finance","SMB","Marketing","Manufacturing","Hospitality","Other"].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companySize">Company Size</Label>
                  <select
                    id="companySize"
                    value={form.companySize}
                    onChange={e => update("companySize", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {["1-10","11-50","51-200","201-500","500+"].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearFounded">Year Founded</Label>
                  <Input id="yearFounded" value={form.yearFounded} onChange={e => update("yearFounded", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" value={form.website} onChange={e => update("website", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessDescription">Business Description</Label>
                  <textarea
                    id="businessDescription"
                    rows={3}
                    value={form.businessDescription}
                    onChange={e => update("businessDescription", e.target.value)}
                    placeholder="Describe what your company does..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <textarea
                    id="targetAudience"
                    rows={2}
                    value={form.targetAudience}
                    onChange={e => update("targetAudience", e.target.value)}
                    placeholder="Who are your ideal customers?"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="keyProducts">Key Products / Services</Label>
                  <Input id="keyProducts" value={form.keyProducts} onChange={e => update("keyProducts", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="competitors">Main Competitors</Label>
                  <Input id="competitors" value={form.competitors} onChange={e => update("competitors", e.target.value)} />
                </div>
              </div>
            </section>

            {/* AI Configuration */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Configuration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="aiName">AI Agent Name</Label>
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
                    {["Formal","Professional","Friendly","Casual","Concise","Enthusiastic"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="aiRole">AI Role & Job Description</Label>
                  <textarea
                    id="aiRole"
                    rows={3}
                    value={form.aiRole}
                    onChange={e => update("aiRole", e.target.value)}
                    placeholder="Describe what this AI agent does day-to-day..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="toneExamples">Tone Examples</Label>
                  <textarea
                    id="toneExamples"
                    rows={2}
                    value={form.toneExamples}
                    onChange={e => update("toneExamples", e.target.value)}
                    placeholder="Provide example phrases your AI should use..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="wordsToAvoid">Words & Phrases to Avoid</Label>
                  <Input id="wordsToAvoid" value={form.wordsToAvoid} onChange={e => update("wordsToAvoid", e.target.value)} placeholder="cheap, guaranteed, miracle..." />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="clarificationPrompt">Clarification Prompt</Label>
                  <textarea
                    id="clarificationPrompt"
                    rows={4}
                    value={form.clarificationPrompt}
                    onChange={e => update("clarificationPrompt", e.target.value)}
                    placeholder="Instruct the AI when and how to ask clarifying questions..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">This text is injected into the AI system prompt. It tells Nira when to ask follow-up questions instead of guessing.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="responseLength">Preferred Response Length</Label>
                  <select
                    id="responseLength"
                    value={form.responseLength}
                    onChange={e => update("responseLength", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {["Short","Medium","Long","Detailed"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="languages">Languages</Label>
                  <Input id="languages" value={form.languages} onChange={e => update("languages", e.target.value)} placeholder="e.g. English, Spanish" />
                </div>
              </div>
            </section>

            {/* Brand Identity */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input id="logoUrl" type="url" value={form.logoUrl} onChange={e => update("logoUrl", e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="brandColors">Brand Colors</Label>
                  <Input id="brandColors" value={form.brandColors} onChange={e => update("brandColors", e.target.value)} placeholder="e.g. #10b981, #202733" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="slogan">Slogan / Tagline</Label>
                  <Input id="slogan" value={form.slogan} onChange={e => update("slogan", e.target.value)} />
                </div>
              </div>
            </section>

            {/* Knowledge & Content */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Knowledge & Content</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="docCategories">Document Categories</Label>
                  <Input id="docCategories" value={form.docCategories} onChange={e => update("docCategories", e.target.value)} placeholder="SOPs, FAQs, Playbooks..." />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="preferredSources">Preferred Knowledge Sources</Label>
                  <Input id="preferredSources" value={form.preferredSources} onChange={e => update("preferredSources", e.target.value)} placeholder="Google Drive, Notion, PDFs..." />
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
                  { name: "Slack", connected: false },
                  { name: "iCloud", connected: false },
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

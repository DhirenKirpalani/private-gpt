"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Save, Info, X, ChevronDown, Check } from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const [saved, setSaved] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null)
  const [promptExampleOpen, setPromptExampleOpen] = useState<string | null>(null)
  const [responseDropdownOpen, setResponseDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    fullName: "Alex Rivera",
    jobTitle: "Founder",
    phone: "+1 (555) 000-0000",
    location: "New York, NY",
    linkedinUrl: "",
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
    responseLength: "Standard",
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
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input id="linkedinUrl" type="url" value={form.linkedinUrl} onChange={e => update("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
                </div>
              </div>
            </section>

            {/* Company */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
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
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="aiRole">AI Role & Job Description</Label>
                    <button type="button" onClick={() => setTooltipOpen("aiRole")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="toneExamples">Tone Examples</Label>
                    <button type="button" onClick={() => setTooltipOpen("toneExamples")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
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

                {/* Prompt Use Case Examples */}
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt Use Case Examples</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "analysis", label: "Analysis" },
                      { key: "proposal", label: "Proposals" },
                      { key: "report", label: "Reports" },
                      { key: "email", label: "Emails" },
                      { key: "faq", label: "FAQ" },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPromptExampleOpen(tab.key)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative space-y-1.5">
                  <Label>Preferred Response</Label>
                  <button
                    type="button"
                    onClick={() => setResponseDropdownOpen(o => !o)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-[#2a3444] px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {form.responseLength}
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", responseDropdownOpen && "rotate-180")} />
                  </button>
                  {responseDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#2a3444] py-1 shadow-xl">
                      {["Concise","Standard","Detailed","Comprehensive"].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { update("responseLength", s); setResponseDropdownOpen(false) }}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-emerald-600/10",
                            form.responseLength === s ? "text-emerald-400" : "text-white"
                          )}
                        >
                          {s}
                          {form.responseLength === s && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="languages">Languages</Label>
                  <Input id="languages" value={form.languages} onChange={e => update("languages", e.target.value)} placeholder="e.g. English, Spanish" />
                </div>
              </div>
            </section>

            {/* Brand Identity */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>Upload Logo</Label>
                    <button type="button" onClick={() => setTooltipOpen("logoUpload")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#2a3444] px-3 py-2.5 text-sm transition-colors hover:border-emerald-500/30">
                    <div className="flex h-8 items-center justify-center rounded bg-emerald-600/15 px-3 text-xs font-semibold text-emerald-400">
                      Browse
                    </div>
                    <span className="truncate text-muted-foreground">
                      {form.logoUrl || "PNG, JPEG, or SVG — max 2 MB"}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="sr-only"
                      onChange={e => update("logoUrl", e.target.files?.[0]?.name || "")}
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="brandColors">Brand Colors</Label>
                    <button type="button" onClick={() => setTooltipOpen("brandColors")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <Input id="brandColors" value={form.brandColors} onChange={e => update("brandColors", e.target.value)} placeholder="e.g. #10b981, #202733" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="slogan">Slogan / Tagline</Label>
                  <Input id="slogan" value={form.slogan} onChange={e => update("slogan", e.target.value)} />
                </div>
              </div>
            </section>

            {/* Knowledge & Content */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
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
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-lg shadow-emerald-900/5 space-y-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
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

      {/* Tooltip Modal */}
      {tooltipOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTooltipOpen(null)}>
          <div className="relative mx-4 max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setTooltipOpen(null)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {tooltipOpen === "aiRole" ? "AI Role & Job Description" : tooltipOpen === "logoUpload" ? "Logo Upload Requirements" : tooltipOpen === "brandColors" ? "Brand Colors" : "Tone Examples"}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {tooltipOpen === "brandColors" ? (
                <>
                  <p><strong className="text-white">Primary color:</strong> This is your main brand color used for buttons, highlights, and the AI avatar. Enter a hex code like <span className="text-emerald-400">#10b981</span>.</p>
                  <p><strong className="text-white">Secondary color:</strong> Used for backgrounds, cards, and subtle accents. Typically a darker complement like <span className="text-emerald-400">#202733</span>.</p>
                  <p><strong className="text-white">Format:</strong> Enter as comma-separated hex values. Example: <span className="text-emerald-400">#10b981, #202733</span></p>
                  <p><strong className="text-white">Where it applies:</strong> These colors theme your AI chat interface, dashboard, and customer-facing widgets so everything feels like your brand.</p>
                </>
              ) : tooltipOpen === "logoUpload" ? (
                <>
                  <p><strong className="text-white">Recommended dimensions:</strong> 512 × 512 px (square) or 1024 × 512 px (wide). Minimum 256 × 256 px.</p>
                  <p><strong className="text-white">Accepted formats:</strong> PNG, JPEG, or SVG. PNG with transparent background is ideal.</p>
                  <p><strong className="text-white">Background:</strong> Use a transparent or solid dark background (#202733) so the logo blends with the AI interface.</p>
                  <p><strong className="text-white">File size:</strong> Keep under 2 MB for fast loading.</p>
                  <p><strong className="text-white">Best practice:</strong> Use a simple, recognizable icon or wordmark. Avoid fine details that blur at small sizes.</p>
                </>
              ) : tooltipOpen === "aiRole" ? (
                <>
                  <p><strong className="text-white">Be specific about responsibilities.</strong> Instead of "helps customers," write "answers WhatsApp inquiries about pricing, schedules demos, and escalates technical issues to support@company.com."</p>
                  <p><strong className="text-white">Define scope & boundaries.</strong> Clarify what the AI should not do — e.g., "does not process payments or access sensitive HR data."</p>
                  <p><strong className="text-white">Mention channels & tools.</strong> List where it operates: WhatsApp, email, Slack, website chat, internal docs.</p>
                  <p><strong className="text-white">Example:</strong> "Nira greets website visitors, qualifies leads by asking 3 discovery questions, books Calendly meetings, and sends follow-up summaries to the sales Slack channel."
                  </p>
                </>
              ) : (
                <>
                  <p><strong className="text-white">Show, don't just tell.</strong> Include 2–3 real sentences your team actually uses. The AI learns patterns from concrete examples.</p>
                  <p><strong className="text-white">Include do's and don'ts.</strong> "Do say: 'Let us walk you through this.' Don't say: 'It's easy, anyone can do it.'"</p>
                  <p><strong className="text-white">Note context shifts.</strong> Specify if tone changes by channel: formal for email, casual for WhatsApp, concise for Slack.</p>
                  <p><strong className="text-white">Example:</strong> "Greeting: 'Welcome to [Company] — how can we help you today?' Closing: 'Let us know if anything else comes up. We're here.' Avoid: 'Hey buddy', 'ASAP', all caps."
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt Examples Modal */}
      {promptExampleOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPromptExampleOpen(null)}>
          <div className="relative mx-4 max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setPromptExampleOpen(null)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {promptExampleOpen === "analysis" && "Analysis Prompt Example"}
              {promptExampleOpen === "proposal" && "Proposal Prompt Example"}
              {promptExampleOpen === "report" && "Report Prompt Example"}
              {promptExampleOpen === "email" && "Email Prompt Example"}
              {promptExampleOpen === "faq" && "FAQ Prompt Example"}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {promptExampleOpen === "analysis" && (
                <>
                  <p><strong className="text-white">User:</strong> "Analyze our Q3 sales data and compare it to Q2. Highlight what changed and why."</p>
                  <p><strong className="text-white">Clarifying question:</strong> "Do you want the analysis broken down by product line, region, or sales rep?"</p>
                  <p className="text-xs text-emerald-400">Teaches the AI to ask for structure before generating a vague summary.</p>
                </>
              )}
              {promptExampleOpen === "proposal" && (
                <>
                  <p><strong className="text-white">User:</strong> "Create a proposal for the new client interested in our AI consulting package."</p>
                  <p><strong className="text-white">Clarifying question:</strong> "What is the client's budget range and preferred timeline for implementation?"</p>
                  <p className="text-xs text-emerald-400">Teaches the AI to scope budget and timeline before writing a generic proposal.</p>
                </>
              )}
              {promptExampleOpen === "report" && (
                <>
                  <p><strong className="text-white">User:</strong> "Generate a weekly team performance report."</p>
                  <p><strong className="text-white">Clarifying question:</strong> "Which metrics matter most — closed deals, response time, or customer satisfaction scores?"</p>
                  <p className="text-xs text-emerald-400">Teaches the AI to prioritize metrics instead of dumping everything.</p>
                </>
              )}
              {promptExampleOpen === "email" && (
                <>
                  <p><strong className="text-white">User:</strong> "Draft a follow-up email to the prospect who went silent after the demo."</p>
                  <p><strong className="text-white">Clarifying question:</strong> "What was the last topic or objection they raised during the demo?"</p>
                  <p className="text-xs text-emerald-400">Teaches the AI to reference context before writing a hollow follow-up.</p>
                </>
              )}
              {promptExampleOpen === "faq" && (
                <>
                  <p><strong className="text-white">User:</strong> "How do I reset my password?"</p>
                  <p><strong className="text-white">Clarifying question:</strong> "Are you locked out of your account, or do you still have access and want to change it proactively?"</p>
                  <p className="text-xs text-emerald-400">Teaches the AI to diagnose the situation before giving a one-size-fits-all answer.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

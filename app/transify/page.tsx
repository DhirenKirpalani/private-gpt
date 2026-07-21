"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { translations, type TranslationKey } from "@/lib/translations"
import { publishTranslations, getTranslations } from "@/lib/supabase"
import { useAuth } from "@/app/auth-provider"

const ALL_KEYS = Object.keys(translations.en) as TranslationKey[]

function getSection(key: TranslationKey): string {
  const k = key as string
  if (["features","useCases","security","pricing","logIn","getStarted","menu","whyNow"].includes(k)) return "navbar"
  if (["product","integrations","resources","documentation","faq","contact","support","startBuilding","footerTagline","getStartedFree","copyright","privacy","terms","disclaimer","brandTagline"].includes(k)) return "footer"
  if (["welcomeBack","signInAccount","email","password","forgotPassword","signIn","noAccount","signUpFree","createAccount","getStartedFreeTagline","fullName","confirmPassword","agreeTerms","termsAnd","privacyPolicy","and","createAccountBtn","alreadyHaveAccount","signInLink"].includes(k)) return "auth"
  if (k.startsWith("login") || k.startsWith("signup")) return "auth-branding"
  if (k.startsWith("hero") || k.startsWith("mockup") || k.startsWith("comparison") || k.startsWith("industries") || k.startsWith("industry") || k.startsWith("howItWorks") || k.startsWith("step") || k.startsWith("integrationsTitle") || k.startsWith("integrationsSubtitle") || k.startsWith("integration") || k.startsWith("privacyTitle") || k.startsWith("privacySubtitle") || k.startsWith("privacyNo") || k.startsWith("privacyIs") || k.startsWith("privacyOwn") || k.startsWith("useCases") || k.startsWith("useCase") || k.startsWith("departments") || k.startsWith("dept") || k.startsWith("pricing") || k.startsWith("cta")) return "homepage"
  if (k.startsWith("aboutUs") || k.startsWith("pillar")) return "about"
  if (k === "faqTitle" || k === "faqs") return "faq"
  if (k.startsWith("transify") || k.startsWith("english") || k.startsWith("spanish") || k === "translate" || k === "clear" || k.startsWith("operator") || k === "addEntry" || k === "englishPhrase" || k === "spanishPhrase" || k === "delete" || k === "save" || k.startsWith("builtIn") || k.startsWith("customEntries") || k.startsWith("noCustom") || k.startsWith("placeholder") || k === "language") return "transify"
  if (k.startsWith("greeting")) return "greetings"
  if (k.startsWith("trial")) return "trial"
  if (k.startsWith("chat")) return "chat"
  if (k.startsWith("nav")) return "nav-rail"
  if (k.startsWith("profileIndustry")) return "profile-industry"
  if (k.startsWith("knowledge")) return "knowledge"
  if (k.startsWith("channel") || k.startsWith("channelDesc")) return "channels"
  if (k.startsWith("crm")) return "crm"
  if (k.startsWith("admin")) return "admin"
  if (k.startsWith("profile")) return "profile"
  if (k.startsWith("ws") || k.startsWith("createWorkspace")) return "workspace"
  if (k.startsWith("support")) return "support"
  if (["productTagline","goToChat","analyticsComingSoon","automationsComingSoon","agentsComingSoon","contactsComingSoon","inboxComingSoon"].includes(k)) return "misc"
  return "other"
}

const SECTION_LABELS: Record<string, string> = {
  navbar: "Navbar",
  footer: "Footer",
  auth: "Auth",
  "auth-branding": "Auth Branding",
  homepage: "Homepage",
  about: "About Us",
  faq: "FAQ",
  transify: "Transify",
  greetings: "Greetings",
  trial: "Trial",
  chat: "Chat",
  "nav-rail": "Nav Rail",
  "profile-industry": "Profile — Industries",
  knowledge: "Knowledge",
  channels: "Channels",
  crm: "CRM",
  admin: "Admin",
  profile: "Profile",
  workspace: "Workspace",
  support: "Support",
  misc: "Miscellaneous",
  other: "Other",
}

function isEdited(key: TranslationKey, draftVal: string | undefined, customVal: string | undefined, pubVal: string | undefined, baseEs: string): boolean {
  const current = draftVal !== undefined ? draftVal : (customVal ?? pubVal ?? baseEs)
  return current !== baseEs
}

function isPublished(key: TranslationKey, pubVal: string | undefined, baseEs: string): boolean {
  return pubVal !== undefined && pubVal !== baseEs
}

export default function TransifyPage() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const { customTrans, saveCustomTrans, reloadSupabaseTranslations } = useI18n()
  const [publishedEs, setPublishedEs] = useState<Partial<Record<TranslationKey, string>>>({})
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Record<TranslationKey, string>>>({ ...customTrans })
  const [publishLoading, setPublishLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (loading) return
    if (!user || role !== "super_admin") {
      router.push("/")
      return
    }
    setMounted(true)
    getTranslations("es").then(data => setPublishedEs(data as Partial<Record<TranslationKey, string>>)).catch(() => {})
  }, [user, role, loading, router])

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePublish = async () => {
    setPublishLoading(true)
    try {
      const entries = (Object.keys(draft) as TranslationKey[])
        .filter(key => {
          if (key === "faqs") return false
          const val = draft[key]!
          const base = translations.es[key] as string
          const publishedVal = publishedEs[key] ?? base
          return val !== publishedVal && val.trim() !== ""
        })
        .map(key => ({
          key: key as string,
          lang: "es",
          value: draft[key]!,
        }))

      if (entries.length === 0) {
        setToast("No changes to publish")
        setTimeout(() => setToast(""), 2000)
        setPublishLoading(false)
        return
      }

      await publishTranslations(entries)

      const nextDraft = { ...draft }
      entries.forEach(e => { delete nextDraft[e.key as TranslationKey] })
      setDraft(nextDraft)
      saveCustomTrans(nextDraft)

      const freshEs = await getTranslations("es")
      setPublishedEs(freshEs as Partial<Record<TranslationKey, string>>)
      await reloadSupabaseTranslations()

      setToast(`Published ${entries.length} translation${entries.length > 1 ? "s" : ""}`)
      setTimeout(() => setToast(""), 3000)
    } catch (err: any) {
      setToast(err.message || "Failed to publish")
      setTimeout(() => setToast(""), 4000)
    } finally {
      setPublishLoading(false)
    }
  }

  const updateDraft = (key: TranslationKey, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value }
      saveCustomTrans(next)
      return next
    })
  }

  const sections = useMemo(() => {
    const map = new Map<string, TranslationKey[]>()
    ALL_KEYS.forEach(key => {
      if (key === "faqs") return
      const sec = getSection(key)
      if (!map.has(sec)) map.set(sec, [])
      map.get(sec)!.push(key)
    })
    return Array.from(map.entries()).map(([id, keys]) => ({
      id,
      label: SECTION_LABELS[id] || id,
      keys: keys.sort(),
    }))
  }, [])

  const filteredSections = useMemo(() => {
    if (!activeSection) return sections
    return sections
      .filter(s => s.id === activeSection)
  }, [sections, activeSection])

  const editedCount = useMemo(() => {
    return (Object.keys(draft) as TranslationKey[]).filter(key => {
      if (key === "faqs") return false
      const val = draft[key]
      if (val === undefined) return false
      const baseEs = translations.es[key] as string
      const publishedVal = publishedEs[key] ?? baseEs
      return val !== publishedVal && val.trim() !== ""
    }).length
  }, [draft, publishedEs])

  const publishedCount = useMemo(() => {
    return ALL_KEYS.filter(key => {
      if (key === "faqs") return false
      const baseEs = translations.es[key] as string
      return isPublished(key, publishedEs[key], baseEs)
    }).length
  }, [publishedEs])

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!user || role !== "super_admin") {
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Translation Manager</h1>
          <p className="text-sm text-muted-foreground">Edit Spanish translations. Click Publish to make changes live.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toast && (
            <span className={cn("text-xs font-medium", toast.includes("Failed") || toast.includes("No changes") ? "text-red-400" : "text-emerald-400")}>{toast}</span>
          )}
          <Button size="sm" onClick={handlePublish} disabled={publishLoading || editedCount === 0} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {publishLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Publish {editedCount > 0 && `(${editedCount})`}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{publishedCount} published</span>
        <span className="text-white/10">·</span>
        <span className={editedCount > 0 ? "text-amber-400" : ""}>{editedCount} edited</span>
      </div>

      {/* Section filters */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 flex flex-col gap-3 bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveSection(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeSection === null ? "bg-emerald-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
          >
            All
          </button>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeSection === s.id ? "bg-emerald-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {filteredSections.map(section => {
          const isCollapsed = collapsedSections.has(section.id)
          return (
          <div key={section.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center gap-2 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", isCollapsed && "-rotate-90")} />
              <span className="text-sm font-semibold">{section.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">{section.keys.length}</span>
            </button>
            {!isCollapsed && (
            <div className="divide-y divide-white/5">
              {section.keys.map(key => {
                const en = translations.en[key] as string
                const baseEs = translations.es[key] as string
                const current = draft[key] !== undefined ? draft[key]! : (customTrans[key] ?? publishedEs[key] ?? baseEs)
                const publishedVal = publishedEs[key] ?? baseEs
                const edited = draft[key] !== undefined && draft[key] !== publishedVal && draft[key].trim() !== ""
                const published = isPublished(key, publishedEs[key], baseEs)
                const isEmpty = !current.trim()
                return (
                  <div key={key} className="grid gap-3 px-4 py-3 sm:grid-cols-[200px_1fr_1fr]">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        edited ? "bg-amber-400" : published ? "bg-emerald-400" : "bg-white/20"
                      )} />
                      <div className="min-w-0">
                        <code className="break-all text-[11px] text-muted-foreground">{key}</code>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                      {en}
                    </div>
                    <textarea
                      value={current}
                      onChange={e => updateDraft(key, e.target.value)}
                      rows={Math.min(4, Math.max(1, Math.ceil(current.length / 50)))}
                      className={cn(
                        "resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                        isEmpty
                          ? "border-red-500/40"
                          : edited
                            ? "border-amber-500/40"
                            : published
                              ? "border-emerald-500/40"
                              : "border-white/10"
                      )}
                    />
                  </div>
                )
              })}
            </div>
            )}
          </div>
          )
        })}

        {filteredSections.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-muted-foreground">No translations in this section.</p>
          </div>
        )}
      </div>
    </div>
  )
}

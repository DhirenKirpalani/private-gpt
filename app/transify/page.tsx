"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Save, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { translations, type TranslationKey } from "@/lib/translations"

const ALL_KEYS = Object.keys(translations.en) as TranslationKey[]

function getSection(key: TranslationKey): string {
  const k = key as string
  if (["features","useCases","security","pricing","logIn","getStarted","menu"].includes(k)) return "navbar"
  if (["product","integrations","resources","documentation","faq","contact","startBuilding","footerTagline","getStartedFree","copyright","privacy","terms","brandTagline"].includes(k)) return "footer"
  if (["welcomeBack","signInAccount","email","password","forgotPassword","signIn","noAccount","signUpFree","createAccount","getStartedFreeTagline","fullName","confirmPassword","agreeTerms","termsAnd","privacyPolicy","and","createAccountBtn","alreadyHaveAccount","signInLink"].includes(k)) return "auth"
  if (k.startsWith("login") || k.startsWith("signup")) return "auth-branding"
  if (k.startsWith("hero") || k.startsWith("mockup") || k.startsWith("comparison") || k.startsWith("industries") || k.startsWith("industry") || k.startsWith("howItWorks") || k.startsWith("step") || k.startsWith("integrationsTitle") || k.startsWith("integrationsSubtitle") || k.startsWith("privacyTitle") || k.startsWith("privacySubtitle") || k.startsWith("privacyNo") || k.startsWith("privacyIs") || k.startsWith("privacyOwn") || k.startsWith("useCases") || k.startsWith("useCase") || k.startsWith("departments") || k.startsWith("dept") || k.startsWith("pricing") || k.startsWith("cta")) return "homepage"
  if (k.startsWith("aboutUs") || k.startsWith("pillar")) return "about"
  if (k === "faqTitle") return "faq"
  if (k.startsWith("transify") || k.startsWith("english") || k.startsWith("spanish") || k === "translate" || k === "clear" || k.startsWith("operator") || k === "addEntry" || k === "englishPhrase" || k === "spanishPhrase" || k === "delete" || k === "save" || k.startsWith("builtIn") || k.startsWith("customEntries") || k.startsWith("noCustom") || k.startsWith("placeholder") || k === "language") return "transify"
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
  other: "Other",
}

export default function TransifyPage() {
  const { customTrans, saveCustomTrans } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Record<TranslationKey, string>>>({})
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setDraft({ ...customTrans })
  }, [customTrans])

  const handleSave = () => {
    saveCustomTrans({ ...draft })
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const handleReset = () => {
    setDraft({})
    saveCustomTrans({})
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const updateDraft = (key: TranslationKey, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }))
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
    if (!search.trim() && !activeSection) return sections
    const q = search.toLowerCase()
    return sections
      .filter(s => !activeSection || s.id === activeSection)
      .map(s => ({
        ...s,
        keys: s.keys.filter(k => {
          const en = (translations.en[k] as string).toLowerCase()
          const es = (translations.es[k] as string).toLowerCase()
          return k.toLowerCase().includes(q) || en.includes(q) || es.includes(q)
        }),
      }))
      .filter(s => s.keys.length > 0)
  }, [sections, search, activeSection])

  const hasChanges = useMemo(() => {
    const allKeys = Object.keys(draft) as TranslationKey[]
    return allKeys.some(k => draft[k] !== customTrans[k])
  }, [draft, customTrans])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Translation Manager</h1>
          <p className="text-sm text-muted-foreground">Edit Spanish translations per page section. Changes apply instantly across the app.</p>
        </div>
        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="text-xs font-medium text-emerald-400">Saved!</span>
          )}
          {hasChanges && (
            <span className="text-xs font-medium text-yellow-400">Unsaved changes</span>
          )}
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5 border-white/10">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Search & Section filters */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 flex flex-col gap-3 bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by key, English, or Spanish..."
            className="pl-9"
          />
        </div>
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
        {filteredSections.map(section => (
          <div key={section.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold">{section.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">{section.keys.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {section.keys.map(key => {
                const en = translations.en[key] as string
                const baseEs = translations.es[key] as string
                const current = draft[key] !== undefined ? draft[key]! : baseEs
                const isCustom = draft[key] !== undefined && draft[key] !== baseEs
                const isEmpty = !current.trim()
                return (
                  <div key={key} className="grid gap-3 px-4 py-3 sm:grid-cols-[200px_1fr_1fr]">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        isCustom ? "bg-emerald-400" : isEmpty ? "bg-red-400" : "bg-white/20"
                      )} />
                      <code className="break-all text-[11px] text-muted-foreground">{key}</code>
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
                        isCustom
                          ? "border-emerald-500/40"
                          : isEmpty
                            ? "border-red-500/40"
                            : "border-white/10"
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-muted-foreground">No translations match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

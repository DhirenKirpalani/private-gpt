"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Save, Info, X, ChevronDown, Check, Loader2, User, LogOut, Menu, CreditCard, ArrowRight, Building2, Plus, Settings, Trash2 } from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { getProfile, upsertProfile, uploadAvatar, uploadLogo, signOut, type Profile, getEmailConnections, getWhatsAppConnections, getCalendarConnections } from "@/lib/supabase"
import { toast, Toaster } from "@/components/ui/toast"
import { Calendar } from "@/components/ui/calendar"
import { BillingPortalButton } from "@/components/checkout-button"
import { isPaid, planName } from "@/lib/subscription"
import { TrialPill } from "@/components/trial-pill"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { useWorkspace } from "@/app/workspace-provider"
import { CreateWorkspaceModal } from "@/components/create-workspace-modal"
import { deleteWorkspace, type Workspace } from "@/lib/workspace"

const countries = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Korea, North","Korea, South","Kosovo","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
]

const countryCodes = [
  { code: "+1", flag: "🇺🇸", country: "USA" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+62", flag: "🇮🇩", country: "Indonesia" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
  { code: "+33", flag: "🇫🇷", country: "France" },
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+55", flag: "🇧🇷", country: "Brazil" },
  { code: "+52", flag: "🇲🇽", country: "Mexico" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+34", flag: "🇪🇸", country: "Spain" },
  { code: "+39", flag: "🇮🇹", country: "Italy" },
  { code: "+31", flag: "🇳🇱", country: "Netherlands" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
  { code: "+60", flag: "🇲🇾", country: "Malaysia" },
  { code: "+66", flag: "🇹🇭", country: "Thailand" },
  { code: "+63", flag: "🇵🇭", country: "Philippines" },
  { code: "+84", flag: "🇻🇳", country: "Vietnam" },
  { code: "+81", flag: "🇯🇵", country: "Japan" },
  { code: "+82", flag: "🇰🇷", country: "South Korea" },
  { code: "+86", flag: "🇨🇳", country: "China" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
  { code: "+90", flag: "🇹🇷", country: "Turkey" },
  { code: "+7", flag: "🇷🇺", country: "Russia" },
  { code: "+20", flag: "🇪🇬", country: "Egypt" },
  { code: "+27", flag: "🇿🇦", country: "South Africa" },
  { code: "+46", flag: "🇸🇪", country: "Sweden" },
  { code: "+47", flag: "🇳🇴", country: "Norway" },
  { code: "+45", flag: "🇩🇰", country: "Denmark" },
  { code: "+41", flag: "🇨🇭", country: "Switzerland" },
  { code: "+48", flag: "🇵🇱", country: "Poland" },
  { code: "+43", flag: "🇦🇹", country: "Austria" },
]

function extractCountryCode(phone: string): { code: string; local: string } {
  const trimmed = phone.trim()
  if (!trimmed.startsWith("+")) return { code: "", local: trimmed }
  // Sort by length descending so longer codes match first (e.g. +44 before +4)
  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (trimmed.startsWith(c.code)) {
      return { code: c.code, local: trimmed.slice(c.code.length).trim() }
    }
  }
  return { code: "", local: trimmed }
}

const defaultForm = {
  fullName: "",
  jobTitle: "",
  countryCode: "",
  phone: "",
  location: "",
  companyName: "",
  industry: "Consulting",
  companySize: "1-10",
  yearFounded: "",
  website: "",
  email: "",
  businessDescription: "",
  targetAudience: "",
  keyProducts: "",
  competitors: "",
  aiName: "",
  aiRole: "",
  brandVoice: "",
  communicationStyle: "Formal",
  toneExamples: "",
  wordsToAvoid: "",
  clarificationPrompt: "",
  responseLength: "Standard",
  tokenCap: 20000,
  avatarUrl: "",
  languages: "",
  logoUrl: "",
  primaryColor: "",
  secondaryColor: "",
  brandStyle: "cinematic" as "minimal" | "editorial" | "cinematic",
  brandMood: "futuristic" as "calm" | "bold" | "luxury" | "futuristic",
  inputStyle: "dark" as "dark" | "light",
  slogan: "",
  docCategories: "",
  preferredSources: "",
}

// JSONB helpers: array ↔ comma-separated string
function jsonbToString(val: any): string {
  if (Array.isArray(val)) return val.join(", ")
  if (typeof val === "string") return val
  return ""
}
function stringToJsonb(val: string): string[] {
  if (!val.trim()) return []
  return val.split(",").map(s => s.trim()).filter(Boolean)
}

function profileToForm(p: Profile | null) {
  if (!p) return defaultForm
  const parsedPhone = extractCountryCode(p.phone || "")
  return {
    fullName: p.full_name || "",
    jobTitle: p.job_title || "",
    countryCode: parsedPhone.code,
    phone: parsedPhone.local,
    location: p.location || "",
    companyName: p.company_name || "",
    industry: p.industry || "Consulting",
    companySize: p.company_size || "1-10",
    yearFounded: p.year_founded || "",
    website: p.website || "",
    email: p.contact_email || "",
    businessDescription: p.business_description || "",
    targetAudience: p.target_audience || "",
    keyProducts: p.key_products || "",
    competitors: jsonbToString(p.competitors),
    aiName: p.ai_name || "",
    aiRole: p.ai_role || "",
    brandVoice: p.brand_voice || "",
    communicationStyle: p.communication_style || "Formal",
    toneExamples: p.tone_examples || "",
    wordsToAvoid: p.words_to_avoid || "",
    clarificationPrompt: p.clarification_prompt || "",
    responseLength: p.response_length || "Standard",
    tokenCap: typeof p.token_cap === "number" ? p.token_cap : 20000,
    languages: jsonbToString(p.languages),
    avatarUrl: p.avatar_url || "",
    logoUrl: p.logo_url || "",
    primaryColor: (Array.isArray(p.brand_colors) ? p.brand_colors[0] : "") || "",
    secondaryColor: (Array.isArray(p.brand_colors) ? p.brand_colors[1] : "") || "",
    brandStyle: (p.brand_style || "cinematic") as "minimal" | "editorial" | "cinematic",
    brandMood: (p.brand_mood || "futuristic") as "calm" | "bold" | "luxury" | "futuristic",
    inputStyle: (p.input_style || "dark") as "dark" | "light",
    slogan: p.slogan || "",
    docCategories: jsonbToString(p.doc_categories),
    preferredSources: jsonbToString(p.preferred_sources),
  }
}

function formToProfile(form: typeof defaultForm): Partial<Profile> {
  return {
    full_name: form.fullName,
    job_title: form.jobTitle,
    phone: (form.countryCode + " " + form.phone).trim(),
    location: form.location,
    company_name: form.companyName,
    industry: form.industry,
    company_size: form.companySize,
    year_founded: form.yearFounded,
    website: form.website,
    contact_email: form.email,
    business_description: form.businessDescription,
    target_audience: form.targetAudience,
    key_products: form.keyProducts,
    competitors: stringToJsonb(form.competitors),
    ai_name: form.aiName,
    ai_role: form.aiRole,
    brand_voice: form.brandVoice,
    communication_style: form.communicationStyle,
    tone_examples: form.toneExamples,
    words_to_avoid: form.wordsToAvoid,
    clarification_prompt: form.clarificationPrompt,
    response_length: form.responseLength,
    token_cap: form.tokenCap,
    languages: stringToJsonb(form.languages),
    avatar_url: form.avatarUrl,
    logo_url: form.logoUrl,
    brand_colors: [form.primaryColor, form.secondaryColor].filter(Boolean),
    brand_style: form.brandStyle,
    brand_mood: form.brandMood,
    input_style: form.inputStyle,
    slogan: form.slogan,
    doc_categories: stringToJsonb(form.docCategories),
    preferred_sources: stringToJsonb(form.preferredSources),
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshProfile, subscription, role } = useAuth()
  const { workspaces, refreshWorkspaces, setCurrentWorkspace } = useWorkspace()
  const { t, lang, setLang } = useI18n()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null)
  const [promptExampleOpen, setPromptExampleOpen] = useState<string | null>(null)
  const [responseDropdownOpen, setResponseDropdownOpen] = useState(false)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState("")
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [companySizeDropdownOpen, setCompanySizeDropdownOpen] = useState(false)
  const [commStyleDropdownOpen, setCommStyleDropdownOpen] = useState(false)
  const [docCategoriesDropdownOpen, setDocCategoriesDropdownOpen] = useState(false)
  const [preferredSourcesDropdownOpen, setPreferredSourcesDropdownOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [languagesDropdownOpen, setLanguagesDropdownOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [originalForm, setOriginalForm] = useState(defaultForm)
  const [navOpen, setNavOpen] = useState(false)
  const [emailConnections, setEmailConnections] = useState<any[]>([])
  const [whatsappConnections, setWhatsappConnections] = useState<any[]>([])
  const [calendarConnections, setCalendarConnections] = useState<any[]>([])
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    async function load() {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        setLoadError(null)
        const [profile, emailConns, waConns, calConns] = await Promise.all([
          getProfile(user.id),
          getEmailConnections(user.id),
          getWhatsAppConnections(user.id),
          getCalendarConnections(user.id),
        ])
        setEmailConnections(emailConns)
        setWhatsappConnections(waConns)
        setCalendarConnections(calConns)
        console.log("[AVATAR DEBUG] Raw profile from DB:", profile)
        console.log("[AVATAR DEBUG] avatar_url field:", profile?.avatar_url)
        const loaded = profileToForm(profile)
        if (!loaded.email) loaded.email = user.email || ""
        console.log("[AVATAR DEBUG] Form avatarUrl after mapping:", loaded.avatarUrl)
        if (loaded.fullName) localStorage.setItem("exploro_user_name", loaded.fullName)
        setForm(loaded)
        setOriginalForm(loaded)
      } catch (err: any) {
        console.error("Failed to load profile:", err)
        setLoadError(err.message || "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, authLoading])

  const update = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }))

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm)
  }, [form, originalForm])

  const handleSave = async (showAlert = true) => {
    if (!user || !hasChanges) return
    setSaveLoading(true)
    try {
      await upsertProfile({ user_id: user.id, ...formToProfile(form) })
      // Sync theme to localStorage so Chat page picks up changes
      if (form.primaryColor) localStorage.setItem("exploro_theme_primary", form.primaryColor)
      if (form.secondaryColor) localStorage.setItem("exploro_theme_secondary", form.secondaryColor)
      localStorage.setItem("exploro_theme_style", form.brandStyle)
      localStorage.setItem("exploro_theme_mood", form.brandMood)
      localStorage.setItem("exploro_input_dark", form.inputStyle === "dark" ? "true" : "false")
      setOriginalForm(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      console.error("Failed to save profile:", err)
      if (showAlert) toast({ title: t("profileErrorSaveTitle") || "Error", description: err.message || t("profileErrorSave"), variant: "error" })
    } finally {
      setSaveLoading(false)
    }
  }

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#countryCodeBtn") && !target.closest("#countryDropdownPanel")) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [countryDropdownOpen])

  // Close location dropdown on outside click
  useEffect(() => {
    if (!locationDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#locationDropdownBtn") && !target.closest("#locationDropdownPanel")) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [locationDropdownOpen])

  // Close industry dropdown on outside click
  useEffect(() => {
    if (!industryDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#industryDropdownBtn") && !target.closest("#industryDropdownPanel")) {
        setIndustryDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [industryDropdownOpen])

  // Close company size dropdown on outside click
  useEffect(() => {
    if (!companySizeDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#companySizeDropdownBtn") && !target.closest("#companySizeDropdownPanel")) {
        setCompanySizeDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [companySizeDropdownOpen])

  // Close communication style dropdown on outside click
  useEffect(() => {
    if (!commStyleDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#commStyleDropdownBtn") && !target.closest("#commStyleDropdownPanel")) {
        setCommStyleDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [commStyleDropdownOpen])

  // Close doc categories dropdown on outside click
  useEffect(() => {
    if (!docCategoriesDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#docCategoriesDropdownBtn") && !target.closest("#docCategoriesDropdownPanel")) {
        setDocCategoriesDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [docCategoriesDropdownOpen])

  // Close preferred sources dropdown on outside click
  useEffect(() => {
    if (!preferredSourcesDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#preferredSourcesDropdownBtn") && !target.closest("#preferredSourcesDropdownPanel")) {
        setPreferredSourcesDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [preferredSourcesDropdownOpen])

  // Close date picker dropdown on outside click
  useEffect(() => {
    if (!datePickerOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#datePickerBtn") && !target.closest("#datePickerPanel")) {
        setDatePickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [datePickerOpen])

  // Close languages dropdown on outside click
  useEffect(() => {
    if (!languagesDropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#languagesDropdownBtn") && !target.closest("#languagesDropdownPanel")) {
        setLanguagesDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [languagesDropdownOpen])

  // Auto-save after 1.5s of inactivity when there are changes
  useEffect(() => {
    if (!user || loading || !hasChanges) return
    const timeout = setTimeout(() => {
      handleSave(false)
    }, 1500)
    return () => clearTimeout(timeout)
  }, [form, user, hasChanges, loading])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (err: any) {
      toast({ title: t("profileErrorLogoutTitle") || "Error", description: err.message || t("profileErrorLogout"), variant: "error" })
    }
  }

  const allowedImageTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log("[DEBUG handleAvatarUpload] file selected:", file?.name, "type:", file?.type, "user:", user?.id)
    if (!file || !user) {
      console.log("[DEBUG handleAvatarUpload] ABORT - no file or no user")
      return
    }
    if (!allowedImageTypes.has(file.type)) {
      toast({ title: t("profileErrorImageTitle") || "Invalid file", description: t("profileErrorImage"), variant: "error" })
      return
    }
    setSaveLoading(true)
    try {
      console.log("[DEBUG handleAvatarUpload] Calling uploadAvatar...")
      const publicUrl = await uploadAvatar(user.id, file)
      console.log("[DEBUG handleAvatarUpload] uploadAvatar returned:", publicUrl)
      setForm(f => ({ ...f, avatarUrl: publicUrl }))
      console.log("[DEBUG handleAvatarUpload] Calling upsertProfile with:", { user_id: user.id, avatar_url: publicUrl })
      await upsertProfile({ user_id: user.id, avatar_url: publicUrl })
      console.log("[DEBUG handleAvatarUpload] upsertProfile SUCCESS")
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      console.error("[DEBUG handleAvatarUpload] CATCH error:", err)
      console.error("[DEBUG handleAvatarUpload] CATCH error.message:", err?.message)
      console.error("[DEBUG handleAvatarUpload] CATCH error.code:", err?.code)
      console.error("[DEBUG handleAvatarUpload] CATCH error.details:", err?.details)
      toast({ title: t("profileErrorAvatarTitle") || "Upload failed", description: err.message || t("profileErrorAvatar"), variant: "error" })
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* Header */}
      <header className="relative z-40 flex h-16 md:h-16 shrink-0 items-center gap-2 md:gap-4 border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
        <button
          onClick={() => setNavOpen(true)}
          className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2 overflow-hidden">
          <Image src="/assets/images/exploro-logo.png" alt="Exploro OS" width={140} height={40} className="h-[36px] w-auto object-contain sm:h-[38px] md:h-[40px]" />
          <span className="inline-block rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
        </Link>
        <div className="flex flex-1 justify-end items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Language toggle */}
          <div className="hidden md:inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all sm:px-2.5 sm:text-xs",
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
                "rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all sm:px-2.5 sm:text-xs",
                lang === "es"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              ES
            </button>
          </div>
          <TrialPill className="hidden md:flex" />
          <Link href="/chat" className={cn("relative flex h-9 w-9 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white transition-colors overflow-hidden", form.avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600 hover:bg-emerald-500")}>
            {!form.avatarUrl && (form.fullName.trim()
              ? form.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
              : <User className="h-5 w-5 md:h-4 md:w-4 text-white" />)}
            {form.avatarUrl && (
              <Image
                src={form.avatarUrl}
                alt="Your avatar"
                fill
                sizes="36px"
                className="absolute inset-0 h-full w-full rounded-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail mobileOpen={navOpen} onClose={() => setNavOpen(false)} />

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-8 sm:py-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("profileTitle")}</h1>
                <p className="mt-0.5 sm:mt-1 text-sm text-muted-foreground">{t("profileSubtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs sm:text-sm font-semibold text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 sm:px-4"
                >
                  <LogOut className="h-4 w-4" />
                  {t("profileLogout")}
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={saveLoading || !hasChanges}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors sm:px-4",
                    saved ? "bg-emerald-600/20 text-emerald-400" : hasChanges ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-muted text-muted-foreground cursor-not-allowed",
                    saveLoading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saved ? t("profileSaved") : t("profileSaveChanges")}
                </button>
              </div>
            </div>

            <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8 px-4 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8">

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            )}

            {loadError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {loadError}
              </div>
            )}

            <div className={cn("space-y-6 sm:space-y-8", loading && "hidden")}>

            {/* Account Profile Card */}
            <section className="card-3d mb-6 sm:mb-8 rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative">
                  {(() => {
                    console.log("[AVATAR DEBUG] Rendering avatar. avatarUrl:", form.avatarUrl, "| fullName:", form.fullName)
                    return null
                  })()}
                  <div className={`relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white overflow-hidden ${form.avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600"}`}>
                    {!form.avatarUrl && (form.fullName.trim()
                      ? form.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                      : <User className="h-10 w-10 text-white/80" />)}
                    {form.avatarUrl && (
                      <Image
                        src={form.avatarUrl}
                        alt="Your avatar"
                        fill
                        sizes="80px"
                        className="absolute inset-0 h-full w-full rounded-full object-cover"
                        onError={e => {
                          console.error("[AVATAR DEBUG] Image failed to load:", form.avatarUrl)
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-muted-foreground backdrop-blur-sm border border-white/10 hover:bg-emerald-600 hover:text-white transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="sr-only"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-white">{form.fullName}</h2>
                  {form.jobTitle && form.companyName && (
                    <p className="text-sm text-emerald-400">{form.jobTitle} {t("profileAt")} {form.companyName}</p>
                  )}
                  {form.jobTitle && !form.companyName && (
                    <p className="text-sm text-emerald-400">{form.jobTitle}</p>
                  )}
                  {!form.jobTitle && form.companyName && (
                    <p className="text-sm text-emerald-400">{form.companyName}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{form.email}</p>
                  <p className="mt-0.5 text-xs text-white/40 font-mono break-all">User ID: {user?.id}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">{t("profileSoloPlan")}</span>
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{form.location}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Personal */}
            <section className="relative z-20 card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionPersonal")}</h2>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{t("profileLabelFullName")}</Label>
                  <Input id="fullName" value={form.fullName} onChange={e => update("fullName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">{t("profileLabelJobTitle")}</Label>
                  <Input id="jobTitle" value={form.jobTitle} onChange={e => update("jobTitle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("profileLabelPhone")}</Label>
                  <div className="flex gap-2">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        id="countryCodeBtn"
                        onClick={() => setCountryDropdownOpen(o => !o)}
                        className={cn(
                          "flex h-10 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                          !form.countryCode && "text-muted-foreground"
                        )}
                      >
                        {form.countryCode
                          ? (() => {
                              const found = countryCodes.find(c => c.code === form.countryCode)
                              return found ? `${found.flag} ${found.code}` : form.countryCode
                            })()
                          : "🇺🇳 Code"}
                        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", countryDropdownOpen && "rotate-180")} />
                      </button>
                      {countryDropdownOpen && (
                        <div
                          id="countryDropdownPanel"
                          className="absolute left-0 top-full z-50 mt-1 max-h-96 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#2a3444] shadow-2xl"
                        >
                          <div className="sticky top-0 border-b border-white/5 bg-[#2a3444] px-3 py-2.5">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={e => setCountrySearch(e.target.value)}
                                placeholder="Search country or code..."
                                className="w-full rounded-lg border border-white/10 bg-background py-2 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-80 overflow-y-auto py-1">
                            {(() => {
                              const q = countrySearch.trim().toLowerCase()
                              const filtered = q
                                ? countryCodes.filter(
                                    c =>
                                      c.country.toLowerCase().includes(q) ||
                                      c.code.replace("+", "").includes(q)
                                  )
                                : countryCodes
                              if (filtered.length === 0) {
                                return (
                                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    No countries found
                                  </p>
                                )
                              }
                              return filtered.map(c => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    update("countryCode", c.code)
                                    setCountryDropdownOpen(false)
                                    setCountrySearch("")
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                    form.countryCode === c.code ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  <span className="text-lg">{c.flag}</span>
                                  <span className="flex-1 text-left">{c.country}</span>
                                  <span className="text-xs text-muted-foreground">{c.code}</span>
                                  {form.countryCode === c.code && <Check className="h-4 w-4 text-emerald-400" />}
                                </button>
                              ))
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={e => update("phone", e.target.value)}
                      placeholder="8123456789"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">{t("profileLabelLocation")}</Label>
                  <div className="relative">
                    <button
                      type="button"
                      id="locationDropdownBtn"
                      onClick={() => setLocationDropdownOpen(o => !o)}
                      className={cn(
                        "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                        !form.location && "text-muted-foreground"
                      )}
                    >
                      <span className="min-w-0 truncate">{form.location || "Select a country..."}</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", locationDropdownOpen && "rotate-180")} />
                    </button>
                    {locationDropdownOpen && (
                      <div
                        id="locationDropdownPanel"
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-hidden rounded-xl border border-white/10 bg-[#2a3444] shadow-2xl"
                      >
                        <div className="sticky top-0 border-b border-white/5 bg-[#2a3444] px-3 py-2.5">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={locationSearch}
                              onChange={e => setLocationSearch(e.target.value)}
                              placeholder="Search country..."
                              className="w-full rounded-lg border border-white/10 bg-background py-2 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto py-1">
                          {(() => {
                            const q = locationSearch.trim().toLowerCase()
                            const filtered = q
                              ? countries.filter(c => c.toLowerCase().includes(q))
                              : countries
                            if (filtered.length === 0) {
                              return (
                                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                  No countries found
                                </p>
                              )
                            }
                            return filtered.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  update("location", c)
                                  setLocationDropdownOpen(false)
                                  setLocationSearch("")
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                  form.location === c ? "text-emerald-400" : "text-white"
                                )}
                              >
                                {c}
                                {form.location === c && <Check className="h-4 w-4 text-emerald-400" />}
                              </button>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Company */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionCompany")}</h2>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">{t("profileLabelCompanyName")}</Label>
                  <Input id="companyName" value={form.companyName} onChange={e => update("companyName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">{t("profileLabelIndustry")}</Label>
                  <div className="relative">
                    {(() => {
                      const industries = ["Consulting","Agencies","Real Estate","Healthcare","Education","Wellness","Restaurants","Technology","Legal","Finance","SMB","Marketing","Manufacturing","Hospitality","Other"]
                      const industryLabels: Record<string, string> = {
                        Consulting: t("profileIndustryConsulting"),
                        Agencies: t("profileIndustryAgencies"),
                        "Real Estate": t("profileIndustryRealEstate"),
                        Healthcare: t("profileIndustryHealthcare"),
                        Education: t("profileIndustryEducation"),
                        Wellness: t("profileIndustryWellness"),
                        Restaurants: t("profileIndustryRestaurants"),
                        Technology: t("profileIndustryTechnology"),
                        Legal: t("profileIndustryLegal"),
                        Finance: t("profileIndustryFinance"),
                        SMB: t("profileIndustrySMB"),
                        Marketing: t("profileIndustryMarketing"),
                        Manufacturing: t("profileIndustryManufacturing"),
                        Hospitality: t("profileIndustryHospitality"),
                        Other: t("profileIndustryOther"),
                      }
                      return (
                        <>
                          <button
                            type="button"
                            id="industryDropdownBtn"
                            onClick={() => setIndustryDropdownOpen(o => !o)}
                            className={cn(
                              "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                              !form.industry && "text-muted-foreground"
                            )}
                          >
                            <span className="min-w-0 truncate">{industryLabels[form.industry] || form.industry}</span>
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", industryDropdownOpen && "rotate-180")} />
                          </button>
                          {industryDropdownOpen && (
                            <div
                              id="industryDropdownPanel"
                              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                            >
                              {industries.map(i => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => { update("industry", i); setIndustryDropdownOpen(false) }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                    form.industry === i ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {industryLabels[i] || i}
                                  {form.industry === i && <Check className="h-4 w-4 text-emerald-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companySize">{t("profileLabelCompanySize")}</Label>
                  <div className="relative">
                    <button
                      type="button"
                      id="companySizeDropdownBtn"
                      onClick={() => setCompanySizeDropdownOpen(o => !o)}
                      className={cn(
                        "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      )}
                    >
                      <span className="min-w-0 truncate">{form.companySize}</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", companySizeDropdownOpen && "rotate-180")} />
                    </button>
                    {companySizeDropdownOpen && (
                      <div
                        id="companySizeDropdownPanel"
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                      >
                        {["1-10","11-50","51-200","201-500","500+"].map(i => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { update("companySize", i); setCompanySizeDropdownOpen(false) }}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                              form.companySize === i ? "text-emerald-400" : "text-white"
                            )}
                          >
                            {i}
                            {form.companySize === i && <Check className="h-4 w-4 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="yearFounded">{t("profileLabelYearFounded")}</Label>
                  <button
                    type="button"
                    id="datePickerBtn"
                    onClick={() => setDatePickerOpen(o => !o)}
                    className={cn(
                      "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                      form.yearFounded ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    <span className="min-w-0 truncate">{form.yearFounded
                      ? (() => {
                          const d = new Date(form.yearFounded)
                          return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/")
                        })()
                      : "dd/mm/yyyy"}</span>
                    <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </button>
                  {datePickerOpen && (
                    <div id="datePickerPanel" className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/10 bg-[#2a3444] p-3 shadow-2xl">
                      <Calendar
                        value={form.yearFounded}
                        onChange={(val) => {
                          update("yearFounded", val)
                          setDatePickerOpen(false)
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">{t("profileLabelWebsite")}</Label>
                  <Input id="website" type="url" value={form.website} onChange={e => update("website", e.target.value)} placeholder={t("profilePlaceholderWebsite")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("profileLabelContactEmail")}</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="businessDescription">{t("profileLabelBusinessDesc")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("businessDescription")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    id="businessDescription"
                    rows={3}
                    value={form.businessDescription}
                    onChange={e => update("businessDescription", e.target.value)}
                    placeholder={t("profilePlaceholderBusinessDesc")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="targetAudience">{t("profileLabelTargetAudience")}</Label>
                  <textarea
                    id="targetAudience"
                    rows={2}
                    value={form.targetAudience}
                    onChange={e => update("targetAudience", e.target.value)}
                    placeholder={t("profilePlaceholderTargetAudience")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="keyProducts">{t("profileLabelKeyProducts")}</Label>
                  <Input id="keyProducts" value={form.keyProducts} onChange={e => update("keyProducts", e.target.value)} />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="competitors">{t("profileLabelCompetitors")}</Label>
                  <Input id="competitors" value={form.competitors} onChange={e => update("competitors", e.target.value)} />
                </div>
              </div>
            </section>

            {/* AI Configuration */}
            <section className="relative z-10 card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionAI")}</h2>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="aiName">{t("profileLabelAIName")}</Label>
                  <Input id="aiName" value={form.aiName} onChange={e => update("aiName", e.target.value)} placeholder={t("profilePlaceholderAIName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="communicationStyle">{t("profileLabelCommStyle")}</Label>
                  <div className="relative">
                    {(() => {
                      const commStyleLabels: Record<string, string> = {
                        Formal: t("profileCommStyleFormal"),
                        Professional: t("profileCommStyleProfessional"),
                        Friendly: t("profileCommStyleFriendly"),
                        Casual: t("profileCommStyleCasual"),
                        Concise: t("profileCommStyleConcise"),
                        Enthusiastic: t("profileCommStyleEnthusiastic"),
                      }
                      return (
                        <>
                          <button
                            type="button"
                            id="commStyleDropdownBtn"
                            onClick={() => setCommStyleDropdownOpen(o => !o)}
                            className={cn(
                              "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            )}
                          >
                            <span className="min-w-0 truncate">{commStyleLabels[form.communicationStyle] || form.communicationStyle}</span>
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", commStyleDropdownOpen && "rotate-180")} />
                          </button>
                          {commStyleDropdownOpen && (
                            <div
                              id="commStyleDropdownPanel"
                              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                            >
                              {["Formal","Professional","Friendly","Casual","Concise","Enthusiastic"].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => { update("communicationStyle", s); setCommStyleDropdownOpen(false) }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                    form.communicationStyle === s ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {commStyleLabels[s] || s}
                                  {form.communicationStyle === s && <Check className="h-4 w-4 text-emerald-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="aiRole">{t("profileLabelAIRole")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("aiRole")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    id="aiRole"
                    rows={3}
                    value={form.aiRole}
                    onChange={e => update("aiRole", e.target.value)}
                    placeholder={t("profilePlaceholderAIRole")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="brandVoice">{t("profileLabelBrandVoice")}</Label>
                  <textarea
                    id="brandVoice"
                    rows={3}
                    value={form.brandVoice}
                    onChange={e => update("brandVoice", e.target.value)}
                    placeholder={t("profilePlaceholderBrandVoice")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="toneExamples">{t("profileLabelToneExamples")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("toneExamples")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    id="toneExamples"
                    rows={2}
                    value={form.toneExamples}
                    onChange={e => update("toneExamples", e.target.value)}
                    placeholder={t("profilePlaceholderToneExamples")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="wordsToAvoid">{t("profileLabelWordsToAvoid")}</Label>
                  <Input id="wordsToAvoid" value={form.wordsToAvoid} onChange={e => update("wordsToAvoid", e.target.value)} placeholder={t("profilePlaceholderWordsToAvoid")} />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="clarificationPrompt">{t("profileLabelClarificationPrompt")}</Label>
                  <textarea
                    id="clarificationPrompt"
                    rows={4}
                    value={form.clarificationPrompt}
                    onChange={e => update("clarificationPrompt", e.target.value)}
                    placeholder={t("profilePlaceholderClarification")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{t("profileHelperClarification")}</p>
                </div>

                {/* Prompt Use Case Examples */}
                <div className="min-w-0 space-y-2 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("profilePromptExamplesTitle")}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "analysis", label: t("profilePromptAnalysis") },
                      { key: "proposal", label: t("profilePromptProposal") },
                      { key: "report", label: t("profilePromptReport") },
                      { key: "email", label: t("profilePromptEmail") },
                      { key: "faq", label: t("profilePromptFAQ") },
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
                  <Label>{t("profileLabelPreferredResponse")}</Label>
                  <button
                    type="button"
                    onClick={() => setResponseDropdownOpen(o => !o)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                      !form.responseLength && "text-muted-foreground"
                    )}
                  >
                    {(() => {
                      const responseLengthLabels: Record<string, string> = {
                        Concise: t("profileResponseConcise"),
                        Standard: t("profileResponseStandard"),
                        Detailed: t("profileResponseDetailed"),
                        Comprehensive: t("profileResponseComprehensive"),
                      }
                      return responseLengthLabels[form.responseLength] || form.responseLength
                    })()}
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", responseDropdownOpen && "rotate-180")} />
                  </button>
                  {responseDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl">
                      {["Concise","Standard","Detailed","Comprehensive"].map(s => {
                        const responseLengthLabels: Record<string, string> = {
                          Concise: t("profileResponseConcise"),
                          Standard: t("profileResponseStandard"),
                          Detailed: t("profileResponseDetailed"),
                          Comprehensive: t("profileResponseComprehensive"),
                        }
                        return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { update("responseLength", s); setResponseDropdownOpen(false) }}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-emerald-600/10",
                            form.responseLength === s ? "text-emerald-400" : "text-white"
                          )}
                        >
                          {responseLengthLabels[s] || s}
                          {form.responseLength === s && <Check className="h-4 w-4" />}
                        </button>
                      )})}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>{t("profileLabelTokenCap")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("tokenCap")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex h-10 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white">
                    {form.tokenCap.toLocaleString()} tokens
                  </div>
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="languages">{t("profileLabelLanguages")}</Label>
                  {(() => {
                    const langOptions = [
                      "English", "Spanish", "French", "German", "Portuguese",
                      "Italian", "Dutch", "Russian", "Chinese", "Japanese",
                      "Korean", "Arabic", "Hindi", "Indonesian", "Turkish",
                      "Thai", "Vietnamese", "Polish", "Swedish", "Danish",
                    ]
                    const rawLangs: any = form.languages
                    const langValue = typeof rawLangs === "string" ? rawLangs : (Array.isArray(rawLangs) ? rawLangs.join(", ") : "")
                    const selectedSet = new Set(langValue.split(",").map((s: string) => s.trim()).filter(Boolean))
                    const toggle = (key: string) => {
                      const next = new Set(selectedSet)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      update("languages", Array.from(next).join(", "))
                    }
                    const displayText = langValue.trim()
                      ? langValue.split(",").map((s: string) => s.trim()).filter(Boolean).join(", ")
                      : t("profilePlaceholderLanguages") || "Select languages..."
                    return (
                      <>
                        <button
                          type="button"
                          id="languagesDropdownBtn"
                          onClick={() => setLanguagesDropdownOpen(o => !o)}
                          className={cn(
                            "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                            !langValue.trim() && "text-muted-foreground"
                          )}
                        >
                          <span className="min-w-0 truncate">{displayText}</span>
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", languagesDropdownOpen && "rotate-180")} />
                        </button>
                        {languagesDropdownOpen && (
                          <div
                            id="languagesDropdownPanel"
                            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                          >
                            {langOptions.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggle(opt)}
                                className={cn(
                                  "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                  selectedSet.has(opt) ? "text-emerald-400" : "text-white"
                                )}
                              >
                                {opt}
                                {selectedSet.has(opt) && <Check className="h-4 w-4 text-emerald-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </section>

            {/* Brand Identity */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionBrand")}</h2>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>{t("profileLabelUploadLogo")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("logoUpload")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  {form.logoUrl && (
                    <div className="mb-2 flex items-center gap-3">
                      <Image
                        src={form.logoUrl}
                        alt="Company logo"
                        width={160}
                        height={40}
                        className="h-10 w-auto max-w-[160px] rounded object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#2a3444] px-3 py-2.5 text-sm transition-colors hover:border-emerald-500/30">
                    <div className="flex h-8 items-center justify-center rounded bg-emerald-600/15 px-3 text-xs font-semibold text-emerald-400">
                      {t("profileBrowse")}
                    </div>
                    <span className="truncate text-muted-foreground">
                      {form.logoUrl ? "Change logo" : t("profilePlaceholderLogo")}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="sr-only"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file || !user) return
                        if (!allowedImageTypes.has(file.type)) {
                          toast({ title: t("profileErrorImageTitle") || "Invalid file", description: t("profileErrorImage"), variant: "error" })
                          return
                        }
                        setSaveLoading(true)
                        try {
                          const publicUrl = await uploadLogo(user.id, file)
                          setForm(f => ({ ...f, logoUrl: publicUrl }))
                          await upsertProfile({ user_id: user.id, logo_url: publicUrl })
                          setSaved(true)
                          setTimeout(() => setSaved(false), 2000)
                        } catch (err: any) {
                          toast({ title: t("profileErrorLogoTitle") || "Upload failed", description: err.message || "Could not upload logo", variant: "error" })
                        } finally {
                          setSaveLoading(false)
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>{t("profileLabelBrandColors")}</Label>
                    <button type="button" onClick={() => setTooltipOpen("brandColors")} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Primary Color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => document.getElementById("primaryColorPicker")?.click()}
                            className="h-10 w-10 shrink-0 rounded-md border border-white/10 overflow-hidden relative"
                            style={{ backgroundColor: form.primaryColor || "transparent" }}
                            title="Pick primary color"
                          >
                            {!form.primaryColor && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-4 w-0.5 bg-muted-foreground/40 rotate-45" />
                              </div>
                            )}
                          </button>
                          {form.primaryColor && (
                            <button
                              type="button"
                              onClick={() => update("primaryColor", "")}
                              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-white text-[8px] hover:bg-red-500 transition-colors"
                              title="Clear"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                          <input
                            id="primaryColorPicker"
                            type="color"
                            value={form.primaryColor || "#6D5EF6"}
                            onChange={e => update("primaryColor", e.target.value)}
                            className="sr-only"
                          />
                        </div>
                        <Input
                          value={form.primaryColor}
                          onChange={e => update("primaryColor", e.target.value)}
                          placeholder="#6D5EF6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    {/* Secondary Color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Secondary (optional)</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => document.getElementById("secondaryColorPicker")?.click()}
                            className="h-10 w-10 shrink-0 rounded-md border border-white/10 overflow-hidden relative"
                            style={{ backgroundColor: form.secondaryColor || "transparent" }}
                            title="Pick secondary color"
                          >
                            {!form.secondaryColor && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-4 w-0.5 bg-muted-foreground/40 rotate-45" />
                              </div>
                            )}
                          </button>
                          {form.secondaryColor && (
                            <button
                              type="button"
                              onClick={() => update("secondaryColor", "")}
                              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-white text-[8px] hover:bg-red-500 transition-colors"
                              title="Clear"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                          <input
                            id="secondaryColorPicker"
                            type="color"
                            value={form.secondaryColor || "#22D3EE"}
                            onChange={e => update("secondaryColor", e.target.value)}
                            className="sr-only"
                          />
                        </div>
                        <Input
                          value={form.secondaryColor}
                          onChange={e => update("secondaryColor", e.target.value)}
                          placeholder="#22D3EE"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Style */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Style Preference</Label>
                    <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-white/10 p-0.5">
                      {(["minimal", "editorial", "cinematic"] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => update("brandStyle", s)}
                          className={cn(
                            "rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
                            form.brandStyle === s
                              ? "bg-emerald-600 text-white"
                              : "text-muted-foreground hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mood (optional)</Label>
                    <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-white/10 p-0.5 sm:grid-cols-4">
                      {(["calm", "bold", "luxury", "futuristic"] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => update("brandMood", m)}
                          className={cn(
                            "rounded-md py-1.5 text-[11px] font-medium capitalize transition-colors",
                            form.brandMood === m
                              ? "bg-emerald-600 text-white"
                              : "text-muted-foreground hover:text-white"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Style */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Chat Input Style</Label>
                    <div className="grid grid-cols-2 w-48 rounded-lg border border-white/10 p-0.5">
                      {(["dark", "light"] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            update("inputStyle", s)
                            localStorage.setItem("exploro_input_dark", s === "dark" ? "true" : "false")
                          }}
                          className={cn(
                            "rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
                            form.inputStyle === s
                              ? "bg-emerald-600 text-white"
                              : "text-muted-foreground hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="slogan">{t("profileLabelSlogan")}</Label>
                  <Input id="slogan" value={form.slogan} onChange={e => update("slogan", e.target.value)} />
                </div>
              </div>
            </section>

            {/* Knowledge & Content */}
            <section className="relative z-20 card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionKnowledge")}</h2>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="docCategories">{t("profileLabelDocCategories")}</Label>
                  <div className="relative">
                    {(() => {
                      const docOptions = [
                        { key: "SOPs", label: t("knowledgeCategorySOPs") },
                        { key: "FAQs", label: t("knowledgeCategoryFAQs") },
                        { key: "Training", label: t("knowledgeCategoryTraining") },
                        { key: "Policies", label: t("knowledgeCategoryPolicies") },
                        { key: "Reports", label: t("knowledgeCategoryReports") },
                      ]
                      const selectedSet = new Set(form.docCategories.split(",").map(s => s.trim()).filter(Boolean))
                      const toggle = (key: string) => {
                        const next = new Set(selectedSet)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        update("docCategories", Array.from(next).join(", "))
                      }
                      const displayText = form.docCategories.trim()
                        ? form.docCategories.split(",").map(s => s.trim()).filter(Boolean).join(", ")
                        : "Select categories..."
                      return (
                        <>
                          <button
                            type="button"
                            id="docCategoriesDropdownBtn"
                            onClick={() => setDocCategoriesDropdownOpen(o => !o)}
                            className={cn(
                              "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                              !form.docCategories.trim() && "text-muted-foreground"
                            )}
                          >
                            <span className="min-w-0 truncate">{displayText}</span>
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", docCategoriesDropdownOpen && "rotate-180")} />
                          </button>
                          {docCategoriesDropdownOpen && (
                            <div
                              id="docCategoriesDropdownPanel"
                              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                            >
                              {docOptions.map(opt => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => toggle(opt.key)}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                    selectedSet.has(opt.key) ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {opt.label}
                                  {selectedSet.has(opt.key) && <Check className="h-4 w-4 text-emerald-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label htmlFor="preferredSources">{t("profileLabelPreferredSources")}</Label>
                  <div className="relative">
                    {(() => {
                      const sourceOptions = [
                        { key: "Google Drive", label: "Google Drive" },
                        { key: "Notion", label: "Notion" },
                        { key: "Dropbox", label: "Dropbox" },
                        { key: "OneDrive", label: "OneDrive" },
                        { key: "Box", label: "Box" },
                        { key: "PDFs", label: "PDFs" },
                        { key: "Word Docs", label: "Word Docs" },
                        { key: "Excel Sheets", label: "Excel Sheets" },
                        { key: "SharePoint", label: "SharePoint" },
                        { key: "Confluence", label: "Confluence" },
                        { key: "Local Files", label: "Local Files" },
                        { key: "Email Attachments", label: "Email Attachments" },
                      ]
                      const selectedSet = new Set(form.preferredSources.split(",").map(s => s.trim()).filter(Boolean))
                      const toggle = (key: string) => {
                        const next = new Set(selectedSet)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        update("preferredSources", Array.from(next).join(", "))
                      }
                      const displayText = form.preferredSources.trim()
                        ? form.preferredSources.split(",").map(s => s.trim()).filter(Boolean).join(", ")
                        : "Select sources..."
                      return (
                        <>
                          <button
                            type="button"
                            id="preferredSourcesDropdownBtn"
                            onClick={() => setPreferredSourcesDropdownOpen(o => !o)}
                            className={cn(
                              "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                              !form.preferredSources.trim() && "text-muted-foreground"
                            )}
                          >
                            <span className="min-w-0 truncate">{displayText}</span>
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", preferredSourcesDropdownOpen && "rotate-180")} />
                          </button>
                          {preferredSourcesDropdownOpen && (
                            <div
                              id="preferredSourcesDropdownPanel"
                              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#2a3444] py-1 shadow-2xl"
                            >
                              {sourceOptions.map(opt => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => toggle(opt.key)}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-emerald-600/10",
                                    selectedSet.has(opt.key) ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {opt.label}
                                  {selectedSet.has(opt.key) && <Check className="h-4 w-4 text-emerald-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </section>

            {/* Connected Channels summary */}
            <section className="card-3d rounded-2xl border border-white/5 bg-[#2a3444] p-4 sm:p-6 shadow-lg shadow-emerald-900/5 space-y-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profileSectionChannels")}</h2>
                <Link href="/channels" className="text-xs text-emerald-400 hover:underline">{t("profileManage")}</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const channels: { name: string; connected: boolean }[] = []
                  if (whatsappConnections.length > 0) {
                    channels.push({ name: "WhatsApp Business", connected: true })
                  }
                  for (const conn of emailConnections) {
                    if (conn.status === "connected") {
                      const name = conn.provider === "gmail" ? "Gmail" : conn.provider === "outlook" ? "Outlook" : conn.provider === "zoho" ? "Zoho Mail" : conn.provider === "icloud" ? "iCloud" : conn.provider
                      if (!channels.find(c => c.name === name)) channels.push({ name, connected: true })
                    }
                  }
                  for (const conn of calendarConnections) {
                    if (conn.status === "connected") {
                      const name = conn.provider === "google" ? "Google Calendar" : conn.provider === "outlook" ? "Outlook Calendar" : "Calendar"
                      if (!channels.find(c => c.name === name)) channels.push({ name, connected: true })
                    }
                  }
                  if (channels.length === 0) {
                    channels.push({ name: "No channels connected", connected: false })
                  }
                  return channels.map(ch => (
                    <span
                      key={ch.name}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] sm:text-xs font-medium",
                        ch.connected
                          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {ch.name}{ch.connected ? " ✓" : ""}
                    </span>
                  ))
                })()}
              </div>
            </section>

            {/* Workspaces — visible for Team/Enterprise plans or super_admin */}
            {(subscription?.plan === "team" || subscription?.plan === "enterprise" || role === "super_admin") && (
              <section className="rounded-2xl border border-white/10 bg-[#2a3444] p-5 sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Building2 className="h-5 w-5 text-emerald-400" /> Workspaces
                  </h3>
                  <Button
                    onClick={() => setShowCreateWorkspace(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" /> New
                  </Button>
                </div>
                <div className="space-y-2">
                  {workspaces.filter(ws => ws.name !== "Admin's Workspace").length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No workspaces yet. Create one to get started.</p>
                  ) : (
                    workspaces.filter(ws => ws.name !== "Admin's Workspace").map(ws => (
                      <div
                        key={ws.id}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <span className="text-xl leading-none">{(ws.icon ?? "🏢").split(",")[0].trim() || "🏢"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{ws.name}</p>
                          {ws.description && (
                            <p className="truncate text-xs text-muted-foreground">{ws.description}</p>
                          )}
                        </div>
                        <Link
                          href={`/workspace/${ws.id}`}
                          onClick={() => setCurrentWorkspace(ws)}
                          className="text-muted-foreground hover:text-white transition-colors"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        {workspaces.length > 1 && (
                          confirmDeleteId === ws.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await deleteWorkspace(ws.id)
                                    await refreshWorkspaces()
                                    setConfirmDeleteId(null)
                                    toast({ title: "Workspace deleted" })
                                  } catch (err: any) {
                                    toast({ title: "Error", description: err.message, variant: "error" })
                                  }
                                }}
                                className="rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(ws.id)}
                              className="text-red-400/60 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {showCreateWorkspace && <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />}

            {/* Billing & Subscription */}
            <section className="rounded-2xl border border-white/10 bg-[#2a3444] p-5 sm:p-8">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <CreditCard className="h-5 w-5 text-emerald-400" /> Billing & Subscription
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-base font-semibold text-white">{planName(subscription)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={cn(
                      "text-base font-semibold",
                      isPaid(subscription) ? "text-emerald-400" : "text-muted-foreground"
                    )}>
                      {isPaid(subscription) ? "Active" : "Free"}
                    </p>
                  </div>
                </div>
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {isPaid(subscription) ? (
                    <BillingPortalButton userId={user?.id} className="border-white/10">
                      Manage Billing
                    </BillingPortalButton>
                  ) : (
                    <Link href="/pricing">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                        Upgrade Plan <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </section>

            </div>

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
              {tooltipOpen === "aiRole" ? t("profileTooltipAIRoleTitle") : tooltipOpen === "tokenCap" ? t("profileTooltipTokenCapTitle") : tooltipOpen === "logoUpload" ? t("profileTooltipLogoTitle") : tooltipOpen === "brandColors" ? t("profileTooltipBrandColorsTitle") : tooltipOpen === "businessDescription" ? t("profileTooltipBusinessDescTitle") : t("profileTooltipToneTitle")}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {tooltipOpen === "brandColors" ? (
                <>
                  {(() => {
                    const renderLabeled = (text: string) => {
                      const idx = text.indexOf(":")
                      if (idx === -1) return <p>{text}</p>
                      return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                    }
                    return (
                      <>
                        {renderLabeled(t("profileTooltipBrandColorsPrimary"))}
                        {renderLabeled(t("profileTooltipBrandColorsSecondary"))}
                        {renderLabeled(t("profileTooltipBrandColorsFormat"))}
                        {renderLabeled(t("profileTooltipBrandColorsApply"))}
                      </>
                    )
                  })()}
                </>
              ) : tooltipOpen === "tokenCap" ? (
                <>
                  <p><strong className="text-white">{t("profileTooltipTokenCapIntro")}</strong></p>
                  <p>{t("profileTooltipTokenCapDesc")}</p>
                  <p><strong className="text-white">{t("profileTooltipTokenCapRecommend")}</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t("profileTooltipTokenCapLow")}</li>
                    <li>{t("profileTooltipTokenCapMedium")}</li>
                    <li>{t("profileTooltipTokenCapHigh")}</li>
                  </ul>
                  <p>{t("profileTooltipTokenCapNote")}</p>
                </>
              ) : tooltipOpen === "logoUpload" ? (
                <>
                  {(() => {
                    const renderLabeled = (text: string) => {
                      const idx = text.indexOf(":")
                      if (idx === -1) return <p>{text}</p>
                      return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                    }
                    return (
                      <>
                        {renderLabeled(t("profileTooltipLogoDimensions"))}
                        {renderLabeled(t("profileTooltipLogoFormats"))}
                        {renderLabeled(t("profileTooltipLogoBackground"))}
                        {renderLabeled(t("profileTooltipLogoSize"))}
                        {renderLabeled(t("profileTooltipLogoBestPractice"))}
                      </>
                    )
                  })()}
                </>
              ) : tooltipOpen === "aiRole" ? (
                <>
                  <p><strong className="text-white">{t("profileTooltipAIRoleIntro")}</strong></p>
                  <p>{t("profileTooltipAIRoleDesc")}</p>
                  <p><strong className="text-white">{t("profileTooltipAIRoleInclude")}</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t("profileTooltipAIRoleTask")}</li>
                    <li>{t("profileTooltipAIRoleChannels")}</li>
                    <li>{t("profileTooltipAIRoleBoundaries")}</li>
                  </ul>
                  {(() => {
                    const text = t("profileTooltipAIRoleExample")
                    const idx = text.indexOf(":")
                    if (idx === -1) return <p>{text}</p>
                    return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                  })()}
                </>
              ) : tooltipOpen === "businessDescription" ? (
                <>
                  <p><strong className="text-white">{t("profileTooltipBusinessDescTitle")}</strong></p>
                  <p>{t("profileTooltipBusinessDescIntro")}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t("profileTooltipBusinessDescItem1")}</li>
                    <li>{t("profileTooltipBusinessDescItem2")}</li>
                    <li>{t("profileTooltipBusinessDescItem3")}</li>
                    <li>{t("profileTooltipBusinessDescItem4")}</li>
                    <li>{t("profileTooltipBusinessDescItem5")}</li>
                  </ul>
                  <p><strong className="text-white">{t("profileTooltipBusinessDescImportant")}</strong></p>
                  <p>{t("profileTooltipBusinessDescPrivacy")}</p>
                  <p><strong className="text-white">{t("profileTooltipBusinessDescCanDo")}</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t("profileTooltipBusinessDescDo1")}</li>
                    <li>{t("profileTooltipBusinessDescDo2")}</li>
                    <li>{t("profileTooltipBusinessDescDo3")}</li>
                    <li>{t("profileTooltipBusinessDescDo4")}</li>
                  </ul>
                  <p>{t("profileTooltipBusinessDescDataNote")}</p>
                </>
              ) : (
                <>
                  {(() => {
                    const renderTone = (key: string) => {
                      const text = t(key as any)
                      const idx = text.indexOf(".")
                      if (idx === -1) return <p>{text}</p>
                      return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                    }
                    return (
                      <>
                        {renderTone("profileTooltipToneShow")}
                        {renderTone("profileTooltipToneInclude")}
                        {renderTone("profileTooltipToneContext")}
                        {(() => {
                          const text = t("profileTooltipToneExample")
                          const idx = text.indexOf(":")
                          if (idx === -1) return <p>{text}</p>
                          return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                        })()}
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Toaster />
      {/* Prompt Examples Modal */}
      {promptExampleOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPromptExampleOpen(null)}>
          <div className="relative mx-4 max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setPromptExampleOpen(null)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {promptExampleOpen === "analysis" && t("profilePromptAnalysisTitle")}
              {promptExampleOpen === "proposal" && t("profilePromptProposalTitle")}
              {promptExampleOpen === "report" && t("profilePromptReportTitle")}
              {promptExampleOpen === "email" && t("profilePromptEmailTitle")}
              {promptExampleOpen === "faq" && t("profilePromptFaqTitle")}
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              {promptExampleOpen === "analysis" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptLogicLabel")}</p>
                  <p>{t("profilePromptAnalysisLogic")}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptSampleLabel")}</p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/90">
                    {t("profilePromptAnalysisSample")}
                  </div>
                </>
              )}
              {promptExampleOpen === "proposal" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptLogicLabel")}</p>
                  <p>{t("profilePromptProposalLogic")}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptSampleLabel")}</p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/90">
                    {t("profilePromptProposalSample")}
                  </div>
                </>
              )}
              {promptExampleOpen === "report" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptLogicLabel")}</p>
                  <p>{t("profilePromptReportLogic")}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptSampleLabel")}</p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/90">
                    {t("profilePromptReportSample")}
                  </div>
                </>
              )}
              {promptExampleOpen === "email" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptLogicLabel")}</p>
                  <p>{t("profilePromptEmailLogic")}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptSampleLabel")}</p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/90">
                    {t("profilePromptEmailSample")}
                  </div>
                </>
              )}
              {promptExampleOpen === "faq" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptLogicLabel")}</p>
                  <p>{t("profilePromptFaqLogic")}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("profilePromptSampleLabel")}</p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/90">
                    {t("profilePromptFaqSample")}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

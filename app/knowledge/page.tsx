"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import {
  Search, Upload, FileText, Trash2, Info, X,
  Filter, File, CheckCircle2, Clock, AlertCircle, BookOpen, User, Plus, ChevronDown,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { getProfile, uploadDocument, fetchUserDocuments, fetchUserCategories, insertCategory, deleteCategory, deleteDocument, getDocumentPublicUrl } from "@/lib/supabase"
import { toast, Toaster } from "@/components/ui/toast"

const DEFAULT_CATEGORIES = ["SOPs", "FAQs", "Training Material", "Policies", "Reports"]

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/html",
  "application/json",
  "text/csv",
  "application/xml",
  "text/xml",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/epub+zip",
]

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

interface DocItem {
  id: string
  name: string
  category: string
  size: string
  pages: number
  status: "indexed" | "processing" | "error" | "UPLOADING" | "PROCESSING" | "INDEXING" | "INDEXED" | "FAILED"
  uploaded: string
  filename: string
}

function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}


const statusIcon = (s: string) =>
  s === "indexed"    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
  s === "processing" ? <Clock        className="h-3.5 w-3.5 text-yellow-400 animate-pulse" /> :
                       <AlertCircle  className="h-3.5 w-3.5 text-red-400" />

function StatusLabel({ status, translate }: { status: string; translate: (k: string) => string }) {
  return status === "indexed" ? translate("knowledgeStatusIndexed") :
         status === "processing" ? translate("knowledgeStatusProcessing") : translate("knowledgeStatusError")
}

const statusColor = (s: string) =>
  s === "indexed"    ? "text-emerald-400" :
  s === "processing" ? "text-yellow-400"  : "text-red-400"

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function categoryDisplay(cat: string, translate: (k: string) => string) {
  switch (cat) {
    case "All Documents": return translate("knowledgeCategoryAll")
    case "SOPs": return translate("knowledgeCategorySOPs")
    case "FAQs": return translate("knowledgeCategoryFAQs")
    case "Training Material": return translate("knowledgeCategoryTraining")
    case "Policies": return translate("knowledgeCategoryPolicies")
    case "Reports": return translate("knowledgeCategoryReports")
    default: return cat
  }
}

export default function KnowledgePage() {
  const { user, avatarUrl, loading: authLoading } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [activeCategory, setActiveCategory] = useState("All Documents")
  const [search, setSearch] = useState("")
  const [docsTooltipOpen, setDocsTooltipOpen] = useState(false)
  const [userInitials, setUserInitials] = useState("")
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string }[]>([])
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const allCategories = ["All Documents", ...customCategories.map(c => c.name)]
  const [docList, setDocList] = useState<DocItem[]>([])
  const [uploadPreview, setUploadPreview] = useState<{ file: File; category: string }[]>([])
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [docsLoading, setDocsLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      setDocsLoading(true)
      try {
        const profile = await getProfile(user.id)
        const name = profile?.full_name || user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))

        // Load categories and documents from DB
        let cats = await fetchUserCategories(user.id)
        // Seed default categories if user has none
        if (cats.length === 0) {
          const seeded = await Promise.all(
            DEFAULT_CATEGORIES.map((name, i) =>
              insertCategory(user.id, name).then(c => ({ ...c, is_default: true }))
            )
          )
          cats = seeded
        }
        setCustomCategories(cats)
        const docs = await fetchUserDocuments(user.id)
        const mapped: DocItem[] = docs.map((d: any) => ({
          id: d.id,
          name: d.original_filename,
          category: d.category || "Uncategorized",
          size: formatFileSize(d.file_size_bytes),
          pages: d.page_count || 0,
          status: (d.status?.toLowerCase() === "indexed" ? "indexed" : d.status?.toLowerCase() === "failed" ? "error" : "processing") as DocItem["status"],
          uploaded: relativeTime(new Date(d.created_at)),
          filename: d.filename,
        }))
        setDocList(mapped)
      } catch (err) {
        console.error("Failed to load knowledge base:", err)
        const name = user.user_metadata?.full_name || ""
        setUserInitials(getInitials(name))
      } finally {
        setDocsLoading(false)
      }
    }
    load()
  }, [user])

  // Close add-category input on outside click
  useEffect(() => {
    if (!addingCategory) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("#addCategoryRow")) {
        setAddingCategory(false)
        setNewCategoryName("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [addingCategory])

  // Close per-file category dropdown on outside click
  useEffect(() => {
    if (openCategoryIndex === null) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("[data-file-dropdown]")) {
        setOpenCategoryIndex(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [openCategoryIndex])

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return
    function handleClick(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [filterOpen])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Documents": docList.length }
    for (const doc of docList) {
      counts[doc.category] = (counts[doc.category] || 0) + 1
    }
    return counts
  }, [docList])

  const filtered = docList.filter(d =>
    (activeCategory === "All Documents" || d.category === activeCategory) &&
    d.name.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === "all" || d.status === statusFilter)
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const invalid = files.filter(f => !ACCEPTED_MIME_TYPES.includes(f.type))
    if (invalid.length > 0) {
      toast({ title: "Invalid file type", description: t("knowledgeFileTypeError", { type: invalid[0].type || "unknown" }), variant: "error" })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    const defaultCategory = activeCategory === "All Documents" ? DEFAULT_CATEGORIES[0] : activeCategory
    setUploadPreview(files.map(file => ({ file, category: defaultCategory })))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function confirmUpload() {
    if (uploadPreview.length === 0) return
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to upload documents.", variant: "error" })
      return
    }
    setIsUploading(true)
    try {
      for (const { file, category } of uploadPreview) {
        // Count pages server-side
        let pageCount = 0
        const countableTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ]
        if (countableTypes.includes(file.type)) {
          const formData = new FormData()
          formData.append("file", file)
          const res = await fetch("/api/count-pages", { method: "POST", body: formData })
          if (res.ok) {
            const data = await res.json()
            pageCount = data.pageCount || 0
          }
        }
        await uploadDocument(user.id, file, category, pageCount)
      }
      // Refresh document list
      const docs = await fetchUserDocuments(user.id)
      const mapped: DocItem[] = docs.map((d: any) => ({
        id: d.id,
        name: d.original_filename,
        category: d.category || "Uncategorized",
        size: formatFileSize(d.file_size_bytes),
        pages: d.page_count || 0,
        status: (d.status?.toLowerCase() === "indexed" ? "indexed" : d.status?.toLowerCase() === "failed" ? "error" : "processing") as DocItem["status"],
        uploaded: relativeTime(new Date(d.created_at)),
        filename: d.filename,
      }))
      setDocList(mapped)
      setUploadPreview([])
      setOpenCategoryIndex(null)
    } catch (err: any) {
      console.error("Upload failed:", err)
      toast({ title: "Upload failed", description: err.message || "Upload failed", variant: "error" })
    } finally {
      setIsUploading(false)
    }
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
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder={t("knowledgeSearchPlaceholder")}
            />
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
          <Link href="/profile" className={cn(
            "relative flex h-7 w-7 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full text-[10px] md:text-xs font-bold text-white transition-colors overflow-hidden",
            authLoading || avatarUrl ? "bg-[#1a1f2b]" : "bg-emerald-600 hover:bg-emerald-500"
          )}>
            {!authLoading && !avatarUrl && (userInitials || <User className="h-4 w-4 text-white" />)}
            {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail />

        {/* Sidebar: categories */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-white/5 bg-[#2a3444] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("knowledgeCategories")}</p>
            {allCategories.map(cat => (
              <div key={cat} className="group relative flex items-center">
                <button
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-lg px-3 py-2 pr-7 text-sm transition-colors",
                    activeCategory === cat
                      ? "bg-emerald-600/15 text-emerald-400 font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-left">{categoryDisplay(cat, t as unknown as (k: string) => string)}</span>
                  <span className={cn(
                    "ml-1 shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums leading-none transition-opacity",
                    (categoryCounts[cat] ?? 0) > 0 ? "opacity-100" : "opacity-0"
                  )}>
                    {categoryCounts[cat] ?? 0}
                  </span>
                </button>
                {(() => {
                  const catObj = customCategories.find(c => c.name === cat)
                  return catObj ? (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!user) return
                        try { await deleteCategory(catObj.id) } catch (err) { console.error(err) }
                        setCustomCategories(prev => prev.filter(c => c.id !== catObj.id))
                        if (activeCategory === cat) setActiveCategory("All Documents")
                      }}
                      className="absolute right-1 rounded-md p-1 text-muted-foreground opacity-70 transition-colors hover:text-red-400 hover:opacity-100"
                      title={t("knowledgeRemoveCategory")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null
                })()}
              </div>
            ))}
            {addingCategory ? (
              <div id="addCategoryRow" className="mt-1 flex items-center gap-1.5 px-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      if (!user) return
                      const name = newCategoryName.trim()
                      try {
                        const cat = await insertCategory(user.id, name)
                        setCustomCategories(prev => [...prev, cat])
                      } catch (err) { console.error(err) }
                      setActiveCategory(name)
                      setNewCategoryName("")
                      setAddingCategory(false)
                    }
                    if (e.key === "Escape") {
                      setAddingCategory(false)
                      setNewCategoryName("")
                    }
                  }}
                  placeholder={t("knowledgeNewCategoryPlaceholder")}
                  autoFocus
                  className="flex-1 rounded-md border border-white/10 bg-background px-2 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return
                    const name = newCategoryName.trim()
                    if (name) {
                      try {
                        const cat = await insertCategory(user.id, name)
                        setCustomCategories(prev => [...prev, cat])
                      } catch (err) { console.error(err) }
                      setActiveCategory(name)
                      setNewCategoryName("")
                      setAddingCategory(false)
                    }
                  }}
                  className="rounded-md p-1.5 text-emerald-400 hover:bg-emerald-600/10 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingCategory(false); setNewCategoryName("") }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                {t("knowledgeAddCategory")}
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{categoryDisplay(activeCategory, t as unknown as (k: string) => string)}</h1>
                  <button type="button" onClick={() => setDocsTooltipOpen(true)} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{t("knowledgeDocumentsCount", { count: filtered.length })}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2" ref={filterRef}>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                  statusFilter !== "all" ? "border-emerald-500/30 text-emerald-400" : "text-muted-foreground"
                )}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="h-3.5 w-3.5" />
                {statusFilter === "all" ? t("knowledgeFilter") : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-white/10 bg-[#1e2533] py-1 shadow-2xl">
                  {["all", "indexed", "processing", "error"].map(s => (
                    <button
                      key={s}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-emerald-600/10",
                        statusFilter === s ? "text-emerald-400" : "text-white"
                      )}
                      onClick={() => { setStatusFilter(s); setFilterOpen(false) }}
                    >
                      <span>{s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      {statusFilter === s && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Centered upload bar — hidden when no documents */}
          {filtered.length > 0 && (
            <div className="flex shrink-0 items-center justify-center border-b px-6 py-3">
              <label className="group flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 bg-muted/30 px-5 py-2 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-600/5">
                <Upload className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-emerald-400" />
                <span>Click here to upload</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept={ACCEPTED_MIME_TYPES.join(",")}
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {docsLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
              {!docsLoading && filtered.map(doc => {
                const docIndex = docList.findIndex(d => d.id === doc.id) + 1
                return (
                  <div
                  key={doc.id}
                  className="card-3d flex items-center gap-4 rounded-xl border border-white/5 bg-[#2a3444] px-4 py-3 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-900/10"
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white leading-none">
                      {docIndex}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      className="truncate text-sm font-medium text-left hover:text-emerald-400 transition-colors"
                      onClick={() => {
                        if (!user) return
                        const url = getDocumentPublicUrl(user.id, doc.filename)
                        window.open(url, "_blank")
                      }}
                    >
                      {doc.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{categoryDisplay(doc.category, t as unknown as (k: string) => string)} · {t("knowledgePages", { pages: doc.pages })} · {doc.size}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(doc.status)}
                    <span className={cn("text-xs font-medium", statusColor(doc.status))}>
                      <StatusLabel status={doc.status} translate={t as unknown as (k: string) => string} />
                    </span>
                  </div>
                  <p className="hidden text-xs text-muted-foreground sm:block">{doc.uploaded}</p>
                  <div className="relative flex items-center gap-1">
                    <button
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
                      onClick={async () => {
                        if (!user) return
                        setDeleteConfirmId(doc.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === doc.id && (
                      <div className="fixed right-4 top-1/2 z-[100] -translate-y-1/2 w-52 rounded-xl border border-emerald-500/30 bg-[#1e2533] p-3 shadow-2xl">
                        <p className="mb-3 text-xs font-medium text-white">Delete this document?</p>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
                            onClick={async () => {
                              try {
                                await deleteDocument(doc.id)
                                setDocList(prev => prev.filter(d => d.id !== doc.id))
                                toast({ title: "Deleted", description: doc.name, variant: "default" })
                              } catch (err: any) {
                                toast({ title: "Delete failed", description: err.message || "Delete failed", variant: "error" })
                              }
                              setDeleteConfirmId(null)
                            }}
                          >
                            Delete
                          </button>
                          <button
                            className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                )
              })}

              {!docsLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <label className="mb-6 flex cursor-pointer flex-col items-center gap-2 group">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-muted transition-colors group-hover:border-emerald-500/50 group-hover:bg-emerald-600/5">
                      <Upload className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-emerald-400 group-hover:underline">Click here to upload</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept={ACCEPTED_MIME_TYPES.join(",")}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="font-medium">{t("knowledgeEmptyTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("knowledgeEmptySubtitle")}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Upload Preview & Category Modal */}
      {uploadPreview.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-10" onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">{t("knowledgeUploadModalTitle")} ({uploadPreview.length})</h3>
            <div className="mb-5 space-y-2 pr-1">
              {uploadPreview.map(({ file, category }, i) => {
                const dropdownOpen = openCategoryIndex === i
                return (
                  <div key={i} data-file-dropdown className="relative rounded-xl border border-white/5 bg-background p-3 overflow-visible">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <File className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {file.type || t("knowledgeUnknownType")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = uploadPreview.filter((_, idx) => idx !== i)
                          setUploadPreview(next)
                          if (next.length === 0) setOpenCategoryIndex(null)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Per-file category dropdown */}
                    <div className="mt-2">
                      <div className="relative overflow-visible" data-file-dropdown>
                        <button
                          type="button"
                          onClick={() => setOpenCategoryIndex(dropdownOpen ? null : i)}
                          className="flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-[#2a3444] px-3 py-2 text-xs text-white transition-colors hover:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <span>{categoryDisplay(category, t as unknown as (k: string) => string)}</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
                        </button>
                        {dropdownOpen && (
                          <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-emerald-500/30 bg-[#1e2533] p-1 shadow-2xl shadow-black/40">
                            {allCategories.filter(c => c !== "All Documents").map(cat => {
                              const selected = category === cat
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setUploadPreview(prev => prev.map((item, idx) => idx === i ? { ...item, category: cat } : item))
                                    setOpenCategoryIndex(null)
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-emerald-600/10",
                                    selected ? "text-emerald-400" : "text-white"
                                  )}
                                >
                                  {categoryDisplay(cat, t as unknown as (k: string) => string)}
                                  {selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setUploadPreview([]); setOpenCategoryIndex(null) }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                {t("knowledgeCancel")}
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={isUploading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "Uploading..." : t("knowledgeUploadButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Info Tooltip Modal */}
      {docsTooltipOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDocsTooltipOpen(false)}>
          <div className="relative mx-4 max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setDocsTooltipOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">{t("knowledgeGuidelinesTitle")}</h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {(() => {
                const renderGuideline = (text: string) => {
                  const idx = text.indexOf(":")
                  if (idx === -1) return <p>{text}</p>
                  return <p><strong className="text-white">{text.slice(0, idx + 1)}</strong>{text.slice(idx + 1)}</p>
                }
                return (
                  <>
                    {renderGuideline(t("knowledgeGuidelinesTypes"))}
                    {renderGuideline(t("knowledgeGuidelinesRetention"))}
                    {renderGuideline(t("knowledgeGuidelinesSize"))}
                    {renderGuideline(t("knowledgeGuidelinesBestPractice"))}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  )
}

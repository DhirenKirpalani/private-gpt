"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search, Upload, FileText, Trash2, MoreHorizontal, Info, X,
  Filter, File, CheckCircle2, Clock, AlertCircle, BookOpen,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"

const categories = ["All Documents", "SOPs", "FAQs", "Training Material", "Policies", "Reports"]

const documents = [
  { id: "1", name: "Employee_Handbook.pdf",   category: "SOPs",             size: "2.4 MB", pages: 48, status: "indexed",    uploaded: "2 days ago" },
  { id: "2", name: "Sales_Playbook.pdf",       category: "Training Material", size: "1.1 MB", pages: 32, status: "indexed",    uploaded: "3 days ago" },
  { id: "3", name: "Product_FAQ.pdf",          category: "FAQs",             size: "0.8 MB", pages: 18, status: "indexed",    uploaded: "5 days ago" },
  { id: "4", name: "SOP_Onboarding.pdf",       category: "SOPs",             size: "1.6 MB", pages: 24, status: "indexed",    uploaded: "1 week ago" },
  { id: "5", name: "Brand_Guidelines.docx",   category: "Policies",          size: "3.2 MB", pages: 56, status: "indexed",    uploaded: "1 week ago" },
  { id: "6", name: "Q3_Sales_Report.xlsx",     category: "Reports",          size: "0.4 MB", pages: 8,  status: "processing", uploaded: "Just now"   },
  { id: "7", name: "Customer_Support_SOP.pdf", category: "SOPs",             size: "0.9 MB", pages: 14, status: "indexed",    uploaded: "2 weeks ago" },
  { id: "8", name: "Pricing_Sheet_2024.pdf",   category: "FAQs",             size: "0.3 MB", pages: 4,  status: "error",      uploaded: "3 weeks ago" },
]

const statusIcon = (s: string) =>
  s === "indexed"    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
  s === "processing" ? <Clock        className="h-3.5 w-3.5 text-yellow-400 animate-pulse" /> :
                       <AlertCircle  className="h-3.5 w-3.5 text-red-400" />

const statusLabel = (s: string) =>
  s === "indexed"    ? "Indexed"    :
  s === "processing" ? "Processing" : "Error"

const statusColor = (s: string) =>
  s === "indexed"    ? "text-emerald-400" :
  s === "processing" ? "text-yellow-400"  : "text-red-400"

export default function KnowledgePage() {
  const [activeCategory, setActiveCategory] = useState("All Documents")
  const [search, setSearch] = useState("")
  const [docsTooltipOpen, setDocsTooltipOpen] = useState(false)

  const filtered = documents.filter(d =>
    (activeCategory === "All Documents" || d.category === activeCategory) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  )

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
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Search documents..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">E</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <NavRail />

        {/* Sidebar: categories */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-white/5 bg-[#2a3444] overflow-hidden">
          <div className="p-3">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors">
              <Upload className="h-4 w-4" />
              Upload Documents
              <input type="file" className="hidden" multiple accept=".pdf,.docx,.xlsx,.txt,.csv" />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeCategory === cat
                    ? "bg-emerald-600/15 text-emerald-400 font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {cat}
              </button>
            ))}
          </div>
          <div className="border-t p-3 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">356</span> documents indexed
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{activeCategory}</h1>
                  <button type="button" onClick={() => setDocsTooltipOpen(true)} className="text-muted-foreground hover:text-emerald-400 transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{filtered.length} documents</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <Filter className="h-3.5 w-3.5" /> Filter
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {filtered.map(doc => (
                <div
                  key={doc.id}
                  className="card-3d flex items-center gap-4 rounded-xl border border-white/5 bg-[#2a3444] px-4 py-3 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-900/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} · {doc.pages} pages · {doc.size}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(doc.status)}
                    <span className={cn("text-xs font-medium", statusColor(doc.status))}>
                      {statusLabel(doc.status)}
                    </span>
                  </div>
                  <p className="hidden text-xs text-muted-foreground sm:block">{doc.uploaded}</p>
                  <div className="flex items-center gap-1">
                    <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No documents here</p>
                  <p className="mt-1 text-sm text-muted-foreground">Upload documents to start building your knowledge base.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Document Info Tooltip Modal */}
      {docsTooltipOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDocsTooltipOpen(false)}>
          <div className="relative mx-4 max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setDocsTooltipOpen(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-white">Document Guidelines</h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p><strong className="text-white">Supported file types:</strong> PDF, DOCX, XLSX, TXT, and CSV. Other formats may not be indexed correctly.</p>
              <p><strong className="text-white">Retention period:</strong> Documents are retained for <span className="text-emerald-400 font-semibold">15 days</span> before automatic cleanup. Make sure to export or back up critical files.</p>
              <p><strong className="text-white">Size limit:</strong> Each file must be under 50 MB. Larger files should be split into smaller sections.</p>
              <p><strong className="text-white">Best practice:</strong> Use clear filenames and organized categories so your AI can retrieve the right document faster.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

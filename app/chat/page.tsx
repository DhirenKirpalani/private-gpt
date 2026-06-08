"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Plus, MessageSquare, FileText, Settings,
  Search, Bell, ChevronLeft, Send, Paperclip, Mic,
  Bot, Copy, RefreshCw, Maximize2, FileDown, Share2,
  CheckCircle2, AlertCircle, HelpCircle, Pin, Folder,
  Zap, PanelLeftClose, PanelRightClose, Database, Brain, Sparkles,
} from "lucide-react"
import { NavRail } from "@/components/nav-rail"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  confidence?: "high" | "medium" | "low"
  timestamp: Date
}

const recentChats = [
  { id: "1", title: "Sales Proposal Draft", time: "2h ago", pinned: true },
  { id: "2", title: "Customer Support SOP", time: "5h ago", pinned: false },
  { id: "3", title: "Marketing Strategy Q3", time: "Yesterday", pinned: false },
  { id: "4", title: "Restaurant Operations", time: "2d ago", pinned: false },
  { id: "5", title: "Contract Review", time: "3d ago", pinned: false },
]

const collections = ["Sales", "Marketing", "Operations", "Legal", "HR"]

const templates = [
  { label: "Generate Proposal", icon: FileText },
  { label: "Draft Email", icon: MessageSquare },
  { label: "Analyze Contract", icon: FileText },
  { label: "Create SOP", icon: Settings },
]

const knowledgeSources = [
  { name: "Google Drive", status: "connected" },
  { name: "Notion", status: "connected" },
  { name: "Gmail", status: "syncing" },
  { name: "WhatsApp", status: "connected" },
  { name: "Company Wiki", status: "connected" },
]

const memoryItems = ["Company Mission", "Products & Services", "Pricing", "Brand Voice", "Processes", "Policies"]

const quickActions = [
  { icon: FileText, title: "Draft Proposal", desc: "Generate client proposals from templates and pricing data.", color: "from-blue-500 to-cyan-500" },
  { icon: Search, title: "Analyze Documents", desc: "Extract insights from PDFs, contracts, and reports.", color: "from-purple-500 to-violet-500" },
  { icon: MessageSquare, title: "Customer Communication", desc: "Draft WhatsApp messages and emails.", color: "from-green-500 to-emerald-500" },
  { icon: Database, title: "Knowledge Search", desc: "Find information across all connected business knowledge.", color: "from-orange-500 to-amber-500" },
  { icon: Settings, title: "Create SOP", desc: "Generate procedures and workflows for your team.", color: "from-pink-500 to-rose-500" },
  { icon: Sparkles, title: "Business Analysis", desc: "Analyze metrics, operations, and opportunities.", color: "from-teal-500 to-cyan-500" },
]

const smartSuggestions = ["Draft Follow-Up Email", "Create Proposal", "Generate Summary", "Create SOP"]

const loadingStates = [
  "Searching knowledge base...",
  "Analyzing documents...",
  "Reviewing sources...",
  "Generating response...",
]

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    let i = 0
    const iv = setInterval(() => { setLoadingText(loadingStates[i++ % loadingStates.length]) }, 900)
    await new Promise(r => setTimeout(r, 3600))
    clearInterval(iv)
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Based on your business knowledge, here is a detailed response to: "${userMsg.content}"\n\nYour indexed documents contain relevant information across multiple sources. Key findings:\n\n1. Your SOPs define a clear process for this scenario\n2. Previous communications align with this approach\n3. Based on your brand guidelines, proceed with the standard workflow\n\nAll information has been verified against your private knowledge base.`,
      sources: ["Company_SOP.pdf · Page 3", "Brand_Guidelines.docx · Page 7", "Knowledge Base"],
      confidence: "high",
      timestamp: new Date(),
    }])
    setLoading(false)
    setLoadingText("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const confidenceColor = (c?: string) =>
    c === "high" ? "text-emerald-400" : c === "medium" ? "text-yellow-400" : "text-red-400"
  const ConfidenceIcon = (c?: string) =>
    c === "high" ? CheckCircle2 : c === "medium" ? AlertCircle : HelpCircle

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">

      {/* ── HEADER ── */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <img src="/assets/images/exploro-logo.png" alt="Exploro" className="h-8 w-8 object-contain" />
            <span className="hidden text-base font-bold tracking-tight sm:block">EXPLORO</span>
          </Link>
        </div>
        <div className="flex flex-1 justify-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Search chats, documents, knowledge, files..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 sm:flex">
            <Zap className="h-3 w-3" /> 2,450 Credits
          </div>
          <button className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </button>
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            E
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── NAV RAIL ── */}
        <NavRail />

        {/* ── LEFT SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="flex w-72 shrink-0 flex-col border-r bg-card/30 overflow-hidden">
            <div className="p-3">
              <button
                onClick={() => setMessages([])}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-5 px-3 pb-4">
              <div>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
                {recentChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => setMessages([])}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    {chat.pinned
                      ? <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      : <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    }
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{chat.title}</div>
                      <div className="text-xs text-muted-foreground">{chat.time}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</p>
                {collections.map(c => (
                  <button key={c} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50 transition-colors">
                    <Folder className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{c}
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
                {templates.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setInput(t.label)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <t.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-t p-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold">Storage</p>
                  <p className="text-xs text-muted-foreground">12.4 / 50 GB</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full w-1/4 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold">Exploro AI · Online</span>
              </div>
            </div>
          </aside>
        )}

        {/* ── MAIN WORKSPACE ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">

              {/* Greeting + stats */}
              <div className="mb-10 w-full max-w-3xl">
                <div className="mb-6">
                  <p className="text-sm font-medium text-muted-foreground">Good morning,</p>
                  <h2 className="text-3xl font-bold tracking-tight">Alex</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "356", label: "Documents Indexed", color: "text-emerald-400" },
                    { value: "42",  label: "Knowledge Sources",  color: "text-blue-400" },
                    { value: "On",  label: "Business Memory",    color: "text-purple-400" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border bg-card px-4 py-3">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mb-8 max-w-md text-center text-muted-foreground">
                Ask questions, analyze documents, draft communications, or generate business insights.
              </p>
              <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map(action => (
                  <button
                    key={action.title}
                    onClick={() => setInput(action.title)}
                    className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-900/10"
                  >
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 text-sm font-semibold">{action.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    msg.role === "user" ? "bg-muted text-foreground" : "bg-emerald-600 text-white"
                  )}>
                    {msg.role === "user" ? "U" : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("max-w-[72%] space-y-2", msg.role === "user" && "flex flex-col items-end")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-tr-sm bg-emerald-600 text-white"
                        : "rounded-tl-sm border bg-card"
                    )}>
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className={cn("mt-0.5", line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') ? "ml-2" : "")}>
                          {line}
                        </p>
                      ))}
                    </div>
                    {msg.role === "assistant" && msg.sources && (
                      <div className="space-y-2 pl-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources Used</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map(s => (
                            <span key={s} className="flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-emerald-500/40 transition-colors">
                              <FileText className="h-3 w-3 text-emerald-400" />{s}
                            </span>
                          ))}
                        </div>
                        {msg.confidence && (() => {
                          const CIcon = ConfidenceIcon(msg.confidence)
                          return (
                            <span className={cn("flex items-center gap-1 text-xs font-medium", confidenceColor(msg.confidence))}>
                              <CIcon className="h-3 w-3" />
                              {msg.confidence.charAt(0).toUpperCase() + msg.confidence.slice(1)} Confidence
                            </span>
                          )
                        })()}
                        <div className="flex gap-0.5">
                          {[Copy, RefreshCw, Maximize2, FileDown, Share2].map((Icon, i) => (
                            <button key={i} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                      {loadingText}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── INPUT ── */}
          <div className="shrink-0 border-t bg-background px-4 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/25 transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="Ask your AI about your business..."
                  className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="absolute bottom-3 flex w-full items-center justify-between px-3">
                  <div className="flex gap-0.5">
                    {[{ icon: Paperclip, label: "Attach" }, { icon: Mic, label: "Voice" }].map(a => (
                      <button key={a.label} title={a.label} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <a.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Exploro AI answers from your private business knowledge only.
              </p>
            </div>
          </div>
        </main>

        {/* ── RIGHT CONTEXT PANEL ── */}
        {rightOpen ? (
          <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l bg-card/30 lg:flex">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">AI Context</span>
              <button onClick={() => setRightOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 p-4">
              <div className="rounded-xl border bg-gradient-to-br from-emerald-950/40 to-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Exploro AI</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-400">Business Memory Active</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <div className="text-xl font-bold text-emerald-400">42</div>
                    <div className="text-xs text-muted-foreground">Sources</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <div className="text-xl font-bold text-emerald-400">356</div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Knowledge Sources</p>
                <div className="space-y-1">
                  {knowledgeSources.map(s => (
                    <div key={s.name} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{s.name}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        s.status === "connected" ? "text-emerald-400" : s.status === "syncing" ? "text-yellow-400" : "text-red-400"
                      )}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What AI Knows</p>
                <div className="flex flex-wrap gap-1.5">
                  {memoryItems.map(m => (
                    <span key={m} className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                      <Brain className="h-3 w-3 text-emerald-400" />{m}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart Suggestions</p>
                <div className="space-y-1.5">
                  {smartSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:border-emerald-500/30 hover:bg-emerald-950/20"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute right-4 top-20 z-10 hidden rounded-lg border bg-card p-2 shadow-md hover:bg-muted transition-colors lg:flex"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

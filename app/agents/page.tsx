"use client"
import Link from "next/link"
import { Clock } from "lucide-react"
import { NavRail } from "@/components/nav-rail"
export default function AgentsPage() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-4 overflow-hidden border-b bg-background/80 backdrop-blur-md px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 overflow-hidden">
          <img src="/assets/images/exploro-logo.png" alt="Exploro" className="w-auto object-contain" style={{ height: "40px" }} />
          <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
        </Link>
        <div className="flex-1" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">E</div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><Clock className="h-7 w-7 text-muted-foreground" /></div>
          <h1 className="text-2xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground max-w-sm">Build and deploy autonomous AI agents for sales, support, and ops. Coming soon.</p>
          <Link href="/chat" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">Go to Chat →</Link>
        </main>
      </div>
    </div>
  )
}

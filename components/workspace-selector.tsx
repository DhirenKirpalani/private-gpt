"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Plus, Settings, Check, Loader2, Building2 } from "lucide-react"
import { useWorkspace } from "@/app/workspace-provider"
import { useAuth } from "@/app/auth-provider"
import { cn } from "@/lib/utils"
import { CreateWorkspaceModal } from "./create-workspace-modal"
import Link from "next/link"

type Props = {
  /** When provided, renders icon-only (collapsed nav) + full selector (expanded nav) side-by-side via CSS */
  collapsedClassName?: string
  /** className applied to the full selector wrapper */
  className?: string
}

function WorkspaceDropdown({
  onClose,
  onNew,
}: {
  onClose: () => void
  onNew: () => void
}) {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#131929] shadow-2xl shadow-black/50">
      {/* Workspace list */}
      <div className="max-h-52 overflow-y-auto p-1.5">
        {workspaces.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground text-center">No workspaces yet</p>
        ) : (
          workspaces.map(ws => {
            const active = currentWorkspace?.id === ws.id
            return (
              <button
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); onClose() }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-emerald-600/10 text-emerald-400" : "hover:bg-white/5 text-white/80 hover:text-white"
                )}
              >
                <span className="text-base leading-none">{ws.icon}</span>
                <span className="flex-1 truncate text-left font-medium">{ws.name}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              </button>
            )
          })
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-white/5 p-1.5 space-y-0.5">
        <button
          onClick={() => { onNew(); onClose() }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>New workspace</span>
        </button>
        {currentWorkspace && (
          <Link
            href={`/workspace/${currentWorkspace.id}`}
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>Workspace settings</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export function WorkspaceSelector({ className, collapsedClassName }: Props) {
  const { workspaces, currentWorkspace, workspaceLoading } = useWorkspace()
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const icon = currentWorkspace?.icon ?? "🏢"
  const companyName = profile?.company_name || profile?.full_name || "My Company"

  // ── Collapsed icon (desktop nav non-hover state) ──────────────────────────
  if (collapsedClassName) {
    return (
      <>
        {/* Icon only — visible when nav is collapsed */}
        <div
          title={currentWorkspace ? `${companyName} › ${currentWorkspace.name}` : "Workspace"}
          className={collapsedClassName}
        >
          {workspaceLoading
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : <span className="text-lg leading-none">{icon}</span>
          }
        </div>

        {/* Full selector — visible when nav is expanded (hover) */}
        <div ref={ref} className={cn("relative flex-col gap-1", className)}>
          {/* Section label */}
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Workspace
          </p>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm transition-all hover:bg-white/[0.08] hover:border-white/20"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-base leading-none">
              {workspaceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-[11px] text-muted-foreground leading-tight">{companyName}</p>
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {workspaceLoading ? "Loading…" : (currentWorkspace?.name ?? "Set up workspace")}
              </p>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </button>
          {open && <WorkspaceDropdown onClose={() => setOpen(false)} onNew={() => setShowCreate(true)} />}
        </div>

        {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
      </>
    )
  }

  // ── Full selector (mobile drawer / standalone usage) ──────────────────────
  return (
    <>
      <div ref={ref} className={cn("relative", className)}>
        {/* Section label */}
        <div className="mb-1.5 flex items-center gap-1.5 px-1">
          <Building2 className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Workspace
          </p>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-all hover:bg-white/[0.08] hover:border-white/20"
        >
          {/* Icon */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-xl leading-none">
            {workspaceLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : icon}
          </span>

          {/* Text */}
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-[11px] text-muted-foreground leading-tight">{companyName}</p>
            <p className="truncate text-sm font-semibold text-white leading-tight">
              {workspaceLoading
                ? "Loading…"
                : currentWorkspace?.name ?? "Set up workspace"}
            </p>
          </div>

          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )} />
        </button>

        {open && <WorkspaceDropdown onClose={() => setOpen(false)} onNew={() => setShowCreate(true)} />}
      </div>

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </>
  )
}

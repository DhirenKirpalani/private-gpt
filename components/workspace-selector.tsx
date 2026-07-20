"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Plus, Settings, Check, Loader2, Building2, User } from "lucide-react"
import { getFirstDeptIcon } from "@/lib/workspace-icons"
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
  /** Renders a slim pill for use in top navbars */
  compact?: boolean
}

function WorkspaceDropdown({
  onClose,
  onNew,
  sidebar,
}: {
  onClose: () => void
  onNew: () => void
  sidebar?: boolean
}) {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()

  return (
    <div className={cn(
      "absolute z-[200] w-56 min-w-[200px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-emerald-500/20 bg-[#0f1520] shadow-2xl shadow-black/70",
      sidebar ? "bottom-full left-0 mb-1.5" : "right-0 top-full mt-1.5"
    )}>
      {/* Workspace list */}
      <div className="max-h-52 overflow-y-auto p-1.5">
        {workspaces.filter(ws => ws.name !== "Admin's Workspace").length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground text-center">No workspaces yet</p>
        ) : (
          workspaces.filter(ws => ws.name !== "Admin's Workspace").map(ws => {
            const active = currentWorkspace?.id === ws.id
            return (
              <button
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); onClose() }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20" : "hover:bg-white/5 text-white/80 hover:text-white"
                )}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {(() => { const Icon = getFirstDeptIcon(ws.icon); return <Icon className="h-3.5 w-3.5" /> })()}
                </span>
                <span className="flex-1 truncate text-left font-medium">{ws.name}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              </button>
            )
          })
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-emerald-500/10 p-1.5 space-y-0.5">
        {(() => {
          const adminWs = workspaces.find(ws => ws.name === "Admin's Workspace")
          const isPersonal = currentWorkspace?.id === adminWs?.id
          return adminWs ? (
            <button
              onClick={() => { setCurrentWorkspace(adminWs); onClose() }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                isPersonal ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20" : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Personal mode</span>
              {isPersonal && <Check className="h-3.5 w-3.5 shrink-0 ml-auto text-emerald-400" />}
            </button>
          ) : null
        })()}
        <button
          onClick={() => { onNew(); onClose() }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
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

export function WorkspaceSelector({ className, collapsedClassName, compact }: Props) {
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

  const WorkspaceIcon = getFirstDeptIcon(currentWorkspace?.icon)
  const companyName = profile?.company_name || profile?.full_name || "My Company"
  const isPersonalMode = currentWorkspace?.name === "Admin's Workspace"
  const displayName = isPersonalMode ? "Personal" : (currentWorkspace?.name ?? "Workspace")

  // ── Compact pill (top navbar usage) ──────────────────────────────────────
  if (compact) {
    return (
      <>
        <div ref={ref} className={cn("relative", className)}>
          <button
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white hover:border-white/20"
          >
            {workspaceLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <WorkspaceIcon className="h-3.5 w-3.5" />
            }
            <span className="hidden sm:inline max-w-[110px] truncate">
              {workspaceLoading ? "…" : displayName}
            </span>
            <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </button>
          {open && <WorkspaceDropdown onClose={() => setOpen(false)} onNew={() => setShowCreate(true)} />}
        </div>
        {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
      </>
    )
  }

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
            : <WorkspaceIcon className="h-4 w-4" />
          }
        </div>

        {/* Full selector — visible when nav is expanded (hover) */}
        <div ref={ref} className={cn("relative flex-col gap-1", className)}>
          {/* Section label */}
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-500/60">
            Workspace
          </p>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-sm transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-base leading-none border border-emerald-500/20">
              {workspaceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> : <WorkspaceIcon className="h-3.5 w-3.5" />}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-[10px] text-emerald-400/70 leading-tight font-medium">{companyName}</p>
              <p className="truncate text-xs font-semibold text-white leading-tight">
                {workspaceLoading ? "Loading…" : (isPersonalMode ? "Personal" : (currentWorkspace?.name ?? "Set up workspace"))}
              </p>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-emerald-400/60 transition-transform duration-200", open && "rotate-180")} />
          </button>
          {open && <WorkspaceDropdown onClose={() => setOpen(false)} onNew={() => setShowCreate(true)} sidebar />}
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
            {workspaceLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <WorkspaceIcon className="h-4 w-4" />}
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

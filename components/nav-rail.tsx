"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import {
  MessageSquare, BookOpen, Plug2, User,
  Users, X, Shield, Headphones,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/app/auth-provider"
import { WorkspaceSelector } from "@/components/workspace-selector"

interface NavRailProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export function NavRail({ mobileOpen, onClose }: NavRailProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const { avatarUrl, role, subscription } = useAuth()
  const showWorkspace = subscription?.plan === "team" || subscription?.plan === "enterprise" || role === "super_admin"
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const hideTimeout = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
      hideTimeout.current = null
    }
    const rect = el.getBoundingClientRect()
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 })
  }, [])

  const hideTooltip = useCallback(() => {
    hideTimeout.current = setTimeout(() => setTooltip(null), 100)
  }, [])

  const handleTooltipEnter = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
      hideTimeout.current = null
    }
  }, [])

  const renderTooltip = () => {
    if (!tooltip) return null
    return (
      <div
        ref={tooltipRef}
        onMouseEnter={handleTooltipEnter}
        onMouseLeave={hideTooltip}
        className="fixed z-[100] whitespace-nowrap rounded-md bg-[#1e2533] px-2.5 py-1 text-xs font-medium text-white shadow-lg shadow-black/20"
        style={{ top: tooltip.top, left: tooltip.left, transform: "translateY(-50%)" }}
      >
        {tooltip.label}
      </div>
    )
  }

  const primary = [
    { href: "/chat",      icon: MessageSquare, labelKey: "navChat" },
    { href: "/knowledge", icon: BookOpen,      labelKey: "navKnowledge" },
    { href: "/channels",  icon: Plug2,         labelKey: "navChannels" },
    { href: "/profile",   icon: User,          labelKey: "navProfile" },
  ] as const

  const secondary = [
    { href: "/crm", icon: Users, labelKey: "navCRM" },
  ] as const

  const support = [
    { href: "/support", icon: Headphones, labelKey: "navTechSupport", tooltipKey: "navContactTooltip" },
  ] as const

  const admin = [
    { href: "/admin", icon: Shield, labelKey: "navAdmin" },
  ] as const

  // Use static labels for SSR/hydration to avoid language-mismatch errors.
  const labels = {
    navChat: "Chat",
    navKnowledge: "Knowledge",
    navChannels: "Channels",
    navProfile: "Profile",
    navCRM: "CRM",
    navAdmin: "Admin",
    navTechSupport: "Contact",
  }
  const tooltips = {
    navContactTooltip: "Tech Support and Suggestions",
  }
  const getLabel = (key: keyof typeof labels) => (mounted ? t(key as any) : labels[key])
  const getTooltip = (key: keyof typeof tooltips) => (mounted ? t(key as any) : tooltips[key])

  if (!mounted) {
    return (
      <nav className="hidden md:flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r bg-background py-3 overflow-y-auto" aria-hidden="true" />
    )
  }

  return (
    <>
      {/* Desktop NavRail — expands on hover */}
      <nav className="group/nav hidden md:flex h-full w-16 shrink-0 flex-col border-r bg-background transition-all duration-200 ease-out hover:w-48">
        {/* Scrollable nav items */}
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto scrollbar-exploro py-3 group-hover/nav:items-stretch group-hover/nav:px-3">
        {primary.map(({ href, icon: Icon, labelKey }) => {
          const label = getLabel(labelKey as keyof typeof labels)
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-xl transition-all duration-200",
                active
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "w-11 justify-center gap-0 px-0 group-hover/nav:w-full group-hover/nav:justify-start group-hover/nav:gap-3 group-hover/nav:px-2"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/nav:w-auto group-hover/nav:opacity-100">
                {label}
              </span>
            </Link>
          )
        })}

        <div className="my-2 h-px w-8 bg-border transition-all duration-200 group-hover/nav:w-full" />

        {secondary.map(({ href, icon: Icon, labelKey }) => {
          const label = getLabel(labelKey as keyof typeof labels)
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-xl transition-all duration-200",
                active
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "w-11 justify-center gap-0 px-0 group-hover/nav:w-full group-hover/nav:justify-start group-hover/nav:gap-3 group-hover/nav:px-2"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/nav:w-auto group-hover/nav:opacity-100">
                {label}
              </span>
            </Link>
          )
        })}

        <div className="my-2 h-px w-8 bg-border transition-all duration-200 group-hover/nav:w-full" />

        {support.map(({ href, icon: Icon, labelKey, tooltipKey }) => {
          const label = getLabel(labelKey as keyof typeof labels)
          const tooltip = tooltipKey ? getTooltip(tooltipKey as keyof typeof tooltips) : label
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={tooltip}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-xl transition-all duration-200",
                active
                  ? "border border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]"
                  : "text-[#FFBF00] hover:bg-[#FFBF00]/10",
                "w-11 justify-center gap-0 px-0 group-hover/nav:w-full group-hover/nav:justify-start group-hover/nav:gap-3 group-hover/nav:px-2"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/nav:w-auto group-hover/nav:opacity-100">
                {label}
              </span>
            </Link>
          )
        })}

        </div>{/* end scroll container */}

        {/* Bottom section — outside scroll so dropdown isn't clipped */}
        <div className="flex w-full flex-col items-center gap-2 border-t border-border pt-3 pb-3 group-hover/nav:items-stretch group-hover/nav:px-3">
          {showWorkspace && (
            <WorkspaceSelector
              collapsedClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted cursor-pointer group-hover/nav:hidden"
              className="hidden group-hover/nav:flex"
            />
          )}
          {role === "super_admin" && (
            <>
              <div className="my-2 h-px w-8 bg-border transition-all duration-200 group-hover/nav:w-full" />
              {admin.map(({ href, icon: Icon, labelKey }) => {
                const label = getLabel(labelKey as keyof typeof labels)
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    className={cn(
                      "flex h-11 shrink-0 items-center rounded-xl transition-all duration-200",
                      active
                        ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      "w-11 justify-center gap-0 px-0 group-hover/nav:w-full group-hover/nav:justify-start group-hover/nav:gap-3 group-hover/nav:px-2"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/nav:w-auto group-hover/nav:opacity-100">
                      {label}
                    </span>
                  </Link>
                )
              })}
            </>
          )}
        </div>
      </nav>

      {/* Mobile drawer — slides from left, labels always visible, separate from desktop */}
      {mobileOpen && (
        <MobileNavDrawer
          onClose={onClose}
          role={role}
          pathname={pathname}
          primary={primary}
          secondary={secondary}
          support={support}
          admin={admin}
          labels={labels}
          showWorkspace={showWorkspace}
        />
      )}
    </>
  )
}

interface MobileNavDrawerProps {
  onClose?: () => void
  role: string | null
  pathname: string
  primary: readonly { href: string; icon: typeof MessageSquare; labelKey: string }[]
  secondary: readonly { href: string; icon: typeof MessageSquare; labelKey: string }[]
  support: readonly { href: string; icon: typeof MessageSquare; labelKey: string }[]
  admin: readonly { href: string; icon: typeof MessageSquare; labelKey: string }[]
  labels: Record<string, string>
  showWorkspace: boolean
}

function MobileNavDrawer({ onClose, role, pathname, primary, secondary, support, admin, labels, showWorkspace }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10)
    return () => clearTimeout(t)
  }, [])

  const getLabel = (key: string) => labels[key] || key

  const renderItem = (href: string, Icon: typeof MessageSquare, labelKey: string, color?: string) => {
    const label = getLabel(labelKey)
    const active = pathname === href
    const isGold = color === "gold"
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        className={cn(
          "flex h-12 items-center gap-4 rounded-xl px-3 transition-colors",
          active
            ? isGold
              ? "border border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]"
              : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
            : isGold
              ? "text-[#FFBF00] hover:bg-[#FFBF00]/10 hover:text-[#FFBF00]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    )
  }

  return (
    <div className="fixed inset-0 z-[55] flex md:hidden">
      <nav
        className={cn(
          "flex h-full w-64 shrink-0 flex-col gap-2 border-r bg-background py-4 px-4 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-1.5">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro OS"
              width={112}
              height={32}
              className="h-8 w-auto object-contain"
            />
            <span className="inline-block rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {primary.map(({ href, icon, labelKey }) => renderItem(href, icon, labelKey))}
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-1">
          {secondary.map(({ href, icon, labelKey }) => renderItem(href, icon, labelKey))}
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-1">
          {support.map(({ href, icon, labelKey }) => renderItem(href, icon, labelKey, "gold"))}
        </div>

        {showWorkspace && (
          <div className="flex flex-col gap-1">
            <div className="h-px bg-border" />
            <WorkspaceSelector className="w-full" />
          </div>
        )}

        {role === "super_admin" && (
          <>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-1">
              {admin.map(({ href, icon, labelKey }) => renderItem(href, icon, labelKey))}
            </div>
          </>
        )}
      </nav>
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
    </div>
  )
}

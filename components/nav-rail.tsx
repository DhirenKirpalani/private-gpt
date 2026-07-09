"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  MessageSquare, BookOpen, Plug2, User,
  Users, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

interface NavRailProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export function NavRail({ mobileOpen, onClose }: NavRailProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const primary = [
    { href: "/chat",      icon: MessageSquare, label: t("navChat") },
    { href: "/knowledge", icon: BookOpen,      label: t("navKnowledge") },
    { href: "/channels",  icon: Plug2,         label: t("navChannels") },
    { href: "/profile",   icon: User,          label: t("navProfile") },
  ]

  const secondary = [
    { href: "/crm", icon: Users, label: t("navCRM") },
  ]

  return (
    <>
      {/* Desktop NavRail */}
      <nav className="hidden md:flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r bg-background py-3 overflow-y-auto">
        {primary.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
              mounted && pathname === href
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        ))}

        <div className="my-2 h-px w-8 bg-border" />

        {secondary.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
              mounted && pathname === href
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[55] flex md:hidden">
          {/* Drawer */}
          <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r bg-background py-3 overflow-y-auto shadow-2xl shadow-black/50">
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="my-1 h-px w-8 bg-border" />

            {primary.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={onClose}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  mounted && pathname === href
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}

            <div className="my-2 h-px w-8 bg-border" />

            {secondary.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={onClose}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  mounted && pathname === href
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>
          {/* Backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        </div>
      )}
    </>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare, BookOpen, Plug2, User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export function NavRail() {
  const pathname = usePathname()
  const { t } = useI18n()

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
    <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r bg-background py-3 overflow-y-auto">
      {primary.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            pathname === href
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
            pathname === href
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </Link>
      ))}

    </nav>
  )
}

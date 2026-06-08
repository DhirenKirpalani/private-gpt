"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare, BookOpen, Plug2, User,
  Users, InboxIcon, Mail, BarChart3, Layers, Workflow, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const primary = [
  { href: "/chat",      icon: MessageSquare, label: "Chat" },
  { href: "/knowledge", icon: BookOpen,      label: "Knowledge" },
  { href: "/channels",  icon: Plug2,         label: "Channels" },
  { href: "/profile",   icon: User,          label: "Profile" },
]

const secondary = [
  { href: "/crm",         icon: Users,     label: "CRM" },
  { href: "/inbox",       icon: InboxIcon, label: "Inbox" },
  { href: "/contacts",    icon: Mail,      label: "Contacts" },
  { href: "/analytics",   icon: BarChart3, label: "Analytics" },
  { href: "/agents",      icon: Layers,    label: "AI Agents" },
  { href: "/automations", icon: Workflow,  label: "Automations" },
]

export function NavRail() {
  const pathname = usePathname()

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-0.5 border-r bg-background py-3 overflow-y-auto">
      {primary.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            pathname === href
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </Link>
      ))}

      <div className="my-2 h-px w-8 bg-border" />

      {secondary.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            pathname === href
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </Link>
      ))}

      <div className="mt-auto">
        <Link
          href="/"
          title="Home"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  )
}

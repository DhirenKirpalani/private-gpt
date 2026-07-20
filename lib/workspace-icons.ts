import {
  TrendingUp, BarChart2, Scale, Settings2, CreditCard, Users,
  Briefcase, Folder, Lightbulb, Target, ShoppingCart, Globe,
  Building2, type LucideIcon,
} from "lucide-react"

export const DEPT_ICONS: { emoji: string; label: string; icon: LucideIcon }[] = [
  { emoji: "🤝", label: "Sales",       icon: TrendingUp   },
  { emoji: "📈", label: "Marketing",   icon: BarChart2    },
  { emoji: "⚖️", label: "Legal",       icon: Scale        },
  { emoji: "🏭", label: "Operations",  icon: Settings2    },
  { emoji: "💳", label: "Finance",     icon: CreditCard   },
  { emoji: "🧑‍💼", label: "HR",         icon: Users        },
  { emoji: "📋", label: "Management",  icon: Briefcase    },
  { emoji: "📄", label: "General",     icon: Folder       },
  { emoji: "🚀", label: "Innovation",  icon: Lightbulb    },
  { emoji: "🎯", label: "Strategy",    icon: Target       },
  { emoji: "🛍️", label: "Commerce",   icon: ShoppingCart },
  { emoji: "🌐", label: "Global",      icon: Globe        },
]

const DEFAULT_ICON = Building2

export function getDeptIcon(emoji: string): LucideIcon {
  return DEPT_ICONS.find(i => i.emoji === emoji)?.icon ?? DEFAULT_ICON
}

export function getDeptLabel(emoji: string): string {
  return DEPT_ICONS.find(i => i.emoji === emoji)?.label ?? emoji
}

export function getFirstDeptIcon(iconField: string | null | undefined): LucideIcon {
  if (!iconField) return DEFAULT_ICON
  const first = iconField.split(",")[0].trim()
  return getDeptIcon(first)
}

export function getDeptLabels(iconField: string | null | undefined): string[] {
  if (!iconField) return []
  return iconField
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(emoji => DEPT_ICONS.find(i => i.emoji === emoji)?.label)
    .filter(Boolean) as string[]
}

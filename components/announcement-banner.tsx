"use client"

import { useEffect, useState } from "react"
import { X, Megaphone, Sparkles, Tag, AlertTriangle, Info } from "lucide-react"
import { getAppSettings, type AnnouncementType } from "@/lib/app-settings"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<AnnouncementType, {
  icon: React.ElementType
  banner: string
  text: string
  cta: string
  dismiss: string
  border: string
}> = {
  info: {
    icon: Info,
    banner: "bg-sky-500/10 border-sky-500/20",
    text: "text-sky-300",
    cta: "bg-sky-500/20 hover:bg-sky-500/30 text-sky-200",
    dismiss: "text-sky-400/50 hover:text-sky-300",
    border: "border-b border-sky-500/20",
  },
  feature: {
    icon: Sparkles,
    banner: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-300",
    cta: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200",
    dismiss: "text-emerald-400/50 hover:text-emerald-300",
    border: "border-b border-emerald-500/20",
  },
  promo: {
    icon: Tag,
    banner: "bg-[#FFBF00]/10 border-[#FFBF00]/20",
    text: "text-[#FFBF00]",
    cta: "bg-[#FFBF00]/20 hover:bg-[#FFBF00]/30 text-[#FFBF00]",
    dismiss: "text-[#FFBF00]/50 hover:text-[#FFBF00]",
    border: "border-b border-[#FFBF00]/20",
  },
  warning: {
    icon: AlertTriangle,
    banner: "bg-red-500/10 border-red-500/20",
    text: "text-red-300",
    cta: "bg-red-500/20 hover:bg-red-500/30 text-red-200",
    dismiss: "text-red-400/50 hover:text-red-300",
    border: "border-b border-red-500/20",
  },
}

const LS_KEY = (text: string) => `exploro_announcement_dismissed_${btoa(text).slice(0, 24)}`

export function AnnouncementBanner({ className }: { className?: string }) {
  const [config, setConfig] = useState<{
    text: string
    type: AnnouncementType
    linkUrl: string
    linkLabel: string
  } | null>(null)
  const [visible, setVisible] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const settings = await getAppSettings()
        const enabled = settings.announcement_enabled === "true" || (settings.announcement_enabled as any) === true
        const text = settings.announcement_text?.trim()
        if (!enabled || !text) return

        const key = LS_KEY(text)
        if (localStorage.getItem(key) === "1") return

        setConfig({
          text,
          type: settings.announcement_type || "info",
          linkUrl: settings.announcement_link_url || "",
          linkLabel: settings.announcement_link_label || "Learn more",
        })
        setVisible(true)
        requestAnimationFrame(() => setShow(true))
      } catch {}
    }
    load()
  }, [])

  const dismiss = () => {
    setShow(false)
    setTimeout(() => setVisible(false), 300)
    if (config) localStorage.setItem(LS_KEY(config.text), "1")
  }

  if (!visible || !config) return null

  const t = TYPE_CONFIG[config.type]
  const Icon = t.icon

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        show ? "max-h-16 opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
        t.banner, t.border
      )}>
        <div className={cn("flex items-center gap-2 min-w-0", t.text)}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{config.text}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {config.linkUrl && (
            <a
              href={config.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                t.cta
              )}
            >
              {config.linkLabel} →
            </a>
          )}
          <button
            onClick={dismiss}
            className={cn("transition-colors", t.dismiss)}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { X, Megaphone } from "lucide-react"
import { getAppSettings } from "@/lib/app-settings"
import { cn } from "@/lib/utils"

export function AnnouncementBanner({ className }: { className?: string }) {
  const [text, setText] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const settings = await getAppSettings()
        const rawEnabled = (settings as any).announcement_enabled
        const rawText = (settings as any).announcement_text ?? ""
        setEnabled(rawEnabled === "true" || rawEnabled === true)
        setText(rawText)
      } catch {}
    }
    load()
  }, [])

  if (!enabled || !text || dismissed) return null

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 border-b border-[#FFBF00]/20 bg-[#FFBF00]/10 px-4 py-2.5 text-sm",
      className
    )}>
      <div className="flex items-center gap-2 text-[#FFBF00]">
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        <span>{text}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-[#FFBF00]/60 hover:text-[#FFBF00] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

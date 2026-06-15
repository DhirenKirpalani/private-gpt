"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000

type ToastType = "default" | "error" | "success"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastType
}

interface ToastState {
  toasts: Toast[]
}

const toastListeners: Array<(toasts: Toast[]) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: { type: "ADD"; toast: Toast } | { type: "REMOVE"; id: string }) {
  switch (action.type) {
    case "ADD":
      memoryState = {
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      }
      break
    case "REMOVE":
      memoryState = {
        toasts: memoryState.toasts.filter(t => t.id !== action.id),
      }
      break
  }
  toastListeners.forEach(listener => listener(memoryState.toasts))
}

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2)
  dispatch({ type: "ADD", toast: { id, title, description, variant } })
  setTimeout(() => dispatch({ type: "REMOVE", id }), TOAST_REMOVE_DELAY)
  return id
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(memoryState.toasts)

  React.useEffect(() => {
    toastListeners.push(setToasts)
    return () => {
      const index = toastListeners.indexOf(setToasts)
      if (index > -1) toastListeners.splice(index, 1)
    }
  }, [])

  return { toasts }
}

export function Toaster() {
  const { toasts } = useToast()
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "relative flex w-[320px] items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-4",
            t.variant === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : t.variant === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-[#2a3444]/95 text-white"
          )}
        >
          <div className="flex-1 space-y-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-xs opacity-90">{t.description}</p>}
          </div>
          <button
            onClick={() => dispatch({ type: "REMOVE", id: t.id })}
            className="shrink-0 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

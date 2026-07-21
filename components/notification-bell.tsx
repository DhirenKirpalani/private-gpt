"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell, Check, CheckCheck, Users, Loader2, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/app/auth-provider"
import { useRouter } from "next/navigation"
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  type Notification,
} from "@/lib/supabase"

export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    try {
      const list = await getNotifications(user.id)
      setNotifications(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const channel = subscribeToNotifications(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === payload.new.id)) return prev
          return [payload.new as Notification, ...prev]
        })
      } else if (payload.eventType === "UPDATE") {
        setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
      } else if (payload.eventType === "DELETE") {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleAcceptInvite = (token: string) => {
    router.push(`/invite?token=${token}`)
    setOpen(false)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (seconds < 60) return "just now"
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days === 1) return "1d"
    if (days < 7) return `${days}d`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          open
            ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
            : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
        )}
      >
        <div className="relative shrink-0">
          <Bell className={cn("h-5 w-5 transition-transform duration-200", open && "scale-110")} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background animate-in fade-in zoom-in duration-300">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] origin-top-right rounded-2xl border border-white/10 bg-[#1a1f2b] shadow-2xl shadow-black/50 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3.5 bg-gradient-to-r from-emerald-500/[0.03] to-transparent">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-400">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[28rem] overflow-y-auto scrollbar-exploro">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400/60" />
                <p className="text-xs text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5">
                  <Bell className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">No new notifications right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {notifications.map((n) => {
                  const isInvite = n.type === "workspace_invite"
                  const hasActions = isInvite && !n.read && n.data?.token
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group relative px-4 py-3.5 transition-colors hover:bg-white/[0.02]",
                        !n.read && "bg-emerald-500/[0.02]"
                      )}
                    >
                      {/* Left accent bar for unread */}
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400/60" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="mt-0.5 shrink-0">
                          {isInvite ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/10">
                              <Users className="h-4 w-4 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/10">
                              <Sparkles className="h-4 w-4 text-blue-400" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-white" : "font-medium text-muted-foreground")}>
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                              {formatTimeAgo(n.created_at)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>
                          )}

                          {/* Actions for workspace invite */}
                          {hasActions && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                onClick={() => handleAcceptInvite(n.data.token)}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-700/30 active:scale-95"
                              >
                                Accept invite
                                <ArrowRight className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleMarkRead(n.id)}
                                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white active:scale-95"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}

                          {/* Read indicator for read invite notifications */}
                          {isInvite && n.read && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/50">
                              <Check className="h-3 w-3" />
                              {n.data?.status === "accepted" ? "Accepted" : n.data?.status === "declined" ? "Declined" : "Read"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-white/5 px-4 py-2.5 bg-white/[0.01]">
              <button
                onClick={() => { setOpen(false); router.push("/profile") }}
                className="w-full text-center text-xs font-medium text-muted-foreground hover:text-white transition-colors py-1"
              >
                View all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

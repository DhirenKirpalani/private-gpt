"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, CheckCircle2, XCircle, Users, AlertTriangle } from "lucide-react"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"idle" | "accepting" | "declining">("idle")
  const [error, setError] = useState("")
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided")
      setLoading(false)
      return
    }

    // If not logged in, redirect to signup with invite token
    if (!authLoading && !user) {
      const signupUrl = `/signup?invite=${token}&email=`
      router.push(signupUrl)
      return
    }

    if (!authLoading && user) {
      fetchInvitation()
    }
  }, [token, authLoading, user])

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/workspace/invitation?token=${token}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load invitation")
      } else {
        setInvitation(data)
      }
    } catch {
      setError("Failed to load invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user || !token) return
    setAction("accepting")
    setError("")
    try {
      const res = await fetch("/api/workspace/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.alreadyMember) {
          router.push("/chat")
          return
        }
        throw new Error(data.error || "Failed to accept invitation")
      }
      // Redirect to chat with the workspace
      router.push("/chat")
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation")
      setAction("idle")
    }
  }

  const handleDecline = async () => {
    if (!token) return
    setAction("declining")
    setError("")
    try {
      const res = await fetch("/api/workspace/decline-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: user?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to decline invitation")
      router.push("/chat")
    } catch (err: any) {
      setError(err.message || "Failed to decline invitation")
      setAction("idle")
    }
  }

  // Loading states
  if (authLoading || (loading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  // Redirecting to signup
  if (!user && !authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to signup...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">{error}</h1>
          <Link href="/chat" className="mt-6 inline-block text-sm text-emerald-400 hover:text-emerald-300">
            Go to Chat
          </Link>
        </div>
      </div>
    )
  }

  // Accept/decline modal
  const wsName = invitation?.workspace_name || invitation?.data?.workspace_name || "a workspace"
  const wsIcon = invitation?.workspace_icon || invitation?.data?.workspace_icon || "🏢"
  const role = invitation?.role || invitation?.data?.role || "member"
  const inviterName = invitation?.inviter_name || invitation?.data?.inviter_name || "Someone"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/assets/images/exploro-icon.svg" alt="Exploro OS" width={32} height={32} unoptimized className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-white">Exploro OS</span>
        </div>

        {/* Modal card */}
        <div className="rounded-2xl border border-white/10 bg-[#1a1f2b] p-8">
          {/* Workspace icon */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl">
              {wsIcon}
            </div>
            <h1 className="text-xl font-bold text-white">Join {wsName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {inviterName} invited you to join this workspace as <span className="font-medium text-emerald-400 capitalize">{role}</span>
            </p>
          </div>

          {/* Info rows */}
          <div className="mb-6 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-medium text-white">{wsName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invited by</span>
              <span className="font-medium text-white">{inviterName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-emerald-400 capitalize">{role}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={action !== "idle"}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
            >
              {action === "declining" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Decline"}
            </button>
            <button
              onClick={handleAccept}
              disabled={action !== "idle"}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-700/30 disabled:opacity-50"
            >
              {action === "accepting" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Accept Invite"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By accepting, you'll join this workspace and can switch to it anytime.
        </p>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}

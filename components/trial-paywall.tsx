"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, X } from "lucide-react"
import { useAuth } from "@/app/auth-provider"
import { isTrialExpired } from "@/lib/subscription"

export function TrialPaywall({ className }: { className?: string }) {
  const { subscription, role } = useAuth()
  const expired = isTrialExpired(subscription)
  const [dismissed, setDismissed] = useState(false)

  if (!expired) return null
  if (dismissed) return null

  const isSuperAdmin = role === "super_admin"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/60" />

      {/* Modal card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[#FFBF00]/20 bg-[#0f1117] p-8 shadow-2xl text-center">

        {/* Close button — super_admin only */}
        {isSuperAdmin && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
            title="Close (admin only)"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFBF00]/10 border border-[#FFBF00]/20">
          <Lock className="h-6 w-6 text-[#FFBF00]" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">Your free trial has ended</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Upgrade to a plan to continue using Exploro and keep access to all your chats, documents, and integrations.
        </p>

        <Link
          href="/pricing"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#FFBF00] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#FFBF00]/90"
        >
          Subscribe — View Plans
        </Link>

        {isSuperAdmin ? (
          <p className="mt-4 text-xs text-[#FFBF00]/60">
            You can close this as super_admin for testing purposes.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Your data is safe. It will be available as soon as you subscribe.
          </p>
        )}
      </div>
    </div>
  )
}

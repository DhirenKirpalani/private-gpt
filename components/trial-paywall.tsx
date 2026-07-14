"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { useAuth } from "@/app/auth-provider"
import { isTrialExpired } from "@/lib/subscription"

export function TrialPaywall({ className }: { className?: string }) {
  const { subscription } = useAuth()
  const expired = isTrialExpired(subscription)

  if (!expired) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/60" />

      {/* Modal card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[#FFBF00]/20 bg-[#0f1117] p-8 shadow-2xl text-center">
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

        <p className="mt-4 text-xs text-muted-foreground">
          Your data is safe. It will be available as soon as you subscribe.
        </p>
      </div>
    </div>
  )
}

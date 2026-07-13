"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/app/auth-provider"
import { isTrialExpired } from "@/lib/subscription"
import { cn } from "@/lib/utils"

export function TrialPaywall({ className }: { className?: string }) {
  const { subscription } = useAuth()
  const expired = isTrialExpired(subscription)

  if (!expired) return null

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm",
        className
      )}
    >
      <p className="text-red-200">
        Your 15-day trial has ended. Choose a plan to continue using Exploro.
      </p>
      <Link
        href="/pricing"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
      >
        View plans <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getTrialDaysLeft, isTrialExpired } from "@/lib/subscription"
import { cn } from "@/lib/utils"

export function TrialPill({ className }: { className?: string }) {
  const { subscription } = useAuth()
  const daysLeft = getTrialDaysLeft(subscription)
  const expired = isTrialExpired(subscription)

  if (daysLeft === null && !expired) return null

  if (expired) {
    return (
      <Link
        href="/pricing"
        className={cn(
          "inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20",
          className
        )}
      >
        Trial ended — upgrade
      </Link>
    )
  }

  const isLastDay = daysLeft !== null && daysLeft <= 1

  return (
    <Link
      href="/pricing"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        isLastDay
          ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
        className
      )}
    >
      {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
    </Link>
  )
}

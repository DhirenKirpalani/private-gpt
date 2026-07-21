"use client"

import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getTrialDaysLeft, isTrialExpired } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export function TrialPill({ className }: { className?: string }) {
  const { subscription } = useAuth()
  const { t } = useI18n()
  const daysLeft = getTrialDaysLeft(subscription)
  const expired = isTrialExpired(subscription)

  if (daysLeft === null && !expired) return null

  if (expired) {
    return (
      <Link
        href="/pricing"
        className={cn(
          "inline-flex items-center rounded-full border border-[#FFBF00]/50 bg-[#FFBF00]/20 px-3 py-1 text-xs font-semibold text-[#FFBF00] transition-colors hover:bg-[#FFBF00]/30",
          className
        )}
      >
        {t("trialSubscribe")}
      </Link>
    )
  }

  const isLastDay = daysLeft !== null && daysLeft <= 1

  return (
    <Link
      href="/pricing"
      className={cn(
        "inline-flex items-center rounded-full border border-[#FFBF00]/30 bg-[#FFBF00]/10 px-3 py-1 text-xs font-semibold text-[#FFBF00] transition-colors hover:bg-[#FFBF00]/20",
        className
      )}
    >
      {daysLeft === 1 ? t("trialEndsInOneDay") : t("trialEndsIn", { days: daysLeft! })}
    </Link>
  )
}

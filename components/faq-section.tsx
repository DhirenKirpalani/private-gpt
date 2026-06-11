"use client"

import { ChevronDown } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function FaqSection() {
  const { t, dict } = useI18n()
  const faqs = (dict as any).faqs as Array<{ q: string; a: string }>

  return (
    <section id="faq" className="perspective-feature relative overflow-hidden border-t border-white/5 px-4 py-16 sm:py-24">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="feature-block-3d relative mx-auto max-w-3xl">
        <div className="mb-10 text-center sm:mb-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("faqTitle")}</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="faq-3d group rounded-xl border border-white/8 bg-white/[0.02] backdrop-blur-sm transition-all open:border-emerald-500/20 open:bg-emerald-950/10 hover:border-white/15"
            >
              <summary className="flex cursor-pointer items-start gap-3 p-4 list-none sm:items-center sm:gap-4 sm:p-5">
                {/* Numbered badge */}
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-600/15 text-[10px] font-bold text-emerald-400 sm:mt-0 sm:h-7 sm:w-7 sm:text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Question */}
                <span className="flex-1 text-sm font-semibold leading-snug sm:text-base">
                  {faq.q}
                </span>

                {/* Chevron */}
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-emerald-400 transition-transform duration-300 group-open:rotate-180 sm:mt-0 sm:h-5 sm:w-5"
                  )}
                />
              </summary>

              <div className="border-t border-white/5 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                <p className="pl-9 text-xs leading-relaxed text-muted-foreground sm:pl-11 sm:text-sm">
                  {faq.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

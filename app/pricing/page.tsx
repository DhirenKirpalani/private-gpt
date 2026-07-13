"use client"

import Link from "next/link"
import { Check, Zap, ArrowRight, Star, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/app/auth-provider"
import { CheckoutButton } from "@/components/checkout-button"

function usePricingData() {
  const { t, lang } = useI18n()
  const isEs = lang === "es"

  const plans = [
    {
      name: t("pricingPlanSolo"),
      key: "Solo" as const,
      originalPrice: isEs ? "$700 MXN/mes" : "$40",
      price: isEs ? "$525 MXN/mes" : "$30",
      period: isEs ? "" : "/mo",
      foundingLabel: t("pricingFoundingPriceSolo"),
      desc: t("pricingDescSolo"),
      features: t("pricingFeaturesSolo").split(","),
      trialNote: t("pricingTrialNoteSolo"),
      cta: t("pricingCTASolo"),
      ctaStyle: "primary" as const,
      href: "/signup",
    },
    {
      name: t("pricingPlanTeam"),
      key: "Team" as const,
      originalPrice: isEs ? "$1,400 MXN por usuario/mes" : "$80",
      price: isEs ? "$875 MXN por usuario/mes" : "$50",
      period: isEs ? "" : "/seat per month",
      foundingLabel: t("pricingFoundingPriceTeam"),
      desc: t("pricingDescTeam"),
      features: t("pricingFeaturesTeam").split(","),
      cta: t("pricingCTATeam"),
      ctaStyle: "primary" as const,
      href: "/signup",
    },
    {
      name: t("pricingPlanEnterprise"),
      key: "Enterprise" as const,
      price: t("pricingPlanEnterprise") === "Enterprise" ? "Custom" : "Personalizado",
      period: "",
      desc: t("pricingDescEnterprise"),
      features: t("pricingFeaturesEnterprise").split(","),
      cta: t("pricingCTAEnterprise"),
      ctaStyle: "outline" as const,
      href: "mailto:sales@exploro.ai",
    },
  ]

  const comparisonFeatures = [
    { feature: t("pricingCompareFeatureWorkspaces"), solo: "1", team: "5", enterprise: t("pricingPlanEnterprise") === "Enterprise" ? "Unlimited" : "Ilimitado" },
    { feature: t("pricingCompareFeatureDocuments"), solo: t("pricingPlanEnterprise") === "Enterprise" ? "Up to 50" : "Hasta 50", team: t("pricingPlanEnterprise") === "Enterprise" ? "Unlimited" : "Ilimitado", enterprise: t("pricingPlanEnterprise") === "Enterprise" ? "Unlimited" : "Ilimitado" },
    { feature: t("pricingCompareFeatureChat"), solo: true, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureWhatsApp"), solo: false, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureEmail"), solo: true, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureTelegram"), solo: false, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureAnalytics"), solo: false, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureCollaboration"), solo: false, team: true, enterprise: true },
    { feature: t("pricingCompareFeaturePrioritySupport"), solo: false, team: true, enterprise: true },
    { feature: t("pricingCompareFeatureCustomIntegrations"), solo: false, team: false, enterprise: true },
    { feature: t("pricingCompareFeatureSSO"), solo: false, team: false, enterprise: true },
    { feature: t("pricingCompareFeatureOnPremise"), solo: false, team: false, enterprise: true },
    { feature: t("pricingCompareFeatureSLA"), solo: false, team: false, enterprise: true },
    { feature: t("pricingCompareFeatureWhiteLabel"), solo: false, team: false, enterprise: true },
    { feature: t("pricingCompareFeatureAPI"), solo: true, team: true, enterprise: true },
  ]

  const comingSoon = t("pricingComingSoonFeatures").split(",")

  return { t, plans, comparisonFeatures, comingSoon }
}

export default function PricingPage() {
  const { t, plans, comparisonFeatures, comingSoon } = usePricingData()
  const { user } = useAuth()
  const userId = user?.id
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      {/* Header */}
      <div className="mb-10 sm:mb-14 text-center">
        <h1 className="gradient-text-shimmer pb-1 text-3xl font-bold tracking-tight sm:text-4xl">{t("pricingPageTitle")}</h1>
        <p className="mt-2 text-base text-muted-foreground sm:mt-3 sm:text-lg">
          {t("pricingPageSubtitle")}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="perspective-grid grid gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "card-3d relative rounded-2xl border bg-[#2a3444] p-5 sm:p-6 md:p-8 shadow-xl shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10",
              plan.name === "Team" ? "border-emerald-500/30" : "border-white/10"
            )}
          >
            {plan.key === "Team" && (
              <>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    <Star className="h-3 w-3 fill-white" /> {t("pricingBadgeBestValue")}
                  </div>
                </div>
              </>
            )}

            <div className={cn(
              "mb-3 sm:mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
              "bg-emerald-500/10 text-emerald-400"
            )}>
              {plan.key === "Solo" && <Zap className="h-4 w-4" />}
              {plan.name}
            </div>

            {plan.originalPrice && (
              <p className="text-sm text-muted-foreground line-through">{plan.originalPrice}</p>
            )}
            <h2 className="text-2xl font-bold sm:text-3xl">
              {plan.price}
              {plan.period && <span className="text-sm font-normal text-muted-foreground sm:text-base">{plan.period}</span>}
            </h2>
            {plan.foundingLabel && (
              <p className="mt-1 text-xs font-semibold text-emerald-400 sm:text-sm">{plan.foundingLabel}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{plan.desc}</p>

            <ul className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground sm:text-base">
                  <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-8 sm:mt-10">
              {plan.key === "Enterprise" ? (
                <a href={plan.href}>
                  <Button variant="outline" className="w-full border-white/10 text-sm py-4 sm:text-base sm:py-6">
                    {plan.cta}
                  </Button>
                </a>
              ) : plan.key === "Solo" ? (
                <CheckoutButton
                  plan="solo"
                  userId={userId}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm py-4 sm:text-base sm:py-6"
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </CheckoutButton>
              ) : (
                <CheckoutButton
                  plan="team"
                  userId={userId}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-sm py-4 sm:text-base sm:py-6"
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </CheckoutButton>
              )}
              {plan.trialNote && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {plan.trialNote}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Comparison */}
      <section className="mt-16 sm:mt-24">
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight text-white sm:mb-10 sm:text-2xl">{t("pricingCompareTitle")}</h2>
        <div className="card-3d overflow-hidden rounded-2xl border border-white/10 bg-[#2a3444]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground sm:px-6 sm:py-4 sm:text-sm">{t("pricingCompareFeatureHeader")}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-400 sm:px-6 sm:py-4 sm:text-sm">{t("pricingPlanSolo")}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-400 sm:px-6 sm:py-4 sm:text-sm">{t("pricingPlanTeam")}</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-400 sm:px-6 sm:py-4 sm:text-sm">{t("pricingPlanEnterprise")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-white/5", i % 2 === 1 && "bg-white/[0.02]")}>
                    <td className="px-3 py-2.5 text-xs text-white sm:px-6 sm:py-3.5 sm:text-sm">{row.feature}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground sm:px-6 sm:py-3.5 sm:text-sm whitespace-nowrap">
                      {typeof row.solo === "boolean"
                        ? row.solo
                          ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
                          : <span className="text-white/20">{t("pricingCompareNo")}</span>
                        : row.solo}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground sm:px-6 sm:py-3.5 sm:text-sm whitespace-nowrap">
                      {typeof row.team === "boolean"
                        ? row.team
                          ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
                          : <span className="text-white/20">{t("pricingCompareNo")}</span>
                        : row.team}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground sm:px-6 sm:py-3.5 sm:text-sm whitespace-nowrap">
                      {typeof row.enterprise === "boolean"
                        ? row.enterprise
                          ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
                          : <span className="text-white/20">{t("pricingCompareNo")}</span>
                        : row.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mt-16 sm:mt-24">
        <div className="mb-6 text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-400">
            <Clock className="h-4 w-4" /> {t("pricingComingSoonBadge")}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t("pricingComingSoonTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("pricingComingSoonSubtitle")}</p>
        </div>
        <div className="perspective-grid grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((feature) => (
            <div
              key={feature}
              className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] px-3 py-2.5 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10 sm:px-5 sm:py-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-white">{feature}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

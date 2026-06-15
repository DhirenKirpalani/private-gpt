"use client"

import Link from "next/link"
import { Check, Zap, ArrowRight, Star, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

function usePricingData() {
  const { t } = useI18n()

  const plans = [
    {
      name: t("pricingPlanSolo"),
      key: "Solo" as const,
      price: "$30",
      period: "/mo",
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
      price: "$49",
      period: "/mo",
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Header */}
      <div className="mb-14 text-center">
        <h1 className="gradient-text-shimmer pb-1 text-4xl font-bold tracking-tight">{t("pricingPageTitle")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("pricingPageSubtitle")}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="perspective-grid grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "card-3d relative rounded-2xl border bg-[#2a3444] p-8 shadow-xl shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10",
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
              "mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
              plan.name === "Enterprise" ? "bg-white/10 text-muted-foreground" : "bg-emerald-500/10 text-emerald-400"
            )}>
              {plan.key === "Solo" && <Zap className="h-4 w-4" />}
              {plan.name}
            </div>

            <h2 className="text-3xl font-bold">
              {plan.price}
              {plan.period && <span className="text-base font-normal text-muted-foreground">{plan.period}</span>}
            </h2>
            <p className="mt-2 text-base text-muted-foreground">{plan.desc}</p>

            <ul className="mt-8 space-y-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-base text-muted-foreground">
                  <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              {plan.ctaStyle === "primary" ? (
                <Link href={plan.href}>
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-base py-6">
                    {plan.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <a href={plan.href}>
                  <Button variant="outline" className="w-full border-white/10 text-base py-6">
                    {plan.cta}
                  </Button>
                </a>
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
      <section className="mt-24">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white">{t("pricingCompareTitle")}</h2>
        <div className="card-3d overflow-hidden rounded-2xl border border-white/10 bg-[#2a3444]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">{t("pricingCompareFeatureHeader")}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">{t("pricingPlanSolo")}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">{t("pricingPlanTeam")}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">{t("pricingPlanEnterprise")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-white/5", i % 2 === 1 && "bg-white/[0.02]")}>
                    <td className="px-6 py-3.5 text-sm text-white">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">
                      {typeof row.solo === "boolean"
                        ? row.solo
                          ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
                          : <span className="text-white/20">{t("pricingCompareNo")}</span>
                        : row.solo}
                    </td>
                    <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">
                      {typeof row.team === "boolean"
                        ? row.team
                          ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
                          : <span className="text-white/20">{t("pricingCompareNo")}</span>
                        : row.team}
                    </td>
                    <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">
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
      <section className="mt-24">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-400">
            <Clock className="h-4 w-4" /> {t("pricingComingSoonBadge")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t("pricingComingSoonTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("pricingComingSoonSubtitle")}</p>
        </div>
        <div className="perspective-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((feature) => (
            <div
              key={feature}
              className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] px-5 py-4 shadow-lg shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10"
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

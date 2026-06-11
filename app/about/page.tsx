"use client"

import { Shield, Wifi, FileCheck, Palette } from "lucide-react"
import { useI18n } from "@/lib/i18n"

const pillarIcons = {
  security: Shield,
  connectivity: Wifi,
  reliability: FileCheck,
  brand: Palette,
}

const pillars: Array<{
  key: "pillarSecurity" | "pillarConnectivity" | "pillarReliability" | "pillarBrand"
  icon: typeof Shield
}> = [
  { key: "pillarSecurity", icon: Shield },
  { key: "pillarConnectivity", icon: Wifi },
  { key: "pillarReliability", icon: FileCheck },
  { key: "pillarBrand", icon: Palette },
]

export default function AboutPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          {t("aboutUsTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("aboutUsSubtitle")}
        </p>
      </div>

      {/* Intro paragraph */}
      <p className="mb-12 text-center text-base leading-relaxed text-foreground/80 md:text-lg">
        {t("aboutUsP1")}
      </p>

      {/* Pillars */}
      <div className="perspective-grid">
        <div className="grid-3d grid gap-6 sm:grid-cols-2">
          {pillars.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="card-3d group relative overflow-hidden rounded-2xl border border-white/5 bg-[#2a3444] p-6"
            >
              <div className="relative">
                <div className="pillar-icon-3d mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {t(`${key}Title` as any)}
                </h2>
                <p className="mt-1 text-sm font-semibold text-emerald-400">
                  {t(`${key}Subtitle` as any)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}Desc` as any)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing */}
      <p className="mx-auto mt-12 max-w-2xl text-center text-base leading-relaxed text-foreground/80 md:text-lg">
        {t("aboutUsP2")}
      </p>

      <p className="mt-8 text-center text-sm font-medium text-emerald-400">
        {t("aboutUsByline")}
      </p>
    </div>
  )
}

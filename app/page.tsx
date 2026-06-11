"use client"

import Link from "next/link"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { FaWhatsapp, FaTelegram, FaSlack, FaEnvelope, FaMicrosoft, FaApple, FaGoogle } from "react-icons/fa"
import { SiNotion } from "react-icons/si"
import {
  ArrowRight,
  Play,
  X,
  Check,
  Upload,
  Rocket,
  Shield,
  Lock,
  FileText,
  MessageSquare,
  Bot,
  ChevronDown,
  Building2,
  BarChart3,
  HeartPulse,
  Briefcase,
  Home,
  GraduationCap,
  Stethoscope,
  ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FaqSection } from "@/components/faq-section"

export default function HomePage() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col">

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-28 text-center sm:py-40">
        {/* Cinematic background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-background" />
          {/* Emerald orb — top-left */}
          <div className="animate-drift-1 absolute -left-40 -top-20 h-[650px] w-[650px] rounded-full bg-emerald-600/18 blur-[130px]" />
          {/* Violet orb — bottom-right */}
          <div className="animate-drift-2 absolute -bottom-20 -right-40 h-[550px] w-[550px] rounded-full bg-violet-600/12 blur-[110px]" />
          {/* Center pulse */}
          <div className="animate-pulse-glow absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />
          {/* Dot-grid overlay — fades at bottom */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.035)_1px,_transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]" />
          {/* Floating particles */}
          <div className="particles">
            {[
              { l: 8, d: 5.2, del: 0 }, { l: 18, d: 7.1, del: 1.3 }, { l: 28, d: 6.4, del: 2.1 },
              { l: 38, d: 8.3, del: 0.7 }, { l: 48, d: 5.8, del: 3.4 }, { l: 58, d: 7.6, del: 1.8 },
              { l: 68, d: 6.1, del: 4.2 }, { l: 78, d: 9.0, del: 2.5 }, { l: 88, d: 5.5, del: 0.3 },
              { l: 12, d: 7.3, del: 3.8 }, { l: 22, d: 6.7, del: 1.1 }, { l: 32, d: 8.5, del: 4.6 },
              { l: 42, d: 5.0, del: 2.9 }, { l: 52, d: 7.8, del: 0.5 }, { l: 62, d: 6.3, del: 3.1 },
              { l: 72, d: 8.1, del: 1.6 }, { l: 82, d: 5.7, del: 4.0 }, { l: 92, d: 7.4, del: 2.2 },
              { l: 5, d: 6.9, del: 3.5 }, { l: 95, d: 8.7, del: 0.9 },
            ].map((p, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${p.l}%`,
                  animationDuration: `${p.d}s`,
                  animationDelay: `${p.del}s`,
                  opacity: 0.25 + (i % 3) * 0.15,
                }}
              />
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400 [animation-delay:0ms]">
          {t("heroBadge")}
        </div>
        <h1 className="animate-fade-in-up gradient-text-shimmer mb-6 max-w-5xl pb-2 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl [animation-delay:120ms]">
          {t("heroTitle")}
        </h1>
        <p className="animate-fade-in-up mb-2 max-w-2xl text-lg text-muted-foreground sm:text-xl [animation-delay:240ms]">
          {t("heroSubtitle")}
        </p>
        <p className="animate-fade-in-up mb-10 text-sm font-medium text-emerald-400 [animation-delay:280ms]">
          by Us+AI Bureau
        </p>
        <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-4 [animation-delay:360ms]">
          <Link href="/signup">
            <Button size="lg" className="pulse-ring gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:shadow-emerald-700/50 hover:scale-105">
              {t("heroStartFree")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="gap-2 px-8 transition-all duration-200 hover:scale-105">
            <Play className="h-4 w-4" /> {t("heroWatchDemo")}
          </Button>
        </div>
      </section>

      {/* ── COMPARISON (Features) ── */}
      <section id="features" className="border-t border-white/5 px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="reveal mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("comparisonTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("comparisonSubtitle")}</p>
          </div>

          {/* Desktop: table */}
          <div className="perspective-table hidden md:block">
            <div className="table-3d cinematic-border overflow-hidden rounded-2xl shadow-2xl shadow-emerald-900/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-500/10 bg-emerald-950/20 backdrop-blur-sm">
                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground">{t("comparisonCapability")}</th>
                    <th className="px-6 py-4 text-center font-semibold text-muted-foreground">{t("comparisonChatGPT")}</th>
                    <th className="px-6 py-4 text-center font-semibold text-emerald-400">Exploro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    [t("comparisonItem1"), false, true],
                    [t("comparisonItem2"), false, true],
                    [t("comparisonItem3"), false, true],
                    [t("comparisonItem4"), false, true],
                    [t("comparisonItem5"), false, true],
                    [t("comparisonItem6"), false, true],
                    [t("comparisonItem7"), false, true],
                  ].map(([label, chatgpt, exploro], i) => (
                    <tr key={label as string} className={cn("row-3d", i % 2 === 0 ? "bg-white/[0.02]" : "")}>
                      <td className="px-6 py-4 font-medium">{label as string}</td>
                      <td className="px-6 py-4 text-center">
                        {chatgpt ? <Check className="mx-auto h-4 w-4 text-emerald-400" /> : <X className="mx-auto h-4 w-4 text-red-400" />}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {exploro ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {[
              t("comparisonItem1"),
              t("comparisonItem2"),
              t("comparisonItem3"),
              t("comparisonItem4"),
              t("comparisonItem5"),
              t("comparisonItem6"),
              t("comparisonItem7"),
            ].map((label) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-sm font-medium">{label}</span>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("comparisonChatGPT")}</span>
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Exploro</span>
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT FOR (Use Cases) ── */}
      <section id="use-cases" className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("industriesHeading")}</h2>
            <p className="mt-3 text-muted-foreground">{t("industriesTitle")}</p>
          </div>
          <div className="perspective-grid">
            <div className="grid-3d grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Briefcase, label: t("industryConsultants"), desc: t("industryConsultantsDesc") },
                { icon: Building2, label: t("industryAgencies"), desc: t("industryAgenciesDesc") },
                { icon: BarChart3, label: t("industryRestaurants"), desc: t("industryRestaurantsDesc") },
                { icon: Stethoscope, label: t("industryHealthcare"), desc: t("industryHealthcareDesc") },
                { icon: Home, label: t("industryRealEstate"), desc: t("industryRealEstateDesc") },
                { icon: GraduationCap, label: t("industryEducation"), desc: t("industryEducationDesc") },
                { icon: HeartPulse, label: t("industryWellness"), desc: t("industryWellnessDesc") },
                { icon: ShoppingBag, label: t("industrySMBs"), desc: t("industrySMBsDesc") },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="card-3d rounded-xl border border-white/5 bg-[#2a3444] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-background border-t border-white/5 px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="reveal mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("howItWorksTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("howItWorksSubtitle")}</p>
          </div>

          {/* Desktop: vertical timeline */}
          <div className="perspective-timeline hidden flex-col md:flex">
            <div className="timeline-3d">
              {[
                { step: "01", icon: Upload, title: t("step1Title"), desc: t("step1Desc") },
                { step: "02", icon: Bot, title: t("step2Title"), desc: t("step2Desc") },
                { step: "03", icon: FileText, title: t("step3Title"), desc: t("step3Desc") },
                { step: "04", icon: MessageSquare, title: t("step4Title"), desc: t("step4Desc") },
                { step: "05", icon: Shield, title: t("step5Title"), desc: t("step5Desc") },
                { step: "06", icon: Rocket, title: t("step6Title"), desc: t("step6Desc") },
              ].map((item, i) => (
                <div key={item.step} className="step-3d flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="step-icon-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    {i < 5 && <div className="mt-1 h-full w-px timeline-line-glow" />}
                  </div>
                  <div className="pb-10">
                    <div className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-400">{t("stepLabel")} {item.step}</div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: compact cards */}
          <div className="grid gap-3 md:hidden">
            {[
              { step: "01", icon: Upload, title: t("step1Title"), desc: t("step1Desc") },
              { step: "02", icon: Bot, title: t("step2Title"), desc: t("step2Desc") },
              { step: "03", icon: FileText, title: t("step3Title"), desc: t("step3Desc") },
              { step: "04", icon: MessageSquare, title: t("step4Title"), desc: t("step4Desc") },
              { step: "05", icon: Shield, title: t("step5Title"), desc: t("step5Desc") },
              { step: "06", icon: Rocket, title: t("step6Title"), desc: t("step6Desc") },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{t("stepLabel")} {item.step}</span>
                  </div>
                  <h3 className="mt-0.5 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" className="border-t border-white/5 px-4 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="reveal mb-4 text-3xl font-bold tracking-tight text-white">{t("integrationsTitle")}</h2>
          <p className="mb-2 text-muted-foreground">{t("integrationsSubtitle")}</p>
          <p className="mb-12 text-sm font-medium text-emerald-400">by Us+AI Bureau</p>
          <div className="perspective-grid">
            <div className="grid-3d grid grid-cols-2 gap-3 sm:grid-cols-4">

            {/* WhatsApp */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaWhatsapp className="h-6 w-6" style={{ color: "#25D366" }} />
              </div>
              <span className="text-sm font-medium">WhatsApp</span>
            </div>

            {/* Gmail */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaGoogle className="h-6 w-6" style={{ color: "#EA4335" }} />
              </div>
              <span className="text-sm font-medium">Gmail</span>
            </div>

            {/* Outlook */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaMicrosoft className="h-6 w-6" style={{ color: "#0078D4" }} />
              </div>
              <span className="text-sm font-medium">Outlook</span>
            </div>

            {/* Google Drive */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaGoogle className="h-6 w-6" style={{ color: "#4285F4" }} />
              </div>
              <span className="text-sm font-medium">Google Drive</span>
            </div>

            {/* Notion */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <SiNotion className="h-6 w-6" style={{ color: "#000000" }} />
              </div>
              <span className="text-sm font-medium">Notion</span>
            </div>

            {/* Dropbox */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaEnvelope className="h-6 w-6" style={{ color: "#0061FF" }} />
              </div>
              <span className="text-sm font-medium">Dropbox</span>
            </div>

            {/* OneDrive */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaMicrosoft className="h-6 w-6" style={{ color: "#0078D4" }} />
              </div>
              <span className="text-sm font-medium">OneDrive</span>
            </div>

            {/* Telegram */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaTelegram className="h-6 w-6" style={{ color: "#26A5E4" }} />
              </div>
              <span className="text-sm font-medium">Telegram</span>
            </div>

            {/* Other Email */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaEnvelope className="h-6 w-6" style={{ color: "#888888" }} />
              </div>
              <span className="text-sm font-medium">Other Email</span>
            </div>

            {/* iCloud */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaApple className="h-6 w-6" style={{ color: "#3693F3" }} />
              </div>
              <span className="text-sm font-medium">iCloud</span>
            </div>

            {/* Slack */}
            <div className="card-3d flex items-center gap-3 rounded-xl border border-white/5 bg-[#2a3444] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1.5">
                <FaSlack className="h-6 w-6" style={{ color: "#4A154B" }} />
              </div>
              <span className="text-sm font-medium">Slack</span>
            </div>

          </div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY ── */}
      <section id="security" className="perspective-feature border-t border-white/5 px-4 py-24">
        <div className="feature-block-3d mx-auto max-w-5xl rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-background p-10 sm:p-16 shadow-2xl shadow-emerald-900/10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="reveal mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("privacyTitle")}</h2>
            <p className="mb-12 text-muted-foreground text-lg">
              {t("privacySubtitle")}
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, title: t("privacyNoTraining"), desc: t("privacyNoTrainingDesc") },
              { icon: Lock, title: t("privacyIsolated"), desc: t("privacyIsolatedDesc") },
              { icon: FileText, title: t("privacyOwnAI"), desc: t("privacyOwnAIDesc") },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="pillar-3d flex flex-col items-center space-y-3 text-center">
                <div className="pillar-icon-3d flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="bg-background border-t border-white/5 px-4 py-24" id="real-use-cases">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("useCasesTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("useCasesSubtitle")}</p>
          </div>
          <div className="perspective-grid">
            <div className="grid-3d grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: BarChart3,
                  title: t("useCaseRestaurant"),
                  color: "bg-emerald-500",
                  benefits: [t("useCaseRestaurantBenefit1"),t("useCaseRestaurantBenefit2"),t("useCaseRestaurantBenefit3"),t("useCaseRestaurantBenefit4")],
                },
                {
                  icon: Home,
                  title: t("useCaseRealEstate"),
                  color: "bg-gradient-to-br from-blue-500 to-cyan-500",
                  benefits: [t("useCaseRealEstateBenefit1"),t("useCaseRealEstateBenefit2"),t("useCaseRealEstateBenefit3"),t("useCaseRealEstateBenefit4")],
                },
                {
                  icon: HeartPulse,
                  title: t("useCaseWellness"),
                  color: "bg-gradient-to-br from-emerald-500 to-lime-500",
                  benefits: [t("useCaseWellnessBenefit1"),t("useCaseWellnessBenefit2"),t("useCaseWellnessBenefit3"),t("useCaseWellnessBenefit4")],
                },
              ].map((uc) => (
                <div key={uc.title} className="card-3d rounded-xl border border-white/5 bg-[#2a3444] p-4 sm:p-6">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${uc.color} text-white sm:mb-4 sm:h-12 sm:w-12 sm:rounded-xl`}>
                  <uc.icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 text-base font-semibold sm:mb-4 sm:text-lg">{uc.title}</h3>
                <ul className="space-y-1 sm:space-y-2">
                  {uc.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                      <Check className="h-3 w-3 shrink-0 text-emerald-400 sm:h-3.5 sm:w-3.5" />{b}
                    </li>
                  ))}
                </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-background border-t border-white/5 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">{t("departmentsTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("departmentsSubtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Briefcase, title: t("deptConsulting"), desc: t("deptConsultingDesc") },
              { icon: MessageSquare, title: t("deptSales"), desc: t("deptSalesDesc") },
              { icon: Building2, title: t("deptOperations"), desc: t("deptOperationsDesc") },
              { icon: HeartPulse, title: t("deptSupport"), desc: t("deptSupportDesc") },
              { icon: GraduationCap, title: t("deptTraining"), desc: t("deptTrainingDesc") },
              { icon: Shield, title: t("deptCompliance"), desc: t("deptComplianceDesc") },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/5 bg-[#2a3444] p-4 transition-colors hover:border-emerald-500/30 sm:p-6">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 sm:mb-4 sm:h-10 sm:w-10 sm:rounded-lg">
                  <Icon className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mb-1 text-sm font-semibold sm:mb-2 sm:text-base">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <div id="faq">
        <FaqSection />
      </div>

      {/* ── CTA ── */}
      <section className="perspective-feature border-t border-white/5 px-4 py-24">
        <div className="feature-block-3d mx-auto max-w-4xl rounded-2xl border border-white/5 bg-[#2a3444] p-12 text-center shadow-2xl shadow-emerald-900/10">
          <div className="mb-6 flex items-center justify-center">
            <div className="pillar-icon-3d flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Bot className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="reveal mb-4 text-3xl font-bold text-white sm:text-5xl">{t("ctaTitle")}</h2>
          <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto">
            {t("ctaSubtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10">
                {t("ctaStartFree")}
              </Button>
            </Link>
            <Link href="/exploro">
              <Button size="lg" variant="outline" className="px-10">
                {t("ctaBookDemo")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}

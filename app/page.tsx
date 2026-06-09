"use client"

import Link from "next/link"
import { useI18n } from "@/lib/i18n"
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
  Utensils,
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
          {/* Dot-grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.035)_1px,_transparent_1px)] [background-size:32px_32px]" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.55)_100%)]" />
        </div>

        <div className="animate-fade-in-up mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400 [animation-delay:0ms]">
          {t("heroBadge")}
        </div>
        <h1 className="animate-fade-in-up mb-6 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl [animation-delay:120ms]">
          {t("heroTitle")}
        </h1>
        <p className="animate-fade-in-up mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl [animation-delay:240ms]">
          {t("heroSubtitle")}
        </p>
        <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-4 [animation-delay:360ms]">
          <Link href="/signup">
            <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:shadow-emerald-700/50 hover:scale-105">
              {t("heroStartFree")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="gap-2 px-8 transition-all duration-200 hover:scale-105">
            <Play className="h-4 w-4" /> {t("heroWatchDemo")}
          </Button>
        </div>
      </section>

      {/* ── PRODUCT SCREENSHOT MOCKUP ── */}
      <section className="px-4 pb-24">
        <div className="animate-float mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-emerald-900/20">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <span className="ml-4 text-xs text-muted-foreground">{t("mockupWorkspace")}</span>
            </div>
            <div className="grid md:grid-cols-[240px_1fr]">
              {/* Sidebar */}
              <div className="hidden border-r border-white/10 p-4 md:block">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mockupKnowledgeBase")}</p>
                {["Employee_Handbook.pdf","SOP_Onboarding.pdf","Product_FAQ.pdf","Sales_Playbook.pdf","Support_Guide.pdf"].map((f) => (
                  <div key={f} className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-white/5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </div>
                ))}
              </div>
              {/* Chat */}
              <div className="flex flex-col p-5 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">U</div>
                  <div className="rounded-xl rounded-tl-none bg-muted px-4 py-2.5 text-sm">{t("mockupQuestion")}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="rounded-xl rounded-tl-none border border-emerald-500/20 bg-emerald-950/30 px-4 py-3 text-sm text-foreground">
                      {t("mockupAnswerPrefix")} <span className="font-semibold text-emerald-400">SOP_Onboarding.pdf</span>, {t("mockupAnswerSuffix")}
                      <ol className="mt-2 space-y-1 list-decimal list-inside text-muted-foreground">
                        <li>{t("mockupAnswerItem1")}</li>
                        <li>{t("mockupAnswerItem2")}</li>
                        <li>{t("mockupAnswerItem3")}</li>
                        <li>{t("mockupAnswerItem4")}</li>
                      </ol>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3 text-emerald-400" />
                        SOP_Onboarding.pdf · Page 4
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3 text-emerald-400" />
                        Employee_Handbook.pdf · Page 12
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("mockupInputPlaceholder")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON (Features) ── */}
      <section id="features" className="px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("comparisonTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("comparisonSubtitle")}</p>
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-card/80">
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">{t("comparisonCapability")}</th>
                  <th className="px-6 py-4 text-center font-semibold text-muted-foreground">{t("comparisonChatGPT")}</th>
                  <th className="px-6 py-4 text-center font-semibold text-emerald-400">Exploro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  [t("comparisonItem1"), false, true],
                  [t("comparisonItem2"), false, true],
                  [t("comparisonItem3"), false, true],
                  [t("comparisonItem4"), false, true],
                  [t("comparisonItem5"), false, true],
                  [t("comparisonItem6"), false, true],
                  [t("comparisonItem7"), false, true],
                ].map(([label, chatgpt, exploro]) => (
                  <tr key={label as string} className="transition-colors hover:bg-muted/20">
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
      <section id="use-cases" className="border-y px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("industriesTitle")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Briefcase, label: t("industryConsultants"), desc: t("industryConsultantsDesc") },
              { icon: Building2, label: t("industryAgencies"), desc: t("industryAgenciesDesc") },
              { icon: Utensils, label: t("industryRestaurants"), desc: t("industryRestaurantsDesc") },
              { icon: Stethoscope, label: t("industryHealthcare"), desc: t("industryHealthcareDesc") },
              { icon: Home, label: t("industryRealEstate"), desc: t("industryRealEstateDesc") },
              { icon: GraduationCap, label: t("industryEducation"), desc: t("industryEducationDesc") },
              { icon: HeartPulse, label: t("industryWellness"), desc: t("industryWellnessDesc") },
              { icon: ShoppingBag, label: t("industrySMBs"), desc: t("industrySMBsDesc") },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border bg-card p-4 transition-colors hover:border-emerald-500/30">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Icon className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-card/30 px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("howItWorksTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("howItWorksSubtitle")}</p>
          </div>

          {/* Desktop: vertical timeline */}
          <div className="hidden flex-col md:flex">
            {[
              { step: "01", icon: Upload, title: t("step1Title"), desc: t("step1Desc") },
              { step: "02", icon: Bot, title: t("step2Title"), desc: t("step2Desc") },
              { step: "03", icon: MessageSquare, title: t("step3Title"), desc: t("step3Desc") },
              { step: "04", icon: FileText, title: t("step4Title"), desc: t("step4Desc") },
              { step: "05", icon: Rocket, title: t("step5Title"), desc: t("step5Desc") },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <item.icon className="h-5 w-5" />
                  </div>
                  {i < 4 && <div className="mt-1 h-full w-px bg-emerald-500/20" />}
                </div>
                <div className="pb-10">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-400">{t("stepLabel")} {item.step}</div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: compact cards */}
          <div className="grid gap-3 md:hidden">
            {[
              { step: "01", icon: Upload, title: t("step1Title"), desc: t("step1Desc") },
              { step: "02", icon: Bot, title: t("step2Title"), desc: t("step2Desc") },
              { step: "03", icon: MessageSquare, title: t("step3Title"), desc: t("step3Desc") },
              { step: "04", icon: FileText, title: t("step4Title"), desc: t("step4Desc") },
              { step: "05", icon: Rocket, title: t("step5Title"), desc: t("step5Desc") },
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
      <section id="integrations" className="px-4 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">{t("integrationsTitle")}</h2>
          <p className="mb-12 text-muted-foreground">{t("integrationsSubtitle")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            {/* WhatsApp */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.855L.057 23.882l6.197-1.624A11.957 11.957 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.851 0-3.587-.504-5.079-1.379l-.361-.214-3.781.991 1.01-3.688-.235-.375A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              </div>
              <span className="text-sm font-medium">WhatsApp</span>
            </div>

            {/* Gmail */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.75l8.073-6.257C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
              </div>
              <span className="text-sm font-medium">Gmail</span>
            </div>

            {/* Outlook */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24"><path d="M24 7.387v10.478c0 .23-.08.427-.241.59a.803.803 0 01-.59.242h-9.931V9.931l-2.069 1.517-2.069-1.517V18.697H.831a.803.803 0 01-.59-.242A.803.803 0 010 17.865V7.387c0-.23.08-.427.241-.59A.803.803 0 01.831 6.556h3.9l6.507 4.772 6.507-4.772h3.924c.23 0 .427.08.59.241A.803.803 0 0124 7.387z" fill="#0078D4"/></svg>
              </div>
              <span className="text-sm font-medium">Outlook</span>
            </div>

            {/* Google Drive */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 87.3 78"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a7.3 7.3 0 001.55 4.35z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2a8.1 8.1 0 00-3.3 3.3L1.55 48.55A7.3 7.3 0 000 52.9h27.5z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25a7.3 7.3 0 001.2-4.35H59.8l5.85 11.65z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.43 54.5 0 52.9 0H34.4c-1.6 0-3.15.43-4.5 1.2z" fill="#00832D"/><path d="M59.8 52.9h27.5a7.3 7.3 0 00-1.2-4.35L61.05 8.5a8.1 8.1 0 00-3.65-3.3L43.65 25z" fill="#2684FC"/><path d="M27.45 52.9l-13.7 23.8c1.35.77 2.9 1.2 4.5 1.2h51.4c1.6 0 3.1-.43 4.45-1.2L59.8 52.9z" fill="#FFBA00"/></svg>
              </div>
              <span className="text-sm font-medium">Google Drive</span>
            </div>

            {/* Notion */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" fill="#000"/></svg>
              </div>
              <span className="text-sm font-medium">Notion</span>
            </div>

            {/* Dropbox */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24" fill="#0061FF"><path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4L6 2zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zm-6 14l-6 4 6 4 6-4-6-4z"/></svg>
              </div>
              <span className="text-sm font-medium">Dropbox</span>
            </div>

            {/* OneDrive */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24"><path d="M10.318 6.527A6.5 6.5 0 0016.5 4a6.5 6.5 0 016.415 5.402A4.5 4.5 0 0124 13.5a4.5 4.5 0 01-4.5 4.5H5.5A5.5 5.5 0 010 12.5a5.5 5.5 0 015.072-5.484A6.5 6.5 0 0010.318 6.527z" fill="#0078D4"/></svg>
              </div>
              <span className="text-sm font-medium">OneDrive</span>
            </div>

            {/* Telegram */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-emerald-500/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                <svg className="h-full w-full" viewBox="0 0 24 24" fill="#26A5E4"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.837l-2.97-.924c-.644-.203-.658-.644.136-.953l11.578-4.467c.538-.194 1.006.131.99.728z"/></svg>
              </div>
              <span className="text-sm font-medium">Telegram</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── PRIVACY ── */}
      <section id="security" className="px-4 py-24">
        <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-background p-10 sm:p-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{t("privacyTitle")}</h2>
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
              <div key={title} className="flex flex-col items-center space-y-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
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
      <section className="bg-card/30 px-4 py-24" id="real-use-cases">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("useCasesTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("useCasesSubtitle")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Utensils,
                title: t("useCaseRestaurant"),
                color: "from-orange-500 to-amber-500",
                benefits: [t("useCaseRestaurantBenefit1"),t("useCaseRestaurantBenefit2"),t("useCaseRestaurantBenefit3"),t("useCaseRestaurantBenefit4")],
              },
              {
                icon: Home,
                title: t("useCaseRealEstate"),
                color: "from-blue-500 to-cyan-500",
                benefits: [t("useCaseRealEstateBenefit1"),t("useCaseRealEstateBenefit2"),t("useCaseRealEstateBenefit3"),t("useCaseRealEstateBenefit4")],
              },
              {
                icon: HeartPulse,
                title: t("useCaseWellness"),
                color: "from-emerald-500 to-lime-500",
                benefits: [t("useCaseWellnessBenefit1"),t("useCaseWellnessBenefit2"),t("useCaseWellnessBenefit3"),t("useCaseWellnessBenefit4")],
              },
            ].map((uc) => (
              <div key={uc.title} className="rounded-xl border bg-card p-4 transition-colors hover:border-emerald-500/30 sm:p-6">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${uc.color} text-white sm:mb-4 sm:h-12 sm:w-12 sm:rounded-xl`}>
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
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="border-y px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t("departmentsTitle")}</h2>
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
              <div key={title} className="rounded-xl border bg-card p-4 transition-colors hover:border-emerald-500/30 sm:p-6">
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
      <FaqSection />

      {/* ── CTA ── */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-emerald-900/40 to-background border p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-5xl">{t("ctaTitle")}</h2>
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

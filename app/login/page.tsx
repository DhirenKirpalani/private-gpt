"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"

const featureKeys = [
  "loginFeature1",
  "loginFeature2",
  "loginFeature3",
] as const

export default function LoginPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Login:", { email, password })
  }

  return (
    <div className="-mt-[72px] flex h-screen flex-col md:flex-row">

      {/* ── Left branding panel (desktop only) ── */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900/40 to-background md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-[500px] w-[500px] rounded-full bg-emerald-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <Link href="/" className="mb-6">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={280}
              className="h-40 w-auto object-contain drop-shadow-[0_0_40px_rgba(52,211,153,0.3)] transition-opacity hover:opacity-90"
            />
          </Link>
          <h2 className="mb-3 text-3xl font-bold text-white">{t("loginHeadline")}</h2>
          <p className="mb-10 max-w-xs text-base text-emerald-200/70">
            {t("loginTagline")}
          </p>
          <ul className="w-full max-w-xs space-y-3 text-left">
            {featureKeys.map(k => (
              <li key={k} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm text-emerald-100/80">{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">

        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center justify-center md:hidden">
          <Image
            src="/assets/images/exploro-logo.png"
            alt="Exploro"
            width={200}
            height={200}
            className="h-28 w-auto object-contain"
          />
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{t("welcomeBack")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("signInAccount")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link href="#" className="text-xs text-emerald-400 hover:underline">{t("forgotPassword")}</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base font-semibold">
              {t("signIn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/signup" className="font-medium text-emerald-400 hover:underline">{t("signUpFree")}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

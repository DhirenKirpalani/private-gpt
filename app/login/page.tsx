"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"
import { signIn } from "@/lib/supabase"

const featureKeys = [
  "loginFeature1",
  "loginFeature2",
  "loginFeature3",
] as const

export default function LoginPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmedEmail, setConfirmedEmail] = useState(false)

  useEffect(() => {
    // Show welcome banner if user arrives from email confirmation
    const fromConfirm = searchParams.get("confirmed") === "true"
    if (fromConfirm) setConfirmedEmail(true)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signIn(email, password)
      router.push("/chat")
    } catch (err: any) {
      setError(err.message || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
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
            <h1 className="gradient-text-shimmer text-3xl font-bold tracking-tight pb-1">{t("welcomeBack")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("signInAccount")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/5 bg-[#2a3444] p-6 shadow-2xl shadow-emerald-900/10">
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

            {confirmedEmail && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-sm leading-relaxed text-emerald-300">
                  Email confirmed! Please log in with your password.
                </p>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                  <span className="text-xs font-bold text-red-400">!</span>
                </div>
                <p className="text-sm leading-relaxed text-red-300">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("signIn")}
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

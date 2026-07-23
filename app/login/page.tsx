"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, CheckCircle2, Loader2, X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"
import { signIn, resetPassword } from "@/lib/supabase"

const featureKeys = [
  "loginFeature1",
  "loginFeature2",
  "loginFeature3",
] as const

function LoginContent() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmedEmail, setConfirmedEmail] = useState(false)
  const [showForgotForm, setShowForgotForm] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  useEffect(() => {
    // Show welcome banner if user arrives from email confirmation
    const fromConfirm = searchParams.get("confirmed") === "true"
    if (fromConfirm) setConfirmedEmail(true)
  }, [searchParams])

  const inviteToken = searchParams.get("invite")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rateLimited) return
    setError("")
    setLoading(true)
    try {
      await signIn(email, password)
      router.push(inviteToken ? `/invite?token=${inviteToken}` : "/profile")
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase()
      const newCount = attemptCount + 1
      setAttemptCount(newCount)

      if (newCount >= 5) {
        setRateLimited(true)
        setError("Too many failed attempts. Please wait 30 seconds before trying again.")
        setTimeout(() => {
          setRateLimited(false)
          setAttemptCount(0)
        }, 30000)
      } else if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setError("Please confirm your email before signing in. Check your inbox for the confirmation link.")
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setError(`Invalid email or password. ${5 - newCount} attempt${5 - newCount === 1 ? "" : "s"} remaining.`)
      } else {
        setError(err.message || "Invalid email or password.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await resetPassword(forgotEmail || email)
      setForgotSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset link. Please try again.")
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="-mt-[72px] flex h-screen flex-col md:flex-row">

      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:p-12" style={{ backgroundColor: "#202733" }}>
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-6 flex items-center gap-2">
            <Image
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              width={280}
              height={280}
              className="h-40 w-auto object-contain"
            />
            <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
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
      <div className="flex flex-1 flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-10">

        {/* Mobile logo */}
        <Link href="/" className="mb-5 flex items-center justify-center gap-2 md:hidden sm:mb-8">
          <Image
            src="/assets/images/exploro-logo.png"
            alt="Exploro"
            width={200}
            height={200}
            className="h-16 w-auto object-contain sm:h-20"
          />
          <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">BETA</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-6 text-center md:text-left sm:mb-8">
            <h1 className="text-2xl font-bold tracking-tight pb-1 sm:text-3xl">{t("welcomeBack")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("signInAccount")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/5 bg-[#2a3444] p-4 shadow-2xl shadow-emerald-900/10 sm:p-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <button type="button" onClick={() => setShowForgotForm(v => !v)} className="text-xs text-emerald-400 hover:underline">{t("forgotPassword")}</button>
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

      {/* ── Forgot Password Modal ── */}
      {showForgotForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => {
            setShowForgotForm(false)
            setForgotSuccess(false)
            setForgotEmail("")
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#2a3444] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                  <Mail className="h-4 w-4 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold">Reset Password</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotForm(false)
                  setForgotSuccess(false)
                  setForgotEmail("")
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-sm leading-relaxed text-emerald-300">
                  Reset link sent! Check your email and follow the instructions to reset your password.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@company.com"
                      value={forgotEmail || email}
                      onChange={e => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 text-sm font-semibold disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="-mt-[72px] flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

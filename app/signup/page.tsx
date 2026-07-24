"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, CheckCircle2, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/app/auth-provider"
import { signUp, signIn } from "@/lib/supabase"
import { startTrial } from "@/lib/subscription"

const perkKeys = [
  "signupPerk1",
  "signupTrialNote",
  "signupPerk2",
  "signupPerk3",
] as const

function SignupForm() {
  const { t } = useI18n()
  const { refreshSubscription } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [inviteInfo, setInviteInfo] = useState<{ workspace_name?: string; inviter_name?: string; invited_email?: string } | null>(null)

  // Load invite info if token present
  useEffect(() => {
    if (!inviteToken) return
    fetch(`/api/workspace/invitation?token=${inviteToken}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.status === "pending") {
          setInviteInfo(data)
          if (data.invited_email) setEmail(data.invited_email)
        }
      })
      .catch(() => {})
  }, [inviteToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) return
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      await signUp(email, password, name)
      // Try auto-signin — may fail if email confirmation is required
      try {
        const { user, session } = await signIn(email, password)
        if (user && session) {
          await startTrial(user.id)
          await refreshSubscription()
          router.push(inviteToken ? `/invite?token=${inviteToken}` : "/profile")
        } else if (user && !session) {
          // User exists but session is null — email confirmation required
          setSuccess("Account created! Please check your email and click the confirmation link. Then come back and log in.")
        }
      } catch (loginErr: any) {
        if (loginErr.message?.toLowerCase().includes("email not confirmed") || loginErr.message?.toLowerCase().includes("not confirmed")) {
          setSuccess("Account created! Please check your email and click the confirmation link. Then come back and log in.")
        } else {
          throw loginErr
        }
      }
    } catch (err: any) {
      const msg = err.message || ""
      if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("not confirmed")) {
        setSuccess("Account created! Please check your email and click the confirmation link. Then come back and log in.")
      } else if (msg.toLowerCase().includes("user already registered")) {
        setError("This email is already registered. Please log in instead.")
      } else {
        setError(msg || "Something went wrong. Please try again.")
      }
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
          <h2 className="mb-3 text-3xl font-bold text-white">{t("signupHeadline")}</h2>
          <p className="mb-10 max-w-xs text-base text-emerald-200/70">
            {t("signupTagline")}
          </p>
          <ul className="w-full max-w-xs space-y-3 text-left">
            {perkKeys.map(k => (
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
          {inviteInfo && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-sm leading-relaxed text-emerald-300">
                You've been invited to join <span className="font-semibold">{inviteInfo.workspace_name}</span> by {inviteInfo.inviter_name}. Sign up to accept the invitation.
              </p>
            </div>
          )}
          <div className="mb-6 text-center md:text-left sm:mb-7">
            <h1 className="text-2xl font-bold tracking-tight pb-1 sm:text-3xl">{t("createAccount")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("getStartedFreeTagline")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-[#2a3444] p-4 shadow-2xl shadow-emerald-900/10 sm:p-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input id="name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required readOnly={!!inviteInfo?.invited_email} className={inviteInfo?.invited_email ? "opacity-60 cursor-not-allowed" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} className="pr-10" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input id="confirm-password" type={showConfirm ? "text" : "password"} placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pr-10" required />
                <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 cursor-pointer" required />
              <span className="text-sm text-muted-foreground leading-snug">
                {t("agreeTerms")}{" "}
                <Link href="/terms" className="text-emerald-400 hover:underline">{t("termsAnd")}</Link>{" "}
                {t("and")}{" "}
                <Link href="/privacy" className="text-emerald-400 hover:underline">{t("privacyPolicy")}</Link>
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                  <span className="text-xs font-bold text-red-400">!</span>
                </div>
                <p className="text-sm leading-relaxed text-red-300">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-sm leading-relaxed text-emerald-300">{success}</p>
              </div>
            )}
            <Button type="submit" disabled={!agreedToTerms || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("createAccountBtn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-medium text-emerald-400 hover:underline">{t("signInLink")}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}

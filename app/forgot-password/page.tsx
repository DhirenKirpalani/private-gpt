"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, Suspense } from "react"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"
import { resetPassword } from "@/lib/supabase"

function ForgotPasswordContent() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess("Password reset link sent! Check your email and follow the instructions to reset your password.")
    } catch (err: any) {
      const msg = err.message || ""
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many")) {
        setError("Too many requests. Please wait a minute before trying again.")
      } else {
        setError(msg || "Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="-mt-[72px] flex h-screen flex-col items-center justify-center px-3 py-6 sm:px-4">
      <Link href="/" className="mb-5 flex items-center justify-center gap-2 sm:mb-8">
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
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Mail className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/5 bg-[#2a3444] p-4 shadow-2xl shadow-emerald-900/10 sm:p-6">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

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
          <Button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base font-semibold disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-emerald-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="-mt-[72px] flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}

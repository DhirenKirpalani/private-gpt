"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase, updatePassword, signOut } from "@/lib/supabase"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [recoveryReady, setRecoveryReady] = useState(false)

  // Listen for PASSWORD_RECOVERY event from Supabase when user clicks the email link
  // detectSessionInUrl: true auto-creates a session, but we need to intercept it
  // so the user sees the password form instead of being logged in directly
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Session exists from the recovery token — show the form
        setRecoveryReady(true)
      } else if (event === "SIGNED_IN" && session && !recoveryReady) {
        // If auto-signin happened before recovery event, check if this is a recovery flow
        // by looking for recovery params in the URL
        const hash = window.location.hash
        if (hash && hash.includes("type=recovery")) {
          setRecoveryReady(true)
        }
      }
    })

    // Also check URL hash on mount (in case the event already fired)
    if (typeof window !== "undefined") {
      const hash = window.location.hash
      if (hash && hash.includes("type=recovery")) {
        setRecoveryReady(true)
      }
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [recoveryReady])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      await updatePassword(password)
      // Sign out so the recovery session is cleared — user must log in with new password
      await signOut()
      setSuccess("Password updated successfully! Redirecting to login...")
      setTimeout(() => router.push("/login"), 2000)
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.")
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Set New Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {recoveryReady
              ? "Enter your new password below."
              : "Verifying your reset link..."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/5 bg-[#2a3444] p-4 shadow-2xl shadow-emerald-900/10 sm:p-6"
          style={{ display: recoveryReady ? undefined : "none" }}>
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
          </Button>
        </form>

        {recoveryReady && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-emerald-400 hover:underline">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="-mt-[72px] flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

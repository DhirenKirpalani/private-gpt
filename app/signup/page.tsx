"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const perks = [
  "No credit card required to start",
  "Set up your AI in under 60 minutes",
  "Cancel or upgrade anytime",
]

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) return
    console.log("Signup:", { name, email, password, confirmPassword })
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
          <h2 className="mb-3 text-3xl font-bold text-white">Start for free today</h2>
          <p className="mb-10 max-w-xs text-base text-emerald-200/70">
            Join hundreds of businesses using Exploro to power their AI workforce.
          </p>
          <ul className="w-full max-w-xs space-y-3 text-left">
            {perks.map(p => (
              <li key={p} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm text-emerald-100/80">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">

        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex flex-col items-center gap-2 md:hidden">
          <Image
            src="/assets/images/exploro-logo.png"
            alt="Exploro"
            width={200}
            height={200}
            className="h-28 w-auto object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-emerald-400">EXPLORO</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-7 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Get started with Exploro for free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
              <Label htmlFor="confirm-password">Confirm Password</Label>
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
                I agree to the{" "}
                <Link href="#" className="text-emerald-400 hover:underline">Terms</Link>
                {" "}and{" "}
                <Link href="#" className="text-emerald-400 hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <Button type="submit" disabled={!agreedToTerms}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

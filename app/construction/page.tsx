"use client"

import { useState } from "react"
import { Mail, ArrowRight, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "exploro-construction-emails"

function loadEmails(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveEmails(emails: string[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails))
}

export default function ConstructionPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = () => {
    setError("")
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }
    const existing = loadEmails()
    if (existing.includes(email.trim().toLowerCase())) {
      setSubmitted(true)
      return
    }
    saveEmails([...existing, email.trim().toLowerCase()])
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 text-center shadow-xl">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <Mail className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Coming Soon</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We are building something great. Leave your email and be the first to know when we launch.
        </p>

        {submitted ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <Check className="h-6 w-6 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-400">You are on the list!</p>
            <p className="text-xs text-muted-foreground">We will notify you at {email}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
                placeholder="your@email.com"
                className="pl-10"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={handleSubmit} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
              Notify Me <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

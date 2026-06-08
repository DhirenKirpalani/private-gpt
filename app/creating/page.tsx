"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"

const steps = [
  { label: "Analyzing business profile" },
  { label: "Processing documents" },
  { label: "Learning brand voice" },
  { label: "Building knowledge graph" },
  { label: "Creating memory" },
]

export default function CreatingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (currentStep < steps.length) {
      const t = setTimeout(() => setCurrentStep(s => s + 1), 900)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setDone(true), 600)
      return () => clearTimeout(t)
    }
  }, [currentStep])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-900/30">
            <img
              src="/assets/images/exploro-logo.png"
              alt="Exploro"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Creating Your AI</h1>
          <p className="text-sm text-muted-foreground">
            Exploro is learning your business. This takes about 2 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const completed = i < currentStep
            const active = i === currentStep
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                  completed
                    ? "border-emerald-500/30 bg-emerald-950/20"
                    : active
                    ? "border-white/10 bg-card"
                    : "border-white/5 opacity-40"
                }`}
              >
                <div className="shrink-0">
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-white/20" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    completed
                      ? "text-emerald-300"
                      : active
                      ? "text-white"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Estimated time / launch */}
        {!done ? (
          <p className="text-center text-xs text-muted-foreground">
            Estimated time: <span className="font-medium text-foreground">2 minutes</span>
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-semibold text-emerald-400">
              ✓ Your AI is ready
            </p>
            <Link
              href="/chat"
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-700"
            >
              Launch Chat →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

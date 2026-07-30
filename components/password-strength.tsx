"use client"

import { useMemo } from "react"
import { Check, X } from "lucide-react"

interface PasswordStrengthProps {
  password: string
  t?: (key: any) => string
}

export function PasswordStrength({ password, t }: PasswordStrengthProps) {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback)

  const checks = [
    { key: "length", label: tr("pw8Chars", "8+ characters"), test: (p: string) => p.length >= 8 },
    { key: "upper", label: tr("pwUppercase", "Uppercase letter"), test: (p: string) => /[A-Z]/.test(p) },
    { key: "lower", label: tr("pwLowercase", "Lowercase letter"), test: (p: string) => /[a-z]/.test(p) },
    { key: "number", label: tr("pwNumber", "Number"), test: (p: string) => /\d/.test(p) },
    { key: "special", label: tr("pwSpecial", "Special character"), test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ]

  const levels = [
    { score: 0, label: "", color: "", bars: 0, text: "" },
    { score: 1, label: tr("pwWeak", "Weak"), color: "bg-red-500", bars: 1, text: "text-red-400" },
    { score: 2, label: tr("pwFair", "Fair"), color: "bg-orange-500", bars: 2, text: "text-orange-400" },
    { score: 3, label: tr("pwGood", "Good"), color: "bg-yellow-500", bars: 3, text: "text-yellow-400" },
    { score: 4, label: tr("pwStrong", "Strong"), color: "bg-emerald-500", bars: 4, text: "text-emerald-400" },
    { score: 5, label: tr("pwVeryStrong", "Very Strong"), color: "bg-emerald-500", bars: 4, text: "text-emerald-400" },
  ]

  const passedChecks = useMemo(() => checks.filter(c => c.test(password)), [password])
  const score = passedChecks.length
  const level = levels[score]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2.5 overflow-hidden">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ease-out ${
                i < level.bars ? level.color : "bg-white/10"
              }`}
              style={{
                transform: i < level.bars ? "scaleX(1)" : "scaleX(0.6)",
                transformOrigin: "left",
                opacity: i < level.bars ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <span
          className={`text-xs font-medium transition-all duration-300 ${level.text}`}
          style={{
            opacity: score > 0 ? 1 : 0,
            transform: score > 0 ? "translateX(0)" : "translateX(-4px)",
          }}
        >
          {level.label}
        </span>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {checks.map(c => {
          const passed = c.test(password)
          return (
            <div
              key={c.key}
              className="flex items-center gap-1.5 transition-all duration-300"
              style={{
                opacity: password ? 0.7 : 0,
                transform: passed ? "translateX(0)" : "translateX(0)",
              }}
            >
              <div
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  passed ? "bg-emerald-500/20 scale-100" : "bg-white/5 scale-90"
                }`}
              >
                {passed ? (
                  <Check
                    className="h-2.5 w-2.5 text-emerald-400 transition-all duration-300"
                    style={{ transform: "scale(1) rotate(0deg)", opacity: 1 }}
                  />
                ) : (
                  <X
                    className="h-2.5 w-2.5 text-muted-foreground/50 transition-all duration-300"
                    style={{ transform: "scale(0.8)", opacity: 0.5 }}
                  />
                )}
              </div>
              <span
                className={`text-[11px] transition-colors duration-300 ${
                  passed ? "text-emerald-400/80" : "text-muted-foreground/60"
                }`}
              >
                {c.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

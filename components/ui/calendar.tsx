"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  value?: string // yyyy-mm-dd
  onChange: (value: string) => void
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function parseDate(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function Calendar({ value, onChange }: CalendarProps) {
  const selected = parseDate(value || "")
  const [viewDate, setViewDate] = React.useState(selected || new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const startDay = firstDayOfMonth.getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const handleSelect = (day: number) => {
    const d = new Date(year, month, day)
    onChange(toYMD(d))
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getDate() === day &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    )
  }

  const isToday = (day: number) => {
    const t = new Date()
    return (
      t.getDate() === day &&
      t.getMonth() === month &&
      t.getFullYear() === year
    )
  }

  return (
    <div className="w-64 select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S","M","T","W","T","F","S"].map(d => (
          <div key={d} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div key={i} className="aspect-square">
            {day !== null ? (
              <button
                type="button"
                onClick={() => handleSelect(day)}
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-md text-sm transition-colors",
                  isSelected(day)
                    ? "bg-emerald-600 text-white font-semibold"
                    : isToday(day)
                    ? "text-emerald-400 font-semibold hover:bg-white/5"
                    : "text-white hover:bg-white/5"
                )}
              >
                {day}
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

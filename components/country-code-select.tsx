"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Search, Check } from "lucide-react"

const COUNTRIES = [
  { code: "US", name: "United States", dial: "1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dial: "61", flag: "🇦🇺" },
  { code: "IN", name: "India", dial: "91", flag: "🇮🇳" },
  { code: "DE", name: "Germany", dial: "49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dial: "34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dial: "31", flag: "🇳🇱" },
  { code: "BR", name: "Brazil", dial: "55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "JP", name: "Japan", dial: "81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "82", flag: "🇰🇷" },
  { code: "CN", name: "China", dial: "86", flag: "🇨🇳" },
  { code: "RU", name: "Russia", dial: "7", flag: "🇷🇺" },
  { code: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦" },
  { code: "AE", name: "UAE", dial: "971", flag: "🇦🇪" },
  { code: "IL", name: "Israel", dial: "972", flag: "🇮🇱" },
  { code: "TR", name: "Turkey", dial: "90", flag: "🇹🇷" },
  { code: "EG", name: "Egypt", dial: "20", flag: "🇪🇬" },
  { code: "ZA", name: "South Africa", dial: "27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "254", flag: "🇰🇪" },
  { code: "SG", name: "Singapore", dial: "65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", dial: "60", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", dial: "62", flag: "🇮🇩" },
  { code: "TH", name: "Thailand", dial: "66", flag: "🇹🇭" },
  { code: "PH", name: "Philippines", dial: "63", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", dial: "84", flag: "🇻🇳" },
  { code: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩" },
  { code: "PL", name: "Poland", dial: "48", flag: "🇵🇱" },
  { code: "SE", name: "Sweden", dial: "46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dial: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dial: "358", flag: "🇫🇮" },
  { code: "CH", name: "Switzerland", dial: "41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dial: "43", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", dial: "32", flag: "🇧🇪" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dial: "30", flag: "🇬🇷" },
  { code: "IE", name: "Ireland", dial: "353", flag: "🇮🇪" },
  { code: "CZ", name: "Czech Republic", dial: "420", flag: "🇨🇿" },
  { code: "RO", name: "Romania", dial: "40", flag: "🇷🇴" },
  { code: "HU", name: "Hungary", dial: "36", flag: "🇭🇺" },
  { code: "UA", name: "Ukraine", dial: "380", flag: "🇺🇦" },
  { code: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "PE", name: "Peru", dial: "51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { code: "NZ", name: "New Zealand", dial: "64", flag: "🇳🇿" },
  { code: "HK", name: "Hong Kong", dial: "852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", dial: "886", flag: "🇹🇼" },
  { code: "QA", name: "Qatar", dial: "974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dial: "965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dial: "973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dial: "968", flag: "🇴🇲" },
  { code: "JO", name: "Jordan", dial: "962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", dial: "961", flag: "🇱🇧" },
  { code: "IQ", name: "Iraq", dial: "964", flag: "🇮🇶" },
  { code: "MA", name: "Morocco", dial: "212", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", dial: "213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", dial: "216", flag: "🇹🇳" },
  { code: "GH", name: "Ghana", dial: "233", flag: "🇬🇭" },
  { code: "ET", name: "Ethiopia", dial: "251", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", dial: "255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", dial: "256", flag: "🇺🇬" },
  { code: "HR", name: "Croatia", dial: "385", flag: "🇭🇷" },
  { code: "SK", name: "Slovakia", dial: "421", flag: "🇸🇰" },
  { code: "BG", name: "Bulgaria", dial: "359", flag: "🇧🇬" },
  { code: "RS", name: "Serbia", dial: "381", flag: "🇷🇸" },
  { code: "LT", name: "Lithuania", dial: "370", flag: "🇱🇹" },
  { code: "LV", name: "Latvia", dial: "371", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", dial: "372", flag: "🇪🇪" },
  { code: "IS", name: "Iceland", dial: "354", flag: "🇮🇸" },
  { code: "LU", name: "Luxembourg", dial: "352", flag: "🇱🇺" },
  { code: "MT", name: "Malta", dial: "356", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", dial: "357", flag: "🇨🇾" },
  { code: "SI", name: "Slovenia", dial: "386", flag: "🇸🇮" },
  { code: "EC", name: "Ecuador", dial: "593", flag: "🇪🇨" },
  { code: "UY", name: "Uruguay", dial: "598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", dial: "595", flag: "🇵🇾" },
  { code: "BO", name: "Bolivia", dial: "591", flag: "🇧🇴" },
  { code: "DO", name: "Dominican Republic", dial: "1", flag: "🇩🇴" },
  { code: "GT", name: "Guatemala", dial: "502", flag: "🇬🇹" },
  { code: "CR", name: "Costa Rica", dial: "506", flag: "🇨🇷" },
  { code: "PA", name: "Panama", dial: "507", flag: "🇵🇦" },
  { code: "LK", name: "Sri Lanka", dial: "94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dial: "977", flag: "🇳🇵" },
  { code: "MM", name: "Myanmar", dial: "95", flag: "🇲🇲" },
  { code: "KH", name: "Cambodia", dial: "855", flag: "🇰🇭" },
  { code: "LA", name: "Laos", dial: "856", flag: "🇱🇦" },
  { code: "MN", name: "Mongolia", dial: "976", flag: "🇲🇳" },
  { code: "KZ", name: "Kazakhstan", dial: "7", flag: "🇰🇿" },
  { code: "AZ", name: "Azerbaijan", dial: "994", flag: "🇦🇿" },
  { code: "GE", name: "Georgia", dial: "995", flag: "🇬🇪" },
  { code: "AM", name: "Armenia", dial: "374", flag: "🇦🇲" },
  { code: "BY", name: "Belarus", dial: "375", flag: "🇧🇾" },
  { code: "MD", name: "Moldova", dial: "373", flag: "🇲🇩" },
]

interface CountryCodeSelectProps {
  value: string
  onChange: (dialCode: string) => void
  disabled?: boolean
}

export function CountryCodeSelect({ value, onChange, disabled }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => COUNTRIES.find(c => c.dial === value) ?? COUNTRIES[0], [value])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.code.toLowerCase().includes(q)
    )
  }, [search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-muted-foreground">+{selected.dial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-white/10 bg-[#1a1f2e] shadow-2xl">
          <div className="border-b border-white/10 p-2">
            <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code + c.dial}
                onClick={() => {
                  onChange(c.dial)
                  setOpen(false)
                  setSearch("")
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
                {c.dial === value && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

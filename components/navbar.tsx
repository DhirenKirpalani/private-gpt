"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/#features",  label: "Features",  sectionId: "features"  },
  { href: "/#use-cases", label: "Use Cases", sectionId: "use-cases" },
  { href: "/#security",  label: "Security",  sectionId: "security"  },
  { href: "/#pricing",   label: "Pricing",   sectionId: "pricing"   },
]

export function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Clear highlight immediately when leaving the homepage
    if (pathname !== "/") {
      setActiveSection("")
      return
    }

    const ids = navLinks.map(l => l.sectionId)
    const observers: IntersectionObserver[] = []

    ids.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [pathname])

  if (pathname === "/chat" || pathname === "/login" || pathname === "/signup") return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 overflow-visible border-b border-white/8 bg-background/90 backdrop-blur-xl">
      {/* Main bar */}
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between overflow-visible px-4 sm:px-6">

        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center overflow-visible" onClick={() => setMobileOpen(false)}>
          <Image
            src="/assets/images/exploro-logo.png"
            alt="Exploro"
            width={280}
            height={70}
            priority
            className="w-auto object-contain transition-transform duration-300 hover:scale-105"
            style={{ height: "140px", transformOrigin: "left center" }}
          />
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, sectionId }) => {
            const isActive = activeSection === sectionId
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative px-4 py-2 text-sm font-medium transition-colors duration-200",
                  isActive ? "text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                <span className={cn("absolute inset-0 rounded-md bg-white/8 transition-transform duration-200 ease-out origin-center", isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                <span className={cn("absolute bottom-1 left-4 right-4 h-px rounded-full bg-emerald-400 transition-transform duration-300 ease-out origin-left", isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                <span className="relative z-10">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground transition-colors md:block">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:px-4">
            Get Started
          </Link>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-white/8 bg-background/95 px-4 pb-4 pt-2 md:hidden">
          {navLinks.map(({ href, label, sectionId }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeSection === sectionId
                  ? "bg-emerald-600/15 text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              {label}
            </Link>
          ))}
          <div className="mt-3 border-t border-white/8 pt-3">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
              Log in
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

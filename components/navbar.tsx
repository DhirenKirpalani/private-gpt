"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/app/auth-provider"

const navLinkKeys = [
  { href: "/about",      key: "whyNow"    as const, sectionId: "_"         },
  { href: "/#security",  key: "security"  as const, sectionId: "security"  },
  { href: "/#features",  key: "features"  as const, sectionId: "features"  },
  { href: "/#faq",       key: "faq"       as const, sectionId: "faq"       },
  { href: "/#use-cases", key: "useCases"  as const, sectionId: "use-cases" },
  { href: "/pricing",    key: "pricing"   as const, sectionId: "_"         },
]

function getInitials(name: string): string {
  if (!name.trim()) return ""
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t, lang, setLang } = useI18n()
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    const av = localStorage.getItem("exploro_avatar_url")
    if (av) setAvatarUrl(av)
  }, [])

  const handleCTA = () => {
    if (user) router.push("/chat")
    else router.push("/signup")
  }
  const userName = user?.user_metadata?.full_name || ""
  const userInitials = getInitials(userName)

  useEffect(() => {
    // Clear highlight immediately when leaving the homepage
    if (pathname !== "/") {
      setActiveSection("")
      return
    }

    const ids = navLinkKeys.map(l => l.sectionId)
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

    const handleScroll = () => {
      if (window.scrollY < 100) setActiveSection("")
    }
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      observers.forEach(o => o.disconnect())
      window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname])

  if (pathname === "/chat" || pathname === "/login" || pathname === "/signup") return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 overflow-visible border-b border-white/8 bg-background/90 backdrop-blur-xl">
      {/* Main bar */}
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between overflow-visible px-4 sm:px-6">

        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center overflow-visible" onClick={() => { setMobileOpen(false); setActiveSection("") }}>
          <img
            src="/assets/images/exploro-logo.png"
            alt="Exploro"
            className="w-auto object-contain transition-transform duration-300 hover:scale-105"
            style={{ height: "44px", transformOrigin: "left center" }}
          />
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden items-center gap-2 md:flex">
          {navLinkKeys.map(({ href, key, sectionId }) => {
            const isActive = sectionId === "_" ? pathname === href : activeSection === sectionId
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative px-3 py-2 text-sm font-medium transition-colors duration-200 lg:px-4",
                  isActive ? "text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                <span className={cn("absolute inset-0 rounded-md bg-white/8 transition-transform duration-200 ease-out origin-center", isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                <span className={cn("absolute bottom-1 left-3 right-3 h-px rounded-full bg-emerald-400 transition-transform duration-300 ease-out origin-left lg:left-4 lg:right-4", isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                <span className="relative z-10 whitespace-nowrap">{t(key)}</span>
              </Link>
            )
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-5 sm:gap-8">
          {/* Language toggle — segmented pill */}
          <div className="hidden items-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:inline-flex">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                lang === "en"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("es")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                lang === "es"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              ES
            </button>
          </div>

          {user ? (
            <Link href="/profile" className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 transition-colors overflow-hidden">
              <span className={avatarUrl ? "hidden" : ""}>{userInitials || <User className="h-4 w-4 text-white" />}</span>
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
              )}
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground transition-colors md:block">
                {t("logIn")}
              </Link>
              <button onClick={handleCTA} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-emerald-700 sm:px-4">
                {t("getStarted")}
              </button>
            </>
          )}
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
          {navLinkKeys.map(({ href, key, sectionId }) => {
            const isMobileActive = sectionId === "_" ? pathname === href : activeSection === sectionId
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isMobileActive
                    ? "bg-emerald-600/15 text-white"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                {t(key)}
              </Link>
            )
          })}
          <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
            {user ? (
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                Profile
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                {t("logIn")}
              </Link>
            )}
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => setLang("en")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                  lang === "en"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLang("es")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                  lang === "es"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                ES
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { FaLinkedin, FaFacebook } from "react-icons/fa"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/app/auth-provider"
import { cn } from "@/lib/utils"

export function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const { user } = useAuth()

  const handleCTA = () => {
    if (user) router.push("/chat")
    else router.push("/signup")
  }

  if (pathname === "/chat" || pathname === "/login" || pathname === "/signup") return null

  return (
    <footer className="border-t border-white/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-16">

        {/* Main Footer */}
        <div className="grid gap-12 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center justify-center transition-transform duration-300 hover:scale-105"
              >
                <Image src="/assets/images/exploro-icon.svg" alt="Exploro OS" width={40} height={40} unoptimized className="h-10 w-10 object-contain" />
              </Link>
              <a
                href="https://www.linkedin.com/company/exploro-os/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center transition-colors hover:opacity-80"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="h-8 w-8" style={{ color: "#0077b5" }} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61591467366278"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center transition-colors hover:opacity-80"
                aria-label="Facebook"
              >
                <FaFacebook className="h-8 w-8" style={{ color: "#1877F2" }} />
              </a>
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-400">{t("productTagline")}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("brandTagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("product")}
            </h3>

            <div className="space-y-3">
              <Link
                href="/#features"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("features")}
              </Link>

              <Link
                href="/#integrations"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("integrations")}
              </Link>

              <Link
                href="/#security"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("security")}
              </Link>

              <Link
                href="/pricing"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("pricing")}
              </Link>

              <Link
                href="/about"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("aboutUs")}
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("resources")}
            </h3>

            <div className="space-y-3">
              <Link
                href="/#faq"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("faq")}
              </Link>

              <Link
                href="/login"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("logIn")}
              </Link>

              <button
                onClick={handleCTA}
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("getStarted")}
              </button>

              <Link
                href="/support"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("support")}
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("startBuilding")}
            </h3>

            <p className="mb-5 text-sm text-muted-foreground">
              {t("footerTagline")}
            </p>

            <button
              onClick={handleCTA}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-700/50 hover:scale-105"
            >
              {user ? t("goToChat") : t("getStartedFree")}
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className={cn(
                "group relative px-1 py-1 text-xs font-medium transition-colors duration-200",
                pathname === "/privacy" ? "text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              <span className={cn("absolute bottom-0 left-1 right-1 h-px rounded-full bg-emerald-400 transition-transform duration-300 ease-out origin-left", pathname === "/privacy" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
              <span className="relative z-10 whitespace-nowrap">{t("privacy")}</span>
            </Link>

            <Link
              href="/terms"
              className={cn(
                "group relative px-1 py-1 text-xs font-medium transition-colors duration-200",
                pathname === "/terms" ? "text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              <span className={cn("absolute bottom-0 left-1 right-1 h-px rounded-full bg-emerald-400 transition-transform duration-300 ease-out origin-left", pathname === "/terms" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
              <span className="relative z-10 whitespace-nowrap">{t("terms")}</span>
            </Link>

            <Link
              href="/disclaimer"
              className={cn(
                "group relative px-1 py-1 text-xs font-medium transition-colors duration-200",
                pathname === "/disclaimer" ? "text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              <span className={cn("absolute bottom-0 left-1 right-1 h-px rounded-full bg-emerald-400 transition-transform duration-300 ease-out origin-left", pathname === "/disclaimer" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
              <span className="relative z-10 whitespace-nowrap">{t("disclaimer")}</span>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
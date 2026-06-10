"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/lib/i18n"

export function Footer() {
  const pathname = usePathname()
  const { t } = useI18n()

  if (pathname === "/chat" || pathname === "/login" || pathname === "/signup") return null

  return (
    <footer className="border-t border-white/10 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">

        {/* Main Footer */}
        <div className="grid gap-12 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 transition-transform duration-300 hover:scale-105 overflow-hidden"
              >
                <img src="/favicon.ico" alt="Exploro" className="h-10 w-10 object-contain" />
              </Link>
              <a
                href="https://www.linkedin.com/company/us-ai-bureau/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0077b5]/10 transition-colors hover:bg-[#0077b5]/20"
                aria-label="Us+AI Bureau LinkedIn"
              >
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="#0077b5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
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

              <Link
                href="/signup"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("getStarted")}
              </Link>

              <Link
                href="/"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("contact")}
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

            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              {t("getStartedFree")}
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("privacy")}
            </Link>

            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("terms")}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
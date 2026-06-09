"use client"

import Link from "next/link"
import Image from "next/image"
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
            <Link
              href="/"
              className="inline-flex items-center"
            >
              <Image
                src="/assets/images/exploro-logo.png"
                alt="Exploro"
                width={320}
                height={80}
                priority
                className="h-20 w-auto object-contain transition-transform duration-300 hover:scale-105"
              />
            </Link>

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
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Animated background glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[120px] animate-drift-1" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[350px] w-[350px] rounded-full bg-emerald-600/8 blur-[100px] animate-drift-2" />

      {/* Floating 404 */}
      <div className="relative mb-6 animate-float">
        <h1 className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-8xl font-extrabold tracking-tight text-transparent sm:text-9xl">
          404
        </h1>
        <div className="absolute inset-0 mx-auto h-8 w-8 rounded-full bg-emerald-500/20 blur-xl animate-pulse-glow" />
      </div>

      {/* Staggered content */}
      <h2 className="animate-fade-in-up mb-3 text-2xl font-bold text-white sm:text-3xl [animation-delay:120ms]">
        Page not found
      </h2>
      <p className="animate-fade-in-up mb-8 max-w-md text-muted-foreground sm:text-lg [animation-delay:240ms]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      {/* Buttons */}
      <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-4 [animation-delay:360ms]">
        <Link href="/">
          <Button className="gap-2 bg-emerald-600 px-6 py-2.5 text-white shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:bg-emerald-700 hover:shadow-emerald-700/50 hover:scale-105">
            <Home className="h-4 w-4" /> Go home
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="outline" className="gap-2 px-6 py-2.5 transition-all duration-200 hover:scale-105">
            <ArrowLeft className="h-4 w-4" /> View pricing
          </Button>
        </Link>
      </div>

      {/* Helpful links */}
      <div className="animate-fade-in-up mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground [animation-delay:480ms]">
        <Link href="/#features" className="transition-colors hover:text-emerald-400">
          Features
        </Link>
        <Link href="/#integrations" className="transition-colors hover:text-emerald-400">
          Integrations
        </Link>
        <Link href="/#security" className="transition-colors hover:text-emerald-400">
          Security
        </Link>
        <Link href="/#faq" className="transition-colors hover:text-emerald-400">
          FAQ
        </Link>
        <Link href="/about" className="transition-colors hover:text-emerald-400">
          About
        </Link>
      </div>

      {/* Search hint */}
      <div className="animate-fade-in-up mt-8 flex items-center gap-2 text-xs text-muted-foreground/60 [animation-delay:600ms]">
        <Search className="h-3 w-3" />
        <span>Try navigating from the homepage</span>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { Check, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SubscriberPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Start with Solo and scale as your team grows.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Solo */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
            Solo
          </div>
          <h2 className="text-2xl font-bold">Free</h2>
          <p className="mt-1 text-sm text-muted-foreground">Perfect for individuals getting started.</p>
          <ul className="mt-6 space-y-3">
            {[
              "1 AI workspace",
              "Up to 50 documents",
              "Chat interface",
              "Basic integrations",
              "Community support",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/signup">
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                Unlock Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Team */}
        <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            Team
          </div>
          <h2 className="text-2xl font-bold">$49<span className="text-sm font-normal text-muted-foreground">/mo</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">For growing teams that need more power.</p>
          <ul className="mt-6 space-y-3">
            {[
              "5 AI workspaces",
              "Unlimited documents",
              "WhatsApp & Email channels",
              "Priority support",
              "Analytics dashboard",
              "Team collaboration",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button variant="outline" className="w-full border-white/10">
              Choose Team
            </Button>
          </div>
        </div>

        {/* Enterprise */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-muted-foreground">
            Enterprise
          </div>
          <h2 className="text-2xl font-bold">Custom</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dedicated infrastructure and SLA.</p>
          <ul className="mt-6 space-y-3">
            {[
              "Unlimited workspaces",
              "Custom integrations",
              "Dedicated support",
              "SSO & audit logs",
              "On-premise option",
              "SLA guarantee",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button variant="outline" className="w-full border-white/10">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

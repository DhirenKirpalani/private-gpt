"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { getProfile } from "@/lib/supabase"
import { getSubscription } from "@/lib/subscription"

interface CheckoutButtonProps {
  plan: "solo" | "team"
  userId?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

function isUSLocation(location: string | null | undefined): boolean {
  if (!location) return false
  const normalized = location.trim().toLowerCase()
  return (
    normalized === "united states" ||
    normalized === "us" ||
    normalized === "usa" ||
    normalized === "u.s." ||
    normalized === "u.s.a." ||
    normalized === "united states of america"
  )
}

export function CheckoutButton({
  plan,
  userId,
  disabled,
  className,
  children,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!userId) {
      window.location.href = "/login?redirect=/pricing"
      return
    }

    setLoading(true)
    try {
      let useStripe = true

      try {
        const profile = await getProfile(userId)
        if (profile && !isUSLocation(profile.location)) {
          useStripe = false
        }
      } catch {
        // If profile fetch fails, default to Stripe
      }

      const endpoint = useStripe ? "/api/stripe/checkout" : "/api/fastspring/checkout"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[Checkout]", data.error)
        toast({ title: "Checkout Error", description: data.error || "Something went wrong. Please try again.", variant: "error" })
      }
    } catch (err) {
      console.error("[Checkout]", err)
      toast({ title: "Checkout Error", description: "Something went wrong. Please try again.", variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </>
      ) : (
        children
      )}
    </Button>
  )
}

interface BillingPortalButtonProps {
  userId?: string
  className?: string
  children?: React.ReactNode
}

export function BillingPortalButton({ userId, className, children }: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePortal = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const sub = await getSubscription(userId)

      if (sub?.fastspring_subscription_id) {
        // FastSpring — redirect to FastSpring account management
        const storeId = process.env.NEXT_PUBLIC_FASTSPRING_STORE_ID ?? ""
        if (storeId) {
          window.location.href = `https://${storeId}.onfastspring.com/account`
          return
        }
        toast({ title: "Billing Error", description: "FastSpring store not configured.", variant: "error" })
        return
      }

      if (sub?.stripe_customer_id) {
        const res = await fetch("/api/stripe/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
        toast({ title: "Billing Error", description: data.error || "Something went wrong.", variant: "error" })
        return
      }

      toast({ title: "Billing Error", description: "No active subscription found.", variant: "error" })
    } catch (err) {
      console.error("[Billing Portal]", err)
      toast({ title: "Billing Error", description: "Something went wrong.", variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePortal} disabled={loading} variant="outline" className={className}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
    </Button>
  )
}

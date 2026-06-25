"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

interface StripeCheckoutButtonProps {
  plan: "solo" | "team"
  userId?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function StripeCheckoutButton({
  plan,
  userId,
  disabled,
  className,
  children,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!userId) {
      // Redirect to login if not authenticated
      window.location.href = "/login?redirect=/pricing"
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[Stripe Checkout]", data.error)
        toast({ title: "Checkout Error", description: data.error || "Something went wrong. Please try again.", variant: "error" })
      }
    } catch (err) {
      console.error("[Stripe Checkout]", err)
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

interface StripePortalButtonProps {
  userId?: string
  className?: string
  children?: React.ReactNode
}

export function StripePortalButton({ userId, className, children }: StripePortalButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePortal = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[Stripe Portal]", data.error)
        toast({ title: "Billing Error", description: data.error || "Something went wrong.", variant: "error" })
      }
    } catch (err) {
      console.error("[Stripe Portal]", err)
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

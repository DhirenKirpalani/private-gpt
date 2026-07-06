"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

interface FastSpringCheckoutButtonProps {
  plan: "solo" | "team"
  userId?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function FastSpringCheckoutButton({
  plan,
  userId,
  disabled,
  className,
  children,
}: FastSpringCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!userId) {
      window.location.href = "/login?redirect=/pricing"
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/fastspring/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[FastSpring Checkout]", data.error)
        toast({
          title: "Checkout Error",
          description: data.error || "Something went wrong. Please try again.",
          variant: "error",
        })
      }
    } catch (err) {
      console.error("[FastSpring Checkout]", err)
      toast({
        title: "Checkout Error",
        description: "Something went wrong. Please try again.",
        variant: "error",
      })
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

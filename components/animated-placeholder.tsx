"use client"

import { useState, useEffect } from "react"

interface AnimatedPlaceholderProps {
  messages: string[]
  interval?: number
  className?: string
}

export function AnimatedPlaceholder({ messages, interval = 3000, className }: AnimatedPlaceholderProps) {
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIndex(prev => (prev + 1) % messages.length)
        setFading(false)
      }, 400)
    }, interval)
    return () => clearInterval(timer)
  }, [messages, interval])

  if (messages.length === 0) return null

  return (
    <span
      className={className}
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 400ms ease-in-out",
      }}
    >
      {messages[index]}
    </span>
  )
}

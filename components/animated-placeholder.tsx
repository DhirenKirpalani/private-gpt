"use client"

import { useState, useEffect, useRef } from "react"

interface AnimatedPlaceholderProps {
  messages: string[]
  interval?: number
  className?: string
  typeSpeed?: number
  deleteSpeed?: number
  pauseDuration?: number
}

export function AnimatedPlaceholder({
  messages,
  className,
  typeSpeed = 48,
  deleteSpeed = 22,
  pauseDuration = 1800,
}: AnimatedPlaceholderProps) {
  const [displayed, setDisplayed] = useState("")
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing")
  const [promptIdx, setPromptIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (messages.length === 0) return
    const prompt = messages[promptIdx % messages.length]

    if (phase === "typing") {
      if (displayed.length < prompt.length) {
        timerRef.current = setTimeout(
          () => setDisplayed(prompt.slice(0, displayed.length + 1)),
          typeSpeed
        )
      } else {
        timerRef.current = setTimeout(() => setPhase("deleting"), pauseDuration)
      }
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        timerRef.current = setTimeout(
          () => setDisplayed(d => d.slice(0, -1)),
          deleteSpeed
        )
      } else {
        setPromptIdx(i => (i + 1) % messages.length)
        setPhase("typing")
      }
    }

    return () => clearTimeout(timerRef.current)
  }, [displayed, phase, promptIdx, messages, typeSpeed, deleteSpeed, pauseDuration])

  if (messages.length === 0) return null

  return (
    <span className={className}>
      {displayed}
      <span
        className="inline-block w-[1.5px] h-[0.9em] ml-[1px] align-middle bg-current"
        style={{ animation: "placeholder-blink 1s step-end infinite" }}
      />
      <style>{`
        @keyframes placeholder-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}

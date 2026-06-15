"use client"

import { useMemo } from "react"
import { compileTheme, generateKeyframes, type ThemeInput } from "@/lib/theme-engine"

interface CinematicBackgroundProps {
  primaryColor: string
  secondaryColor?: string
  style: ThemeInput["style"]
  mood: ThemeInput["mood"]
}

export function CinematicBackground({ primaryColor, secondaryColor, style, mood }: CinematicBackgroundProps) {
  const theme = useMemo(
    () => compileTheme({ primaryColor, secondaryColor, style, mood }),
    [primaryColor, secondaryColor, style, mood]
  )

  const keyframes = generateKeyframes()

  return (
    <>
      <style>{keyframes}</style>
      <div style={theme.background} aria-hidden="true" />
      {theme.overlayLayers.map((layer, i) => (
        <div key={i} style={layer} aria-hidden="true" />
      ))}
      <div style={theme.noise} aria-hidden="true" />
    </>
  )
}

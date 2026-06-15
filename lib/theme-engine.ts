export type ThemeStyle = "minimal" | "editorial" | "cinematic"
export type ThemeMood = "calm" | "bold" | "luxury" | "futuristic"

export interface ThemeInput {
  primaryColor: string
  secondaryColor?: string
  style: ThemeStyle
  mood: ThemeMood
}

export interface CompiledTheme {
  background: React.CSSProperties
  overlayLayers: React.CSSProperties[]
  noise: React.CSSProperties
  ui: {
    glassBlur: number
    glassOpacity: number
    borderSoftness: number
    shadowDepth: string
    surfaceBg: string
  }
  glow: {
    color: string
    intensity: number
    spread: number
  }
  animation: {
    driftDuration: string
    driftEnabled: boolean
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "")
  const bigint = parseInt(clean, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount)
  )
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount)
  )
}

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function generateAccent(primary: string, secondary?: string): string {
  if (secondary) {
    const p = hexToRgb(primary)
    const s = hexToRgb(secondary)
    return rgbToHex(
      Math.min(255, Math.round((p.r + s.r) / 2) + 20),
      Math.min(255, Math.round((p.g + s.g) / 2) + 30),
      Math.min(255, Math.round((p.b + s.b) / 2) + 40)
    )
  }
  return lighten(primary, 60)
}

function generateBackgroundDeep(primary: string): string {
  const { r, g, b } = hexToRgb(primary)
  return rgbToHex(Math.max(5, r * 0.06), Math.max(5, g * 0.06), Math.max(5, b * 0.08))
}

export function compileTheme(input: ThemeInput): CompiledTheme {
  const primary = input.primaryColor || "#6D5EF6"
  const secondary = input.secondaryColor
  const style = input.style
  const mood = input.mood

  const accent = generateAccent(primary, secondary)
  const bgDeep = generateBackgroundDeep(primary)

  // Mood overrides
  const moodConfigs: Record<ThemeMood, { glowIntensity: number; glowSpread: number; driftSpeed: number; grain: number }> = {
    calm: { glowIntensity: 0.35, glowSpread: 80, driftSpeed: 40, grain: 0.03 },
    bold: { glowIntensity: 0.85, glowSpread: 140, driftSpeed: 18, grain: 0.06 },
    luxury: { glowIntensity: 0.55, glowSpread: 100, driftSpeed: 30, grain: 0.04 },
    futuristic: { glowIntensity: 0.75, glowSpread: 120, driftSpeed: 15, grain: 0.08 },
  }
  const moodCfg = moodConfigs[mood]

  // Style overrides
  const styleConfigs: Record<ThemeStyle, { layers: number; blur: number; glassOpacity: number; borderSoftness: number }> = {
    minimal: { layers: 1, blur: 0, glassOpacity: 0.02, borderSoftness: 0.3 },
    editorial: { layers: 2, blur: 12, glassOpacity: 0.04, borderSoftness: 0.5 },
    cinematic: { layers: 3, blur: 24, glassOpacity: 0.06, borderSoftness: 0.7 },
  }
  const styleCfg = styleConfigs[style]

  // Build background base
  const bgStyle: React.CSSProperties = {
    backgroundColor: bgDeep,
    position: "absolute",
    inset: 0,
    zIndex: 0,
  }

  // Build overlay aurora layers
  const overlays: React.CSSProperties[] = []

  if (styleCfg.layers >= 1) {
    // Layer 1: primary glow blob (top-left)
    overlays.push({
      position: "absolute",
      top: "-20%",
      left: "-10%",
      width: "70%",
      height: "70%",
      borderRadius: "50%",
      background: `radial-gradient(circle, ${toRgba(primary, moodCfg.glowIntensity * 0.5)} 0%, transparent 70%)`,
      filter: `blur(${styleCfg.blur + 20}px)`,
      animation: style === "minimal" ? undefined : `aurora-drift-1 ${moodCfg.driftSpeed}s ease-in-out infinite alternate`,
      zIndex: 1,
    })
  }

  if (styleCfg.layers >= 2) {
    // Layer 2: secondary/accent glow blob (bottom-right)
    const glowColor = secondary ? toRgba(secondary, moodCfg.glowIntensity * 0.4) : toRgba(accent, moodCfg.glowIntensity * 0.35)
    overlays.push({
      position: "absolute",
      bottom: "-15%",
      right: "-10%",
      width: "60%",
      height: "60%",
      borderRadius: "50%",
      background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
      filter: `blur(${styleCfg.blur + 16}px)`,
      animation: style === "minimal" ? undefined : `aurora-drift-2 ${moodCfg.driftSpeed * 1.3}s ease-in-out infinite alternate`,
      zIndex: 2,
    })
  }

  if (styleCfg.layers >= 3) {
    // Layer 3: accent mid glow (center, subtle)
    overlays.push({
      position: "absolute",
      top: "30%",
      left: "30%",
      width: "50%",
      height: "50%",
      borderRadius: "50%",
      background: `radial-gradient(circle, ${toRgba(accent, moodCfg.glowIntensity * 0.2)} 0%, transparent 60%)`,
      filter: `blur(${styleCfg.blur + 30}px)`,
      animation: style === "minimal" ? undefined : `aurora-drift-3 ${moodCfg.driftSpeed * 0.8}s ease-in-out infinite alternate`,
      zIndex: 3,
    })
  }

  // Noise overlay
  const noiseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: moodCfg.grain,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat",
    backgroundSize: "128px 128px",
    pointerEvents: "none",
    zIndex: 10,
  }

  // UI surface color derived from background
  const surfaceBg = style === "minimal"
    ? toRgba(primary, 0.03)
    : toRgba(primary, styleCfg.glassOpacity)

  return {
    background: bgStyle,
    overlayLayers: overlays,
    noise: noiseStyle,
    ui: {
      glassBlur: styleCfg.blur,
      glassOpacity: styleCfg.glassOpacity,
      borderSoftness: styleCfg.borderSoftness,
      shadowDepth: style === "cinematic" ? "0 8px 32px rgba(0,0,0,0.4)" : style === "editorial" ? "0 4px 16px rgba(0,0,0,0.25)" : "0 1px 4px rgba(0,0,0,0.15)",
      surfaceBg,
    },
    glow: {
      color: primary,
      intensity: moodCfg.glowIntensity,
      spread: moodCfg.glowSpread,
    },
    animation: {
      driftDuration: `${moodCfg.driftSpeed}s`,
      driftEnabled: style !== "minimal",
    },
  }
}

export function generateKeyframes(): string {
  return `
    @keyframes aurora-drift-1 {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(8%, 6%) scale(1.15); }
    }
    @keyframes aurora-drift-2 {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(-6%, -8%) scale(1.1); }
    }
    @keyframes aurora-drift-3 {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(4%, -4%) scale(1.2); }
    }
  `
}

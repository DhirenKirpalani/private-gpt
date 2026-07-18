import Image from "next/image"

type LogoProps = {
  className?: string
  height?: number
  showBeta?: boolean
  priority?: boolean
}

export function Logo({ className, height = 38, showBeta = false, priority = false }: LogoProps) {
  return (
    <div className={`flex shrink-0 items-center gap-1.5 sm:gap-2 overflow-hidden ${className || ""}`}>
      <Image
        src="/assets/images/exploro-logo.png"
        alt="Exploro OS"
        width={height * 3.5}
        height={height}
        priority={priority}
        className="object-contain transition-transform duration-300 hover:scale-105"
        style={{ height: "auto", width: "auto" }}
      />
      {showBeta && (
        <span className="inline-block rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-600/30">
          BETA
        </span>
      )}
    </div>
  )
}

export function LogoIcon({ className, size = 40, priority = false }: { className?: string; size?: number; priority?: boolean }) {
  return (
    <Image
      src="/assets/images/exploro-icon.svg"
      alt="Exploro OS"
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={`object-contain ${className || ""}`}
    />
  )
}

export function AvatarImage({ src, alt, size = 32, className }: { src: string; alt: string; size?: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className || ""}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.style.display = "none"
      }}
    />
  )
}

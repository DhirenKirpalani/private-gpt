import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-white/5", className)} />
  )
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  )
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-1 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DocumentSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ContactSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ChannelCardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function PageLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        </div>
        <p className="text-xs font-medium text-muted-foreground tracking-wide">Loading…</p>
      </div>
    </div>
  )
}

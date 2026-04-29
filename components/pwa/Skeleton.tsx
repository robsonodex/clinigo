'use client'

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-zinc-800 rounded-full" />
      </div>
      <div className="h-3 bg-zinc-800 rounded w-full" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-zinc-800 rounded w-2/3" />
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-900 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-zinc-900 rounded-xl" />
    </div>
  )
}

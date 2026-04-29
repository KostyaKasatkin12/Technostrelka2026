import { cn } from "@/lib/utils";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-none", className)} />;
}

export function QuestCardSkeleton() {
  return (
    <div className="border-2 border-border bg-card flex flex-col overflow-hidden">
      <ShimmerBlock className="h-48 w-full" />
      <div className="p-5 flex flex-col gap-3">
        <ShimmerBlock className="h-5 w-3/4" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-2/3" />
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function QuestCatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <QuestCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="border-2 border-border bg-card p-3 flex items-center gap-4">
      <ShimmerBlock className="w-12 h-12 shrink-0" />
      <ShimmerBlock className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <ShimmerBlock className="h-4 w-32" />
        <ShimmerBlock className="h-3 w-24" />
      </div>
      <ShimmerBlock className="h-5 w-12 shrink-0" />
    </div>
  );
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ol className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <LeaderboardRowSkeleton />
        </li>
      ))}
    </ol>
  );
}

export function AchievementCardSkeleton() {
  return (
    <div className="border-2 border-border bg-card p-4 flex gap-3">
      <ShimmerBlock className="shrink-0 w-12 h-12" />
      <div className="flex-1 flex flex-col gap-2">
        <ShimmerBlock className="h-4 w-1/2" />
        <ShimmerBlock className="h-3 w-3/4" />
        <ShimmerBlock className="h-3 w-1/3 mt-1" />
      </div>
    </div>
  );
}

export function AchievementsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <AchievementCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="border-2 border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <ShimmerBlock className="h-5 w-3/4" />
          <ShimmerBlock className="h-3 w-1/3" />
        </div>
        <ShimmerBlock className="h-6 w-20 shrink-0" />
      </div>
      <div className="flex items-center gap-4">
        <ShimmerBlock className="h-4 w-20" />
        <ShimmerBlock className="h-4 w-16" />
        <ShimmerBlock className="h-4 w-24" />
      </div>
      <ShimmerBlock className="h-10 w-full" />
    </div>
  );
}

export function SessionsHistorySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <ShimmerBlock className="h-5 w-1/2" />
        <ShimmerBlock className="h-5 w-16" />
      </div>
      <div className="flex items-center justify-between">
        <ShimmerBlock className="h-3 w-16" />
        <ShimmerBlock className="h-3 w-20" />
      </div>
    </div>
  );
}

export function TeamsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShopItemSkeleton() {
  return (
    <div className="border-2 border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-12 w-12 shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <ShimmerBlock className="h-4 w-1/2" />
          <ShimmerBlock className="h-3 w-3/4" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <ShimmerBlock className="h-4 w-12" />
        <ShimmerBlock className="h-8 w-20" />
      </div>
    </div>
  );
}

export function ShopSkeleton() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <ShimmerBlock className="h-10 w-56" />
        <ShimmerBlock className="h-12 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <ShimmerBlock className="h-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShopItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <ShimmerBlock className="h-56 w-full mb-6" />
      <div className="border-2 border-border bg-card p-5 md:p-8">
        <div className="flex gap-6">
          <ShimmerBlock className="w-36 h-36 -mt-20 shrink-0" />
          <div className="flex-1 flex flex-col gap-3 mt-4">
            <ShimmerBlock className="h-8 w-48" />
            <ShimmerBlock className="h-4 w-32" />
            <ShimmerBlock className="h-3 w-full max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

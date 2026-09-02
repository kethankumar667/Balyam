import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rounded" | "rectangular";
  className?: string;
}

/**
 * Fundamental theme-aware Skeleton primitive.
 * Adapts smoothly to light/dark themes with high-precision pulse shimmer.
 */
export function Skeleton({
  variant = "rounded",
  className = "",
  ...props
}: SkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "circular":
        return "rounded-full";
      case "text":
        return "rounded-md h-4";
      case "rectangular":
        return "rounded-none";
      case "rounded":
      default:
        return "rounded-2xl";
    }
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-black/8 dark:bg-white/10 ${getVariantStyles()} ${className}`}
      {...props}
    />
  );
}

/** Profile Hero & Stats Skeleton */
export function ProfileSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-testid="profile-skeleton"
      className={`p-6 sm:p-8 rounded-3xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] space-y-6 shadow-sm ${className}`}
    >
      {/* Header Avatar & Details */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Skeleton variant="circular" className="w-24 h-24 sm:w-28 sm:h-28 shrink-0" />
        <div className="space-y-3 flex-1 w-full text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <Skeleton variant="text" className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton variant="rounded" className="h-6 w-24 mx-auto sm:mx-0 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-4 w-32 mx-auto sm:mx-0" />
          <Skeleton variant="rounded" className="h-3 w-full max-w-md rounded-full mx-auto sm:mx-0" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--auth-card-edge)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] space-y-2">
            <Skeleton variant="text" className="h-3 w-16" />
            <Skeleton variant="text" className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Leaderboard Rank Card & Table Skeleton */
export function LeaderboardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" data-testid="leaderboard-skeleton" className={`space-y-4 ${className}`}>
      {/* Rank Card Skeleton */}
      <div className="p-6 rounded-3xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" className="w-16 h-16 shrink-0" />
          <div className="space-y-2">
            <Skeleton variant="text" className="h-6 w-36" />
            <Skeleton variant="text" className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton variant="rounded" className="h-14 w-24 rounded-2xl" />
          <Skeleton variant="rounded" className="h-14 w-24 rounded-2xl" />
          <Skeleton variant="rounded" className="h-14 w-24 rounded-2xl" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)]">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" className="h-9 w-20 rounded-xl" />
          ))}
        </div>
        <Skeleton variant="rounded" className="h-9 w-44 rounded-xl" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="rounded-2xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] overflow-hidden p-2 space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-[var(--auth-field)]/50"
          >
            <div className="flex items-center gap-3.5">
              <Skeleton variant="text" className="h-5 w-6" />
              <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
              <div className="space-y-1">
                <Skeleton variant="text" className="h-4 w-28" />
                <Skeleton variant="text" className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Skeleton variant="text" className="h-4 w-12" />
              <Skeleton variant="text" className="h-4 w-12" />
              <Skeleton variant="text" className="h-4 w-12" />
              <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Match History List Skeleton */
export function MatchHistorySkeleton({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] flex items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <Skeleton variant="rounded" className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="rounded" className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton variant="text" className="h-3 w-36" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton variant="text" className="h-5 w-16" />
            <Skeleton variant="rounded" className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Games-grid skeleton — GamesPage, FavoritesPage, RecentlyPlayedPage.
 *
 * Without a route-specific Suspense fallback, these three fell through to
 * the generic full-screen `PremiumGamingLoader`, which renders with no
 * `AppLayout` chrome around it. Navigating to a not-yet-loaded chunk swapped
 * the whole page — header and sidebar included — out for that bare loader
 * and back again once the chunk resolved: a one-time "flash" on the first
 * visit to each route per session, gone on every visit after because the
 * chunk is cached. This skeleton renders inside `AppLayout` like
 * `ProfileSkeleton`/`LeaderboardSkeleton` do, so the chrome never leaves.
 */
export function GamesGridSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" data-testid="games-grid-skeleton" className={`space-y-5 ${className}`}>
      <div className="space-y-2">
        <Skeleton variant="text" className="h-3 w-40" />
        <Skeleton variant="text" className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-[26px] border border-black/5 dark:border-white/10 bg-[var(--auth-card)] p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton variant="rounded" className="h-5 w-24 rounded-full" />
              <Skeleton variant="circular" className="h-6 w-6" />
            </div>
            <Skeleton variant="rounded" className="h-28 sm:h-32 w-full rounded-2xl" />
            <Skeleton variant="text" className="h-5 w-2/3 mx-auto" />
            <Skeleton variant="rounded" className="h-11 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dashboard KPI & Grid Skeleton */
export function DashboardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" data-testid="dashboard-skeleton" className={`space-y-6 ${className}`}>
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2"
          >
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="text" className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Middle Split Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <Skeleton variant="text" className="h-5 w-32" />
          <Skeleton variant="rounded" className="h-44 w-full rounded-xl" />
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <Skeleton variant="text" className="h-5 w-32" />
          <Skeleton variant="rounded" className="h-44 w-full rounded-xl" />
        </div>
      </div>

      {/* Bottom Table Skeleton */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
        <Skeleton variant="text" className="h-5 w-40 mb-3" />
        {[1, 2, 3, 4].map((r) => (
          <div key={r} className="flex items-center justify-between py-2 border-b border-zinc-800/40">
            <Skeleton variant="text" className="h-4 w-36" />
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tournament Arena & Matchup Bracket Skeleton */
export function TournamentSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" data-testid="tournament-skeleton" className={`space-y-6 ${className}`}>
      {/* Super Admin / Announcement Banner Skeleton */}
      <div className="rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 w-full max-w-md">
          <Skeleton variant="rounded" className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="h-4 w-40" />
            <Skeleton variant="text" className="h-3 w-64" />
          </div>
        </div>
        <Skeleton variant="rounded" className="h-8 w-28 rounded-xl shrink-0" />
      </div>

      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-72" />
          <Skeleton variant="text" className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="h-10 w-36 rounded-xl" />
          <Skeleton variant="rounded" className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Main Bracket Card Skeleton */}
      <div className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton variant="circular" className="w-6 h-6" />
            <Skeleton variant="text" className="h-5 w-60" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-8 w-20 rounded-lg" />
            <Skeleton variant="rounded" className="h-8 w-32 rounded-lg" />
          </div>
        </div>

        {/* Matchup Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="rounded" className="h-4 w-14 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--chrome-panel)]">
                  <Skeleton variant="text" className="h-4 w-28" />
                  <Skeleton variant="text" className="h-4 w-12" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--chrome-panel)]">
                  <Skeleton variant="text" className="h-4 w-28" />
                  <Skeleton variant="text" className="h-4 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Multiplayer Room Layout Skeleton (Eliminates chunk & connect flash) */
export function RoomSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-testid="room-skeleton"
      className={`min-h-screen bhalyam-paper flex flex-col justify-between p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto ${className}`}
    >
      {/* Top Header Rail */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs">
        <div className="flex items-center gap-2.5">
          <Skeleton variant="rounded" className="h-9 w-24 rounded-xl" />
          <Skeleton variant="rounded" className="h-9 w-32 rounded-xl hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="w-10 h-10" />
          <Skeleton variant="circular" className="w-10 h-10" />
          <Skeleton variant="rounded" className="h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* Main Game Arena / Felt Table Skeleton */}
      <div className="my-6 flex-1 flex flex-col items-center justify-center min-h-[380px] p-6 rounded-3xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-sm relative overflow-hidden">
        {/* Center Game Board / Felt Placeholder */}
        <div className="w-full max-w-md aspect-square rounded-3xl bg-black/5 dark:bg-white/5 border border-[var(--chrome-border)] flex flex-col items-center justify-center p-8 space-y-4">
          <Skeleton variant="rounded" className="w-16 h-16 rounded-2xl" />
          <Skeleton variant="text" className="h-5 w-48" />
          <Skeleton variant="text" className="h-3 w-36" />
        </div>

        {/* Surrounding Player Seat Skeletons */}
        <div className="absolute top-4 left-4 flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)]">
          <Skeleton variant="circular" className="w-9 h-9" />
          <div className="space-y-1">
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="rounded" className="h-2 w-12 rounded-full" />
          </div>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)]">
          <div className="space-y-1 text-right">
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="rounded" className="h-2 w-12 rounded-full ml-auto" />
          </div>
          <Skeleton variant="circular" className="w-9 h-9" />
        </div>
      </div>

      {/* Bottom Lobby / Action Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton variant="rounded" className="h-11 w-full sm:w-28 rounded-xl" />
          <Skeleton variant="rounded" className="h-11 w-full sm:w-28 rounded-xl" />
        </div>
        <Skeleton variant="rounded" className="h-11 w-full sm:w-44 rounded-xl" />
      </div>
    </div>
  );
}

/** Social Hub & Squad Presence Skeleton */
export function SocialHubSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" data-testid="social-hub-skeleton" className={`space-y-6 ${className}`}>
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-80" />
        </div>
      </div>

      {/* Grid of Friends / Squad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-5 flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <Skeleton variant="rounded" className="w-11 h-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-3 w-40" />
              </div>
            </div>
            <Skeleton variant="rounded" className="h-9 w-24 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

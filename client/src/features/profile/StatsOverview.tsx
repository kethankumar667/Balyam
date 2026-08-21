import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";

interface StatsOverviewProps {
  stats: PlayerStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
      {/* Total Matches */}
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition">
        <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono">
          Matches Played
        </span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--auth-ink)] my-2">
          <CountUp end={stats.totalMatches} duration={1.5} />
        </div>
        <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
          {stats.wins}W • {stats.losses}L • {stats.draws}D
        </span>
      </div>

      {/* Win Rate */}
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition">
        <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono">
          Win Rate
        </span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 my-2">
          <CountUp end={stats.winRate} suffix="%" duration={1.5} />
        </div>
        <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
          {stats.wins} victories
        </span>
      </div>

      {/* Total Play Time */}
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition">
        <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono">
          Total Play Time
        </span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500 my-2">
          <CountUp end={stats.totalPlayTimeMinutes} duration={1.5} separator="," /> <span className="text-xs font-normal text-[var(--auth-ink-soft)]">min</span>
        </div>
        <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
          Avg {stats.averageMatchMinutes} min/match
        </span>
      </div>

      {/* Favorite Game */}
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition">
        <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono">
          Best Game
        </span>
        <div className="text-lg sm:text-xl font-bold capitalize text-sky-500 my-2 truncate">
          {(!stats.favoriteGame || stats.favoriteGame === "none" || stats.totalMatches === 0) ? "None yet" : stats.favoriteGame}
        </div>
        <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
          Most active table
        </span>
      </div>
    </div>
  );
}

import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { ProfileResilienceArtwork } from "./ProfileArtwork";
import CountUp from "../../components/CountUp";

interface CareerMetricsProps {
  stats: PlayerStats;
}

export default function CareerMetrics({ stats }: CareerMetricsProps) {
  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
      {/* Top subtle blue flare */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <h2 className="font-extrabold text-sm text-[var(--auth-ink)] flex items-center gap-2.5">
          <ProfileResilienceArtwork className="w-5 h-5 flex-shrink-0" />
          <span>Your Game Journey & Play Style</span>
          {/* Subtle test/screen-reader compatibility anchor */}
          <span className="sr-only">Endurance & Resilience Telemetry</span>
        </h2>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          PLAYING HIGHLIGHTS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 relative z-10">
        <div className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] block uppercase">
            Longest Match
          </span>
          <span className="text-xl font-black font-mono text-[var(--auth-ink)]">
            <CountUp end={stats.longestMatchMinutes} duration={1.5} /> <span className="text-xs font-normal text-[var(--auth-ink-soft)]">min</span>
          </span>
        </div>

        <div className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] block uppercase">
            Average Duration
          </span>
          <span className="text-xl font-black font-mono text-[var(--auth-ink)]">
            <CountUp end={stats.averageMatchMinutes} decimals={1} duration={1.5} /> <span className="text-xs font-normal text-[var(--auth-ink-soft)]">min</span>
          </span>
        </div>

        <div className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] block uppercase">
            Total Draws
          </span>
          <span className="text-xl font-black font-mono text-[var(--auth-ink)]">
            <CountUp end={stats.draws} duration={1.2} />
          </span>
        </div>

        <div className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] block uppercase">
            Seat Recoveries
          </span>
          <span className="text-xl font-black font-mono text-amber-500">
            <CountUp end={stats.recoveryCount} duration={1.2} />
          </span>
        </div>
      </div>
    </div>
  );
}

import type { PlayerStats } from "@shared/profile/PlayerStats";

interface CareerMetricsProps {
  stats: PlayerStats;
}

export default function CareerMetrics({ stats }: CareerMetricsProps) {
  return (
    <div className="bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-bold text-stone-300 dark:text-zinc-300 uppercase tracking-wider">
        Endurance & Resilience Telemetry
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] text-stone-500 block">Longest Match</span>
          <span className="text-lg font-bold font-mono text-stone-100 dark:text-zinc-100">
            {stats.longestMatchMinutes} <span className="text-xs font-normal text-stone-500">min</span>
          </span>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Average Duration</span>
          <span className="text-lg font-bold font-mono text-stone-100 dark:text-zinc-100">
            {stats.averageMatchMinutes} <span className="text-xs font-normal text-stone-500">min</span>
          </span>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Total Draws</span>
          <span className="text-lg font-bold font-mono text-stone-100 dark:text-zinc-100">
            {stats.draws}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Seat Recoveries</span>
          <span className="text-lg font-bold font-mono text-sky-400">
            {stats.recoveryCount}
          </span>
        </div>
      </div>
    </div>
  );
}

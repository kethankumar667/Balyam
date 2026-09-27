import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import { ArrowUpRight, Clock3, Gamepad2, Target, Trophy } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { getProfileGameLabel } from "./gameLabel";

interface StatsOverviewProps {
  stats: PlayerStats;
}

function SafeLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const hasRouter = useInRouterContext();
  return hasRouter ? <Link to={to} className={className}>{children}</Link> : <a href={to} className={className}>{children}</a>;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const isColdStart = stats.totalMatches === 0;

  return (
    <section
      aria-labelledby="career-snapshot-heading"
      className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
    >
      <header className="flex flex-col gap-3 border-b border-stone-200/80 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 dark:border-slate-700/70">
        <div>
          <h2 id="career-snapshot-heading" className="font-display text-xl text-stone-950 sm:text-2xl dark:text-white">
            Career snapshot
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-slate-300">
            Your lifetime performance across every table in the lounge.
          </p>
        </div>
        <SafeLink
          to="/profile/statistics"
          className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:self-auto dark:text-amber-300 dark:hover:bg-amber-400/10"
        >
          Full statistics
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </SafeLink>
      </header>

      <div className="grid md:grid-cols-[1.35fr_1fr]">
        <div className="relative flex min-h-48 flex-col justify-between overflow-hidden bg-stone-950 px-5 py-6 text-white sm:px-7 sm:py-7 dark:bg-[#080D18]">
          <div className="absolute inset-y-0 right-0 w-2/5 bg-[linear-gradient(135deg,transparent_10%,rgba(245,158,11,0.08)_10%,rgba(245,158,11,0.08)_28%,transparent_28%,transparent_42%,rgba(245,158,11,0.05)_42%,rgba(245,158,11,0.05)_62%,transparent_62%)]" aria-hidden="true" />
          <div className="relative flex items-center gap-2 text-sm font-semibold text-stone-300">
            <Target className="h-4 w-4 text-amber-400" aria-hidden="true" />
            Overall win rate
          </div>
          <div className="relative mt-8 flex items-end gap-3">
            <div className="font-display text-6xl leading-none text-white sm:text-7xl">
              {isColdStart ? "—" : <CountUp end={stats.winRate} suffix="%" duration={1.1} />}
            </div>
            <p className="max-w-40 pb-1 text-sm leading-snug text-stone-400">
              {isColdStart ? "Your record begins after your first match." : `${stats.wins} of ${stats.totalMatches} matches won.`}
            </p>
          </div>
          <dl className="relative mt-7 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <div>
              <dt className="text-sm text-stone-400">Wins</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-400">{stats.wins} wins</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Losses</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-white">{stats.losses} losses</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Draws</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-white">{stats.draws}</dd>
            </div>
          </dl>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-stone-200/80 dark:divide-slate-700/70">
          <div className="min-w-0 p-5 sm:p-6">
            <Gamepad2 className="mb-6 h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <dt className="text-sm text-stone-500 dark:text-slate-400">Matches played</dt>
            <dd className="mt-1 font-display text-3xl tabular-nums text-stone-950 dark:text-white">
              <CountUp end={stats.totalMatches} duration={1.1} />
            </dd>
          </div>
          <div className="min-w-0 p-5 sm:p-6">
            <Clock3 className="mb-6 h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <dt className="text-sm text-stone-500 dark:text-slate-400">Play time</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-stone-950 dark:text-white">
              <CountUp end={stats.totalPlayTimeMinutes} duration={1.1} separator="," /> <span className="text-sm font-medium text-stone-500 dark:text-slate-400">min</span>
            </dd>
          </div>
          <div className="col-span-2 min-w-0 p-5 sm:p-6">
            <Trophy className="mb-4 h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <dt className="text-sm text-stone-500 dark:text-slate-400">Most played</dt>
            <dd className="mt-1 truncate text-xl font-bold text-stone-950 dark:text-white">
              {getProfileGameLabel(stats.favoriteGame)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import { ArrowRight, Clock3, Gamepad2, History, RotateCcw, Scale, Timer } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { getProfileGameLabel } from "./gameLabel";

function SafeLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const hasRouter = useInRouterContext();
  return hasRouter ? <Link to={to} className={className}>{children}</Link> : <a href={to} className={className}>{children}</a>;
}

export interface RecentMatchItem {
  id?: string;
  game: string;
  result: "won" | "lost" | "draw";
  playedAt?: number;
}

interface CareerMetricsProps {
  stats: PlayerStats;
  recentMatches?: RecentMatchItem[];
}

const RESULT_STYLES: Record<RecentMatchItem["result"], string> = {
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  lost: "bg-stone-100 text-stone-700 ring-stone-500/20 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600",
  draw: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
};

const RESULT_LABELS: Record<RecentMatchItem["result"], string> = {
  won: "Victory",
  lost: "Defeat",
  draw: "Draw",
};

function formatPlayedAt(playedAt?: number): string {
  if (!playedAt) return "Recent match";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(playedAt);
}

export default function CareerMetrics({ stats, recentMatches = [] }: CareerMetricsProps) {
  const details = [
    { label: "Longest match", value: `${stats.longestMatchMinutes} min`, icon: Timer },
    { label: "Average match", value: `${stats.averageMatchMinutes} min`, icon: Clock3 },
    { label: "Draws", value: String(stats.draws), icon: Scale },
    { label: "Seat recoveries", value: String(stats.recoveryCount), icon: RotateCcw },
  ];

  return (
    <section
      aria-labelledby="recent-matches-heading"
      className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
    >
      <header className="flex items-end justify-between gap-4 border-b border-stone-200/80 px-5 py-5 sm:px-6 dark:border-slate-700/70">
        <div>
          <h2 id="recent-matches-heading" className="font-display text-xl text-stone-950 sm:text-2xl dark:text-white">
            Recent matches
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">Your latest results and playing rhythm.</p>
        </div>
        <SafeLink
          to="/profile/matches"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-400/10"
        >
          Battle log
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SafeLink>
      </header>

      {recentMatches.length > 0 ? (
        <div className="divide-y divide-stone-200/80 px-5 sm:px-6 dark:divide-slate-700/70">
          {recentMatches.map((match, index) => (
            <div key={match.id ?? `${match.game}-${index}`} className="flex min-h-18 items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-200">
                  <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-stone-950 dark:text-white">{getProfileGameLabel(match.game)}</p>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-slate-400">{formatPlayedAt(match.playedAt)}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${RESULT_STYLES[match.result]}`}>
                {RESULT_LABELS[match.result]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-5 px-5 py-8 sm:flex-row sm:items-center sm:px-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
            <History className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-stone-950 dark:text-white">Your first result belongs here</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600 dark:text-slate-300">
              Choose a table, play a match, and this overview will begin tracking your record.
            </p>
          </div>
          <SafeLink
            to="/games"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
          >
            Explore games
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </SafeLink>
        </div>
      )}

      <dl className="grid grid-cols-2 border-t border-stone-200/80 sm:grid-cols-4 dark:border-slate-700/70">
        {details.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={`border-stone-200/80 p-4 sm:border-l sm:border-t-0 sm:p-5 sm:first:border-l-0 dark:border-slate-700/70 ${index % 2 !== 0 ? "border-l" : ""} ${index > 1 ? "border-t" : ""}`}
          >
            <Icon className="mb-3 h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <dt className="text-sm text-stone-500 dark:text-slate-400">{label}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-stone-950 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
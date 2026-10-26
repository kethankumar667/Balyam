import type { PerformanceRankTier } from "@shared/profile/MetricRegistry";

export const SCORECARD_RANK_CLASSES: Record<PerformanceRankTier, string> = {
  S_RANK: "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  A_RANK: "bg-cyan-100 text-cyan-900 border-cyan-500 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40",
  B_RANK: "bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  C_RANK: "bg-surface-2 text-ink-mid border-stone-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

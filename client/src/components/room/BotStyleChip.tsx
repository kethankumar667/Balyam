import type { BotPlayStyle, BotProfile } from "@shared/bot-profile";

/** Cool for the gentle styles, warm for the bold ones, so a table reads at a glance. */
const TONE: Record<BotPlayStyle, string> = {
  Casual: "text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-950/70 border-sky-300/70 dark:border-sky-800/60",
  Cautious: "text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-950/70 border-sky-300/70 dark:border-sky-800/60",
  Balanced: "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600",
  Sharp: "text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border-rose-300/70 dark:border-rose-800/60",
  Daring: "text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-950/70 border-orange-300/70 dark:border-orange-800/60",
};

/**
 * A podium-title badge that reads on the cream light surfaces as well as the dark ones.
 * The shared title classes (`cosmeticsResolver`) are tuned for dark panels only: pale
 * 300-weight text that washes out on cream. Keyed by title id; unknown ids get a neutral badge.
 */
export function botTitleBadgeClass(titleId?: string): string {
  switch (titleId) {
    case "title_table_master":
      return "bg-purple-500/15 text-purple-800 border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/40";
    case "title_grandmaster":
      return "bg-rose-500/15 text-rose-800 border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/40";
    default:
      return "bg-slate-500/15 text-slate-800 border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-200 dark:border-slate-400/40";
  }
}

/** What the chip means, in words — a real difficulty is not the same claim as a persona. */
export function describePlayStyle(profile: Pick<BotProfile, "playStyle" | "styleIsReal">): string {
  return profile.styleIsReal
    ? `Difficulty: ${profile.playStyle}`
    : `Persona: ${profile.playStyle} (this game's bots have no difficulty setting)`;
}

/**
 * The bot's play style as a small badge. For bingo it is the real difficulty the host
 * chose; everywhere else it is a persona, and the tooltip and the profile card say so.
 */
export function BotStyleChip({ profile, className = "" }: { profile: Pick<BotProfile, "playStyle" | "styleIsReal">; className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold rounded-md border px-1.5 py-0.5 shrink-0 ${TONE[profile.playStyle]} ${className}`}
      title={describePlayStyle(profile)}
    >
      {profile.playStyle}
    </span>
  );
}

export default BotStyleChip;

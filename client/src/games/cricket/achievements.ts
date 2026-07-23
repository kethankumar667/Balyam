/**
 * Bhalyam Cricket — achievement catalog + honest detection.
 *
 * A fixed, small catalog rather than an open-ended generator, so the Sticker
 * Album always shows the same known set (locked vs unlocked). Every
 * detection rule reads real per-match data already computed elsewhere
 * (battingRows, the engine's own in-innings achievement flags, and the real
 * margin) — nothing here is randomly awarded or fabricated.
 */

import { battingRows } from "./derive";
import type { InningsState } from "./innings";
import type { MarginInfo } from "./matchSummary";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  glyph: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first-match", title: "First Steps", description: "Played your first match.", glyph: "🎬" },
  { id: "power-hitter", title: "Power Hitter", description: "Hit 3 sixes in a single innings.", glyph: "💥" },
  { id: "half-century", title: "Half-Century Hero", description: "A batter reached 50 runs in an innings.", glyph: "🏏" },
  { id: "century", title: "Century Maker", description: "A batter reached 100 runs in an innings.", glyph: "💯" },
  { id: "hurricane", title: "Hurricane", description: "Struck at 200+ with at least 10 balls faced.", glyph: "🌪️" },
  { id: "flawless-chase", title: "Flawless Chase", description: "Won a chase without losing a wicket.", glyph: "🛡️" },
  { id: "nail-biter", title: "Nail-Biter", description: "Finished a match tied.", glyph: "🤝" },
  { id: "veteran", title: "Veteran", description: "Played 10 matches.", glyph: "🏆" },
];

export interface MatchAchievementContext {
  first: InningsState;
  second: InningsState;
  margin: MarginInfo;
  /** History length AFTER this match is recorded — so "first match"/"veteran"
   *  fire on the match that actually crosses the threshold. */
  matchesPlayedIncludingThis: number;
}

/** Which achievement ids this specific completed match newly qualifies for. */
export function detectMatchAchievements(ctx: MatchAchievementContext): string[] {
  const ids = new Set<string>();

  if (ctx.first.achievements.includes("power-hitter") || ctx.second.achievements.includes("power-hitter")) {
    ids.add("power-hitter");
  }

  for (const row of [...battingRows(ctx.first), ...battingRows(ctx.second)]) {
    if (row.balls === 0) continue;
    if (row.runs >= 100) ids.add("century");
    if (row.runs >= 50) ids.add("half-century");
    if (row.balls >= 10 && (row.runs / row.balls) * 100 >= 200) ids.add("hurricane");
  }

  if (ctx.margin.kind === "wickets" && ctx.margin.value === ctx.second.xi.length - 1) ids.add("flawless-chase");
  if (ctx.margin.kind === "tie") ids.add("nail-biter");
  if (ctx.matchesPlayedIncludingThis === 1) ids.add("first-match");
  if (ctx.matchesPlayedIncludingThis >= 10) ids.add("veteran");

  return Array.from(ids);
}

/**
 * Bhalyam Cricket — daily challenge.
 *
 * No backend, so "daily" is a deterministic, date-seeded pick — the same
 * matchup for every player on a given calendar day, reproducible from the
 * date alone (not random, not fabricated). Completion is derived by checking
 * real match history for a finished match today between exactly this pairing
 * — no separate "completed" flag to fall out of sync with reality.
 */

import { listTeams } from "./data";
import type { HistoryMatchRecord } from "./historyStore";
import type { HcCategory, HcFormat, HcTeamId } from "./types";

const FORMATS: HcFormat[] = ["t20", "odi", "test"];

function dateSeed(d: Date): number {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

export interface DailyChallenge {
  dateKey: string;
  category: HcCategory;
  format: HcFormat;
  teamA: HcTeamId;
  teamB: HcTeamId;
}

/** Today's deterministic matchup — stable across calls on the same day. */
export function todaysChallenge(now: Date = new Date()): DailyChallenge {
  const seed = dateSeed(now);
  const category: HcCategory = seed % 2 === 0 ? "international" : "ipl";
  const teams = listTeams(category).map((t) => t.id);
  const format: HcFormat = category === "ipl" ? "t20" : FORMATS[Math.floor(seed / 7) % FORMATS.length];
  const idxA = seed % teams.length;
  let idxB = Math.floor(seed / 3) % teams.length;
  if (idxB === idxA) idxB = (idxB + 1) % teams.length;
  return { dateKey: now.toDateString(), category, format, teamA: teams[idxA], teamB: teams[idxB] };
}

/** True if a real match matching today's exact pairing + format has already
 *  been completed today (order-independent — either side could bat first). */
export function isChallengeCompletedToday(matches: HistoryMatchRecord[], challenge: DailyChallenge): boolean {
  const wantPair = [challenge.teamA, challenge.teamB].sort().join("|");
  return matches.some((m) => {
    if (new Date(m.playedAt).toDateString() !== challenge.dateKey) return false;
    if (m.category !== challenge.category || m.format !== challenge.format) return false;
    return [m.firstTeamId, m.secondTeamId].sort().join("|") === wantPair;
  });
}

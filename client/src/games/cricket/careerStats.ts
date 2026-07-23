/**
 * Bhalyam Cricket — career-level derivations over the persisted match history.
 *
 * Pure selectors, real data only. There is no login/"your team" concept here
 * (the same player picks every ball for whichever side is batting), so these
 * deliberately avoid a fabricated personal win/loss record — stats are
 * activity totals, and standings are a per-team record across the matches
 * that team appeared in.
 */

import type { HistoryMatchRecord } from "./historyStore";
import type { HcTeamId } from "./types";

export interface CareerStats {
  matchesPlayed: number;
  ties: number;
  totalRuns: number;
  totalFours: number;
  totalSixes: number;
  totalWickets: number;
  highestScore: { teamId: HcTeamId; runs: number; wickets: number; matchId: string } | null;
  biggestWin: { winner: HcTeamId; marginText: string; matchId: string } | null;
  avgDurationSeconds: number;
  mostPlayedTeam: { teamId: HcTeamId; appearances: number } | null;
}

const EMPTY_STATS: CareerStats = {
  matchesPlayed: 0,
  ties: 0,
  totalRuns: 0,
  totalFours: 0,
  totalSixes: 0,
  totalWickets: 0,
  highestScore: null,
  biggestWin: null,
  avgDurationSeconds: 0,
  mostPlayedTeam: null,
};

/** Parses the real "Xm Ys played" / "Xs played" duration text back into
 *  seconds for averaging — avoids storing the number twice. */
function parseDurationSeconds(text: string): number {
  const m = text.match(/(?:(\d+)m\s*)?(\d+)s/);
  if (!m) return 0;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = Number(m[2]);
  return mins * 60 + secs;
}

export function deriveCareerStats(matches: HistoryMatchRecord[]): CareerStats {
  if (matches.length === 0) return EMPTY_STATS;

  let totalRuns = 0;
  let totalFours = 0;
  let totalSixes = 0;
  let totalWickets = 0;
  let ties = 0;
  let totalDurationSeconds = 0;
  let highestScore: CareerStats["highestScore"] = null;
  let biggestWin: CareerStats["biggestWin"] = null;
  let biggestRunsMargin = -1;
  const appearances = new Map<HcTeamId, number>();

  for (const m of matches) {
    for (const [teamId, line] of [
      [m.firstTeamId, m.first],
      [m.secondTeamId, m.second],
    ] as const) {
      totalRuns += line.runs;
      totalFours += line.fours;
      totalSixes += line.sixes;
      totalWickets += line.wickets;
      appearances.set(teamId, (appearances.get(teamId) ?? 0) + 1);
      if (!highestScore || line.runs > highestScore.runs) {
        highestScore = { teamId, runs: line.runs, wickets: line.wickets, matchId: m.id };
      }
    }

    if (m.winner === "tie") {
      ties += 1;
    } else if (m.marginKind === "runs" && m.marginValue > biggestRunsMargin) {
      // Runs-margin and wickets-margin aren't directly comparable, so
      // "biggest win" specifically tracks the largest runs-margin victory —
      // stated as such in the UI rather than implying a false ranking
      // between the two margin types.
      biggestRunsMargin = m.marginValue;
      biggestWin = { winner: m.winner, marginText: m.marginText, matchId: m.id };
    }

    totalDurationSeconds += parseDurationSeconds(m.durationText);
  }

  let mostPlayedTeam: CareerStats["mostPlayedTeam"] = null;
  for (const [teamId, count] of appearances) {
    if (!mostPlayedTeam || count > mostPlayedTeam.appearances) mostPlayedTeam = { teamId, appearances: count };
  }

  return {
    matchesPlayed: matches.length,
    ties,
    totalRuns,
    totalFours,
    totalSixes,
    totalWickets,
    highestScore,
    biggestWin,
    avgDurationSeconds: Math.round(totalDurationSeconds / matches.length),
    mostPlayedTeam,
  };
}

export interface StandingRow {
  teamId: HcTeamId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  winPct: number;
}

/** Per-team record across every match that team appeared in — the closest
 *  honest analogue to a league table without a fixed "your team". */
export function deriveStandings(matches: HistoryMatchRecord[]): StandingRow[] {
  const rows = new Map<HcTeamId, StandingRow>();
  function ensure(teamId: HcTeamId): StandingRow {
    let row = rows.get(teamId);
    if (!row) {
      row = { teamId, played: 0, won: 0, lost: 0, tied: 0, winPct: 0 };
      rows.set(teamId, row);
    }
    return row;
  }

  for (const m of matches) {
    const first = ensure(m.firstTeamId);
    const second = ensure(m.secondTeamId);
    first.played += 1;
    second.played += 1;
    if (m.winner === "tie") {
      first.tied += 1;
      second.tied += 1;
    } else if (m.winner === m.firstTeamId) {
      first.won += 1;
      second.lost += 1;
    } else {
      second.won += 1;
      first.lost += 1;
    }
  }

  const list = Array.from(rows.values()).map((r) => ({ ...r, winPct: r.played > 0 ? (r.won / r.played) * 100 : 0 }));
  list.sort((a, b) => b.winPct - a.winPct || b.played - a.played);
  return list;
}

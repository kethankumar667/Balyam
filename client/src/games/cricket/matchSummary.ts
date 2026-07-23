/**
 * Bhalyam Cricket — match-level summary, computed from two real innings.
 *
 * Pure derivation, no fabricated data. Because this engine has no per-bowler
 * attribution (see derive.ts), "Player of the Match" and "top batter" are both
 * honestly computed from the same signal — the highest run-scorer across both
 * innings — and documented as such rather than presenting two different
 * numbers that don't actually exist independently.
 */

import { battingRows } from "./derive";
import type { InningsState } from "./innings";
import type { HcTeamId } from "./types";

export interface TopBatter {
  playerId: string;
  playerName: string;
  teamId: HcTeamId;
  runs: number;
  balls: number;
}

/** Raw numeric margin, separate from the display string, so history/stats
 *  screens can aggregate ("biggest win") without re-parsing prose. */
export interface MarginInfo {
  kind: "runs" | "wickets" | "tie";
  value: number;
}

export interface MatchSummaryResult {
  firstTeamId: HcTeamId;
  secondTeamId: HcTeamId;
  winner: HcTeamId | "tie";
  margin: MarginInfo;
  marginText: string;
  playerOfMatch: TopBatter | null;
  durationText: string;
  first: { runs: number; wickets: number; overs: number; balls: number };
  second: { runs: number; wickets: number; overs: number; balls: number };
}

function scoreLine(inn: InningsState) {
  return { runs: inn.runs, wickets: inn.wickets, overs: inn.oversCompleted, balls: inn.ballInOver };
}

function topBatterAcross(innings: InningsState[]): TopBatter | null {
  let best: TopBatter | null = null;
  for (const inn of innings) {
    for (const row of battingRows(inn)) {
      if (row.balls === 0) continue;
      if (!best || row.runs > best.runs || (row.runs === best.runs && row.balls < best.balls)) {
        best = { playerId: row.player.id, playerName: row.player.name, teamId: row.player.teamId, runs: row.runs, balls: row.balls };
      }
    }
  }
  return best;
}

export function computeMargin(first: InningsState, second: InningsState): { winner: HcTeamId | "tie"; margin: MarginInfo; marginText: string } {
  const firstTeamId = first.xi[0].teamId;
  const secondTeamId = second.xi[0].teamId;

  if (second.runs > first.runs) {
    const wicketsInHand = second.xi.length - 1 - second.wickets;
    return {
      winner: secondTeamId,
      margin: { kind: "wickets", value: wicketsInHand },
      marginText: `Won by ${wicketsInHand} wicket${wicketsInHand === 1 ? "" : "s"}`,
    };
  }
  if (first.runs > second.runs) {
    const runMargin = first.runs - second.runs;
    return {
      winner: firstTeamId,
      margin: { kind: "runs", value: runMargin },
      marginText: `Won by ${runMargin} run${runMargin === 1 ? "" : "s"}`,
    };
  }
  return { winner: "tie", margin: { kind: "tie", value: 0 }, marginText: "Match tied" };
}

export function buildMatchSummary(first: InningsState, second: InningsState, startedAt: number, endedAt: number): MatchSummaryResult {
  const firstTeamId = first.xi[0].teamId;
  const secondTeamId = second.xi[0].teamId;
  const { winner, margin, marginText } = computeMargin(first, second);

  const elapsedMs = Math.max(0, endedAt - startedAt);
  const totalSeconds = Math.round(elapsedMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const durationText = mins > 0 ? `${mins}m ${secs}s played` : `${secs}s played`;

  return {
    firstTeamId,
    secondTeamId,
    winner,
    margin,
    marginText,
    playerOfMatch: topBatterAcross([first, second]),
    durationText,
    first: scoreLine(first),
    second: scoreLine(second),
  };
}

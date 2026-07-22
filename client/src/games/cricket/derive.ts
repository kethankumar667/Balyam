/**
 * Bhalyam Cricket — scorecard & analytics derivations.
 *
 * Pure selectors computed from a played innings' real ball log and batter
 * stats. No mock data: every number here comes from balls the player actually
 * faced. Bowling figures are intentionally absent — the hand-cricket model has
 * no individual bowler attribution, so inventing them would be fabrication.
 */

import type { InningsState } from "./innings";
import type { CricketPlayer } from "./types";

export interface BattingRow {
  player: CricketPlayer;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  notOut: boolean;
  batted: boolean;
  strikeRate: number;
}

export interface FowRow {
  wicket: number;
  score: number;
  batterName: string;
  over: string;
}

export interface DistBar {
  label: string;
  count: number;
}

export interface ManhattanBar {
  over: number;
  runs: number;
  wickets: number;
}

export interface PartnershipRow {
  index: number;
  names: string;
  runs: number;
  balls: number;
}

function nameOf(inn: InningsState, id: string): string {
  return inn.xi.find((p) => p.id === id)?.name ?? "Batter";
}

export function battingRows(inn: InningsState): BattingRow[] {
  const atCrease = new Set<string>([inn.xi[inn.strikerIdx]?.id, inn.xi[inn.nonStrikerIdx]?.id].filter(Boolean) as string[]);
  return inn.xi.map((player) => {
    const s = inn.stats[player.id];
    const batted = s.balls > 0 || s.out || atCrease.has(player.id);
    return {
      player,
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      out: s.out,
      notOut: batted && !s.out,
      batted,
      strikeRate: s.balls > 0 ? (s.runs / s.balls) * 100 : 0,
    };
  });
}

export function fallOfWickets(inn: InningsState): FowRow[] {
  const rows: FowRow[] = [];
  let total = 0;
  let w = 0;
  for (const b of inn.log) {
    total += b.runs;
    if (b.isWicket) {
      w += 1;
      rows.push({ wicket: w, score: total, batterName: nameOf(inn, b.batterId), over: `${b.over}.${b.ballInOver}` });
    }
  }
  return rows;
}

export function runDistribution(inn: InningsState): DistBar[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let wickets = 0;
  for (const b of inn.log) {
    if (b.isWicket) {
      wickets += 1;
      continue;
    }
    if (b.runs >= 0 && b.runs <= 6) counts[b.runs] += 1;
  }
  const bars: DistBar[] = [
    { label: "Dots", count: counts[0] },
    { label: "1s", count: counts[1] },
    { label: "2s", count: counts[2] },
    { label: "3s", count: counts[3] },
    { label: "4s", count: counts[4] },
    { label: "5s", count: counts[5] },
    { label: "6s", count: counts[6] },
    { label: "Wkts", count: wickets },
  ];
  return bars.filter((b) => b.label !== "5s" || b.count > 0);
}

export function manhattan(inn: InningsState): ManhattanBar[] {
  const overs = [...inn.overs];
  if (inn.thisOver.length > 0) overs.push(inn.thisOver);
  return overs.map((balls, i) => ({
    over: i + 1,
    runs: balls.reduce((n, o) => n + (o === "W" ? 0 : Number(o)), 0),
    wickets: balls.filter((o) => o === "W").length,
  }));
}

export function partnerships(inn: InningsState): PartnershipRow[] {
  if (inn.log.length === 0 || inn.xi.length < 2) return [];
  const rows: PartnershipRow[] = [];
  let pair: [string, string] = [inn.xi[0].id, inn.xi[1].id];
  let nextIdx = 2;
  let runs = 0;
  let balls = 0;
  let idx = 1;
  for (const b of inn.log) {
    runs += b.runs;
    balls += 1;
    if (b.isWicket) {
      rows.push({ index: idx++, names: `${nameOf(inn, pair[0])} & ${nameOf(inn, pair[1])}`, runs, balls });
      const survivor = b.batterId === pair[0] ? pair[1] : pair[0];
      const incoming = inn.xi[nextIdx]?.id ?? survivor;
      nextIdx += 1;
      pair = [survivor, incoming];
      runs = 0;
      balls = 0;
    }
  }
  if (balls > 0) rows.push({ index: idx++, names: `${nameOf(inn, pair[0])} & ${nameOf(inn, pair[1])}`, runs, balls });
  return rows;
}

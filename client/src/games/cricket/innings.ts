/**
 * Bhalyam Cricket — single-innings engine (client, deterministic per tap).
 *
 * Batter-aware state driving the gameplay screen and its overlays. Uses the
 * hand-cricket mechanic: the striker picks 1–6; if it collides with the hidden
 * bowler number they are out — except during powerplay overs, which are a safe
 * batting window (no wickets), matching the shared HC_POWERPLAY_OVERS config.
 * Overs limit and powerplay come from the chosen format, so every format works.
 */

import { HC_POWERPLAY_OVERS } from "@shared/types";
import type { BallOutcome, CricketPlayer, HcFormat } from "./types";
import { oversForFormat } from "./data";

export interface BatterStat {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
}

export type InningsEvent =
  | { kind: "ball"; outcome: BallOutcome; runs: number }
  | { kind: "wicket"; batterName: string; runs: number; balls: number }
  | { kind: "milestone"; batterName: string; milestone: 50 | 100 }
  | { kind: "achievement"; id: string; title: string; desc: string }
  | { kind: "overSummary"; over: number; balls: BallOutcome[]; runs: number };

/** One recorded ball — the source for scorecard/analytics derivations. */
export interface BallLogEntry {
  index: number;
  over: number;
  ballInOver: number;
  outcome: BallOutcome;
  runs: number;
  batterId: string;
  isWicket: boolean;
}

export interface InningsState {
  xi: CricketPlayer[];
  format: HcFormat;
  oversLimit: number;
  ppOvers: number;
  runs: number;
  wickets: number;
  oversCompleted: number;
  ballInOver: number;
  strikerIdx: number;
  nonStrikerIdx: number;
  nextIdx: number;
  stats: Record<string, BatterStat>;
  thisOver: BallOutcome[];
  overs: BallOutcome[][];
  log: BallLogEntry[];
  sixes: number;
  achievements: string[];
  done: boolean;
}

export function createInnings(xi: CricketPlayer[], format: HcFormat): InningsState {
  const stats: Record<string, BatterStat> = {};
  xi.forEach((p) => {
    stats[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
  });
  return {
    xi,
    format,
    oversLimit: oversForFormat(format),
    ppOvers: HC_POWERPLAY_OVERS[format],
    runs: 0,
    wickets: 0,
    oversCompleted: 0,
    ballInOver: 0,
    strikerIdx: 0,
    nonStrikerIdx: xi.length > 1 ? 1 : 0,
    nextIdx: 2,
    stats,
    thisOver: [],
    overs: [],
    log: [],
    sixes: 0,
    achievements: [],
    done: false,
  };
}

export function isPowerplay(s: InningsState): boolean {
  return s.oversCompleted < s.ppOvers;
}

/** Resolve one legal ball for the given pick. Pure — returns the next state
 *  and the ordered events (for overlay sequencing) without mutating input. */
export function playBall(prev: InningsState, pick: number): { state: InningsState; events: InningsEvent[] } {
  if (prev.done) return { state: prev, events: [] };

  const events: InningsEvent[] = [];
  const striker = prev.xi[prev.strikerIdx];
  const pp = isPowerplay(prev);
  const bowler = 1 + Math.floor(Math.random() * 6);
  const isWicket = !pp && bowler === pick;
  const runs = isWicket ? 0 : pick;
  const outcome: BallOutcome = isWicket ? "W" : (String(pick) as BallOutcome);

  const stats: Record<string, BatterStat> = { ...prev.stats, [striker.id]: { ...prev.stats[striker.id] } };
  const st = stats[striker.id];
  const runsBefore = st.runs;
  st.balls += 1;
  let sixes = prev.sixes;
  if (!isWicket) {
    st.runs += runs;
    if (pick === 4) st.fours += 1;
    if (pick === 6) {
      st.sixes += 1;
      sixes += 1;
    }
  }

  let total = prev.runs + runs;
  let wickets = prev.wickets;
  let strikerIdx = prev.strikerIdx;
  let nonStrikerIdx = prev.nonStrikerIdx;
  let nextIdx = prev.nextIdx;
  let ballInOver = prev.ballInOver + 1;
  let oversCompleted = prev.oversCompleted;
  const thisOver = [...prev.thisOver, outcome];
  let overs = prev.overs;
  const achievements = [...prev.achievements];
  let done = false;
  const log: BallLogEntry[] = [
    ...prev.log,
    {
      index: prev.log.length + 1,
      over: prev.oversCompleted,
      ballInOver: prev.ballInOver + 1,
      outcome,
      runs,
      batterId: striker.id,
      isWicket,
    },
  ];

  events.push({ kind: "ball", outcome, runs });

  if (isWicket) {
    st.out = true;
    wickets += 1;
    events.push({ kind: "wicket", batterName: striker.name, runs: st.runs, balls: st.balls });
    if (wickets >= prev.xi.length - 1) {
      done = true;
    } else {
      strikerIdx = nextIdx;
      nextIdx += 1;
    }
  } else {
    if (runsBefore < 50 && st.runs >= 50 && st.runs < 100) {
      events.push({ kind: "milestone", batterName: striker.name, milestone: 50 });
    }
    if (runsBefore < 100 && st.runs >= 100) {
      events.push({ kind: "milestone", batterName: striker.name, milestone: 100 });
    }
    if (runs % 2 === 1) {
      const t = strikerIdx;
      strikerIdx = nonStrikerIdx;
      nonStrikerIdx = t;
    }
  }

  if (sixes >= 3 && !achievements.includes("power-hitter")) {
    achievements.push("power-hitter");
    events.push({ kind: "achievement", id: "power-hitter", title: "Power Hitter", desc: "Smashed 3 sixes in one innings!" });
  }

  let over = thisOver;
  if (ballInOver >= 6 && !done) {
    overs = [...overs, thisOver];
    events.push({ kind: "overSummary", over: oversCompleted + 1, balls: thisOver, runs: total });
    oversCompleted += 1;
    ballInOver = 0;
    over = [];
    const t = strikerIdx;
    strikerIdx = nonStrikerIdx;
    nonStrikerIdx = t;
    if (oversCompleted >= prev.oversLimit) done = true;
  }

  const state: InningsState = {
    ...prev,
    runs: total,
    wickets,
    oversCompleted,
    ballInOver,
    strikerIdx,
    nonStrikerIdx,
    nextIdx,
    stats,
    thisOver: over,
    overs,
    log,
    sixes,
    achievements,
    done,
  };
  return { state, events };
}

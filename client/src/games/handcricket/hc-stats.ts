import type { HcBall, HcInnings } from "@shared/types";

/**
 * Cricket derivations from the ball-by-ball history.
 *
 * Everything here is a PURE function over `HcInnings` — no engine change, no
 * new server state, no migration. The server already records every ball with
 * its over, batter, bowler, runs and wicket flag; these are the readings a
 * cricket follower expects from that data and which the UI was not surfacing.
 *
 * Kept separate from the components so the arithmetic is unit-testable on its
 * own. Cricket stats are exactly the kind of thing that looks right in a
 * screenshot and is quietly off by one — a partnership that survives a wicket,
 * an over count that reads 4.6 instead of 5.0.
 */

/* ── over formatting ─────────────────────────────────────────────────────── */

/**
 * Balls → cricket over notation.
 *
 * Six balls is "1.0", not "0.6" — the sixth ball completes the over. Getting
 * this wrong is the classic cricket-app bug, so it lives in one function that
 * everything else calls.
 */
export function oversFromBalls(balls: number): string {
  const safe = Math.max(0, Math.floor(balls));
  return `${Math.floor(safe / 6)}.${safe % 6}`;
}

/** Batting strike rate: runs per 100 balls. Null when the batter hasn't faced one. */
export function strikeRate(runs: number, balls: number): number | null {
  if (balls <= 0) return null;
  return (runs / balls) * 100;
}

/** Bowling economy: runs conceded per over. Null when no balls bowled. */
export function economy(runs: number, balls: number): number | null {
  if (balls <= 0) return null;
  return runs / (balls / 6);
}

/* ── partnership ─────────────────────────────────────────────────────────── */

export interface Partnership {
  runs: number;
  balls: number;
  /** Profile ids of the two batters involved, in the order they appear. */
  batterIds: string[];
  /** Wickets already down — this is the (n+1)th-wicket stand. */
  forWicket: number;
}

/**
 * The stand currently in progress: everything since the last wicket fell.
 *
 * Counts EVERY ball since that wicket, not just the striker's — a partnership
 * is a joint effort and its ball count is the stand's duration. The wicket ball
 * itself belongs to the previous partnership, hence `slice(idx + 1)`.
 */
export function currentPartnership(innings: HcInnings): Partnership {
  const h = innings.history;
  let lastWicketIdx = -1;
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].wicket) {
      lastWicketIdx = i;
      break;
    }
  }
  const since = h.slice(lastWicketIdx + 1);
  const runs = since.reduce((a, b) => a + b.runs, 0);
  const batterIds: string[] = [];
  for (const b of since) {
    if (!batterIds.includes(b.batterId)) batterIds.push(b.batterId);
  }
  return {
    runs,
    balls: since.length,
    batterIds,
    forWicket: innings.wickets,
  };
}

/** Every completed stand this innings, oldest first. Excludes the live one. */
export function allPartnerships(innings: HcInnings): Partnership[] {
  const out: Partnership[] = [];
  let runs = 0;
  let balls = 0;
  let batterIds: string[] = [];
  let wicketsDown = 0;

  for (const b of innings.history) {
    runs += b.runs;
    balls += 1;
    if (!batterIds.includes(b.batterId)) batterIds.push(b.batterId);
    if (b.wicket) {
      out.push({ runs, balls, batterIds, forWicket: wicketsDown });
      wicketsDown += 1;
      runs = 0;
      balls = 0;
      batterIds = [];
    }
  }
  return out;
}

/* ── fall of wickets ─────────────────────────────────────────────────────── */

export interface FallOfWicket {
  /** 1-based: the Nth wicket to fall. */
  wicket: number;
  /** Team score at the moment it fell. */
  score: number;
  /** Profile id of the dismissed batter. */
  batterId: string;
  /** Profile id of the bowler credited. */
  bowlerId: string;
  /** Over notation at the moment of dismissal, e.g. "1.4". */
  over: string;
}

/**
 * The `1-13 (Gaikwad, 1.4)` line — the story of a collapse in one row.
 *
 * Score is CUMULATIVE up to and including the wicket ball (a wicket scores 0,
 * so it is the running total at that instant), and the over is the ball count
 * INCLUDING that delivery, which is how a scorecard reports it.
 */
export function fallOfWickets(innings: HcInnings): FallOfWicket[] {
  const out: FallOfWicket[] = [];
  let running = 0;
  let balls = 0;
  for (const b of innings.history) {
    running += b.runs;
    balls += 1;
    if (b.wicket) {
      out.push({
        wicket: out.length + 1,
        score: running,
        batterId: b.batterId,
        bowlerId: b.bowlerId,
        over: oversFromBalls(balls),
      });
    }
  }
  return out;
}

/* ── momentum ────────────────────────────────────────────────────────────── */

export interface RecentForm {
  runs: number;
  wickets: number;
  balls: number;
}

/** Runs and wickets in the last N overs — the "is this chase alive?" readout. */
export function lastOvers(innings: HcInnings, overs = 5): RecentForm {
  const window = innings.history.slice(-overs * 6);
  return {
    runs: window.reduce((a, b) => a + b.runs, 0),
    wickets: window.filter((b) => b.wicket).length,
    balls: window.length,
  };
}

/* ── per-over breakdown ──────────────────────────────────────────────────── */

export interface OverSummary {
  over: number;
  runs: number;
  wickets: number;
  balls: HcBall[];
  /** No runs conceded across a completed six-ball over. */
  maiden: boolean;
}

/** Runs and wickets grouped by over, oldest first. */
export function overBreakdown(innings: HcInnings): OverSummary[] {
  const byOver = new Map<number, HcBall[]>();
  for (const b of innings.history) {
    const list = byOver.get(b.overNumber) ?? [];
    list.push(b);
    byOver.set(b.overNumber, list);
  }
  return [...byOver.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([over, balls]) => {
      const runs = balls.reduce((a, b) => a + b.runs, 0);
      return {
        over,
        runs,
        wickets: balls.filter((b) => b.wicket).length,
        balls,
        // Only a COMPLETED wicketless over is a maiden — an in-progress over
        // with two dots is not one yet.
        maiden: runs === 0 && balls.length === 6,
      };
    });
}

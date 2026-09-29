import type { GameKind } from "@shared/types.js";
import { REASON, type MinDurationTable, type ReasonCode } from "./types.js";

/**
 * Whether a finished match could really have been played — the cheapest and
 * most effective anti-farming rule there is, because it needs to know nothing
 * about the player.
 *
 * ── Two questions, both about the match and never the person ──────────────
 *  1. Was it too short? A best-of-ten of Rock Paper Scissors cannot end in three
 *     seconds; a forfeit farmed between two accounts can.
 *  2. Is this player finishing matches faster than people play them? Twelve in
 *     ten minutes is a script, not a person, whatever each match's length.
 *
 * A match that fails either still counts in the record (stats, history are not
 * rewards) — it just pays no XP, with a reason code saying why.
 *
 * ── Why the floors are conservative ───────────────────────────────────────
 * A floor that catches a real game is worse than no floor: it teaches a player
 * that the rules are arbitrary. These sit under the fastest legitimate games
 * observed (the engines' own minimum turn timers), not at typical length.
 */

const SECOND = 1_000;

export const MIN_MATCH_DURATION_MS: MinDurationTable = {
  tictactoe: 20 * SECOND,
  rps: 20 * SECOND,
  snake: 20 * SECOND,
  connect4: 30 * SECOND,
  blockblast: 30 * SECOND,
  spacewar: 30 * SECOND,
  roadrash: 30 * SECOND,
  wordbuilding: 45 * SECOND,
  namesplaceanimal: 45 * SECOND,
  stargame: 45 * SECOND,
  dotsboxes: 45 * SECOND,
  handcricket: 45 * SECOND,
  snl: 60 * SECOND,
  uno: 60 * SECOND,
  chess: 60 * SECOND,
  carrom: 60 * SECOND,
  bingo: 60 * SECOND,
  tambola: 60 * SECOND,
  ludo: 90 * SECOND,
  rummy: 90 * SECOND,
};

/** More than this many finished matches inside the window is faster than a person plays. */
export const PACE_MAX_MATCHES = 12;
export const PACE_WINDOW_MS = 10 * 60 * SECOND;

/** How many abnormal sessions inside `ABNORMAL_WINDOW_MS` move a player to WATCHLIST. */
export const ABNORMAL_SESSIONS_FOR_WATCHLIST = 3;
export const ABNORMAL_WINDOW_MS = 24 * 60 * 60 * SECOND;

export type SessionVerdict = { ok: true } | { ok: false; code: ReasonCode };

export function isTooShort(game: GameKind, durationMs: number): boolean {
  return durationMs < MIN_MATCH_DURATION_MS[game];
}

/**
 * `finishedInWindow` includes the match being assessed. Pure, so the same
 * inputs always give the same verdict and a test can name the exact boundary.
 */
export function assessSession(game: GameKind, durationMs: number, finishedInWindow: number): SessionVerdict {
  if (isTooShort(game, durationMs)) return { ok: false, code: REASON.TOO_SHORT };
  if (finishedInWindow > PACE_MAX_MATCHES) return { ok: false, code: REASON.PACE_LIMIT };
  return { ok: true };
}

/**
 * How many matches each player has finished lately. In memory on purpose: the
 * window is ten minutes, so a restart forgives at most one window of pace, and
 * the durable record of abnormal sessions lives in `risk_events`.
 */
export class PaceTracker {
  private readonly recent = new Map<string, number[]>();

  /** Records a finished match at `at` and returns how many the player finished inside the window, including it. */
  record(playerId: string, at: number): number {
    const inWindow = (this.recent.get(playerId) ?? []).filter((t) => Math.abs(at - t) < PACE_WINDOW_MS);
    inWindow.push(at);
    this.recent.set(playerId, inWindow);
    if (this.recent.size > 5_000) this.pruneBefore(at - PACE_WINDOW_MS);
    return inWindow.length;
  }

  private pruneBefore(cutoff: number): void {
    for (const [id, times] of this.recent) {
      if (times.every((t) => t < cutoff)) this.recent.delete(id);
    }
  }

  reset(): void {
    this.recent.clear();
  }
}

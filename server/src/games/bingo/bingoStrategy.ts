import type { BingoBoard } from "@shared/types.js";
import { ALL_LINES } from "./win.js";

/**
 * Which number a Bingo bot calls on its turn.
 *
 * The old bot called a random uncalled number. That ignores the only decision the caller has: every call
 * marks one cell on EVERY board, so a call helps whoever it brings closest to five lines. A good caller
 * picks the number that moves its own board along and, when it can't win, avoids the one that finishes a
 * rival.
 *
 * Boards are public in the room state (each seat's board is broadcast with its marks), so reading rivals'
 * boards is the same information any player sees on screen; nothing hidden is used.
 *
 * Scoring, for each uncalled number v:
 *   - my gain = how much closer my 12 lines get (a line with 4 of 5 marked is worth far more than one with 1),
 *   - a call that completes my 5th line is taken at once, and one that completes a rival's 5th line while not
 *     completing mine is avoided at nearly any price,
 *   - rival gain counts against it, weighted so the leading rival matters most.
 *
 * Pure: it takes the boards and the called numbers and returns a number.
 */

/** Worth of a line by how many of its five cells are marked. */
const LINE_WORTH = [0, 1, 4, 16, 64, 400] as const;
const LINES_TO_WIN = 5;
const WIN_SCORE = 1_000_000;
const LEADING_RIVAL_WEIGHT = 0.6;
const OTHER_RIVALS_WEIGHT = 0.1;

export interface BingoCallInput {
  /** The bot's own board. */
  mine: BingoBoard;
  /** Every other seat's board. */
  rivals: readonly BingoBoard[];
  /** Numbers already called (every board has them marked). */
  called: ReadonlySet<number>;
  /** Breaks ties; defaults to `Math.random`. */
  random?: () => number;
}

interface Progress {
  worth: number;
  lines: number;
}

/** How far along a board is if `marked` are its marked values. */
function progressOf(board: BingoBoard, marked: ReadonlySet<number>): Progress {
  const valueAt = new Map<number, number>();
  for (const cell of board) valueAt.set(cell.index, cell.value);
  let worth = 0;
  let lines = 0;
  for (const line of ALL_LINES) {
    let count = 0;
    for (const index of line) if (marked.has(valueAt.get(index) ?? -1)) count += 1;
    worth += LINE_WORTH[count];
    if (count === line.length) lines += 1;
  }
  return { worth, lines };
}

/** The number to call, or `null` when every number has been called. */
export function chooseBingoCall(input: BingoCallInput): number | null {
  const uncalled: number[] = [];
  for (let v = 1; v <= 25; v++) if (!input.called.has(v)) uncalled.push(v);
  if (uncalled.length === 0) return null;
  if (uncalled.length === 1) return uncalled[0];

  const random = input.random ?? Math.random;
  const myBefore = progressOf(input.mine, input.called);
  const rivalBefore = input.rivals.map((board) => progressOf(board, input.called));

  let best: number[] = [];
  let bestScore = -Infinity;
  for (const v of uncalled) {
    const marked = new Set(input.called).add(v);
    const mine = progressOf(input.mine, marked);
    const rivalGains = input.rivals.map((board, i) => {
      const after = progressOf(board, marked);
      return { gain: after.worth - rivalBefore[i].worth, wins: after.lines >= LINES_TO_WIN };
    });
    const iWin = mine.lines >= LINES_TO_WIN;
    const rivalWins = rivalGains.some((r) => r.wins);

    let score: number;
    if (iWin) score = WIN_SCORE + mine.worth;
    else if (rivalWins) score = -WIN_SCORE + mine.worth;
    else {
      const gains = rivalGains.map((r) => r.gain).sort((a, b) => b - a);
      const leading = gains[0] ?? 0;
      const others = gains.slice(1).reduce((sum, g) => sum + g, 0);
      score = mine.worth - myBefore.worth - LEADING_RIVAL_WEIGHT * leading - OTHER_RIVALS_WEIGHT * others;
    }

    if (score > bestScore) {
      bestScore = score;
      best = [v];
    } else if (score === bestScore) best.push(v);
  }
  return best[Math.floor(random() * best.length)];
}

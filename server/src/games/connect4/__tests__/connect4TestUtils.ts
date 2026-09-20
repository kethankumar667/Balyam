import type { MoveResult } from "../../GameEngine.js";
import type { Connect4Disc, Connect4Options, Player } from "@shared/types.js";
import { CONNECT4_COLUMNS, CONNECT4_ROWS } from "@shared/types.js";
import type { Grid } from "../connect4Board.js";
import { Connect4Engine } from "../Connect4Engine.js";

export const TOTAL_CELLS = CONNECT4_COLUMNS * CONNECT4_ROWS;

/**
 * Builds a grid from 6 strings of 7 characters, TOP row first: "." empty, "R" red, "Y" yellow.
 * Positions read like the board on screen, so a test can be checked by eye.
 */
export function gridFrom(rows: readonly string[]): Grid {
  if (rows.length !== CONNECT4_ROWS) throw new Error(`gridFrom needs ${CONNECT4_ROWS} rows, got ${rows.length}`);
  return rows.map((line) => {
    if (line.length !== CONNECT4_COLUMNS) throw new Error(`gridFrom row "${line}" must be ${CONNECT4_COLUMNS} wide`);
    return [...line].map((ch): Connect4Disc | null => (ch === "R" || ch === "Y" ? ch : null));
  });
}

export function makePlayers(flags: { p1Bot?: boolean; p2Bot?: boolean } = {}): [Player, Player] {
  return [
    { id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true, isBot: flags.p1Bot === true },
    { id: "p2", name: "Player 2", isHost: false, isReady: true, isConnected: true, isBot: flags.p2Bot === true },
  ];
}

/** Small, fast, seedable PRNG so bot and tie-break behaviour is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestClock {
  now: () => number;
  advance: (ms: number) => void;
}

export function makeClock(start = 1_000_000): TestClock {
  let t = start;
  return { now: () => t, advance: (ms) => void (t += ms) };
}

export interface EngineFixture {
  engine: Connect4Engine;
  players: [Player, Player];
  clock: TestClock;
}

export function newEngine(
  args: { options?: Partial<Connect4Options>; seed?: number; flags?: { p1Bot?: boolean; p2Bot?: boolean } } = {},
): EngineFixture {
  const clock = makeClock();
  const engine = new Connect4Engine({ now: clock.now, random: mulberry32(args.seed ?? 1) });
  if (args.options) engine.setOptions(args.options);
  const players = makePlayers(args.flags);
  engine.init(players);
  return { engine, players, clock };
}

/** Sends a drop through the same envelope the socket layer delivers. `column` is deliberately `unknown`. */
export function drop(engine: Connect4Engine, playerId: string, column: unknown): MoveResult {
  return engine.applyMove({ playerId, type: "drop", data: { column } });
}

/** Plays the columns alternately, p1 first. Returns every result so a test can assert on all of them. */
export function playColumns(engine: Connect4Engine, columns: readonly number[]): MoveResult[] {
  return columns.map((column, index) => drop(engine, index % 2 === 0 ? "p1" : "p2", column));
}

// ---------------------------------------------------------------------------
// An INDEPENDENT four-in-a-row check and game-sequence search. It shares no code
// with the engine on purpose: a test that used the engine's own win logic to build
// its fixtures could never catch a bug in it.
// ---------------------------------------------------------------------------

type Cells = number[][]; // [row][col], row 0 = top, 0 = empty, 1 = first mover, 2 = second mover

function makesFour(cells: Cells, row: number, col: number, who: number): boolean {
  const directions: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of directions) {
    let run = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < CONNECT4_ROWS && c >= 0 && c < CONNECT4_COLUMNS && cells[r][c] === who) {
        run += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run >= 4) return true;
  }
  return false;
}

const SEARCH_NODE_CAP = 3_000_000;
const CENTRE_FIRST = [3, 2, 4, 1, 5, 0, 6] as const;

/**
 * Finds a legal 42-move column sequence (p1 moves first) by depth-first search.
 *   "draw"        - the board fills without anyone ever making four.
 *   "lastMoveWin" - nobody makes four until the 42nd disc, which completes four for p2.
 * Returns null if the search cap is hit, which fails the calling test loudly instead of hanging.
 */
export function findFullBoardSequence(mode: "draw" | "lastMoveWin"): number[] | null {
  const cells: Cells = Array.from({ length: CONNECT4_ROWS }, () => Array<number>(CONNECT4_COLUMNS).fill(0));
  const heights = Array<number>(CONNECT4_COLUMNS).fill(0);
  const sequence: number[] = [];
  let nodes = 0;

  const search = (move: number): boolean => {
    if (move === TOTAL_CELLS) return true;
    if (nodes++ > SEARCH_NODE_CAP) return false;
    const who = (move % 2) + 1;
    const isLast = move === TOTAL_CELLS - 1;
    for (const col of CENTRE_FIRST) {
      if (heights[col] >= CONNECT4_ROWS) continue;
      const row = CONNECT4_ROWS - 1 - heights[col];
      cells[row][col] = who;
      const four = makesFour(cells, row, col, who);
      const acceptable = mode === "lastMoveWin" && isLast ? four : !four;
      if (acceptable) {
        heights[col] += 1;
        sequence.push(col);
        if (search(move + 1)) return true;
        sequence.pop();
        heights[col] -= 1;
      }
      cells[row][col] = 0;
    }
    return false;
  };

  return search(0) ? [...sequence] : null;
}

import type { BlockBlastPieceView } from "@shared/types.js";

/**
 * The piece table.
 *
 * Written as ASCII art because a piece table is the one part of this game a
 * human will want to read and argue about, and a list of `[0,0],[1,0],[1,1]`
 * tuples cannot be argued about — you have to draw it on paper first.
 *
 * **There is no rotation.** That is a design decision, not an omission: every
 * orientation is its own entry here. Rotation turns the game from "where does
 * this go" into "let me spin it a few times and see", which is fiddly on a
 * phone and destroys the planning problem that makes the genre work.
 */

/** Palette indices. 0 is empty and is never a piece. */
const SKY = 1;
const TEAL = 2;
const GREEN = 3;
const LIME = 4;
const AMBER = 5;
const ORANGE = 6;
const PINK = 7;
const VIOLET = 8;

export interface BlockPiece {
  id: string;
  /** Offsets from the piece's top-left, row-major, sorted. */
  cells: readonly { r: number; c: number }[];
  w: number;
  h: number;
  color: number;
  /**
   * Relative draw frequency, not a probability. Tuned so roughly half of all
   * draws are three cells or fewer — a game where flexible pieces are scarce
   * is not harder, it is just shorter and less interesting.
   */
  weight: number;
}

type ShapeSpec = [id: string, weight: number, color: number, rows: string[]];

/**
 * `X` is a filled cell, `.` is empty. Rows must all be the same length.
 */
const SHAPES: ShapeSpec[] = [
  // ── one cell ─────────────────────────────────────────────────────────
  // The get-out-of-jail piece. Common enough to rescue a bad board, rare
  // enough that it never feels owed.
  ["dot", 5, LIME, ["X"]],

  // ── lines ────────────────────────────────────────────────────────────
  ["h2", 7, SKY, ["XX"]],
  ["v2", 7, SKY, ["X", "X"]],
  ["h3", 7, TEAL, ["XXX"]],
  ["v3", 7, TEAL, ["X", "X", "X"]],
  ["h4", 5, GREEN, ["XXXX"]],
  ["v4", 5, GREEN, ["X", "X", "X", "X"]],
  ["h5", 3, AMBER, ["XXXXX"]],
  ["v5", 3, AMBER, ["X", "X", "X", "X", "X"]],

  // ── blocks ───────────────────────────────────────────────────────────
  ["sq2", 7, PINK, ["XX", "XX"]],
  // Nine cells and no give at all. Deliberately the rarest thing in the bag.
  ["sq3", 2, ORANGE, ["XXX", "XXX", "XXX"]],
  ["r23", 3, ORANGE, ["XXX", "XXX"]],
  ["r32", 3, ORANGE, ["XX", "XX", "XX"]],

  // ── small corners ────────────────────────────────────────────────────
  // The workhorses. They fit the ragged edges every other piece leaves.
  ["c3a", 6, VIOLET, ["X.", "XX"]],
  ["c3b", 6, VIOLET, ["XX", "X."]],
  ["c3c", 6, VIOLET, ["XX", ".X"]],
  ["c3d", 6, VIOLET, [".X", "XX"]],

  // ── tees ─────────────────────────────────────────────────────────────
  ["t4a", 3, PINK, ["XXX", ".X."]],
  ["t4b", 3, PINK, [".X.", "XXX"]],
  ["t4c", 3, PINK, ["X.", "XX", "X."]],
  ["t4d", 3, PINK, [".X", "XX", ".X"]],

  // ── skews ────────────────────────────────────────────────────────────
  // The pieces players swear at. Low weight, because a board full of these
  // is unwinnable rather than difficult.
  ["s4a", 2, TEAL, [".XX", "XX."]],
  ["s4b", 2, TEAL, ["XX.", ".XX"]],
  ["s4c", 2, TEAL, ["X.", "XX", ".X"]],
  ["s4d", 2, TEAL, [".X", "XX", "X."]],

  // ── big corners ──────────────────────────────────────────────────────
  // Five cells across a 3x3 box. Brutal late, a gift early against an
  // empty corner.
  ["c5a", 3, AMBER, ["X..", "X..", "XXX"]],
  ["c5b", 3, AMBER, ["XXX", "X..", "X.."]],
  ["c5c", 3, AMBER, ["XXX", "..X", "..X"]],
  ["c5d", 3, AMBER, ["..X", "..X", "XXX"]],
];

function parse(spec: ShapeSpec): BlockPiece {
  const [id, weight, color, rows] = spec;
  const h = rows.length;
  const w = rows[0].length;
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < h; r++) {
    if (rows[r].length !== w) {
      throw new Error(`Piece "${id}" is ragged: row ${r} is not ${w} wide`);
    }
    for (let c = 0; c < w; c++) {
      if (rows[r][c] === "X") cells.push({ r, c });
    }
  }
  if (cells.length === 0) throw new Error(`Piece "${id}" is empty`);
  return { id, cells, w, h, color, weight };
}

export const PIECES: readonly BlockPiece[] = SHAPES.map(parse);

export const PIECE_BY_ID: ReadonlyMap<string, BlockPiece> = new Map(
  PIECES.map((p) => [p.id, p]),
);

/** Five cells or more. Only one of these is ever offered at a time. */
export function isLarge(p: BlockPiece): boolean {
  return p.cells.length >= 5;
}

export function toView(p: BlockPiece): BlockBlastPieceView {
  return {
    id: p.id,
    cells: p.cells.map((cell) => ({ ...cell })),
    w: p.w,
    h: p.h,
    color: p.color,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Deterministic drawing
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * mulberry32. Small, fast, and — the only property that matters here —
 * identical on every machine, which `Math.random` is not.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Trays are drawn from `(seed, drawIndex)` rather than from one long stream.
 *
 * This is the whole basis of Race. A shared mutable generator would hand out
 * pieces in the order players happened to ask for them, so a fast player and
 * a slow player would diverge — and the promise "everyone gets the same
 * pieces" would be false in exactly the matches people care about. Deriving
 * each tray from its index instead makes player A's fifth tray identical to
 * player B's fifth tray no matter who got there first.
 */
export function drawTray(seed: number, drawIndex: number, size: number): BlockPiece[] {
  const rng = mulberry32((seed ^ Math.imul(drawIndex + 1, 0x9e3779b1)) >>> 0);
  // Two throwaway draws: adjacent seeds otherwise share a suspiciously
  // similar first output, which would make consecutive trays rhyme.
  rng();
  rng();

  const out: BlockPiece[] = [];
  let largeTaken = false;

  for (let i = 0; i < size; i++) {
    const pool = PIECES.filter((p) => {
      // Three five-cell monsters at once is not a hard tray, it is a dead
      // one — the player has no decision left to make.
      if (largeTaken && isLarge(p)) return false;
      // Two of a kind is a fine tray. Three is a bug report.
      if (out.filter((o) => o.id === p.id).length >= 2) return false;
      return true;
    });
    const picked = pickWeighted(pool, rng());
    if (isLarge(picked)) largeTaken = true;
    out.push(picked);
  }

  return out;
}

function pickWeighted(pool: readonly BlockPiece[], roll: number): BlockPiece {
  const total = pool.reduce((sum, p) => sum + p.weight, 0);
  let target = roll * total;
  for (const p of pool) {
    target -= p.weight;
    if (target < 0) return p;
  }
  // Floating point landed exactly on the end of the last bucket.
  return pool[pool.length - 1];
}

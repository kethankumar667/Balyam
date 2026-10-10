/**
 * A Dots & Boxes bot that plays the endgame the way the game is actually won.
 *
 * The old bot took any box it could, otherwise drew a line that did not hand the opponent a box, and
 * otherwise drew at random. That is fine for the opening and loses the endgame, because the endgame is
 * about CONTROL: when no safe line is left, every move gives boxes away, and the player who is forced to
 * open the first long chain usually loses. A strong player will even decline the last two boxes of a chain
 * (a "double-cross") to hand the move back and keep control of the next one.
 *
 * ── How it plays ─────────────────────────────────────────────────────
 *   1. A box that can be taken is taken.
 *   2. Otherwise a SAFE line (one that does not make a third side) is drawn.
 *   3. When only unsafe lines remain it opens the cheapest chain: the line after which the opponent can
 *      capture the fewest boxes.
 *   4. With two players and few enough lines left (SOLVE_LIMIT), it stops guessing and SOLVES the rest of the
 *      game exactly, which finds the double-cross sacrifices and the right chain to open.
 *
 * Step 4 is exact only for two players; with three or four the bot uses steps 1-3.
 *
 * Pure: it takes the position and returns a line.
 */

export type Kind = "h" | "v";
export interface LineRef {
  kind: Kind;
  r: number;
  c: number;
}

export interface DotsBoxesPosition {
  /** Dots along one edge; there are (size-1)^2 boxes. */
  size: number;
  /** [size][size-1]: a horizontal line from dot (r,c) to (r,c+1), true when drawn. */
  h: readonly (readonly boolean[])[];
  /** [size-1][size]: a vertical line from dot (r,c) to (r+1,c), true when drawn. */
  v: readonly (readonly boolean[])[];
  playerCount: number;
  /** For choosing among equally good safe lines. Defaults to `Math.random`. */
  random?: () => number;
}

/** Solve exactly when this few lines remain (2^16 positions, well under a frame). */
export const SOLVE_LIMIT = 16;

interface Board {
  boxes: number;
  /** Every line, h lines first. */
  lines: LineRef[];
  /** Each box's four line ids. */
  boxLines: number[][];
  /** For each line, the boxes it borders. */
  lineBoxes: number[][];
  drawn: boolean[];
}

function lineId(size: number, kind: Kind, r: number, c: number): number {
  return kind === "h" ? r * (size - 1) + c : size * (size - 1) + r * size + c;
}

function buildBoard(p: DotsBoxesPosition): Board {
  const { size } = p;
  const lines: LineRef[] = [];
  const drawn: boolean[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size - 1; c++) { lines.push({ kind: "h", r, c }); drawn.push(p.h[r][c]); }
  for (let r = 0; r < size - 1; r++) for (let c = 0; c < size; c++) { lines.push({ kind: "v", r, c }); drawn.push(p.v[r][c]); }

  const boxLines: number[][] = [];
  const lineBoxes: number[][] = lines.map(() => []);
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const ids = [lineId(size, "h", r, c), lineId(size, "h", r + 1, c), lineId(size, "v", r, c), lineId(size, "v", r, c + 1)];
      const box = boxLines.length;
      boxLines.push(ids);
      for (const id of ids) lineBoxes[id].push(box);
    }
  }
  return { boxes: boxLines.length, lines, boxLines, lineBoxes, drawn };
}

const sidesDrawn = (b: Board, box: number): number => b.boxLines[box].filter((id) => b.drawn[id]).length;

/** The boxes a line would complete if drawn now. */
function completes(b: Board, id: number): number {
  return b.lineBoxes[id].filter((box) => sidesDrawn(b, box) === 3).length;
}

/** A line is safe when drawing it makes no box reach three sides. */
function isSafe(b: Board, id: number): boolean {
  return b.lineBoxes[id].every((box) => sidesDrawn(b, box) <= 1);
}

/** How many boxes the opponent could take in a row, greedily, after `id` is drawn: the price of that sacrifice. */
function sacrificeCost(b: Board, id: number): number {
  const view: Board = { ...b, drawn: [...b.drawn] };
  view.drawn[id] = true;
  let taken = 0;
  for (let progress = true; progress; ) {
    progress = false;
    for (let line = 0; line < view.lines.length; line++) {
      if (view.drawn[line]) continue;
      const k = completes(view, line);
      if (k > 0) {
        view.drawn[line] = true;
        taken += k;
        progress = true;
      }
    }
  }
  return taken;
}

/** The exact best line for a two-player game: maximises the mover's boxes taken minus boxes given. */
function solveEndgame(b: Board): number {
  const open = b.lines.map((_, i) => i).filter((i) => !b.drawn[i]);
  const bitOf = new Map<number, number>();
  open.forEach((id, bit) => bitOf.set(id, bit));

  // Each unfinished box, as the set of lines (bits over `open`) it still needs.
  const needs: number[] = [];
  for (let box = 0; box < b.boxes; box++) {
    const missing = b.boxLines[box].filter((id) => !b.drawn[id]);
    if (missing.length === 0) continue;
    needs.push(missing.reduce((m, id) => m | (1 << bitOf.get(id)!), 0));
  }

  const full = (1 << open.length) - 1;
  const memo = new Map<number, number>();

  /** Score of drawing `flag` on top of `mask`, for the player drawing it. */
  const scoreOf = (mask: number, flag: number): number => {
    const next = mask | flag;
    let taken = 0;
    for (const need of needs) if ((need & flag) !== 0 && (next & need) === need) taken += 1;
    // Taking a box earns another move for the same player; otherwise the turn passes.
    return taken > 0 ? taken + value(next) : -value(next);
  };

  function value(mask: number): number {
    if (mask === full) return 0;
    const cached = memo.get(mask);
    if (cached !== undefined) return cached;
    let best = -Infinity;
    for (let bit = 0; bit < open.length; bit++) {
      const flag = 1 << bit;
      if (mask & flag) continue;
      best = Math.max(best, scoreOf(mask, flag));
    }
    memo.set(mask, best);
    return best;
  }

  let bestLine = open[0];
  let bestValue = -Infinity;
  for (let bit = 0; bit < open.length; bit++) {
    const score = scoreOf(0, 1 << bit);
    if (score > bestValue) {
      bestValue = score;
      bestLine = open[bit];
    }
  }
  return bestLine;
}

/** The line to draw, or `null` when every line is drawn. */
export function chooseDotsBoxesLine(position: DotsBoxesPosition): LineRef | null {
  const b = buildBoard(position);
  const open = b.lines.map((_, i) => i).filter((i) => !b.drawn[i]);
  if (open.length === 0) return null;
  const random = position.random ?? Math.random;

  // The endgame, solved exactly (two players): this is where control is won or lost.
  if (position.playerCount === 2 && open.length <= SOLVE_LIMIT) return b.lines[solveEndgame(b)];

  // 1. Take a box when one can be taken, preferring the line that takes the most.
  let bestCapture = -1;
  let bestCaptureCount = 0;
  for (const id of open) {
    const k = completes(b, id);
    if (k > bestCaptureCount) {
      bestCaptureCount = k;
      bestCapture = id;
    }
  }
  if (bestCapture >= 0) return b.lines[bestCapture];

  // 2. A safe line, at random among them so the bot is not the same every game.
  const safe = open.filter((id) => isSafe(b, id));
  if (safe.length > 0) return b.lines[safe[Math.floor(random() * safe.length)]];

  // 3. Every line gives something away: give the least.
  let cheapest = open[0];
  let cheapestCost = Infinity;
  for (const id of open) {
    const cost = sacrificeCost(b, id);
    if (cost < cheapestCost) {
      cheapestCost = cost;
      cheapest = id;
    }
  }
  return b.lines[cheapest];
}

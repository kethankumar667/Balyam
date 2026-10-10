import { Chess, type Move, type PieceSymbol } from "chess.js";

/**
 * A chess bot that actually looks ahead.
 *
 * It used to pick a random legal move and prefer captures, and "master" played exactly like "medium".
 * This is a standard alpha-beta search (negamax) over `chess.js` positions with:
 *
 *   evaluation         material plus piece-square tables, so it values centre control, developed pieces
 *                      and advanced pawns, not just who has more
 *   move ordering      captures (most valuable victim first), promotions and checks are tried first, which is
 *                      what makes the pruning effective
 *   iterative deepening  it searches 1 ply, then 2, then 3, keeping the best move from the last COMPLETE depth,
 *                      so a time limit never leaves it with a half-searched answer
 *   quiescence         at the edge of the search it keeps following captures until the position is quiet, so a
 *                      piece that is hanging is always seen (the "horizon effect" is what makes a shallow
 *                      bot give away its queen)
 *   a floor of 1 ply   the clock may stop it going DEEPER, but never before it has tried each of its moves and
 *                      followed the captures after it; without that a slow moment on a busy server makes it
 *                      blunder a piece. (A floor of 2 full plies was tried and cost a second per move in an open
 *                      position, which would freeze every other room.)
 *   mate and draw      a forced mate is scored as far better than any material, and the nearest mate wins
 *
 * ── Why the time budget is the important part ────────────────────────
 * The server is a single thread that also runs every other room. A search that thinks for a second
 * freezes all of them for that second, so each level has a hard budget in milliseconds and the search
 * stops itself the moment it is spent. Strength comes from using that small budget well.
 *
 *   easy     a random legal move that does not throw away a piece for nothing: it looks one reply ahead
 *   medium   up to 2 plies, about 40 ms: sees one-move threats and basic tactics
 *   master   up to 5 plies, about 150 ms: sees combinations and forced mates a few moves deep
 *
 * It searches a COPY of the position, so a bug or a timeout can never leave the live game half-moved.
 */

export type ChessBotDifficulty = "easy" | "medium" | "master";

export interface ChessBotOptions {
  /** Hard cap on thinking time. Defaults per difficulty. */
  budgetMs?: number;
  /** For tie-breaking among equally good moves. Defaults to `Math.random`. */
  random?: () => number;
  /** Clock, injectable so tests do not depend on how fast the machine is. */
  now?: () => number;
}

const LEVELS: Record<ChessBotDifficulty, { maxDepth: number; budgetMs: number }> = {
  easy: { maxDepth: 1, budgetMs: 15 },
  medium: { maxDepth: 2, budgetMs: 40 },
  master: { maxDepth: 5, budgetMs: 150 },
};

const MATE = 100_000;

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/**
 * Piece-square tables, from White's side, rank 8 first. The classic "simplified evaluation" numbers:
 * small nudges that reward good squares.
 */
const PST: Record<PieceSymbol, readonly number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

/** How far a square is from the middle of the board: 0 in the centre, 6 in a corner. */
function centreDistance(row: number, col: number): number {
  return Math.max(3 - Math.min(row, 7 - row), 0) + Math.max(3 - Math.min(col, 7 - col), 0);
}

/**
 * Winning a won game needs a skill material counting does not give: once clearly ahead, drive the enemy
 * king toward the edge and bring your own king close to help. Without it a bot a queen up shuffles forever
 * and never mates. Only applies with a lead of three pawns or more, so it never distorts a close position.
 */
function mopUp(whiteKing: [number, number], blackKing: [number, number], lead: number): number {
  if (Math.abs(lead) < 300) return 0;
  const winnerIsWhite = lead > 0;
  const loser = winnerIsWhite ? blackKing : whiteKing;
  const winner = winnerIsWhite ? whiteKing : blackKing;
  const kingDistance = Math.abs(winner[0] - loser[0]) + Math.abs(winner[1] - loser[1]);
  const bonus = centreDistance(loser[0], loser[1]) * 10 + (14 - kingDistance) * 4;
  return winnerIsWhite ? bonus : -bonus;
}

/** The position's worth to White, in centipawns. */
export function evaluate(chess: Chess): number {
  let score = 0;
  let material = 0;
  let whiteKing: [number, number] = [7, 4];
  let blackKing: [number, number] = [0, 4];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      // White reads the table as written; Black reads it mirrored top to bottom.
      const table = PST[piece.type];
      const positional = piece.color === "w" ? table[r * 8 + c] : table[(7 - r) * 8 + c];
      const worth = VALUE[piece.type] + positional;
      score += piece.color === "w" ? worth : -worth;
      material += piece.color === "w" ? VALUE[piece.type] : -VALUE[piece.type];
      if (piece.type === "k") {
        if (piece.color === "w") whiteKing = [r, c];
        else blackKing = [r, c];
      }
    }
  }
  return score + mopUp(whiteKing, blackKing, material);
}

/** Try the moves most likely to be best first, so the rest can be pruned. */
function orderMoves(moves: Move[]): Move[] {
  return moves
    .map((m) => {
      let order = 0;
      if (m.captured) order += 10 * VALUE[m.captured] - VALUE[m.piece] / 10 + 1_000;
      if (m.promotion) order += VALUE[m.promotion] + 800;
      if (m.san.endsWith("+") || m.san.endsWith("#")) order += 300;
      return { m, order };
    })
    .sort((a, b) => b.order - a.order)
    .map((x) => x.m);
}

class OutOfTime extends Error {}

interface Search {
  /** Stops going deeper (past the minimum depth). */
  softDeadline: number;
  /** Stops everything, even the minimum depth: only a runaway position reaches it. */
  hardDeadline: number;
  /** The depth being searched now. */
  depth: number;
  now: () => number;
  nodes: number;
}

/** The search is never cut short before this many plies, whatever the clock says. */
const MIN_DEPTH = 1;
/** How many times the soft budget the minimum depth may use before it is abandoned as a runaway. */
const HARD_FACTOR = 3;
/** Capture-only extension past the horizon. */
const QUIESCE_DEPTH = 3;

function checkClock(search: Search): void {
  // Reading the clock on every node costs more than it saves; every 64th is plenty of resolution.
  if ((++search.nodes & 63) !== 0) return;
  const limit = search.depth <= MIN_DEPTH ? search.hardDeadline : search.softDeadline;
  if (search.now() > limit) throw new OutOfTime();
}

/** At the edge of the search: follow captures until nothing is hanging, then judge the position. */
function quiesce(chess: Chess, alpha: number, beta: number, ply: number, budget: number, search: Search): number {
  checkClock(search);

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return chess.inCheck() ? -MATE + ply : 0;

  const stand = chess.turn() === "w" ? evaluate(chess) : -evaluate(chess);
  if (budget === 0) return stand;
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;

  // Only captures that are not obviously losing (a queen taking a defended pawn is not worth following), which
  // keeps the extension small enough to be cheap in an open position full of captures.
  const noisy = orderMoves(moves.filter((m) => m.promotion || (m.captured && VALUE[m.captured] + 200 >= VALUE[m.piece])));
  for (const move of noisy) {
    chess.move(move);
    const score = -quiesce(chess, -beta, -alpha, ply + 1, budget - 1, search);
    chess.undo();
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number, search: Search): number {
  checkClock(search);

  if (depth === 0) return quiesce(chess, alpha, beta, ply, QUIESCE_DEPTH, search);

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return chess.inCheck() ? -MATE + ply : 0; // checkmated, or stalemate

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, search);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

interface Scored {
  move: Move;
  score: number;
}

/**
 * The move to play in `position` at the given strength. Never throws on a clock and always returns a
 * legal move (or `null` only when there is none).
 */
export function chooseChessMove(position: Chess, difficulty: ChessBotDifficulty, options: ChessBotOptions = {}): Move | null {
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const level = LEVELS[difficulty] ?? LEVELS.medium;

  const rootMoves = position.moves({ verbose: true });
  if (rootMoves.length === 0) return null;
  if (rootMoves.length === 1) return rootMoves[0];

  // Easy plays a random move, but never one that hands over a piece for nothing: it looks one reply ahead.
  if (difficulty === "easy") {
    const copy = new Chess(position.fen());
    const safe = rootMoves.filter((m) => {
      copy.move(m);
      const bad = copy.moves({ verbose: true }).some((reply) => reply.captured && VALUE[reply.captured] > VALUE[m.captured ?? "p"] + 150);
      copy.undo();
      return !bad;
    });
    const pool = safe.length > 0 ? safe : rootMoves;
    return pool[Math.floor(random() * pool.length)];
  }

  const copy = new Chess(position.fen());
  const budget = options.budgetMs ?? level.budgetMs;
  const startedAt = now();
  const search: Search = { softDeadline: startedAt + budget, hardDeadline: startedAt + Math.max(budget, 1) * HARD_FACTOR, depth: 1, now, nodes: 0 };
  // Medium varies among near-equal moves, so it is not identical every game; master barely does.
  const slack = difficulty === "medium" ? 12 : 3;
  let ordered = orderMoves(rootMoves);
  let best: Move = ordered[0];

  try {
    for (let depth = 1; depth <= level.maxDepth; depth++) {
      search.depth = depth;
      const scored: Scored[] = [];
      let top = -Infinity;
      for (const move of ordered) {
        // A window just wide enough that every move within `slack` of the best is scored EXACTLY. A move outside
        // it is cut off early and reports only a bound, which is fine because it is never chosen.
        const floor = top === -Infinity ? -Infinity : top - slack - 1;
        copy.move(move);
        const score = -negamax(copy, depth - 1, -Infinity, -floor, 1, search);
        copy.undo();
        scored.push({ move, score });
        if (score > top) top = score;
      }
      // This depth finished, so its answer is trustworthy.
      const near = scored.filter((s) => (top >= MATE / 2 ? s.score === top : s.score >= top - slack));
      best = near[Math.floor(random() * near.length)].move;
      // Look at the best moves first on the next, deeper pass.
      ordered = [...scored].sort((a, b) => b.score - a.score).map((s) => s.move);
      if (top >= MATE - 50) break; // a forced mate is found, so there is nothing left to improve
    }
  } catch (err) {
    if (!(err instanceof OutOfTime)) throw err;
    // Out of time mid-depth: keep the answer from the last depth that finished.
  }
  return best;
}

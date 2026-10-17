import type { VamanaBotDifficulty } from "@shared/types.js";
import { legalPits, seedsOnSide, simulateSow, type Pits, type Side } from "./vamanaBoard.js";

/**
 * Search budget in visited NODES, not milliseconds. A wall-clock limit would make a bot's strength
 * depend on how busy the server is (and its moves irreproducible in tests); a node count is
 * deterministic, and bounds the work a single bot move can cost. `easy` never searches.
 *
 * A search runs synchronously on the server's only thread, so the budgets are sized to keep even
 * `pro` to a small fraction of a second (see the timing test) — a bot must never stall other rooms.
 */
export const BOT_NODE_BUDGET: Readonly<Record<VamanaBotDifficulty, number>> = {
  easy: 0,
  medium: 3_000,
  pro: 30_000,
};

const MAX_SEARCH_DEPTH: Readonly<Record<VamanaBotDifficulty, number>> = { easy: 0, medium: 3, pro: 6 };

/** Seeds sitting on your own row are not yet yours, but they are worth a little: they are likely to end up so. */
const OWN_ROW_WEIGHT = 0.25;

const opposite = (side: Side): Side => (side === 0 ? 1 : 0);

const captureOf = (pits: Pits, pit: number): number => simulateSow(pits, pit).capture?.seeds ?? 0;

/**
 * The pit the server plays for a HUMAN whose turn clock ran out: the one that captures the most right
 * now, lowest pit first on a tie. Deliberately modest (one move deep) so that stalling never pays.
 */
export function chooseFallbackPit(pits: Pits, side: Side): number | null {
  let best: number | null = null;
  let bestCapture = -1;
  for (const pit of legalPits(pits, side)) {
    const capture = captureOf(pits, pit);
    if (capture > bestCapture) {
      best = pit;
      bestCapture = capture;
    }
  }
  return best;
}

interface SearchBudget {
  nodes: number;
  readonly limit: number;
}

/**
 * Value of the position for `side` to move: the seeds it will out-capture the other side by from here
 * on (negamax with alpha-beta). When the side to move has no seeds the match is over and the other
 * side keeps everything left on its own row.
 */
function search(pits: Pits, side: Side, depth: number, alpha: number, beta: number, budget: SearchBudget): number {
  const moves = legalPits(pits, side);
  const other = opposite(side);
  if (moves.length === 0) return -seedsOnSide(pits, other);

  budget.nodes += 1;
  if (depth === 0 || budget.nodes >= budget.limit) {
    return OWN_ROW_WEIGHT * (seedsOnSide(pits, side) - seedsOnSide(pits, other));
  }

  let best = Number.NEGATIVE_INFINITY;
  let low = alpha;
  for (const pit of moves) {
    const result = simulateSow(pits, pit);
    const gain = result.capture?.seeds ?? 0;
    const score = gain - search(result.pits, other, depth - 1, gain - beta, gain - low, budget);
    if (score > best) best = score;
    if (best > low) low = best;
    if (low >= beta) break;
  }
  return best;
}

/**
 * The pit a BOT seat plays.
 *   easy   — any legal pit, at random
 *   medium — a shallow look-ahead
 *   pro    — a deeper look-ahead
 * Equal-scoring pits are chosen among at random, so a seeded game is reproducible but not monotone.
 */
export function chooseBotPit(
  pits: Pits,
  side: Side,
  difficulty: VamanaBotDifficulty,
  random: () => number,
): number | null {
  const moves = legalPits(pits, side);
  if (moves.length === 0) return null;
  if (difficulty === "easy") return moves[Math.floor(random() * moves.length)];

  const budget: SearchBudget = { nodes: 0, limit: BOT_NODE_BUDGET[difficulty] };
  const depth = MAX_SEARCH_DEPTH[difficulty];
  const other = opposite(side);

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestPits: number[] = [];
  for (const pit of moves) {
    const result = simulateSow(pits, pit);
    const gain = result.capture?.seeds ?? 0;
    const score = gain - search(result.pits, other, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, budget);
    if (score > bestScore) {
      bestScore = score;
      bestPits = [pit];
    } else if (score === bestScore) {
      bestPits.push(pit);
    }
  }
  return bestPits[Math.floor(random() * bestPits.length)];
}

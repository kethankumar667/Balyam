import type { VamanaCapture, VamanaLift } from "@shared/types.js";
import {
  VAMANA_MAX_LIFTS_PER_TURN,
  VAMANA_PIT_COUNT,
  VAMANA_PITS_PER_SIDE,
  VAMANA_SEEDS_PER_PIT,
} from "@shared/types.js";

/** Seeds in each of the 14 pits. Always treated as immutable: every function returns a new array. */
export type Pits = readonly number[];

/** 0 = the seat that moves first (pits 0..6), 1 = the seat that moves second (pits 7..13). */
export type Side = 0 | 1;

export interface SowResult {
  pits: number[];
  /** Every pit lifted this turn, in order. The first is the pit the player chose. */
  lifts: VamanaLift[];
  capture: VamanaCapture | null;
  /** True when the turn hit the lift cap and was ended with no capture. */
  truncated: boolean;
}

export const createPits = (): number[] => Array.from({ length: VAMANA_PIT_COUNT }, () => VAMANA_SEEDS_PER_PIT);

export const totalSeeds = (pits: Pits): number => pits.reduce((sum, count) => sum + count, 0);

export const nextPit = (pit: number): number => (pit + 1) % VAMANA_PIT_COUNT;

export const ownerSide = (pit: number): Side => (pit < VAMANA_PITS_PER_SIDE ? 0 : 1);

export const sidePits = (side: Side): number[] =>
  Array.from({ length: VAMANA_PITS_PER_SIDE }, (_, index) => side * VAMANA_PITS_PER_SIDE + index);

export const seedsOnSide = (pits: Pits, side: Side): number =>
  sidePits(side).reduce((sum, pit) => sum + pits[pit], 0);

/** A pit is a whole board position. Rejects NaN, fractions, strings and anything outside 0..13. */
export const isPitNumber = (pit: unknown): pit is number =>
  typeof pit === "number" && Number.isInteger(pit) && pit >= 0 && pit < VAMANA_PIT_COUNT;

/** A move is legal only on a NON-EMPTY pit on the mover's OWN row. */
export function isLegalPit(pits: Pits, side: Side, pit: unknown): pit is number {
  return isPitNumber(pit) && ownerSide(pit) === side && pits[pit] > 0;
}

export const legalPits = (pits: Pits, side: Side): number[] => sidePits(side).filter((pit) => pits[pit] > 0);

/**
 * One whole turn from `startPit`, on a COPY of the board.
 *
 * The seeds of the chosen pit are sown one per pit, counter-clockwise. Then, looking at the pit
 * after the last seed:
 *   - occupied  -> lift all of its seeds and keep sowing from the pit after it (a "relay")
 *   - empty     -> the turn ends and the pit AFTER the empty one is captured (nothing if it is empty too)
 *
 * `maxLifts` bounds how many pits one turn may lift; reaching it ends the turn with no capture.
 */
export function simulateSow(pits: Pits, startPit: number, maxLifts: number = VAMANA_MAX_LIFTS_PER_TURN): SowResult {
  const board = [...pits];
  const lifts: VamanaLift[] = [];

  let seeds = board[startPit];
  board[startPit] = 0;
  lifts.push({ pit: startPit, seeds });
  let pit = startPit;

  for (;;) {
    for (let placed = 0; placed < seeds; placed++) {
      pit = nextPit(pit);
      board[pit] += 1;
    }

    const following = nextPit(pit);
    if (board[following] === 0) {
      const target = nextPit(following);
      const captured = board[target];
      board[target] = 0;
      return { pits: board, lifts, capture: captured > 0 ? { pit: target, seeds: captured } : null, truncated: false };
    }

    if (lifts.length >= maxLifts) return { pits: board, lifts, capture: null, truncated: true };

    seeds = board[following];
    board[following] = 0;
    lifts.push({ pit: following, seeds });
    pit = following;
  }
}

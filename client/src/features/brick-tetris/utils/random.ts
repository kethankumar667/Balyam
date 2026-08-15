import type { ClassicPieceType, PentixPieceType, PieceType, GameMode } from "../types";

/**
 * Deterministic Mulberry32 32-bit PRNG
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CLASSIC_PIECE_BAG: readonly ClassicPieceType[] = [
  "I",
  "J",
  "L",
  "O",
  "S",
  "T",
  "Z",
];

export const PENTIX_PIECE_BAG: readonly PentixPieceType[] = [
  "F",
  "I5",
  "L5",
  "P",
  "N",
  "T5",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z5",
];

/**
 * Fisher-Yates shuffle using deterministic random generator
 */
export function generateShuffledBag(mode: GameMode, rng: () => number): PieceType[] {
  const source: PieceType[] = mode === "CLASSIC" ? [...CLASSIC_PIECE_BAG] : [...PENTIX_PIECE_BAG];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = source[i];
    source[i] = source[j];
    source[j] = temp;
  }
  return source;
}

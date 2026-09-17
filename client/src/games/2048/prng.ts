/**
 * Deterministic Pseudo-Random Number Generator (PRNG) for 2048 Daily Puzzle
 *
 * Uses the Mulberry32 algorithm — lightweight, fast, 32-bit state, perfect
 * for deterministic tile drops so every player worldwide gets the exact same
 * board progression for a given day.
 */

export function createDateSeed(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const numStr = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

  let hash = 0;
  for (let i = 0; i < numStr.length; i++) {
    hash = (hash * 31 + numStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

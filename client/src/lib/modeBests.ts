/**
 * Personal bests a solo game keeps ON THE DEVICE, one per leaderboard mode.
 *
 * Retro Cricket and Retro Snake used to keep a single overall `highScore`, and the leaderboard page
 * showed it under every mode, so a 140-run ten-over innings appeared as the best of the one-over mode too.
 * These are only the optimistic copy shown before the server's scorecard arrives; the scorecard stays
 * the record.
 */
export type ModeBests = Readonly<Record<string, number>>;

const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);

/** `bests` with `score` folded in for `modeId`: a new object, and only ever a higher number for a mode. */
export function withModeBest(bests: ModeBests | undefined, modeId: string, score: number): ModeBests {
  const previous = bests !== undefined && hasOwn(bests, modeId) ? bests[modeId] : undefined;
  return { ...bests, [modeId]: typeof previous === "number" && previous > score ? previous : score };
}

/** The stored best for `modeId`, or null when there is none worth showing. Tolerates any stored shape. */
export function readModeBest(bests: unknown, modeId: string): number | null {
  if (typeof bests !== "object" || bests === null || !hasOwn(bests, modeId)) return null;
  const value = (bests as Record<string, unknown>)[modeId];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

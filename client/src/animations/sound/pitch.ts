/**
 * Small random pitch offset around 1.0 so repeated plays of the same
 * Howler sample (whoosh, smack, boing…) don't sound like a stuck loop —
 * the guide's "layered sound… pitch variation" requirement, applied at
 * the call site via `play(key, { rate: pitchVariant() })`.
 *
 * `spread` is the max deviation each way — `pitchVariant(0.08)` samples
 * from `[0.92, 1.08]`. Kept subtle by default: audible variety, not a
 * chipmunk effect.
 */
export function pitchVariant(spread = 0.08): number {
  return 1 + (Math.random() * 2 - 1) * spread;
}

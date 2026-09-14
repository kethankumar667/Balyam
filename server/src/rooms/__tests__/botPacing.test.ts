import { describe, it, expect } from "vitest";
import { genericBotThinkDelayMs } from "../botPacing.js";

/**
 * Pins the platform-default bot delay's math directly, the same way
 * shared/ludo-pacing.ts's own botThinkMs is pinned in
 * games/ludo/__tests__/pacing.test.ts — a seeded `rng` makes every branch
 * deterministic instead of asserting loose ranges over real randomness.
 */
describe("genericBotThinkDelayMs", () => {
  it("stays within the base 1000-2800ms band when the long-think roll misses", () => {
    // rng() sequence: 0.5 for the base jitter, then 0.9 for the long-think
    // gate (>= 0.15 chance threshold, so no long-think branch is taken).
    const calls = [0.5, 0.9];
    let i = 0;
    const rng = () => calls[i++];
    expect(genericBotThinkDelayMs(rng)).toBeCloseTo(1000 + 0.5 * 1800, 5); // 1900
  });

  it("adds the long-think pause when that roll hits (~15% of the time)", () => {
    // rng() sequence: 0.5 base jitter, 0.1 long-think gate (hits, < 0.15),
    // 0.5 long-think jitter.
    const calls = [0.5, 0.1, 0.5];
    let i = 0;
    const rng = () => calls[i++];
    const expected = (1000 + 0.5 * 1800) + (1200 + 0.5 * 1800);
    expect(genericBotThinkDelayMs(rng)).toBeCloseTo(expected, 5); // 1900 + 2100 = 4000
  });

  it("never returns below the 1000ms floor or exceeds the ~4800ms ceiling", () => {
    for (let i = 0; i < 500; i++) {
      const delay = genericBotThinkDelayMs();
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1000 + 1800 + 1200 + 1800);
    }
  });

  it("is NOT flat — real sampling produces meaningfully different values, unlike the old 1200-2000ms band", () => {
    const samples = Array.from({ length: 50 }, () => genericBotThinkDelayMs());
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    // The old platform default's entire range was 800ms wide (1200-2000).
    // A healthy sample from the new distribution should spread well beyond
    // that in the vast majority of runs (extremely unlikely to flake, given
    // the base range alone is already 1800ms wide).
    expect(max - min).toBeGreaterThan(800);
  });
});

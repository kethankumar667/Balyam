import { describe, expect, it } from "vitest";
import { bandFor } from "../VyomaYudhEngine.js";
import { DEFAULT_VYOMAYUDH_OPTIONS } from "@shared/types.js";

/**
 * Difficulty bands.
 *
 * Levels used to differ only by `spawnEveryTicks - level` plus a boss HP
 * bump, and the enemy table stopped changing after level 3 — so levels 4
 * through 8 drew from the SAME pool and played almost identically. Nothing
 * failed; the back half of a run was just flat.
 *
 * That is the failure worth pinning: a curve that quietly stops curving
 * looks fine in every test that only asks "does the game run".
 */

describe("band boundaries", () => {
  it("splits the ten levels into patrol, assault and siege", () => {
    expect([1, 2, 3].map(bandFor)).toEqual([0, 0, 0]);
    expect([4, 5, 6, 7].map(bandFor)).toEqual([1, 1, 1, 1]);
    expect([8, 9, 10].map(bandFor)).toEqual([2, 2, 2]);
  });

  it("covers every shipped level", () => {
    // A level past the last band boundary must not fall through to a
    // gentler band than the one before it.
    for (let lv = 1; lv <= DEFAULT_VYOMAYUDH_OPTIONS.levels; lv++) {
      const b = bandFor(lv);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(2);
    }
  });

  it("never goes backwards as levels deepen", () => {
    // The whole point of a curve. If a later level ever returned a gentler
    // band than an earlier one, difficulty would dip mid-run.
    let prev = bandFor(1);
    for (let lv = 2; lv <= 12; lv++) {
      const b = bandFor(lv);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });

  it("keeps levels beyond the configured maximum in the hardest band", () => {
    // Guards a host raising `levels` above 10 in options.
    expect(bandFor(11)).toBe(2);
    expect(bandFor(50)).toBe(2);
  });
});

describe("the shipped configuration", () => {
  it("runs ten levels", () => {
    expect(DEFAULT_VYOMAYUDH_OPTIONS.levels).toBe(10);
  });

  it("reaches every band", () => {
    // A level count that stopped short of 8 would leave the siege band —
    // the heaviest content in the game — unreachable in a default match.
    const reached = new Set(
      Array.from({ length: DEFAULT_VYOMAYUDH_OPTIONS.levels }, (_, i) => bandFor(i + 1)),
    );
    expect([...reached].sort()).toEqual([0, 1, 2]);
  });
});

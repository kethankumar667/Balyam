import { describe, it, expect } from "vitest";
import {
  GAME_LIMITS,
  GAME_PREFERRED_ORIENTATION,
  GAME_START_REQUIREMENTS,
  getGamePreferredOrientation,
  type BhalyamGameSlug,
} from "@shared/catalog";

/**
 * Guard against the exact drift this feature was built to fix.
 *
 * `Room.tsx` used to carry its own `orientationForGame()` that hardcoded
 * `rummy → landscape` and everything else to `"any"` — while
 * `GAME_START_REQUIREMENTS` already declared UNO landscape too. Two tables,
 * one of them wrong, and nothing failing. Now there is one table, and these
 * tests fail the moment a game is added without an entry or the two tables
 * disagree about who needs landscape.
 */

// Browser-only retro slugs: real routes, but no server GameKind and so no
// entry in GAME_LIMITS.
const BROWSER_ONLY_SLUGS: BhalyamGameSlug[] = [
  "nokiacricket",
  "brickblocks",
  "tetris",
  "breakout",
];

describe("GAME_PREFERRED_ORIENTATION", () => {
  it("covers every server game kind", () => {
    for (const kind of Object.keys(GAME_LIMITS) as BhalyamGameSlug[]) {
      expect(GAME_PREFERRED_ORIENTATION[kind], `missing orientation for "${kind}"`).toBeDefined();
    }
  });

  it("covers every browser-only retro slug", () => {
    for (const slug of BROWSER_ONLY_SLUGS) {
      expect(GAME_PREFERRED_ORIENTATION[slug], `missing orientation for "${slug}"`).toBeDefined();
    }
  });

  it("declares rummy and uno — and only those — as landscape", () => {
    const landscape = Object.entries(GAME_PREFERRED_ORIENTATION)
      .filter(([, orientation]) => orientation === "landscape")
      .map(([slug]) => slug)
      .sort();

    expect(landscape).toEqual(["rummy", "uno"]);
  });

  it("agrees with the hard preflight gate wherever that gate applies", () => {
    // The hard gate (which blocks match start until the player rotates) is a
    // strict subset of the soft display preference. Any game the server will
    // block on MUST prefer that same orientation, or we would be locking the
    // screen one way while the server demands the other.
    for (const [kind, requirements] of Object.entries(GAME_START_REQUIREMENTS)) {
      if (!requirements.requiresOrientation) continue;
      expect(
        GAME_PREFERRED_ORIENTATION[kind as BhalyamGameSlug],
        `"${kind}" is gated on ${requirements.requiresOrientation} but prefers something else`,
      ).toBe(requirements.requiresOrientation);
    }
  });

  it("falls back to portrait for an unknown slug rather than throwing", () => {
    expect(getGamePreferredOrientation("not-a-game" as BhalyamGameSlug)).toBe("portrait");
  });
});

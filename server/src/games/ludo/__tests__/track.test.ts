import { describe, it, expect } from "vitest";
import type { LudoColor, Player } from "@shared/types.js";
import { LudoEngine } from "../LudoEngine.js";
import {
  CELLS_PER_WEDGE,
  colorStartFor,
  divertOffsetFor,
  lastTrackPosFor,
  safeSquaresFor,
  trackLengthFor,
  wedgeCountFor,
} from "../track.js";

/**
 * Two rules that were wrong in ways no existing test could see, because both
 * are about the relationship between the engine's flat track INDEX and the
 * board a player actually looks at.
 */

describe("cross board (2-4 players) diverts two cells before its start", () => {
  /**
   * The 15x15 cross board's home lane is fed by the cell TWO before a color's
   * start. The cell ONE before sits on the outer edge, orthogonally adjacent
   * to the start square and NOT to the lane — a token diverting there had to
   * jump diagonally across a live track square to reach stretch[0].
   *
   * Verified against client/src/games/ludo/board-layout.ts: for all four
   * colors, start-2 is Manhattan-distance 1 from stretch[0] and start-1 is 2.
   * That is the routing error the player drew on their board screenshot.
   */
  it("uses a divert offset of 2, giving the canonical 57-step journey", () => {
    for (const pc of [2, 3, 4]) {
      expect(divertOffsetFor(pc)).toBe(2);
      const tl = trackLengthFor(pc);
      expect(tl).toBe(52);
      const start = colorStartFor("red", pc);
      const last = lastTrackPosFor("red", pc);
      // Ring cells travelled from the start square, inclusive, then 6 stretch.
      const ringSteps = (last - start + tl) % tl;
      expect(ringSteps).toBe(50);
      expect(ringSteps + 1 + 6).toBe(57);
    }
  });

  it("never lets a token reach its own start square again", () => {
    // start-1 IS reachable-then-onto-start; start-2 is the last legal cell.
    for (const color of ["red", "green", "yellow", "blue"] as const) {
      const start = colorStartFor(color, 4);
      expect(lastTrackPosFor(color, 4)).toBe((start + 50) % 52);
    }
  });
});

describe("polygon boards (5-8 players) keep their own divert offset", () => {
  // Their arm layout is 6 out-column + tip + 6 in-column, and start-1 IS the
  // in-column's outermost cell beside the lane. Changing the cross board must
  // not disturb this.
  it("still diverts one cell before the start", () => {
    for (const pc of [5, 6, 7, 8]) {
      expect(divertOffsetFor(pc)).toBe(1);
      const tl = trackLengthFor(pc);
      const start = colorStartFor("red", pc);
      expect(lastTrackPosFor("red", pc)).toBe((start + tl - 1) % tl);
    }
  });
});

describe("every drawn star is safe for everyone", () => {
  /**
   * Safety used to be scoped to the colors actually seated, but the board
   * always draws a full set of wedges — a 2-player cross board still shows
   * four arms and eight stars. A token parked on a star belonging to an
   * absent color could be captured, which is the exact opposite of what the
   * star means.
   */
  it("covers all wedges regardless of who is seated", () => {
    for (const pc of [2, 3, 4, 5, 6, 7, 8]) {
      const wedges = wedgeCountFor(pc);
      const tl = trackLengthFor(pc);
      // Same answer whether we claim one color is active or all eight.
      const few = safeSquaresFor(["red"], pc);
      const many = safeSquaresFor(
        ["red", "green", "yellow", "blue", "purple", "cyan", "orange", "brown"],
        pc,
      );
      expect([...few].sort((a, b) => a - b)).toEqual([...many].sort((a, b) => a - b));
      expect(few.size).toBe(wedges * 2);
      for (let w = 0; w < wedges; w++) {
        expect(few.has(w * CELLS_PER_WEDGE)).toBe(true);
        expect(few.has((w * CELLS_PER_WEDGE + 8) % tl)).toBe(true);
      }
    }
  });

  it("a two-player game still protects the empty colors' stars", () => {
    const safe = safeSquaresFor(["red", "yellow"], 2);
    // green's start (13) and blue's start (39) are drawn on the board even
    // though nobody is sitting there.
    expect(safe.has(13)).toBe(true);
    expect(safe.has(39)).toBe(true);
  });
});

// ── Color assignment ──────────────────────────────────────────────────────
// Rules: a chosen color is honored exactly; everyone else (bots, and humans
// who never opened the picker) draws at random from what is left; the pool is
// the BOARD's arms, not the player count, so a small game can still pick any
// color and the unused arms stay empty.
describe("Ludo color assignment", () => {
  const seat = (i: number, chosen?: LudoColor, isBot = false): Player =>
    ({
      id: `p${i}`,
      name: `P${i}`,
      isHost: i === 0,
      isReady: true,
      isConnected: true,
      isBot,
      chosenColor: chosen,
    }) as Player;

  const colorsOf = (e: LudoEngine) => e.getPublicState().playerColors;

  it("honors a 2-player game's picks exactly, leaving the other arms empty", () => {
    // The old pool was slice(0, 2) = [red, green], so picking blue/yellow
    // silently became red/green and every 2-player board looked the same.
    const e = new LudoEngine();
    e.init([seat(0, "blue"), seat(1, "yellow")]);
    const c = colorsOf(e);
    expect(c["p0"]).toBe("blue");
    expect(c["p1"]).toBe("yellow");
    // Only two of the four arms are occupied — red and green stay pale.
    expect(Object.values(c).sort()).toEqual(["blue", "yellow"]);
  });

  it("gives the human their pick and draws the bots' colors randomly", () => {
    const e = new LudoEngine();
    e.setRng(() => 0.99);
    e.init([seat(0, "yellow"), seat(1, undefined, true), seat(2, undefined, true), seat(3, undefined, true)]);
    const c = colorsOf(e);
    expect(c["p0"]).toBe("yellow");
    // Everyone got a distinct color, and nobody else took yellow.
    const all = Object.values(c);
    expect(new Set(all).size).toBe(4);
    expect(all.filter((x) => x === "yellow")).toHaveLength(1);
  });

  it("assigns all four at random when nobody picks", () => {
    const e = new LudoEngine();
    e.init([seat(0), seat(1), seat(2), seat(3)]);
    const all = Object.values(colorsOf(e));
    expect(new Set(all).size).toBe(4);
    expect([...all].sort()).toEqual(["blue", "green", "red", "yellow"]);
  });

  it("is actually random, not canonical order, across many unchosen games", () => {
    // Guards the real complaint: red/green/yellow/blue in that order, every
    // single game. Seeded so the test itself cannot flake.
    let s = 7;
    const lcg = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const e = new LudoEngine();
      e.setRng(lcg);
      e.init([seat(0), seat(1), seat(2), seat(3)]);
      const c = colorsOf(e);
      seen.add(["p0", "p1", "p2", "p3"].map((p) => c[p]).join(","));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

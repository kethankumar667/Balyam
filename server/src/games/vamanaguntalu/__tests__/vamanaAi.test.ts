import { describe, expect, it } from "vitest";
import { VAMANA_BOT_DIFFICULTIES, VAMANA_TOTAL_SEEDS } from "@shared/types.js";
import { BOT_NODE_BUDGET, chooseBotPit, chooseFallbackPit } from "../vamanaAi.js";
import { createPits, legalPits, seedsOnSide, simulateSow } from "../vamanaBoard.js";
import { board, mulberry32 } from "./vamanaTestUtils.js";

/** One pit (0) captures 9 seeds; the only other pit (6) captures nothing. */
const BIG_CAPTURE = board({ 0: 2, 4: 9, 6: 1, 10: 3 });

describe("chooseFallbackPit — what the server plays for a human whose clock ran out", () => {
  it("takes the pit that captures the most", () => {
    expect(chooseFallbackPit(BIG_CAPTURE, 0)).toBe(0);
  });

  it("breaks ties toward the lowest pit so the choice is predictable", () => {
    // Pit 2 relays through pit 4 and pit 4 sows into 5; neither ends in a capture, so it is a true 0-0 tie.
    const pits = board({ 2: 1, 4: 1, 9: 4 });
    expect(simulateSow(pits, 2).capture).toBeNull();
    expect(simulateSow(pits, 4).capture).toBeNull();
    expect(chooseFallbackPit(pits, 0)).toBe(2);
  });

  it("returns null when the side has no seeds", () => {
    expect(chooseFallbackPit(board({ 9: 4 }), 0)).toBeNull();
  });

  it("plays for the second side too", () => {
    const pits = board({ 7: 2, 11: 9, 13: 1, 3: 3 });
    expect(chooseFallbackPit(pits, 1)).toBe(7);
  });

  it("does not modify the board", () => {
    const pits = createPits();
    const copy = [...pits];
    chooseFallbackPit(pits, 0);
    expect(pits).toEqual(copy);
  });
});

describe("chooseBotPit", () => {
  it("always returns a legal pit of its own row, at every difficulty", () => {
    for (const difficulty of VAMANA_BOT_DIFFICULTIES) {
      for (const side of [0, 1] as const) {
        const pit = chooseBotPit(createPits(), side, difficulty, mulberry32(3));
        expect(pit).not.toBeNull();
        expect(legalPits(createPits(), side)).toContain(pit as number);
      }
    }
  });

  it("returns null when it has no seeds", () => {
    for (const difficulty of VAMANA_BOT_DIFFICULTIES) {
      expect(chooseBotPit(board({ 9: 4 }), 0, difficulty, mulberry32(1))).toBeNull();
    }
  });

  it("takes the big capture at medium and pro", () => {
    expect(chooseBotPit(BIG_CAPTURE, 0, "medium", mulberry32(1))).toBe(0);
    expect(chooseBotPit(BIG_CAPTURE, 0, "pro", mulberry32(1))).toBe(0);
  });

  it("is reproducible: the same seed gives the same choice", () => {
    for (const difficulty of VAMANA_BOT_DIFFICULTIES) {
      const a = chooseBotPit(createPits(), 0, difficulty, mulberry32(99));
      const b = chooseBotPit(createPits(), 0, difficulty, mulberry32(99));
      expect(a).toBe(b);
    }
  });

  it("easy varies its choice with the seed rather than always playing the same pit", () => {
    const picks = new Set<number | null>();
    for (let seed = 1; seed <= 40; seed++) picks.add(chooseBotPit(createPits(), 0, "easy", mulberry32(seed)));
    expect(picks.size).toBeGreaterThan(2);
  });

  it("pro beats easy over a series of full games (strength is real, and ordered)", () => {
    let proWins = 0;
    let easyWins = 0;
    for (let game = 0; game < 10; game++) {
      const proIsFirst = game % 2 === 0;
      let pits = createPits();
      const captured: [number, number] = [0, 0];
      let side: 0 | 1 = 0;
      const random = mulberry32(1000 + game);
      for (let move = 0; move < 1_500; move++) {
        if (seedsOnSide(pits, side) === 0) {
          captured[0] += seedsOnSide(pits, 0);
          captured[1] += seedsOnSide(pits, 1);
          break;
        }
        const isPro = (side === 0) === proIsFirst;
        const pit = chooseBotPit(pits, side, isPro ? "pro" : "easy", random) as number;
        const result = simulateSow(pits, pit);
        pits = result.pits;
        captured[side] += result.capture?.seeds ?? 0;
        side = side === 0 ? 1 : 0;
      }
      const proTotal = captured[proIsFirst ? 0 : 1];
      const easyTotal = captured[proIsFirst ? 1 : 0];
      expect(proTotal + easyTotal).toBe(VAMANA_TOTAL_SEEDS);
      if (proTotal > easyTotal) proWins += 1;
      else if (easyTotal > proTotal) easyWins += 1;
    }
    expect(proWins).toBeGreaterThan(easyWins);
  });

  it("keeps the search inside a published node budget so one bot move cannot stall the server", () => {
    expect(BOT_NODE_BUDGET.easy).toBe(0);
    expect(BOT_NODE_BUDGET.medium).toBeGreaterThan(0);
    expect(BOT_NODE_BUDGET.pro).toBeGreaterThan(BOT_NODE_BUDGET.medium);
    const started = Date.now();
    chooseBotPit(createPits(), 0, "pro", mulberry32(5));
    expect(Date.now() - started).toBeLessThan(1_500);
  });
});

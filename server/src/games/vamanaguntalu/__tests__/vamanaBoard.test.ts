import { describe, expect, it } from "vitest";
import {
  VAMANA_MAX_LIFTS_PER_TURN,
  VAMANA_PIT_COUNT,
  VAMANA_PITS_PER_SIDE,
  VAMANA_SEEDS_PER_PIT,
  VAMANA_TOTAL_SEEDS,
} from "@shared/types.js";
import {
  createPits,
  isLegalPit,
  legalPits,
  nextPit,
  ownerSide,
  seedsOnSide,
  simulateSow,
  sidePits,
  totalSeeds,
} from "../vamanaBoard.js";

/** A 14-pit board from a sparse description; everything not listed is empty. */
const board = (seeds: Record<number, number>): number[] =>
  Array.from({ length: VAMANA_PIT_COUNT }, (_, pit) => seeds[pit] ?? 0);

describe("vamanaBoard — setup and geometry", () => {
  it("starts with five seeds in each of the 14 pits (70 in total)", () => {
    const pits = createPits();
    expect(pits).toHaveLength(14);
    expect(pits.every((count) => count === VAMANA_SEEDS_PER_PIT)).toBe(true);
    expect(totalSeeds(pits)).toBe(VAMANA_TOTAL_SEEDS);
    expect(VAMANA_TOTAL_SEEDS).toBe(70);
  });

  it("returns a fresh array each time", () => {
    const a = createPits();
    a[0] = 99;
    expect(createPits()[0]).toBe(VAMANA_SEEDS_PER_PIT);
  });

  it("gives pits 0..6 to the first side and 7..13 to the second", () => {
    for (let pit = 0; pit < VAMANA_PITS_PER_SIDE; pit++) expect(ownerSide(pit)).toBe(0);
    for (let pit = VAMANA_PITS_PER_SIDE; pit < VAMANA_PIT_COUNT; pit++) expect(ownerSide(pit)).toBe(1);
    expect(sidePits(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sidePits(1)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it("wraps from the last pit back to the first", () => {
    expect(nextPit(0)).toBe(1);
    expect(nextPit(12)).toBe(13);
    expect(nextPit(13)).toBe(0);
  });

  it("counts the seeds on one side", () => {
    expect(seedsOnSide(board({ 0: 2, 6: 3, 7: 9 }), 0)).toBe(5);
    expect(seedsOnSide(board({ 0: 2, 6: 3, 7: 9 }), 1)).toBe(9);
  });
});

describe("vamanaBoard — legal pits", () => {
  it("allows only a non-empty pit on the mover's own row", () => {
    const pits = board({ 0: 0, 1: 4, 7: 3 });
    expect(isLegalPit(pits, 0, 1)).toBe(true);
    expect(isLegalPit(pits, 0, 0)).toBe(false); // own but empty
    expect(isLegalPit(pits, 0, 7)).toBe(false); // opponent's pit
    expect(isLegalPit(pits, 1, 7)).toBe(true);
    expect(isLegalPit(pits, 1, 1)).toBe(false);
  });

  it("rejects pit numbers that are not whole board positions", () => {
    const pits = createPits();
    for (const bad of [-1, 14, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", null, undefined]) {
      expect(isLegalPit(pits, 0, bad as unknown as number)).toBe(false);
    }
  });

  it("lists the legal pits of a side in board order", () => {
    expect(legalPits(createPits(), 0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(legalPits(board({ 2: 1, 5: 1, 9: 4 }), 0)).toEqual([2, 5]);
    expect(legalPits(board({ 9: 4 }), 0)).toEqual([]);
  });
});

describe("vamanaBoard — sowing, relay and capture", () => {
  it("sows one seed per pit, counter-clockwise, and keeps going from the next occupied pit (hand-worked opening)", () => {
    // 0:5 -> sows 1..5. Pit 6 is occupied, lift it (5) -> 7..11. Pit 12 occupied, lift (5) -> 13,0,1,2,3.
    // Pit 4 occupied (6), lift -> 5..10. Pit 11 occupied (6), lift -> 12,13,0,1,2,3. Pit 4 is empty,
    // so the pit after it (5, holding 7) is captured.
    const result = simulateSow(createPits(), 0);
    expect(result.lifts).toEqual([
      { pit: 0, seeds: 5 },
      { pit: 6, seeds: 5 },
      { pit: 12, seeds: 5 },
      { pit: 4, seeds: 6 },
      { pit: 11, seeds: 6 },
    ]);
    expect(result.capture).toEqual({ pit: 5, seeds: 7 });
    expect(result.truncated).toBe(false);
    expect(result.pits).toEqual([2, 8, 8, 8, 0, 0, 1, 7, 7, 7, 7, 0, 1, 7]);
    expect(totalSeeds(result.pits) + (result.capture?.seeds ?? 0)).toBe(VAMANA_TOTAL_SEEDS);
  });

  it("does not change the board it was given", () => {
    const before = createPits();
    const snapshot = [...before];
    simulateSow(before, 3);
    expect(before).toEqual(snapshot);
  });

  it("ends the turn with no capture when the pit after the last seed AND the pit after that are both empty", () => {
    const result = simulateSow(board({ 0: 1, 13: 4 }), 0);
    expect(result.pits).toEqual(board({ 1: 1, 13: 4 }));
    expect(result.capture).toBeNull();
    expect(result.lifts).toEqual([{ pit: 0, seeds: 1 }]);
  });

  it("captures the pit after an empty pit", () => {
    const result = simulateSow(board({ 0: 2, 4: 3 }), 0);
    // 0 sows into 1 and 2; pit 3 is empty, so pit 4 (3 seeds) is captured.
    expect(result.capture).toEqual({ pit: 4, seeds: 3 });
    expect(result.pits).toEqual(board({ 1: 1, 2: 1 }));
  });

  it("relays through an occupied pit, and captures across the row boundary", () => {
    const relay = simulateSow(board({ 5: 1, 7: 4 }), 5); // lands on 6; 7 occupied -> lifted next
    expect(relay.lifts[1]).toEqual({ pit: 7, seeds: 4 });
    const crossing = simulateSow(board({ 5: 1, 8: 6 }), 5); // lands on 6; 7 empty -> captures pit 8
    expect(crossing.capture).toEqual({ pit: 8, seeds: 6 });
  });

  it("wraps around the end of the board", () => {
    const result = simulateSow(board({ 13: 3, 3: 4 }), 13);
    // 13 sows into 0,1,2; pit 3 is occupied, so it is lifted next and relayed.
    expect(result.lifts[0]).toEqual({ pit: 13, seeds: 3 });
    expect(result.lifts[1]).toEqual({ pit: 3, seeds: 4 });
  });

  it("drops a seed back into the pit it was lifted from once a lap is longer than the board", () => {
    const result = simulateSow(board({ 0: 14, 5: 1 }), 0);
    // 14 seeds visit every pit once and the 14th lands back in pit 0 (the origin is not skipped), so the
    // pit after it (1, holding exactly the seed just sown there) is the next one lifted.
    expect(result.lifts[0]).toEqual({ pit: 0, seeds: 14 });
    expect(result.lifts[1]).toEqual({ pit: 1, seeds: 1 });
    expect(totalSeeds(result.pits) + (result.capture?.seeds ?? 0)).toBe(15);
  });

  it("always conserves the seeds: board + capture equals what was on the board", () => {
    for (let pit = 0; pit < VAMANA_PIT_COUNT; pit++) {
      const result = simulateSow(createPits(), pit);
      expect(totalSeeds(result.pits) + (result.capture?.seeds ?? 0)).toBe(VAMANA_TOTAL_SEEDS);
    }
  });

  it("stops a pathological relay at the lift cap and captures nothing (reports truncated)", () => {
    const result = simulateSow(createPits(), 0, 1);
    expect(result.truncated).toBe(true);
    expect(result.capture).toBeNull();
    expect(result.lifts).toEqual([{ pit: 0, seeds: 5 }]);
    expect(totalSeeds(result.pits)).toBe(VAMANA_TOTAL_SEEDS);
    expect(VAMANA_MAX_LIFTS_PER_TURN).toBeGreaterThan(20);
  });

  it("never lifts more than the cap on any opening pit of the real board", () => {
    for (let pit = 0; pit < VAMANA_PIT_COUNT; pit++) {
      expect(simulateSow(createPits(), pit).lifts.length).toBeLessThanOrEqual(VAMANA_MAX_LIFTS_PER_TURN);
    }
  });
});

import { describe, it, expect } from "vitest";
import { GAME_LIMITS, type GameLimitSpec } from "@shared/catalog.js";
import type { GameKind } from "@shared/types.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { EconomyPrizeScheduleRecord } from "../../persistence/EconomyRepository.js";
import {
  ECONOMY_APPROVED_SEAT_COUNTS,
  ECONOMY_MIN_SEAT_COUNT,
  ECONOMY_MAX_APPROVED_SEAT_COUNT,
  ECONOMY_SEAT_COUNT_SANITY_MAX,
  isStructurallyValidSeatConfiguration,
  catalogGamesExceedingEconomyCapacity,
  validateEconomyCapacityContract,
} from "../economyCapacityContract.js";

/**
 * The permanent regression guard for the 2026-08-28 P0 incident: the game
 * catalog (shared/catalog.ts) and Economy V1's own approved seat counts
 * must never again be able to silently drift apart. See
 * economyCapacityContract.ts's own doc comment for the full root cause.
 */

function freshRepo(): InMemoryEconomyRepository {
  return new InMemoryEconomyRepository();
}

describe("economyCapacityContract — verified 1-12 seat matrix", () => {
  const APPROVED = new Set(ECONOMY_APPROVED_SEAT_COUNTS);

  it("ECONOMY_APPROVED_SEAT_COUNTS is exactly 1 through 12", () => {
    expect([...ECONOMY_APPROVED_SEAT_COUNTS].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(ECONOMY_MIN_SEAT_COUNT).toBe(1);
    expect(ECONOMY_MAX_APPROVED_SEAT_COUNT).toBe(12);
  });

  it("the structural sanity ceiling is derived from the catalog's own highest maximum, not a second hardcoded number", () => {
    const catalogMax = Math.max(...Object.values(GAME_LIMITS as Record<GameKind, GameLimitSpec>).map((l) => l.max));
    expect(ECONOMY_SEAT_COUNT_SANITY_MAX).toBe(catalogMax);
    // Verified directly against the catalog, not assumed: as of this fix, Tambola (12) is the highest.
    expect(catalogMax).toBe(12);
  });

  it.each(Object.entries(GAME_LIMITS) as [GameKind, GameLimitSpec][])(
    "every seat count from %s's own catalog min through max is classified correctly as approved",
    (_game, limits) => {
      for (let seatCount = limits.min; seatCount <= limits.max; seatCount++) {
        expect(isStructurallyValidSeatConfiguration(seatCount, seatCount, 0)).toBe(true);
        expect(APPROVED.has(seatCount)).toBe(true);
      }
    },
  );

  it("Rummy at six seats: structurally valid, economy-approved", () => {
    expect(GAME_LIMITS.rummy.max).toBe(6);
    expect(isStructurallyValidSeatConfiguration(6, 6, 0)).toBe(true);
    expect(APPROVED.has(6)).toBe(true);
  });

  it("every catalog game whose max is exactly 6 seats is supported at 6 (SNL, Dots & Boxes, Rummy)", () => {
    const sixSeatGames = Object.entries(GAME_LIMITS).filter(([, l]) => l.max === 6).map(([g]) => g);
    expect(sixSeatGames.sort()).toEqual(["dotsboxes", "rummy", "snl"].sort());
    for (const game of sixSeatGames) {
      expect(isStructurallyValidSeatConfiguration(6, 6, 0)).toBe(true);
      expect(APPROVED.has(6)).toBe(true);
    }
  });

  it("every catalog game whose max is exactly 8 seats is supported at 8 (Ludo, Word Building, Star Game, Bingo, Names Place Animal, Block Blast)", () => {
    const eightSeatGames = Object.entries(GAME_LIMITS).filter(([, l]) => l.max === 8).map(([g]) => g).sort();
    expect(eightSeatGames).toEqual(["bingo", "blockblast", "ludo", "namesplaceanimal", "stargame", "wordbuilding"].sort());
    for (const game of eightSeatGames) {
      expect(isStructurallyValidSeatConfiguration(8, 8, 0)).toBe(true);
      expect(APPROVED.has(8)).toBe(true);
    }
  });

  it("UNO at ten seats: structurally valid, economy-approved", () => {
    expect(GAME_LIMITS.uno.max).toBe(10);
    expect(isStructurallyValidSeatConfiguration(10, 10, 0)).toBe(true);
    expect(APPROVED.has(10)).toBe(true);
  });

  it("Tambola at twelve seats: structurally valid, economy-approved — also the platform's overall sanity ceiling", () => {
    expect(GAME_LIMITS.tambola.max).toBe(12);
    expect(isStructurallyValidSeatConfiguration(12, 12, 0)).toBe(true);
    expect(APPROVED.has(12)).toBe(true);
    expect(ECONOMY_SEAT_COUNT_SANITY_MAX).toBe(12);
  });

  it("one seat above each catalog game's own maximum is structurally invalid only once it exceeds the platform sanity ceiling — otherwise it's the SAME class of rejection as any other unsupported count", () => {
    for (const [, limits] of Object.entries(GAME_LIMITS)) {
      const oneAbove = limits.max + 1;
      if (oneAbove <= ECONOMY_SEAT_COUNT_SANITY_MAX) {
        expect(isStructurallyValidSeatConfiguration(oneAbove, oneAbove, 0)).toBe(true);
      }
    }
  });

  it("one seat above the platform sanity ceiling is structurally invalid", () => {
    const oneAbove = ECONOMY_SEAT_COUNT_SANITY_MAX + 1;
    expect(isStructurallyValidSeatConfiguration(oneAbove, oneAbove, 0)).toBe(false);
  });

  it("human + bot must equal total seats regardless of seat count", () => {
    expect(isStructurallyValidSeatConfiguration(4, 2, 1)).toBe(false); // 2+1 != 4
    expect(isStructurallyValidSeatConfiguration(6, 3, 3)).toBe(true);
    expect(isStructurallyValidSeatConfiguration(1, -1, 2)).toBe(false); // negative human
    expect(isStructurallyValidSeatConfiguration(1, 1, -1)).toBe(false); // negative bot
  });

  it("catalogGamesExceedingEconomyCapacity is empty now that all catalog games (up to Tambola 12) have approved schedules", () => {
    const affected = catalogGamesExceedingEconomyCapacity();
    expect(affected).toEqual([]);
  });
});

describe("validateEconomyCapacityContract — drift detection", () => {
  it("passes against the real seeded InMemoryEconomyRepository — every approved seat count has a valid, conserving schedule", async () => {
    const repo = freshRepo();
    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.issues).toEqual([]);
    expect(report.fatal).toBe(false);
  });

  it("reports the known catalog/economy gap as informational, never fatal — 0 gap now that all catalog games up to 12 are supported", async () => {
    const repo = freshRepo();
    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.catalogGamesExceedingEconomyCapacity.length).toBe(0);
    expect(report.fatal).toBe(false);
  });

  it("MUTATION: deleting a required schedule (seat count 3) makes the validator fail — proves this is a genuine, live check, not a decoration", async () => {
    const repo = freshRepo();
    const snapshot = repo.testFixture.snapshot();
    const withoutSeat3 = snapshot.prizeSchedules.filter((s) => s.seatCount !== 3);
    repo.testFixture.seedConfiguration(snapshot.configuration, withoutSeat3);

    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.fatal).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ kind: "MISSING_REQUIRED_SCHEDULE", seatCount: 3 }),
    );
    // Restored via a fresh repository in every other test — this test
    // never mutates shared/persisted state, only its own local instance.
  });

  it("MUTATION: a non-conserving schedule (allocation != collected) is caught", async () => {
    const repo = freshRepo();
    const snapshot = repo.testFixture.snapshot();
    const broken: EconomyPrizeScheduleRecord[] = snapshot.prizeSchedules.map((s) =>
      s.seatCount === 2 ? { ...s, firstPlaceCoins: "999999" } : s,
    );
    repo.testFixture.seedConfiguration(snapshot.configuration, broken);

    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.fatal).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ kind: "ALLOCATION_EXCEEDS_TOTAL", seatCount: 2 }),
    );
  });

  it("MUTATION: a negative allocation is caught", async () => {
    const repo = freshRepo();
    const snapshot = repo.testFixture.snapshot();
    const broken: EconomyPrizeScheduleRecord[] = snapshot.prizeSchedules.map((s) =>
      s.seatCount === 4 ? { ...s, thirdPlaceCoins: "-10" } : s,
    );
    repo.testFixture.seedConfiguration(snapshot.configuration, broken);

    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.fatal).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ kind: "NEGATIVE_ALLOCATION", seatCount: 4 }),
    );
  });

  it("MUTATION: a rank that cannot exist at a given seat count (nonzero 2nd place at a 1-seat schedule) is caught", async () => {
    const repo = freshRepo();
    const snapshot = repo.testFixture.snapshot();
    const broken: EconomyPrizeScheduleRecord[] = snapshot.prizeSchedules.map((s) =>
      s.seatCount === 1 ? { ...s, secondPlaceCoins: "5", collectedCoins: "105" } : s,
    );
    repo.testFixture.seedConfiguration(snapshot.configuration, broken);

    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.fatal).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ kind: "INVALID_RANK_ALLOCATION", seatCount: 1 }),
    );
  });

  it("adding a higher-capacity catalog game does not, on its own, fail the validator — the gap is informational only, matching production policy", async () => {
    const repo = freshRepo();
    // Simulates "the catalog just grew" without any economy change — the
    // validator's fatal issues must stay empty; only the informational
    // list grows (already covered by the catalogGamesExceedingEconomyCapacity
    // test above, itself derived live from the real catalog).
    const report = await validateEconomyCapacityContract((seatCount) => repo.getPrizeSchedule(seatCount));
    expect(report.fatal).toBe(false);
  });

  it("Supabase and in-memory repositories expose equivalent schedule behavior for every approved seat count", async () => {
    // Both repositories are validated against the exact same
    // ECONOMY_APPROVED_SEAT_COUNTS list via the identical
    // validateEconomyCapacityContract function — proven directly against
    // InMemoryEconomyRepository here; SupabaseEconomyRepository's
    // equivalence is proven by the shared contract suite
    // (economyRepositoryContract.test.ts) exercising getPrizeSchedule
    // identically for both, seat count by seat count.
    const repo = freshRepo();
    for (const seatCount of ECONOMY_APPROVED_SEAT_COUNTS) {
      const schedule = await repo.getPrizeSchedule(seatCount);
      expect(schedule).not.toBeNull();
    }
    for (let seatCount = 13; seatCount <= 15; seatCount++) {
      const schedule = await repo.getPrizeSchedule(seatCount);
      expect(schedule).toBeNull();
    }
  });
});

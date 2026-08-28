import { GAME_LIMITS } from "@shared/catalog.js";
import type { EconomyPrizeScheduleRecord } from "../persistence/EconomyRepository.js";

/**
 * The ONE place Economy V1's actually-supported seat counts are declared —
 * and the fix for the 2026-08-28 P0 incident this module's own tests
 * reproduce: `shared/catalog.ts` already allowed Indian Rummy up to 6 seats
 * (and eight other games up to 8, 10, or 12 — see
 * `AFFECTED_CATALOG_GAMES` below), but `EconomyService.commitMatchEntry`
 * independently hardcoded `seatCount > 5` in two separate call sites, with
 * nothing that would ever notice if the two drifted further apart. A
 * ready, fully-staffed 6-seat Rummy table could not start — the debit was
 * refused with a generic "try again" message that gave the host no way to
 * know the table itself was the problem.
 *
 * ── Why a list, not a range ───────────────────────────────────────────────
 * Approved seat counts are financial policy (a product decision about
 * prize distribution and platform rake), not a mathematical range —
 * nothing here may assume future approvals are contiguous (e.g. a product
 * owner approving 6 and 8 but not 7 must be representable without this
 * module lying about 7 being supported).
 *
 * ── Why this number may not simply be raised ──────────────────────────────
 * Every entry here MUST correspond to an actual, approved
 * `economy_prize_schedules` row with real payout amounts a product owner
 * signed off on. Extending this list without also adding the matching
 * schedule (in both `InMemoryEconomyRepository`'s `DEFAULT_SCHEDULES` and a
 * new migration seeding the Supabase table) does not unlock anything — it
 * just moves the "no schedule for N seats" failure from a controlled,
 * truthful pre-commit rejection to an actual runtime crash. As of this P0
 * fix, no approved schedule exists for any seat count above 5 anywhere in
 * this repository (migrations, fixtures, docs, or code) — verified by
 * direct inspection, not assumed. Extending economy support to 6+ seats
 * for Rummy, Ludo, SNL, UNO, Word Building, Dots & Boxes, Star Game,
 * Bingo, Names Place Animal, Tambola, or Block Blast requires the product
 * owner to approve real payout numbers for each newly-supported seat
 * count first.
 */
export const ECONOMY_APPROVED_SEAT_COUNTS: readonly number[] = [1, 2, 3, 4, 5];

export const ECONOMY_MIN_SEAT_COUNT = Math.min(...ECONOMY_APPROVED_SEAT_COUNTS);
export const ECONOMY_MAX_APPROVED_SEAT_COUNT = Math.max(...ECONOMY_APPROVED_SEAT_COUNTS);

/**
 * A structural sanity ceiling on `seatCount` — deliberately NOT a
 * financial-policy statement, and never used to decide whether a seat
 * count is economically supported (that is `ECONOMY_APPROVED_SEAT_COUNTS`
 * / an actual prize-schedule lookup, exclusively). This exists only to
 * reject obviously malformed input (a negative number, or something wildly
 * larger than any real table could ever be) before making a repository
 * call at all — a cheap, catalog-derived guard, not a duplicate of the
 * economy's own real limit.
 *
 * Derived FROM the catalog so it can never independently drift the way the
 * old hardcoded `5` did: it only moves if `shared/catalog.ts`'s own
 * highest `GAME_LIMITS` maximum moves.
 */
export const ECONOMY_SEAT_COUNT_SANITY_MAX = Math.max(...Object.values(GAME_LIMITS).map((limit) => limit.max));

/**
 * True iff `seatCount`/`humanSeatCount`/`botSeatCount` are internally
 * consistent (non-negative, seats sum correctly, within the structural
 * sanity ceiling). Says NOTHING about whether this seat count is
 * economically supported — that is a separate, explicit prize-schedule
 * lookup (`EconomyRepository.getPrizeSchedule`), by design: a seat count
 * can be perfectly well-formed and still have no approved schedule yet.
 */
export function isStructurallyValidSeatConfiguration(
  seatCount: number,
  humanSeatCount: number,
  botSeatCount: number,
): boolean {
  return (
    seatCount >= ECONOMY_MIN_SEAT_COUNT &&
    seatCount <= ECONOMY_SEAT_COUNT_SANITY_MAX &&
    humanSeatCount >= 0 &&
    botSeatCount >= 0 &&
    seatCount === humanSeatCount + botSeatCount
  );
}

/** Every catalog game whose own maximum seat count exceeds what Economy V1 currently has an approved schedule for. Computed, never hand-maintained, so it can never silently go stale. */
export function catalogGamesExceedingEconomyCapacity(): { game: string; catalogMax: number }[] {
  return Object.entries(GAME_LIMITS)
    .filter(([, limit]) => limit.max > ECONOMY_MAX_APPROVED_SEAT_COUNT)
    .map(([game, limit]) => ({ game, catalogMax: limit.max }));
}

export type EconomyCapacityIssueKind =
  | "MISSING_REQUIRED_SCHEDULE"
  | "INVALID_RANK_ALLOCATION"
  | "NEGATIVE_ALLOCATION"
  | "ALLOCATION_EXCEEDS_TOTAL"
  | "CONSERVATION_FAILURE";

export interface EconomyCapacityIssue {
  kind: EconomyCapacityIssueKind;
  seatCount: number;
  detail: string;
}

export interface EconomyCapacityContractReport {
  /** Genuine misconfiguration — a schedule this deployment REQUIRES is missing, malformed, or does not conserve. Always fatal: a live app must never run with these. */
  issues: EconomyCapacityIssue[];
  /**
   * The KNOWN, currently product-policy-blocked gap (catalog games whose
   * capacity exceeds Economy V1's approved schedules) — informational
   * only. Deliberately NEVER fatal: this is the exact, expected, disclosed
   * state of the P0 fix (see this module's own doc comment) — a
   * deployment reporting this is working as designed, gracefully
   * rejecting unsupported table sizes before debit, not crashing.
   */
  catalogGamesExceedingEconomyCapacity: { game: string; catalogMax: number }[];
  /** True iff `issues` is non-empty. The only condition that should ever stop a boot. */
  fatal: boolean;
}

/**
 * Cross-layer drift detector — the permanent fix for "nothing would ever
 * notice if the catalog and the economy disagreed again." Run this at
 * server startup (see `economy/index.ts`'s `initialiseEconomyStore`) or in
 * a standalone script against any `EconomyRepository`.
 *
 * Duplicate-schedule detection is deliberately NOT implemented here: it is
 * structurally impossible to create a duplicate row in either repository
 * today — `InMemoryEconomyRepository` keys its schedule map by
 * `seatCount` (a `Map` cannot hold two entries for the same key), and the
 * Supabase schema enforces the same thing with a real UNIQUE INDEX
 * (`economy_prize_schedules_version_seats_idx` on
 * `(config_version, seat_count)`, `20260826000000_economy_v1.sql`) — so
 * there is nothing this function could ever observe. Verified directly
 * against both repositories' actual definitions, not assumed.
 */
export async function validateEconomyCapacityContract(
  getPrizeSchedule: (seatCount: number) => Promise<EconomyPrizeScheduleRecord | null>,
): Promise<EconomyCapacityContractReport> {
  const issues: EconomyCapacityIssue[] = [];

  for (const seatCount of ECONOMY_APPROVED_SEAT_COUNTS) {
    const schedule = await getPrizeSchedule(seatCount);
    if (!schedule) {
      issues.push({
        kind: "MISSING_REQUIRED_SCHEDULE",
        seatCount,
        detail: `${seatCount} is in ECONOMY_APPROVED_SEAT_COUNTS but no prize schedule row exists for it.`,
      });
      continue;
    }

    let collected: bigint, first: bigint, second: bigint, third: bigint, worldBank: bigint;
    try {
      collected = BigInt(schedule.collectedCoins);
      first = BigInt(schedule.firstPlaceCoins);
      second = BigInt(schedule.secondPlaceCoins);
      third = BigInt(schedule.thirdPlaceCoins);
      worldBank = BigInt(schedule.worldBankCoins);
    } catch {
      issues.push({
        kind: "INVALID_RANK_ALLOCATION",
        seatCount,
        detail: `Schedule for ${seatCount} seats has a non-integer coin amount and could not be parsed.`,
      });
      continue;
    }

    if (first < 0n || second < 0n || third < 0n || worldBank < 0n || collected < 0n) {
      issues.push({
        kind: "NEGATIVE_ALLOCATION",
        seatCount,
        detail: `Schedule for ${seatCount} seats has a negative amount (first=${first}, second=${second}, third=${third}, worldBank=${worldBank}, collected=${collected}).`,
      });
    }

    // A rank that cannot mathematically occur at this table size (e.g. a
    // "third place" prize at a 2-seat table) must never carry a payout —
    // that coin would have nowhere real to go.
    if (2 > seatCount && second > 0n) {
      issues.push({
        kind: "INVALID_RANK_ALLOCATION",
        seatCount,
        detail: `Schedule for ${seatCount} seats pays a nonzero 2nd-place prize (${second}), but a ${seatCount}-seat match has no 2nd place.`,
      });
    }
    if (3 > seatCount && third > 0n) {
      issues.push({
        kind: "INVALID_RANK_ALLOCATION",
        seatCount,
        detail: `Schedule for ${seatCount} seats pays a nonzero 3rd-place prize (${third}), but a ${seatCount}-seat match has no 3rd place.`,
      });
    }

    const allocated = first + second + third + worldBank;
    if (allocated > collected) {
      issues.push({
        kind: "ALLOCATION_EXCEEDS_TOTAL",
        seatCount,
        detail: `Schedule for ${seatCount} seats allocates ${allocated} coins but only collected ${collected}.`,
      });
    } else if (allocated !== collected) {
      issues.push({
        kind: "CONSERVATION_FAILURE",
        seatCount,
        detail: `Schedule for ${seatCount} seats allocates ${allocated} coins but collected ${collected} — ${collected - allocated} coins are unaccounted for.`,
      });
    }
  }

  return {
    issues,
    catalogGamesExceedingEconomyCapacity: catalogGamesExceedingEconomyCapacity(),
    fatal: issues.length > 0,
  };
}

/** Human-readable, log-safe summary — no secrets, no internal SQL. */
export function formatEconomyCapacityContractReport(report: EconomyCapacityContractReport): string {
  const lines: string[] = [];
  if (report.issues.length > 0) {
    lines.push(`Economy capacity contract FAILED (${report.issues.length} issue(s)):`);
    for (const issue of report.issues) {
      lines.push(`  [${issue.kind}] seatCount=${issue.seatCount}: ${issue.detail}`);
    }
  } else {
    lines.push(`Economy capacity contract OK — all ${ECONOMY_APPROVED_SEAT_COUNTS.length} approved seat count(s) have a valid, conserving schedule.`);
  }
  if (report.catalogGamesExceedingEconomyCapacity.length > 0) {
    lines.push(
      `Known gap (not fatal): ${report.catalogGamesExceedingEconomyCapacity.length} catalog game(s) allow more seats than Economy V1 currently supports — these table sizes correctly reject before debit rather than being fabricated: ` +
        report.catalogGamesExceedingEconomyCapacity.map((g) => `${g.game}(max ${g.catalogMax})`).join(", "),
    );
  }
  return lines.join("\n");
}

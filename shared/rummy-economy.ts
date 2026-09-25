import {
  ENTRY_STAKE_MIN_COINS,
  GUEST_HOST_ENTRY_STAKE_COINS,
  isValidEntryStakeCoins,
} from "./types.js";

/* ═══════════════════════ Rummy: points-rate stakes ═══════════════════════════
 *
 * Rummy tables are not priced in the platform's flat 100/200/500/1000 coins.
 * A host picks a POINT RATE — 1 point = 1, 2, 4, 8 or 16 coins — and every seat
 * pays that rate against one full hand's worth of points, so the per-seat entry
 * is `80 × rate` (80 / 160 / 320 / 640 / 1280 coins). The pot is winner-takes-all:
 * the player who made the show (or, in pool 101 / 201, outlasted the table) is
 * paid the whole pot and there is NO platform cut. Points still decide who wins,
 * but they no longer move any coins by themselves.
 *
 * Everything below still travels as an ordinary per-seat `entryStakeCoins`, so the
 * commit / debit / settle pipeline is unchanged — this module only says which
 * numbers are legal for Rummy and how the pot is paid.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** One full hand's worth of points: the stake every seat puts up per unit of rate. */
export const RUMMY_STAKE_BASE_POINTS = 80;

export const RUMMY_POINT_RATES = [1, 2, 4, 8, 16] as const;
export type RummyPointRate = (typeof RUMMY_POINT_RATES)[number];

/** Per-seat entry stake for a point rate: `80 × rate`. */
export function rummyStakeCoinsForRate(rate: RummyPointRate): number {
  return RUMMY_STAKE_BASE_POINTS * rate;
}

/** Every legal Rummy entry stake, lowest first — the picker's tiers. */
export const RUMMY_STAKE_TIERS: readonly number[] = RUMMY_POINT_RATES.map(rummyStakeCoinsForRate);

/** The lowest tier (1 point = 1 coin) — a new table's default and a guest host's only table. */
export const RUMMY_DEFAULT_STAKE_COINS = rummyStakeCoinsForRate(1);

/** The point rate a stake corresponds to, or `null` when the stake is not a Rummy tier. */
export function rummyRateForStakeCoins(stake: number): RummyPointRate | null {
  return RUMMY_POINT_RATES.find((rate) => rummyStakeCoinsForRate(rate) === stake) ?? null;
}

export function isValidRummyStakeCoins(stake: number): boolean {
  return rummyRateForStakeCoins(stake) !== null;
}

const isRummy = (game: string | null | undefined): boolean => game === "rummy";

/** Whether `stake` is a legal per-seat entry for `game` — Rummy's tiers, or the platform's stepped range. */
export function isValidEntryStakeFor(game: string | null | undefined, stake: number): boolean {
  return isRummy(game) ? isValidRummyStakeCoins(stake) : isValidEntryStakeCoins(stake);
}

/** A new table's stake when the host did not choose (or chose something illegal). */
export function defaultEntryStakeFor(game: string | null | undefined): number {
  return isRummy(game) ? RUMMY_DEFAULT_STAKE_COINS : ENTRY_STAKE_MIN_COINS;
}

/** The one stake a guest may host at — 100 coins everywhere, the 1-point table for Rummy. */
export function guestHostStakeFor(game: string | null | undefined): number {
  return isRummy(game) ? RUMMY_DEFAULT_STAKE_COINS : GUEST_HOST_ENTRY_STAKE_COINS;
}

/**
 * Winner-takes-all: the whole pot to first place, nothing to the platform, nothing to
 * anyone else. A one-seat table has no opponent to win from, so — exactly like the
 * standard pool — it stays entirely the platform's.
 */
export function computeWinnerTakesAllPool(
  totalCollected: bigint,
  seatCount: number,
): { worldBankCut: bigint; winnerPrizes: bigint[] } {
  if (seatCount <= 1) return { worldBankCut: totalCollected, winnerPrizes: [] };
  return { worldBankCut: 0n, winnerPrizes: [totalCollected] };
}

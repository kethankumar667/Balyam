/* ═══════════════════════ Percentage-of-pool prize math ═══════════════════
 *
 * The exact, authoritative math `server/src/economy/EconomyService.ts` uses
 * to decide how much of a match's real pot each placement is paid — moved
 * here so the client can compute the SAME per-placement amounts for display
 * (e.g. "you won 320 coins" on a result screen) without guessing or
 * duplicating the formula. `EconomyService.ts` re-exports both names below
 * unchanged, so this is a pure extraction — every existing server import and
 * test keeps working exactly as before.
 *
 * Every entry stake is validated elsewhere to be a positive multiple of 100
 * coins, so `totalCollected` (stake × seatCount) is always a multiple of
 * 100 — the 80% winner pool is always a multiple of 80, which divides
 * evenly by every denominator used below (2, 5, 8, 10) for any seat count
 * 2-12. The result is always an exact integer split with zero rounding
 * remainder. (The server's own copy additionally throws if that invariant
 * is ever violated — deliberately NOT duplicated here, since a client-side
 * display helper has no useful way to react to a math bug beyond it not
 * being safe to trust, which not throwing already achieves.)
 */

/**
 * How many placements are paid for a given seat count: winners =
 * min(seatCount - 1, 3), capped at 3 regardless of table size. A solo match
 * (seatCount <= 1) pays 0 winners — see `computePrizePool`'s own special
 * case for why that means 100% World Bank, not "0% platform cut."
 */
export function winnersForSeatCount(seatCount: number): number {
  if (seatCount <= 1) return 0;
  return Math.min(seatCount - 1, 3);
}

/** Exact bigint fractions of the 80% "winner pool" — never floats, never rounded. */
export const RANK_WEIGHTS_BY_WINNER_COUNT: Readonly<Record<number, ReadonlyArray<readonly [bigint, bigint]>>> = {
  1: [[1n, 1n]],
  2: [[5n, 8n], [3n, 8n]],
  3: [[1n, 2n], [3n, 10n], [1n, 5n]],
};

/**
 * Platform always takes exactly 20% of `totalCollected`; the remaining 80%
 * ("winner pool") splits among winners by `RANK_WEIGHTS_BY_WINNER_COUNT`.
 * `winnerPrizes[0]` is 1st place, `[1]` is 2nd, `[2]` is 3rd.
 */
export function computePrizePool(totalCollected: bigint, seatCount: number): { worldBankCut: bigint; winnerPrizes: bigint[] } {
  const winnerCount = winnersForSeatCount(seatCount);
  if (winnerCount === 0) {
    // Solo: the entire pool is the platform's — there is no second party to
    // split a "winner pool" with, so applying the generic 20% split here
    // would leave 80% of the pool credited to nobody.
    return { worldBankCut: totalCollected, winnerPrizes: [] };
  }
  const worldBankCut = (totalCollected * 20n) / 100n;
  const winnerPool = totalCollected - worldBankCut;
  const weights = RANK_WEIGHTS_BY_WINNER_COUNT[winnerCount] ?? [];
  const winnerPrizes = weights.map(([num, den]) => (winnerPool * num) / den);
  return { worldBankCut, winnerPrizes };
}

import { useEffect, useState } from "react";
import { computePrizePool } from "@shared/economy-prizes";
import { getMatchSettlement, type MatchEconomySettlementRecord, EconomyClientError } from "../lib/economyApi";

export interface MatchSettlementState {
  settlement: MatchEconomySettlementRecord | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches a match's authoritative settlement record. `matchId` being
 * null/undefined means "no economy match" (a free/practice game) — never
 * fetches, never errors, just returns an idle, empty state.
 */
export function useMatchSettlement(matchId: string | null | undefined): MatchSettlementState {
  const [settlement, setSettlement] = useState<MatchEconomySettlementRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(matchId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setSettlement(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getMatchSettlement(matchId)
      .then((data) => {
        if (!cancelled) setSettlement(data.settlement);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof EconomyClientError ? err.message : "Settlement record unavailable for this match.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return { settlement, isLoading, error };
}

/**
 * Per-placement prize amounts for a SETTLED match, as decimal-string coin
 * amounts (index 0 = 1st place, matching a ranked player list's own
 * ordering) — the exact amounts `EconomyService` actually paid out,
 * recomputed via the same shared, pure function against this match's real
 * `totalCollected`/`seatCount` (both already on the settlement record, so
 * this is a re-derivation of a real fact, never a guess).
 *
 * `null` when there is nothing truthful to show yet: not settled (still
 * pending, refunded, or forfeited to the platform — none of those have a
 * "prize won" to display).
 */
export function winnerPrizesFor(settlement: MatchEconomySettlementRecord | null): string[] | null {
  if (!settlement || settlement.status !== "SETTLED") return null;
  const { winnerPrizes } = computePrizePool(BigInt(settlement.totalCollected), settlement.seatCount);
  return winnerPrizes.map((p) => p.toString());
}

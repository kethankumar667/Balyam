import { useEffect, useState } from "react";
import { computePrizePool } from "@shared/economy-prizes";
import { getMatchSettlement, type MatchEconomySettlementRecord, EconomyClientError } from "../lib/economyApi";
import { refreshCurrentWallet } from "./useEconomy";

export interface MatchSettlementState {
  settlement: MatchEconomySettlementRecord | null;
  isLoading: boolean;
  error: string | null;
}

/** How often to look again while the settlement is still `COMMITTED`. The server settles within moments of the last move. */
export const SETTLEMENT_POLL_INTERVAL_MS = 700;
/** ~8 s in total: comfortably past the immediate settle, and past one 5 s recovery sweep should that be needed. */
export const SETTLEMENT_POLL_MAX_ATTEMPTS = 12;

const RECORD_UNAVAILABLE = "Settlement record unavailable for this match.";

/** A proxy blip (5xx) or throttling (429) says nothing about the record; only a 4xx is a definite answer. */
function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

/**
 * Fetches a match's authoritative settlement record. `matchId` being
 * null/undefined means "no economy match" (a free/practice game) — never
 * fetches, never errors, just returns an idle, empty state.
 *
 * The record is not final at the moment a match ends: the entry stakes are
 * debited at the start, but the winner is credited a beat AFTER the last move,
 * so the first answer is normally `COMMITTED` and shows no prize. This hook
 * therefore keeps asking (bounded) until the status becomes final — SETTLED,
 * REFUNDED or ABANDONMENT_FORFEITED — and then reloads the wallet once, so the
 * balance chip reflects the payout instead of the stale debited figure.
 *
 * A definite answer from the server (403, 404, ...) stops the polling and is
 * shown; a transient network failure is retried like a still-pending record.
 */
export function useMatchSettlement(matchId: string | null | undefined): MatchSettlementState {
  const [settlement, setSettlement] = useState<MatchEconomySettlementRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(matchId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSettlement(null);
    setError(null);
    if (!matchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts += 1;
      try {
        const data = await getMatchSettlement(matchId);
        if (cancelled) return;
        setSettlement(data.settlement);
        setError(null);
        setIsLoading(false);
        if (data.settlement.status !== "COMMITTED") {
          void refreshCurrentWallet();
          return;
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof EconomyClientError && !isTransientStatus(err.status)) {
          setError(err.message);
          setIsLoading(false);
          return;
        }
        if (attempts >= SETTLEMENT_POLL_MAX_ATTEMPTS) {
          setError(RECORD_UNAVAILABLE);
          setIsLoading(false);
          return;
        }
      }
      if (attempts >= SETTLEMENT_POLL_MAX_ATTEMPTS) {
        setIsLoading(false);
        return;
      }
      timer = setTimeout(() => void poll(), SETTLEMENT_POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
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
  const totalCollected = BigInt(settlement.totalCollected);
  // A winner-takes-all table (Rummy) keeps no platform cut and pays the whole pot to 1st. The record
  // says so itself — a standard match always books a cut — so this needs no game key from the server.
  if (totalCollected > 0n && BigInt(settlement.totalWorldBankCut) === 0n) return [totalCollected.toString()];
  const { winnerPrizes } = computePrizePool(totalCollected, settlement.seatCount);
  return winnerPrizes.map((p) => p.toString());
}

import { useEffect, useState } from "react";
import {
  getEconomyLedger,
  type CoinLedgerEntryRecord,
  type MatchEconomySettlementRecord,
} from "../lib/economyApi";

export type MatchPayoutKind = "prize" | "refund";

/** What the signed-in player was actually paid for one match — read off their own wallet ledger. */
export interface MatchPayout {
  matchId: string;
  kind: MatchPayoutKind;
  /** Decimal-string coin amount, summed across every credit row for the match. */
  amount: string;
}

/** The payout is the newest credit, so a short lookback is plenty. */
const LEDGER_LOOKBACK = 25;
/** The settlement is already final when we ask, so a miss is a network blip, not a race. */
export const PAYOUT_FETCH_MAX_ATTEMPTS = 3;
export const PAYOUT_FETCH_RETRY_MS = 1000;

function sumCredits(entries: CoinLedgerEntryRecord[], entryType: CoinLedgerEntryRecord["entryType"], matchId: string): bigint {
  let total = 0n;
  for (const e of entries) {
    if (e.sourceKind !== "match" || e.sourceId !== matchId || e.entryType !== entryType) continue;
    let amount: bigint;
    try {
      amount = BigInt(e.amount);
    } catch {
      continue;
    }
    if (amount > 0n) total += amount;
  }
  return total;
}

/**
 * The player's payout for `matchId`, or `null` if the ledger holds no credit for it.
 *
 * Reads the ledger rather than re-deriving a prize from placement: it is the record of
 * what the server really wrote, so it is right for every game and every seat count —
 * including the ones whose ranking the client cannot compute. A win outranks a refund.
 */
export function findMatchPayout(entries: CoinLedgerEntryRecord[], matchId: string): MatchPayout | null {
  const prize = sumCredits(entries, "MATCH_PRIZE_CREDIT", matchId);
  if (prize > 0n) return { matchId, kind: "prize", amount: prize.toString() };
  const refund = sumCredits(entries, "MATCH_REFUND", matchId);
  if (refund > 0n) return { matchId, kind: "refund", amount: refund.toString() };
  return null;
}

/**
 * Looks up what this player was paid once a match's settlement is final.
 *
 * `settlement` is the record `useMatchSettlement` already polls; nothing is fetched until
 * it leaves `COMMITTED`, and a `null` result means "nothing to announce" (a loss, a guest —
 * whose win arrives as a voucher instead — or a free match), never an error.
 */
export function useMatchPayout(
  matchId: string | null | undefined,
  settlement: MatchEconomySettlementRecord | null,
): MatchPayout | null {
  const [payout, setPayout] = useState<MatchPayout | null>(null);
  const isFinal = Boolean(matchId) && settlement !== null && settlement.matchId === matchId && settlement.status !== "COMMITTED";

  useEffect(() => {
    setPayout(null);
    if (!matchId || !isFinal) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = async (): Promise<void> => {
      attempts += 1;
      try {
        const { entries } = await getEconomyLedger({ limit: LEDGER_LOOKBACK });
        if (!cancelled) setPayout(findMatchPayout(entries, matchId));
      } catch {
        if (cancelled || attempts >= PAYOUT_FETCH_MAX_ATTEMPTS) return;
        timer = setTimeout(() => void load(), PAYOUT_FETCH_RETRY_MS);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [matchId, isFinal]);

  return payout;
}

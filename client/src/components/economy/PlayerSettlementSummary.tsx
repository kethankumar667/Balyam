import { Wallet, Ticket, Trophy, XCircle } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { winnerPrizesFor } from "../../hooks/useMatchSettlement";
import type { MatchEconomySettlementRecord } from "../../lib/economyApi";

export interface PlayerSettlementSummaryProps {
  /** Same record the caller already fetched via `useMatchSettlement(matchId)` —
   *  passed in rather than fetched again here, so a screen that also mounts
   *  `SettlementView` (or another consumer) never double-fetches the same
   *  settlement. */
  settlement: MatchEconomySettlementRecord | null;
  /** 0-based placement index — identical indexing to `winnerPrizesFor`'s
   *  own returned array, so callers that already compute a rank for
   *  `PrizeWonChip` can pass the same value straight through. */
  myRank: number;
  /** Guest wins are escrowed as a redeemable voucher instead of a direct
   *  wallet credit — same reward amount either way, different label. */
  isGuest: boolean;
  className?: string;
}

/**
 * Self's own settlement breakdown — entry fee paid, reward earned, net
 * result, and whether that reward landed in a wallet or a voucher.
 *
 * Root-caused 2026-09-09: `SettlementView` (mounted alongside this on every
 * result screen already) deliberately only shows AGGREGATE settlement
 * figures — "no participant-level payout record is available client-side
 * to attribute this to a specific person," per its own doc comment. That's
 * true for the raw ledger totals, but a specific player's OWN reward is
 * already knowable without one: `winnerPrizesFor` derives it purely from
 * placement (the exact math `EconomyService` itself used), and every
 * caller already has this player's rank for `PrizeWonChip`. This card is
 * that same trusted number, reframed as "what does MY result mean" instead
 * of "what did the table pay out in total" — entry fee, reward, net,
 * wallet-vs-voucher, and a Match ID / timestamp footer for support/audit
 * purposes, satisfying "no paid match should end without a visible
 * personal settlement" regardless of how the match ended (a normal finish,
 * a forfeit, an abandonment — anything that produced a SETTLED `matchId`
 * reaches this component identically).
 *
 * Renders nothing until the match is actually `SETTLED` — a pending or
 * refunded match already gets its own honest state from `SettlementView`
 * on the same screen; duplicating that here would just be noise.
 */
export default function PlayerSettlementSummary({
  settlement,
  myRank,
  isGuest,
  className = "",
}: PlayerSettlementSummaryProps) {
  if (!settlement || settlement.status !== "SETTLED") return null;

  const prizes = winnerPrizesFor(settlement);
  const reward = prizes?.[myRank] ?? "0";
  const isWinner = reward !== "0";
  const netResult = (BigInt(reward) - BigInt(settlement.costPerSeat)).toString();
  const isNetPositive = !netResult.startsWith("-");

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 font-sans ${
        isWinner
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
          : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isWinner ? (
            <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <XCircle className="w-4 h-4 text-ink-lo dark:text-text-lo" aria-hidden="true" />
          )}
          <h3 className="text-sm font-extrabold text-ink-hi dark:text-text-hi">
            Match Result: {isWinner ? "Winner" : "Defeated"}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Entry Fee Paid</span>
          <CoinAmount amount={settlement.costPerSeat} size="sm" />
        </div>
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Reward Earned</span>
          <CoinAmount amount={reward} size="sm" className={isWinner ? "text-emerald-700 dark:text-emerald-400" : ""} />
        </div>
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 col-span-2">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Net Result</span>
          <CoinAmount
            amount={netResult}
            size="sm"
            className={isNetPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}
          />
        </div>
      </div>

      {isWinner && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-hi dark:text-text-hi">
          {isGuest ? (
            <>
              <Ticket className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
              <span>
                Voucher Generated: <CoinAmount amount={reward} size="sm" className="inline-flex" /> — Status: Ready to Redeem
              </span>
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                Wallet Credited: <CoinAmount amount={reward} size="sm" className="inline-flex" />
              </span>
            </>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-black/10 dark:border-white/10 text-[10px] text-ink-lo dark:text-text-lo font-mono">
        Match {settlement.matchId} · Settled
        {settlement.settledAt ? ` · ${formatTimeAgo(settlement.settledAt)}` : ""}
      </div>
    </div>
  );
}

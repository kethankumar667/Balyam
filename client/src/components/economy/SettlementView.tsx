import React, { useEffect, useState } from "react";
import { Trophy, RefreshCw, AlertCircle, ShieldAlert, Award, Landmark, RotateCcw } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { EconomySkeleton } from "./EconomySkeleton";
import { EconomyStatusBanner } from "./EconomyStatusBanner";
import { RefundSequence, SettlementSequence, EscrowSequence } from "./motion";
import { getMatchSettlement, type MatchEconomySettlementRecord, EconomyClientError } from "../../lib/economyApi";

export interface SettlementViewProps {
  matchId: string;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Match Economy Settlement View.
 * Displays authoritative settlement outcome fetched from GET /api/economy/settlements/:matchId.
 * Never guesses or fabricates outcomes — renders pending state if not yet settled.
 */
export const SettlementView: React.FC<SettlementViewProps> = ({
  matchId,
  onRefresh,
  className = "",
}) => {
  const [settlement, setSettlement] = useState<MatchEconomySettlementRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlement = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMatchSettlement(matchId);
      setSettlement(data.settlement);
    } catch (err) {
      setError(
        err instanceof EconomyClientError
          ? err.message
          : "Settlement record unavailable for this match.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      void fetchSettlement();
    }
  }, [matchId]);

  if (isLoading) {
    return (
      <div className={`p-5 rounded-3xl bg-black/5 dark:bg-white/5 border border-amber-600/20 ${className}`}>
        <EconomySkeleton variant="prize" />
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className={`p-4 ${className}`}>
        <EconomyStatusBanner
          status="failed"
          title="Settlement In Progress"
          description={error || "Match settlement record is not yet available."}
          actionText="Refresh Status"
          onAction={fetchSettlement}
        />
      </div>
    );
  }

  if (settlement.status === "COMMITTED") {
    return (
      <div className={`p-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 text-center font-sans space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center animate-spin">
          <RefreshCw className="w-5 h-5" aria-hidden="true" />
        </div>
        <h3 className="text-base font-extrabold text-ink-hi dark:text-text-hi">
          Settlement Pending
        </h3>
        <p className="text-xs text-ink-lo dark:text-text-lo max-w-sm mx-auto">
          Match concluded. Payout allocations and World Bank fees are being finalized on the authoritative ledger.
        </p>
      </div>
    );
  }

  if (settlement.status === "REFUNDED") {
    return (
      <div className={`space-y-4 ${className}`}>
        <RefundSequence
          payload={{
            sequenceId: `settlement-refund-${settlement.matchId}`,
            matchId: settlement.matchId,
            refundAmount: settlement.totalRefunded,
            reason: settlement.refundReason || "The match was refunded to the host wallet.",
          }}
        />
      </div>
    );
  }

  // SETTLED state
  return (
    <div className={`p-5 rounded-3xl border border-amber-600/30 dark:border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 dark:from-[#131824] dark:to-[#0E131F] font-sans space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" aria-hidden="true" />
          <h3 className="text-base font-extrabold text-ink-hi dark:text-text-hi">
            Settlement Summary
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          Settled
        </span>
      </div>

      <SettlementSequence
        payload={{
          sequenceId: `settlement-payout-${settlement.matchId}`,
          matchId: settlement.matchId,
          totalPotAmount: settlement.totalCollected,
          winners: [
            {
              playerId: "winner-authoritative",
              name: "Match Winner",
              payoutAmount: settlement.totalWalletRewarded,
              isSelf: false,
            },
          ],
          worldBankFeeAmount: settlement.totalWorldBankCut,
        }}
      />

      {settlement.totalGuestEscrow && settlement.totalGuestEscrow !== "0" && (
        <EscrowSequence
          payload={{
            sequenceId: `settlement-escrow-${settlement.matchId}`,
            matchId: settlement.matchId,
            voucherAmount: settlement.totalGuestEscrow,
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Total Pot</span>
          <CoinAmount amount={settlement.totalCollected} size="sm" className="font-bold" />
        </div>
        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Wallet Prizes</span>
          <CoinAmount amount={settlement.totalWalletRewarded} size="sm" className="font-bold text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">Guest Escrow</span>
          <CoinAmount amount={settlement.totalGuestEscrow} size="sm" className="font-bold text-purple-700 dark:text-purple-400" />
        </div>
        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <span className="text-[10px] text-ink-lo dark:text-text-lo block">World Bank</span>
          <CoinAmount amount={settlement.totalWorldBankCut} size="sm" className="font-bold text-indigo-700 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  );
};

export default SettlementView;

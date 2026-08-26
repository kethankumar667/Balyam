import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";
import { CeremonialSeatRing } from "./CeremonialSeatRing";
import { BalancePreview } from "./BalancePreview";
import { PrizeDistribution } from "./PrizeDistribution";
import { WorldBankContribution } from "./WorldBankContribution";
import { EconomyActionButton, type EconomyActionButtonState } from "./EconomyActionButton";
import { EconomyStatusBanner } from "./EconomyStatusBanner";
import { EconomySkeleton } from "./EconomySkeleton";
import { useCheckoutQuote } from "../../hooks/useEconomy";
import { commitMatchCheckout, type CommitMatchEntryRequest, EconomyClientError } from "../../lib/economyApi";

export interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  roomCode: string | null;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  isSolo?: boolean;
  onCommitSuccess?: () => void;
}

/**
 * Match Entry Fee Checkout Sheet.
 * Obtains an authoritative quote from POST /api/economy/checkout/quote
 * and allows the host to commit match funding via POST /api/economy/checkout/commit.
 *
 * Rules:
 * - Quote before commit.
 * - Server-authoritative calculations only (zero client math).
 * - Replay-safe UI handling (disables button during commit).
 */
export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  isOpen,
  onClose,
  matchId,
  roomCode,
  seatCount,
  humanSeatCount,
  botSeatCount,
  isSolo = false,
  onCommitSuccess,
}) => {
  const { quote, isLoading: quoteLoading, error: quoteError } = useCheckoutQuote(
    isOpen ? { seatCount, humanSeatCount, botSeatCount } : null,
  );

  const [buttonState, setButtonState] = useState<EconomyActionButtonState>("idle");
  const [commitError, setCommitError] = useState<string | null>(null);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);

  const handleCommit = async () => {
    if (!quote || !quote.hasSufficientFunds || buttonState === "loading") return;

    setButtonState("loading");
    setCommitError(null);

    const payload: CommitMatchEntryRequest = {
      matchId,
      roomCode,
      seatCount,
      humanSeatCount,
      botSeatCount,
      isSolo,
    };

    try {
      await commitMatchCheckout(payload);
      setButtonState("success");
      setIsCommitted(true);
      setTimeout(() => {
        onCommitSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setCommitError(
        err instanceof EconomyClientError ? err.message : "Failed to authorize match commitment.",
      );
      setButtonState("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-sans"
          role="dialog"
          aria-modal="true"
          aria-label="Match Entry Checkout"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#101524] border border-amber-600/30 dark:border-amber-400/20 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-ink-hi dark:text-text-hi">
                  Match Entry Checkout
                </h3>
                <span className="text-[11px] text-ink-lo dark:text-text-lo">
                  Room {roomCode ? `#${roomCode}` : matchId} • Authoritative Quote
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close checkout"
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quoteLoading ? (
              <EconomySkeleton variant="checkout" />
            ) : quoteError ? (
              <EconomyStatusBanner
                status="failed"
                title="Quote Unavailable"
                description={quoteError}
              />
            ) : quote ? (
              <div className="space-y-4">
                {/* Sovereign Table Ceremonial Ring */}
                <CeremonialSeatRing
                  seatCount={quote.seatCount}
                  humanCount={quote.humanSeatCount}
                  botCount={quote.botSeatCount}
                  totalPotAmount={quote.totalCommitment}
                  costPerSeat={quote.costPerSeat}
                />

                {/* Balance Preview Strip */}
                <BalancePreview
                  currentBalance={quote.hostBalance}
                  totalCommitment={quote.totalCommitment}
                  projectedBalance={quote.projectedBalance}
                  hasSufficientFunds={quote.hasSufficientFunds}
                  shortfall={quote.shortfall ?? undefined}
                />

                {/* Prize Breakdown & World Bank Cut */}
                <PrizeDistribution
                  seatCount={quote.seatCount}
                  firstPlace={quote.prizeDistribution.firstPlace}
                  secondPlace={quote.prizeDistribution.secondPlace}
                  thirdPlace={quote.prizeDistribution.thirdPlace}
                  worldBankCut={quote.worldBankContribution}
                />

                <WorldBankContribution amount={quote.worldBankContribution} showDescription={false} />

                {commitError && (
                  <EconomyStatusBanner
                    status="failed"
                    title="Commitment Failed"
                    description={commitError}
                  />
                )}

                {/* Footer Actions */}
                <div className="flex gap-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                  <EconomyActionButton
                    variant="secondary"
                    size="md"
                    onClick={onClose}
                    disabled={buttonState === "loading"}
                    className="flex-1"
                  >
                    Cancel
                  </EconomyActionButton>

                  <EconomyActionButton
                    variant="primary"
                    size="md"
                    state={buttonState}
                    onClick={handleCommit}
                    disabled={!quote.hasSufficientFunds || isCommitted}
                    className="flex-1"
                  >
                    {isCommitted
                      ? "Committed ✓"
                      : quote.hasSufficientFunds
                      ? "Confirm & Fund Table"
                      : "Insufficient Funds"}
                  </EconomyActionButton>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutSheet;

import React, { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { CoinTransferLayer, type ActiveCoinTransfer } from "./CoinTransferLayer";
import { GameStartSequence } from "./GameStartSequence";
import { SettlementSequence } from "./SettlementSequence";
import { RefundSequence } from "./RefundSequence";
import { EscrowSequence } from "./EscrowSequence";
import type {
  EconomyMotionPhase,
  MatchCommitmentMotionPayload,
  MatchSettlementMotionPayload,
  MatchRefundMotionPayload,
  GuestEscrowMotionPayload,
} from "./types";

export interface EconomyMotionOrchestratorProps {
  phase: EconomyMotionPhase;
  commitment?: MatchCommitmentMotionPayload | null;
  settlement?: MatchSettlementMotionPayload | null;
  refund?: MatchRefundMotionPayload | null;
  escrow?: GuestEscrowMotionPayload | null;
  errorMessage?: string | null;
  onGameStartComplete?: () => void;
  onClaimVoucher?: () => void;
  className?: string;
}

/**
 * Master Economy Motion Orchestrator.
 * Coordinates all visual chapters, manages non-blocking overlays, and provides polite live region announcements.
 */
export const EconomyMotionOrchestrator: React.FC<EconomyMotionOrchestratorProps> = ({
  phase,
  commitment,
  settlement,
  refund,
  escrow,
  errorMessage,
  onGameStartComplete,
  onClaimVoucher,
  className = "",
}) => {
  // Compute active coin flight transfers based on current phase and geometry
  const transfers: ActiveCoinTransfer[] = useMemo(() => {
    if (phase === "coins_departing" && commitment) {
      const source = commitment.hostWalletPoint || {
        x: typeof window !== "undefined" ? window.innerWidth - 80 : 300,
        y: 40,
      };
      const target = commitment.potPoint || {
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 200,
        y: typeof window !== "undefined" ? window.innerHeight / 2 : 200,
      };

      return [
        {
          id: `transfer-wallet-to-pot-${commitment.sequenceId}`,
          source,
          target,
          coinCount: 6,
          duration: 0.6,
        },
      ];
    }

    if (phase === "refunded" && refund && refund.potPoint && refund.walletPoint) {
      return [
        {
          id: `transfer-refund-${refund.sequenceId}`,
          source: refund.potPoint,
          target: refund.walletPoint,
          coinCount: 5,
          duration: 0.7,
          isReversed: true,
        },
      ];
    }

    return [];
  }, [phase, commitment, refund]);

  // Polite live announcement message
  const announcement = useMemo(() => {
    switch (phase) {
      case "awaiting_authority":
        return "Authorizing match entry...";
      case "commitment_confirmed":
      case "coins_departing":
        return commitment
          ? `Match entry of ${commitment.amountPerSeat} coins confirmed.`
          : "Match entry confirmed.";
      case "pot_formed":
        return commitment
          ? `Prize pool formed with ${commitment.totalPotAmount} coins.`
          : "Prize pool formed.";
      case "settled":
        return settlement
          ? `Match settled. Total payout ${settlement.totalPotAmount} coins.`
          : "Match settled.";
      case "refunded":
        return refund
          ? `Match refunded. ${refund.refundAmount} coins restored to wallet.`
          : "Match refunded.";
      case "escrowed":
        return escrow
          ? `Guest winnings of ${escrow.voucherAmount} coins stored in escrow voucher.`
          : "Winnings stored in escrow.";
      case "failed":
        return errorMessage || "Action could not be completed.";
      default:
        return "";
    }
  }, [phase, commitment, settlement, refund, escrow, errorMessage]);

  return (
    <div className={`economy-motion-orchestrator ${className}`}>
      {/* Screen Reader Live Region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* GPU Accelerated Coin Flight Layer */}
      <CoinTransferLayer transfers={transfers} />

      {/* Chapter 2: Game Start Countdown */}
      <AnimatePresence>
        {phase === "game_starting" && (
          <GameStartSequence
            gameTitle="BHALYAM Match"
            totalPotAmount={commitment?.totalPotAmount || "---"}
            onComplete={onGameStartComplete || (() => {})}
          />
        )}
      </AnimatePresence>

      {/* Chapter 3: Match Settlement View */}
      {phase === "settled" && settlement && (
        <SettlementSequence payload={settlement} />
      )}

      {/* Chapter 4: Refund View */}
      {phase === "refunded" && refund && (
        <RefundSequence payload={refund} />
      )}

      {/* Chapter 5: Guest Escrow View */}
      {phase === "escrowed" && escrow && (
        <EscrowSequence payload={escrow} onClaimVoucher={onClaimVoucher} />
      )}
    </div>
  );
};

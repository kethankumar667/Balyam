import React from "react";
import { Play, RotateCcw, Award, Lock, XCircle, RefreshCw } from "lucide-react";
import { useEconomyMotion } from "./useEconomyMotion";
import { EconomyMotionOrchestrator } from "./EconomyMotionOrchestrator";
import { CeremonialSeatRing } from "../CeremonialSeatRing";
import { PrizePot } from "./PrizePot";

/**
 * Interactive Economy Motion System Showcase.
 * Demonstrates the 5 lifecycle chapters using typed synthetic fixtures.
 */
export const EconomyMotionShowcase: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const {
    phase,
    activeCommitment,
    activeSettlement,
    activeRefund,
    activeEscrow,
    errorMessage,
    startAwaitingAuthority,
    triggerCommitmentSequence,
    triggerSettlementSequence,
    triggerRefundSequence,
    triggerEscrowSequence,
    cancelMotion,
    resetMotion,
  } = useEconomyMotion();

  const handleRunCommitment = () => {
    startAwaitingAuthority();
    window.setTimeout(() => {
      triggerCommitmentSequence({
        sequenceId: `seq-commit-${Date.now()}`,
        matchId: "match-demo-001",
        amountPerSeat: "100",
        totalPotAmount: "400",
        seats: [
          { seatId: "s1", seatNumber: 1, name: "Host (You)", isHost: true, isSelf: true },
          { seatId: "s2", seatNumber: 2, name: "Raju", isSelf: false },
          { seatId: "s3", seatNumber: 3, name: "Sneha", isSelf: false },
          { seatId: "s4", seatNumber: 4, name: "Bot 4", isBot: true, isSelf: false },
        ],
      });
    }, 600);
  };

  const handleRunSettlement = () => {
    triggerSettlementSequence({
      sequenceId: `seq-settle-${Date.now()}`,
      matchId: "match-demo-001",
      totalPotAmount: "400",
      winners: [
        { playerId: "p1", name: "Host (You)", payoutAmount: "360", isSelf: true },
      ],
      worldBankFeeAmount: "40",
    });
  };

  const handleRunRefund = () => {
    triggerRefundSequence({
      sequenceId: `seq-refund-${Date.now()}`,
      matchId: "match-demo-001",
      refundAmount: "100",
      reason: "Opponent disconnected before turn 1. Entry refunded to host wallet.",
    });
  };

  const handleRunEscrow = () => {
    triggerEscrowSequence({
      sequenceId: `seq-escrow-${Date.now()}`,
      matchId: "match-demo-001",
      voucherAmount: "360",
      voucherCode: "BH-ESCROW-789",
    });
  };

  const handleRunError = () => {
    startAwaitingAuthority();
    window.setTimeout(() => {
      cancelMotion("Insufficient wallet balance to commit match seats.");
    }, 800);
  };

  return (
    <div className={`p-6 rounded-3xl border border-amber-600/30 bg-black/20 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-600/20">
        <div>
          <h2 className="text-xl font-black text-ink-hi dark:text-text-hi flex items-center gap-2">
            <span>Economy Motion System Showcase</span>
          </h2>
          <p className="text-xs text-ink-lo dark:text-text-lo mt-0.5">
            Production-grade choreographed lifecycle for match commitments, prize pots, settlements, and escrow.
          </p>
        </div>

        {/* Phase Badge */}
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 w-fit">
          Phase: {phase}
        </span>
      </div>

      {/* Control Actions Bar */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={handleRunCommitment}
          disabled={phase !== "idle" && phase !== "complete"}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>1. Match Commitment</span>
        </button>

        <button
          type="button"
          onClick={handleRunSettlement}
          disabled={phase !== "idle" && phase !== "complete"}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <Award className="w-3.5 h-3.5" />
          <span>2. Settlement Payout</span>
        </button>

        <button
          type="button"
          onClick={handleRunRefund}
          disabled={phase !== "idle" && phase !== "complete"}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>3. Refund Reversal</span>
        </button>

        <button
          type="button"
          onClick={handleRunEscrow}
          disabled={phase !== "idle" && phase !== "complete"}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>4. Guest Escrow</span>
        </button>

        <button
          type="button"
          onClick={handleRunError}
          disabled={phase !== "idle" && phase !== "complete"}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>5. Rejected Failure</span>
        </button>

        <button
          type="button"
          onClick={resetMotion}
          className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px] ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Stage Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-center p-6 rounded-2xl bg-black/10 border border-white/5 min-h-[300px]">
        {/* Left: Sovereign Ceremonial Seat Ring */}
        <div className="flex flex-col items-center justify-center">
          <CeremonialSeatRing
            seatCount={4}
            humanCount={3}
            botCount={1}
            totalPotAmount="400"
            costPerSeat="100"
            isIlluminated={phase === "seats_funded" || phase === "pot_formed"}
          />
        </div>

        {/* Right: Central Prize Pot */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <PrizePot
            amount="400"
            isCommitted={phase === "pot_formed" || phase === "game_starting" || phase === "settled"}
            isForming={phase === "coins_departing"}
            isElevated={phase === "settled"}
          />
        </div>
      </div>

      {/* Active Orchestrator Render Layer */}
      <EconomyMotionOrchestrator
        phase={phase}
        commitment={activeCommitment}
        settlement={activeSettlement}
        refund={activeRefund}
        escrow={activeEscrow}
        errorMessage={errorMessage}
      />
    </div>
  );
};

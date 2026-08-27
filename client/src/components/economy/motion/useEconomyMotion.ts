import { useState, useCallback, useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import type {
  EconomyMotionPhase,
  MatchCommitmentMotionPayload,
  MatchSettlementMotionPayload,
  MatchRefundMotionPayload,
  GuestEscrowMotionPayload,
  OptionalSoundHooks,
} from "./types";

export interface UseEconomyMotionOptions {
  soundHooks?: OptionalSoundHooks;
  onPhaseChange?: (phase: EconomyMotionPhase) => void;
  onSequenceComplete?: (sequenceId: string) => void;
}

export function useEconomyMotion(options: UseEconomyMotionOptions = {}) {
  const { soundHooks, onPhaseChange, onSequenceComplete } = options;
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<EconomyMotionPhase>("idle");
  const [activeCommitment, setActiveCommitment] = useState<MatchCommitmentMotionPayload | null>(null);
  const [activeSettlement, setActiveSettlement] = useState<MatchSettlementMotionPayload | null>(null);
  const [activeRefund, setActiveRefund] = useState<MatchRefundMotionPayload | null>(null);
  const [activeEscrow, setActiveEscrow] = useState<GuestEscrowMotionPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Idempotency tracking: Set of completed sequence IDs
  const completedSequencesRef = useRef<Set<string>>(new Set());
  const activeTimersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    activeTimersRef.current.forEach((t) => window.clearTimeout(t));
    activeTimersRef.current = [];
  }, []);

  const changePhase = useCallback(
    (nextPhase: EconomyMotionPhase) => {
      setPhase(nextPhase);
      onPhaseChange?.(nextPhase);
    },
    [onPhaseChange],
  );

  const recordCompletedSequence = useCallback((sequenceId: string) => {
    // Enforce memory bound: keep max 50 recent sequence IDs
    if (completedSequencesRef.current.size >= 50) {
      const first = completedSequencesRef.current.values().next().value;
      if (first) {
        completedSequencesRef.current.delete(first);
      }
    }
    completedSequencesRef.current.add(sequenceId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  /**
   * 1. Start Anticipation state (while server authority is pending).
   * Note: NEVER deducts coins or animates flight here.
   */
  const startAwaitingAuthority = useCallback(() => {
    clearTimers();
    setErrorMessage(null);
    changePhase("awaiting_authority");
  }, [clearTimers, changePhase]);

  /**
   * 2. Trigger Authoritative Match Commitment Sequence (Chapter 1 & 2)
   */
  const triggerCommitmentSequence = useCallback(
    (payload: MatchCommitmentMotionPayload) => {
      if (completedSequencesRef.current.has(payload.sequenceId)) {
        // Idempotency check: ignore duplicate events
        return;
      }

      clearTimers();
      setErrorMessage(null);
      setActiveCommitment(payload);
      soundHooks?.onCommitSound?.();

      if (reduceMotion) {
        // Reduced motion: jump directly to pot_formed and complete
        changePhase("pot_formed");
        const t = window.setTimeout(() => {
          changePhase("complete");
          recordCompletedSequence(payload.sequenceId);
          onSequenceComplete?.(payload.sequenceId);
        }, 500);
        activeTimersRef.current.push(t);
        return;
      }

      changePhase("commitment_confirmed");

      // Step 1: Coins departing from host wallet
      const t1 = window.setTimeout(() => {
        changePhase("coins_departing");
        soundHooks?.onCoinClinkSound?.();
      }, 400);

      // Step 2: Seats funded
      const t2 = window.setTimeout(() => {
        changePhase("seats_funded");
      }, 1000);

      // Step 3: Pot formed
      const t3 = window.setTimeout(() => {
        changePhase("pot_formed");
        soundHooks?.onPotFormSound?.();
      }, 1500);

      // Step 4: Game start sequence
      const t4 = window.setTimeout(() => {
        changePhase("game_starting");
      }, 2100);

      // Step 5: Complete
      const t5 = window.setTimeout(() => {
        changePhase("complete");
        recordCompletedSequence(payload.sequenceId);
        onSequenceComplete?.(payload.sequenceId);
      }, 3600);

      activeTimersRef.current.push(t1, t2, t3, t4, t5);
    },
    [clearTimers, changePhase, reduceMotion, soundHooks, onSequenceComplete],
  );

  /**
   * 3. Trigger Authoritative Settlement Sequence (Chapter 3)
   */
  const triggerSettlementSequence = useCallback(
    (payload: MatchSettlementMotionPayload) => {
      if (completedSequencesRef.current.has(payload.sequenceId)) {
        return;
      }

      clearTimers();
      setErrorMessage(null);
      setActiveSettlement(payload);
      changePhase("settled");
      soundHooks?.onWinFanfareSound?.();

      const duration = reduceMotion ? 600 : 2200;
      const t = window.setTimeout(() => {
        changePhase("complete");
        recordCompletedSequence(payload.sequenceId);
        onSequenceComplete?.(payload.sequenceId);
      }, duration);

      activeTimersRef.current.push(t);
    },
    [clearTimers, changePhase, reduceMotion, soundHooks, onSequenceComplete],
  );

  /**
   * 4. Trigger Authoritative Refund Sequence (Chapter 4)
   */
  const triggerRefundSequence = useCallback(
    (payload: MatchRefundMotionPayload) => {
      if (completedSequencesRef.current.has(payload.sequenceId)) {
        return;
      }

      clearTimers();
      setErrorMessage(null);
      setActiveRefund(payload);
      changePhase("refunded");
      soundHooks?.onRefundSound?.();

      const duration = reduceMotion ? 500 : 1800;
      const t = window.setTimeout(() => {
        changePhase("complete");
        recordCompletedSequence(payload.sequenceId);
        onSequenceComplete?.(payload.sequenceId);
      }, duration);

      activeTimersRef.current.push(t);
    },
    [clearTimers, changePhase, reduceMotion, soundHooks, onSequenceComplete],
  );

  /**
   * 5. Trigger Guest Escrow Sequence (Chapter 5)
   */
  const triggerEscrowSequence = useCallback(
    (payload: GuestEscrowMotionPayload) => {
      if (completedSequencesRef.current.has(payload.sequenceId)) {
        return;
      }

      clearTimers();
      setErrorMessage(null);
      setActiveEscrow(payload);
      changePhase("escrowed");
      soundHooks?.onEscrowSound?.();

      const duration = reduceMotion ? 500 : 2000;
      const t = window.setTimeout(() => {
        changePhase("complete");
        recordCompletedSequence(payload.sequenceId);
        onSequenceComplete?.(payload.sequenceId);
      }, duration);

      activeTimersRef.current.push(t);
    },
    [clearTimers, changePhase, reduceMotion, soundHooks, onSequenceComplete],
  );

  /**
   * 6. Cancel & Halt (on error or rejected commitment)
   */
  const cancelMotion = useCallback(
    (error?: string) => {
      clearTimers();
      setErrorMessage(error || "Action cancelled");
      changePhase("failed");
      soundHooks?.onErrorSound?.();

      const t = window.setTimeout(() => {
        changePhase("idle");
      }, 2500);
      activeTimersRef.current.push(t);
    },
    [clearTimers, changePhase, soundHooks],
  );

  /**
   * 7. Reset to clean idle
   */
  const resetMotion = useCallback(() => {
    clearTimers();
    setActiveCommitment(null);
    setActiveSettlement(null);
    setActiveRefund(null);
    setActiveEscrow(null);
    setErrorMessage(null);
    changePhase("idle");
  }, [clearTimers, changePhase]);

  return {
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
  };
}

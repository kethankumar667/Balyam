import { useEffect, useState } from "react";
import { secondsUntil, useFaucetStore } from "../store/faucetStore";

/**
 * What every free-coins control needs to know, in one place: can the player claim
 * right now, and if not, how long is left.
 *
 * The header chip, the wallet row and the ready dot all read it, so they cannot
 * disagree about whether a claim is available. The countdown runs on the server's
 * clock (see `faucetStore`) and ticks once a second only while a wait is on screen.
 */
export interface FaucetCountdown {
  /** Signed-in players only; everyone else sees no faucet at all. */
  isEligible: boolean;
  isWaiting: boolean;
  /** A claim can be made right now. */
  isReady: boolean;
  isClaiming: boolean;
  /** Whole seconds left; 0 when nothing is pending. */
  remainingSeconds: number;
  amount: number;
}

export function useFaucetCountdown(): FaucetCountdown {
  const status = useFaucetStore((s) => s.status);
  const clockOffsetMs = useFaucetStore((s) => s.clockOffsetMs);
  const isClaiming = useFaucetStore((s) => s.isClaiming);
  const [, setTick] = useState(0);

  const nextClaimAt = status?.nextClaimAt ?? null;
  const remainingSeconds = secondsUntil(nextClaimAt, clockOffsetMs);
  const isWaiting = nextClaimAt !== null && remainingSeconds > 0;
  const isEligible = Boolean(status?.eligible);

  useEffect(() => {
    if (!isWaiting) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 1_000);
    return () => window.clearInterval(id);
  }, [isWaiting]);

  return {
    isEligible,
    isWaiting,
    isReady: isEligible && !isWaiting && !isClaiming,
    isClaiming,
    remainingSeconds,
    amount: status?.amount ?? 0,
  };
}

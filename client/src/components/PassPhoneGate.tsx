import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";

/**
 * Pass-and-play turn gate.
 *
 * Used by Ludo and Snakes & Ladders when the host is driving extra "local"
 * seats on a single device. Whenever the active player changes to a local
 * seat, the gate shows a full-screen "Pass the phone to <name>" overlay
 * that blocks interaction until that player taps to continue.
 *
 * Behavior:
 *   - Only renders when `isHost` is true AND `activePlayer.isLocal === true`.
 *   - Tracks the active player id; resets the "acknowledged" flag every
 *     time the id changes so we re-show the gate at each turn handover.
 *   - The host's own turn does NOT trigger the gate (they're already at
 *     the phone — no handover needed).
 *
 * Children are the actual game board. We don't unmount them — we just
 * cover them with an opaque overlay so any in-flight animations,
 * websocket subscriptions, etc. stay intact.
 */
export default function PassPhoneGate({
  activePlayerId,
  players,
  isHost,
  children,
}: {
  activePlayerId: string | null;
  players: Player[];
  isHost: boolean;
  children: React.ReactNode;
}) {
  const activePlayer = activePlayerId
    ? players.find((p) => p.id === activePlayerId) ?? null
    : null;
  const shouldGate = isHost && activePlayer?.isLocal === true;

  // Track which turn we've acknowledged. Resetting on activePlayerId change
  // means every handover re-shows the gate, even between back-to-back local
  // seats.
  const [acknowledgedForId, setAcknowledgedForId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(activePlayerId);
  useEffect(() => {
    if (lastIdRef.current !== activePlayerId) {
      lastIdRef.current = activePlayerId;
      // New turn — drop any prior acknowledgement.
      setAcknowledgedForId(null);
    }
  }, [activePlayerId]);

  const acknowledged = acknowledgedForId === activePlayerId;
  const showOverlay = shouldGate && !acknowledged;

  return (
    <div className="relative">
      {children}
      {showOverlay && activePlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pass-phone-title"
          className="absolute inset-0 z-30 rounded-2xl flex items-center justify-center
                     bg-zinc-950/85 backdrop-blur-sm animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setAcknowledgedForId(activePlayerId)}
            className="m-4 max-w-md w-full rounded-2xl bg-bhalyam-cream-soft text-bhalyam-wood-dark
                       border-2 border-bhalyam-gold-dark p-6 sm:p-7 text-center cursor-pointer
                       shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]
                       hover:bg-bhalyam-cream-warm active:translate-y-px
                       focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70 focus:ring-offset-2 focus:ring-offset-zinc-900
                       transition-all duration-200"
            aria-label={`Pass the phone to ${activePlayer.name} and tap to continue`}
          >
            <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood/70">
              Pass the phone
            </div>
            <div className="mt-2 font-black text-[28px] sm:text-[34px] leading-tight">
              {activePlayer.name}'s turn
            </div>
            <div className="mt-3 text-[13px] sm:text-[14px] text-bhalyam-wood-dark/80">
              Hand the phone to <span className="font-bold">{activePlayer.name}</span>{" "}
              and tap anywhere to continue.
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bhalyam-gold-leaf
                            text-bhalyam-wood-dark font-bold text-[14px] px-5 py-2
                            border border-bhalyam-gold-dark">
              Tap to play
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { fireUnoDeclareConfetti } from "./uno-confetti";

export interface UnoCallButtonProps {
  visible: boolean;
  onDeclare: () => void;
}

/**
 * The "UNO!" declare button — appears the instant the player's own hand
 * drops to 1 card and disappears the moment they declare (or play their
 * last card and win outright). Deliberately has no numeric countdown: the
 * official rule has no clock (Volume 4 §18 — "before the next player's
 * turn begins" / "if another player notices first"), and the engine models
 * it the same way (advisory, not a hard deadline — see UNO_GAME_PLAN.md
 * §14.4) so there is no deadline value to visualize. The urgency comes from
 * the pulse animation and the fact that any opponent can catch you for as
 * long as this button is showing, not from a ring draining down.
 *
 * Positioned by the caller — renders as a plain circular button, not a
 * viewport-fixed overlay, so it can sit naturally inside the circular
 * table layout (uno-table.tsx) instead of floating over the whole screen.
 */
export function UnoCallButton({ visible, onDeclare }: UnoCallButtonProps) {
  if (!visible) return null;
  return (
    <button
      onClick={onDeclare}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full text-base sm:text-lg font-black uppercase tracking-wide text-white shadow-2xl animate-pulse flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at 35% 30%, #F76C5E, #E23E2E 55%, #B91C1C 100%)",
        border: "4px solid #FFF9F0",
        boxShadow: "0 10px 24px rgba(185,28,28,0.55), inset 0 2px 4px rgba(255,255,255,0.35)",
      }}
      aria-label="Declare UNO — you have one card left"
    >
      UNO
    </button>
  );
}

/**
 * Small "UNO!" speech bubble that pops above the local player's own seat
 * right after a successful declaration, then fades. Purely decorative —
 * the actual declaration already happened server-side by the time this
 * shows; this just gives the moment a beat of celebration matching Volume
 * 8 §19's "this moment deserves special attention."
 */
export function UnoDeclareBubble({ declared }: { declared: boolean }) {
  const [show, setShow] = useState(false);
  const prevDeclared = useRef(false);

  useEffect(() => {
    if (declared && !prevDeclared.current) {
      setShow(true);
      fireUnoDeclareConfetti();
      const t = window.setTimeout(() => setShow(false), 2200);
      prevDeclared.current = declared;
      return () => window.clearTimeout(t);
    }
    prevDeclared.current = declared;
  }, [declared]);

  if (!show) return null;

  return (
    <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce" aria-hidden>
      <div
        className="relative px-3 py-1 rounded-2xl text-sm font-black text-white whitespace-nowrap"
        style={{ background: "#B91C1C", border: "2px solid #FFF9F0" }}
      >
        UNO!
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "7px solid #B91C1C",
          }}
        />
      </div>
    </div>
  );
}

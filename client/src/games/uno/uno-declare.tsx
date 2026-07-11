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
 */
export function UnoCallButton({ visible, onDeclare }: UnoCallButtonProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center pointer-events-none px-4">
      <button
        onClick={onDeclare}
        className="pointer-events-auto rounded-full px-8 py-3 text-lg font-black uppercase tracking-wider text-white shadow-2xl animate-pulse"
        style={{
          background: "linear-gradient(135deg, #E23E2E, #B91C1C)",
          border: "3px solid #17181d",
        }}
        aria-label="Declare UNO — you have one card left"
      >
        UNO!
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

export interface UnoActionToastProps {
  lastAction: string | null;
}

/**
 * Surfaces `UnoPublicState.lastAction` — the engine already produces a
 * human-readable description on every state-changing move ("Skip! Next
 * player skipped.", "Wild Draw Four! Next player draws 4.") but nothing
 * rendered it before this (see UNO_GAME_PLAN.md §8.4). Small, centred,
 * auto-dismissing banner — same "watch for a new value, show, fade" shape
 * as the room-level ChatMessageToast, scoped to UNO's own cream/gold table
 * instead of floating over the whole viewport.
 */
export function UnoActionToast({ lastAction }: UnoActionToastProps) {
  const lastSeenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    // First render: adopt whatever lastAction already exists (e.g. "Dealt 7
    // cards...") as "seen" so we don't toast it — that moment is already
    // covered by the deal overlay.
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSeenRef.current = lastAction;
      return;
    }
    if (lastAction === lastSeenRef.current) return;
    lastSeenRef.current = lastAction;
    if (!lastAction) return;
    setVisible(lastAction);
  }, [lastAction]);

  useEffect(() => {
    if (!visible) return;
    // A round transition (Volume 2/6 multi-round matches) silently refills
    // every player's hand — the standard 2.6s fade was easy to miss for an
    // event that big, so it gets more time on screen and a bolder look
    // below, keyed off the engine's own stable "Round N!" prefix
    // (UnoEngine.startNewRound) rather than a new state field.
    const isRoundBanner = visible.startsWith("Round ");
    const t = window.setTimeout(() => setVisible(null), isRoundBanner ? 4200 : 2600);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  const isRoundBanner = visible.startsWith("Round ");

  return (
    <div className="pointer-events-none flex justify-center px-2" aria-live="polite">
      <span
        className={`pointer-events-auto max-w-full truncate rounded-full shadow-md animate-[fadeIn_150ms_ease-out] ${
          isRoundBanner
            ? "px-6 py-2.5 text-[15px] font-black uppercase tracking-wide"
            : "px-4 py-1.5 text-[12px] font-bold"
        }`}
        style={{
          background: "linear-gradient(135deg, #F7DA8B, #E6A11E)",
          color: "#2B2118",
          border: isRoundBanner ? "2px solid #6D4323" : "1px solid #6D4323",
          boxShadow: isRoundBanner ? "0 8px 22px -4px rgba(0,0,0,0.55)" : undefined,
        }}
      >
        {visible}
      </span>
    </div>
  );
}

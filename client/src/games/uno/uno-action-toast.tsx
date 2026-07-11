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
    const t = window.setTimeout(() => setVisible(null), 2600);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none flex justify-center px-2" aria-live="polite">
      <span
        className="pointer-events-auto max-w-full truncate rounded-full px-4 py-1.5 text-[12px] font-bold shadow-md animate-[fadeIn_150ms_ease-out]"
        style={{
          background: "linear-gradient(135deg, #F7DA8B, #E6A11E)",
          color: "#2B2118",
          border: "1px solid #6D4323",
        }}
      >
        {visible}
      </span>
    </div>
  );
}

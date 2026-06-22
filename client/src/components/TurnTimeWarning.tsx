import { useEffect, useRef, useState } from "react";
import { useHaptics } from "../hooks/useHaptics";

/**
 * Shared "your turn is almost up" hint.
 *
 * Identical to the version baked into RummyBoardMobile — extracted so
 * Word Building, Dots & Boxes (and any future turn-based game) get the
 * same affordance without duplicating CSS keyframes. The keyframe
 * `rummy-time-pulse` is defined in [index.css](../index.css).
 *
 *   • Fires only when `active` is true AND ≤ 10 s remain
 *   • Amber border + chip in the warning window, switching to red at ≤5 s
 *   • One-shot subtle haptic the moment we cross into the window
 *
 * Pointer-events disabled so the player can keep interacting underneath.
 */
export function TurnTimeWarning({
  deadline,
  active,
}: {
  deadline: number | null | undefined;
  active: boolean;
}) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  const haptics = useHaptics();
  const warned = useRef(false);

  const showWarning = active && deadline != null && secondsLeft <= 10 && secondsLeft > 0;
  const critical = active && deadline != null && secondsLeft <= 5 && secondsLeft > 0;

  useEffect(() => {
    if (!active || deadline == null) {
      warned.current = false;
      return;
    }
    if (showWarning && !warned.current) {
      warned.current = true;
      haptics.subtle();
    }
    if (!showWarning) warned.current = false;
  }, [active, deadline, showWarning, haptics]);

  if (!showWarning) return null;

  const color = critical ? "#ef4444" : "#f59e0b";
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          boxShadow: `inset 0 0 0 4px ${color}, inset 0 0 32px ${color}88`,
          animation: "rummy-time-pulse 900ms ease-in-out infinite",
        }}
      />
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0))",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="px-3 py-1.5 rounded-full text-sm font-extrabold tabular-nums shadow-2xl flex items-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${color}, #7f1d1d)`,
            color: "#fff7ed",
            border: "2px solid rgba(255,255,255,0.6)",
            boxShadow: `0 6px 20px ${color}aa, 0 0 0 1px rgba(0,0,0,0.4)`,
            animation: "rummy-time-pulse 900ms ease-in-out infinite",
          }}
        >
          <span>⏱</span>
          <span>{secondsLeft}s left</span>
        </div>
      </div>
    </>
  );
}

/**
 * Whole seconds remaining on the current turn. Recomputes 4× per second
 * via a single interval so the countdown stays live without forcing a
 * full board re-render. Stops the interval when no deadline is set.
 */
export function useTurnSecondsLeft(deadline: number | null | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline == null) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

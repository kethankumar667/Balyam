import { useEffect, useRef, useState } from "react";
import type { UnoColor } from "@shared/types";

export interface WildColorSplashEvent {
  key: string;
  color: UnoColor;
}

/**
 * Watches `lastAction` for a Wild/Wild Draw Four colour choice resolving
 * — the engine's own "… chose Green!" text, the same signal
 * `UnoActionToast` already keys its emphasized-pill treatment off of —
 * and returns a fresh trigger event carrying the just-chosen colour from
 * `currentColor` (authoritative, so no colour-name text parsing needed).
 *
 * Table-wide, like Reverse: everyone at the table sees the felt get
 * repainted, not just the player who played the Wild. `UnoActionToast`
 * is left completely untouched — it still shows the accessible text
 * banner; this is a purely additional visual layer at the pile.
 */
export function useWildColorSplash(lastAction: string | null, currentColor: UnoColor | null): WildColorSplashEvent | null {
  const [active, setActive] = useState<WildColorSplashEvent | null>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (lastAction && lastAction !== prev.current && lastAction.includes("chose ") && currentColor) {
      prev.current = lastAction;
      const key = `wild-${Date.now()}`;
      setActive({ key, color: currentColor });
      const t = window.setTimeout(() => setActive(null), 1300);
      return () => window.clearTimeout(t);
    }
    prev.current = lastAction;
  }, [lastAction, currentColor]);

  return active;
}

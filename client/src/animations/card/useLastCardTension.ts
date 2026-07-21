import { useEffect, useRef, useState } from "react";

export interface LastCardTensionEvent {
  key: string;
  playerId: string;
}

/**
 * Watches `state.handSizes` for any player's hand transitioning TO
 * exactly 1 card (from a different size) — the dread beat right as it
 * happens, independent of whether/when they go on to declare. Distinct
 * from `useUnoCallCelebration` (#6), which fires on the DECLARE itself;
 * this fires on the COUNTDOWN hitting zero, for every seated player, not
 * just self.
 */
export function useLastCardTension(handSizes: Record<string, number>): LastCardTensionEvent | null {
  const [active, setActive] = useState<LastCardTensionEvent | null>(null);
  const prevSizes = useRef<Record<string, number>>({});

  useEffect(() => {
    const prev = prevSizes.current;
    const justHitOne = Object.entries(handSizes).find(([id, size]) => size === 1 && prev[id] !== 1 && prev[id] !== undefined);
    prevSizes.current = { ...handSizes };
    if (justHitOne) {
      const [playerId] = justHitOne;
      const key = `lastcard-${playerId}-${Date.now()}`;
      setActive({ key, playerId });
      const t = window.setTimeout(() => setActive(null), 1400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(handSizes)]);

  return active;
}

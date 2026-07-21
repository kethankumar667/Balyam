import { useEffect, useRef, useState } from "react";

/**
 * Watches `lastAction` for a Jump-In resolving (`UnoEngine.handleJumpIn`
 * sets `lastAction = "${name} jumped in!"`) and returns a fresh trigger
 * key. Table-wide, like Reverse/Wild — `lastAction` only carries the
 * jumper's NAME, not their id, and name-matching against `players` would
 * be fragile with duplicate display names, so this reads as a shared
 * "cards just clashed" moment rather than being pinned to one seat.
 */
export function useJumpInDuel(lastAction: string | null): string | null {
  const [active, setActive] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (lastAction && lastAction !== prev.current && lastAction.endsWith("jumped in!")) {
      prev.current = lastAction;
      const key = `duel-${Date.now()}`;
      setActive(key);
      const t = window.setTimeout(() => setActive(null), 1100);
      return () => window.clearTimeout(t);
    }
    prev.current = lastAction;
  }, [lastAction]);

  return active;
}

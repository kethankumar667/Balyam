import { useEffect, useRef, useState } from "react";

export interface FakeCelebrationEvent {
  key: string;
  playerId: string;
}

/**
 * The inverse of `useUnoCallCelebration` (#6): watches `unoDeclaredBy`
 * for a player being REMOVED (they'd declared, then their hand size
 * changed away from 1 — `UnoEngine.syncUnoDeclaration` drops them, e.g.
 * after being hit by a +2/+4/stack while sitting on their declared last
 * card). Their celebration gets cut short — a "false start" gag.
 */
export function useFakeCelebration(unoDeclaredBy: string[]): FakeCelebrationEvent | null {
  const [active, setActive] = useState<FakeCelebrationEvent | null>(null);
  const prevSet = useRef<Set<string>>(new Set());
  const hasSeenFirst = useRef(false);

  useEffect(() => {
    const nextSet = new Set(unoDeclaredBy);
    // Skip the very first render — an empty-to-populated transition on
    // mount (e.g. reconnecting mid-round) is not a "removal".
    if (!hasSeenFirst.current) {
      hasSeenFirst.current = true;
      prevSet.current = nextSet;
      return;
    }
    const removed = [...prevSet.current].find((id) => !nextSet.has(id));
    prevSet.current = nextSet;
    if (removed) {
      const key = `fakecelebration-${removed}-${Date.now()}`;
      setActive({ key, playerId: removed });
      const t = window.setTimeout(() => setActive(null), 1200);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unoDeclaredBy.join(",")]);

  return active;
}

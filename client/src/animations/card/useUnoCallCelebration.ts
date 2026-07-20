import { useEffect, useRef, useState } from "react";

export interface UnoCallCelebrationEvent {
  key: string;
  playerId: string;
}

/**
 * Watches `state.unoDeclaredBy` for a player NEWLY added (diffed against
 * the previous broadcast, not just "non-empty") and returns an event
 * naming who just declared — works for self or any opponent, since the
 * server keeps this array in sync for the whole table
 * (`UnoEngine.syncUnoDeclaration`), unlike the existing
 * `UnoDeclareBubble`/`fireUnoDeclareConfetti` pair, which is
 * self-only and purely local/optimistic.
 *
 * `syncUnoDeclaration` also REMOVES ids from this array when a hand size
 * changes away from 1 (e.g. after being caught) — that only ever shows
 * up as a removal here, never a false "new declare" addition.
 */
export function useUnoCallCelebration(unoDeclaredBy: string[]): UnoCallCelebrationEvent | null {
  const [active, setActive] = useState<UnoCallCelebrationEvent | null>(null);
  const prevSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nextSet = new Set(unoDeclaredBy);
    const newlyDeclared = unoDeclaredBy.find((id) => !prevSet.current.has(id));
    prevSet.current = nextSet;
    if (newlyDeclared) {
      const key = `unocall-${newlyDeclared}-${Date.now()}`;
      setActive({ key, playerId: newlyDeclared });
      const t = window.setTimeout(() => setActive(null), 1400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unoDeclaredBy.join(",")]);

  return active;
}

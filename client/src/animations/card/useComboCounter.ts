import { useEffect, useRef, useState } from "react";
import type { UnoPublicState } from "@shared/types";

export interface ComboEvent {
  key: string;
  count: number;
}

/**
 * Tracks consecutive `lastHit` events landing within `windowMs` of each
 * other — a real streak of action cards (any kind) hitting the table
 * back to back — and returns an escalating combo count. Resets to
 * nothing the instant a hit-free gap longer than `windowMs` elapses.
 * Deliberately only fires from `count >= 2` (a single hit is just the
 * normal per-kind cinematic already playing; this is the META layer on
 * top for genuine chains).
 */
export function useComboCounter(lastHit: UnoPublicState["lastHit"], windowMs = 3200): ComboEvent | null {
  const [active, setActive] = useState<ComboEvent | null>(null);
  const prevKey = useRef<string | null>(null);
  const lastHitAt = useRef<number>(0);
  const streak = useRef<number>(0);

  useEffect(() => {
    const key = lastHit ? JSON.stringify(lastHit) : null;
    if (!key || key === prevKey.current) return;
    prevKey.current = key;

    const now = Date.now();
    streak.current = now - lastHitAt.current <= windowMs ? streak.current + 1 : 1;
    lastHitAt.current = now;

    if (streak.current >= 2) {
      const count = streak.current;
      setActive({ key: `combo-${count}-${now}`, count });
      const t = window.setTimeout(() => setActive(null), 1300);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastHit]);

  return active;
}

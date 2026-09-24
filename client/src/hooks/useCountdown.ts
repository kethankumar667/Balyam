import { useEffect, useState } from "react";

/**
 * Milliseconds remaining until `endsAt` (epoch ms), re-rendering once a second
 * while there is time left. Returns 0 for `null` or a time already passed, and
 * stops ticking at 0 so an idle component costs nothing.
 */
/**
 * Whether `endsAt` (epoch ms) is still in the future — and nothing more.
 *
 * Unlike `useCountdown` this does NOT tick every second: it schedules a single
 * timer for the moment the time runs out, so a component that only needs an
 * on/off answer (a badge, a disabled state) re-renders when the state actually
 * changes rather than 14,400 times over a four-hour window.
 */
export function useIsCountingDown(endsAt: number | null): boolean {
  const [, bump] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) return;
    // A small margin: timers can fire a millisecond early, which would leave
    // the answer stuck on "still counting down" with nothing to re-render it.
    const id = window.setTimeout(() => bump((n) => n + 1), remaining + 50);
    return () => window.clearTimeout(id);
  }, [endsAt]);

  return endsAt !== null && endsAt > Date.now();
}

export function useCountdown(endsAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return endsAt === null ? 0 : Math.max(0, endsAt - now);
}

import { useEffect, useState } from "react";

/**
 * Milliseconds remaining until `endsAt` (epoch ms), re-rendering once a second
 * while there is time left. Returns 0 for `null` or a time already passed, and
 * stops ticking at 0 so an idle component costs nothing.
 */
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

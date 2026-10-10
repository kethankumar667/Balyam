import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Counts from 0 up to `end` over `ms`, easing out, then stays there.
 *
 * Returns 0 while `enabled` is false, so a number can be armed by a state change (a claim paid, a
 * prize landing) and not before. With reduced motion it simply shows `end`: the information is the
 * same, only the journey is skipped.
 *
 * Like `CountUp`, it paints the final value at once under test, where there is no animation clock to wait on.
 *
 * Used for coin amounts in the celebration surfaces. It exists beside `CountUp` because that one
 * is a scroll-spy ticker and logs an error when mounted inside a portal.
 */
export function useCountTicker(end: number, ms: number, enabled: boolean): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (reduceMotion || import.meta.env.MODE === "test") {
      setValue(end);
      return undefined;
    }
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / ms);
      setValue(Math.round(end * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [end, ms, enabled, reduceMotion]);

  return enabled ? value : 0;
}

export default useCountTicker;

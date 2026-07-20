import { useCallback } from "react";
import { useSpring } from "@react-spring/web";

/**
 * One-shot elastic "pop in" — scale/rotate overshoot then settle, at
 * rest (scale 0) until `play()` is called. Promoted out of
 * `WildColorSplash.tsx`'s inline paintbrush bounce now that a second
 * caller (`WinnerCelebration`'s trophy bounce) needs the identical
 * shape — see that file's original comment for why it started inline.
 *
 * Distinct from `usePlayerWobble`: this is an ENTRANCE (rest → visible,
 * never replayed mid-life), not a repeatable "just got hit" reaction.
 */
export function useBounceIn(fromRotate = -20) {
  const [style, api] = useSpring(() => ({ scale: 0, rotate: fromRotate }));

  const play = useCallback(() => {
    api.start({
      from: { scale: 0, rotate: fromRotate },
      to: async (next) => {
        await next({ scale: 1.15, rotate: fromRotate * -0.3, config: { tension: 500, friction: 12 } });
        await next({ scale: 1, rotate: 0, config: { tension: 320, friction: 14 } });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  return { style, play };
}

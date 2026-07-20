import { useSpring, to } from "@react-spring/web";

/**
 * Elastic "just got hit" reaction — squash, overshoot the other way, then
 * settle. React Spring owns this per the guide ("physics only": bounce,
 * wobble, overshoot, follow-through) rather than a fixed-timing Framer
 * Motion keyframe list, so the wobble genuinely responds like a struck
 * object instead of playing a canned animation.
 *
 * `trigger` is a changing, non-null key (e.g. `"${targetId}-${kind}"`)
 * each time the wobble should replay; `null` holds it at rest.
 * `baseTransform` is the caller's own static positioning transform (e.g.
 * `"translate(-50%, -50%)"` for an opponent chip, `"translateX(-50%)"`
 * for the self plate) — the wobble composes ON TOP of it rather than
 * replacing it, so callers just swap their existing `transform` style
 * value for this hook's return without losing their layout anchor.
 *
 * Return type is left to inference — react-spring's `to()` combinator
 * returns an `Interpolation`, which only `animated.*` components can
 * consume reactively; hand this straight to an `animated.div`'s
 * `style.transform`, never a plain `div`.
 */
export function usePlayerWobble(trigger: string | null, baseTransform = "") {
  const [{ rotate, scaleX, scaleY }] = useSpring(
    {
      from: { rotate: 0, scaleX: 1, scaleY: 1 },
      to: async (next) => {
        if (!trigger) return;
        await next({ rotate: -8, scaleX: 1.16, scaleY: 0.85, config: { tension: 600, friction: 11 } });
        await next({ rotate: 6, scaleX: 0.92, scaleY: 1.1, config: { tension: 450, friction: 10 } });
        await next({ rotate: 0, scaleX: 1, scaleY: 1, config: { tension: 300, friction: 16 } });
      },
      reset: true,
      immediate: !trigger,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger],
  );

  return {
    transform: to([rotate, scaleX, scaleY], (r, sx, sy) => `${baseTransform} rotate(${r}deg) scale(${sx}, ${sy})`),
  };
}

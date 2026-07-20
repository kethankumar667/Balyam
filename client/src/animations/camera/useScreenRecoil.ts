import { useCallback, useRef } from "react";
import { useSpring } from "@react-spring/web";

export interface ScreenRecoilOptions {
  /** Peak downward/outward displacement in px. Default 14 — a real
   *  jolt, distinct from `useTableCamera`'s subtler GSAP jitter. */
  intensity?: number;
  disabled?: boolean;
}

/**
 * Physics-driven "screen recoil" — the guide assigns this specifically to
 * React Spring for +4 Meteor Strike (unlike +2 Flying Slippers, whose
 * camera punch/shake is GSAP-owned via `useTableCamera`). A single
 * one-shot spring: snap down+in on impact, then an elastic overshoot
 * back to rest — the "physics-inspired… overshoot" family React Spring
 * owns per the guide's library table.
 *
 * `recoilRef` wraps `UnoTableMat` itself (NOT the same outer wrapper
 * `useTableCamera.cameraRef` targets) so a GSAP shake elsewhere on the
 * felt can never fight this hook's imperative `animated.div` writes on
 * the same DOM node — the two camera systems stay on separate,
 * concentric layers by construction, not by coincidence.
 */
export function useScreenRecoil() {
  const recoilRef = useRef<HTMLDivElement | null>(null);
  const [style, api] = useSpring(() => ({ y: 0, scale: 1, config: { tension: 300, friction: 20 } }));

  const recoil = useCallback(
    (opts: ScreenRecoilOptions = {}) => {
      if (opts.disabled) return;
      const intensity = opts.intensity ?? 14;
      api.start({
        from: { y: intensity, scale: 1.015 },
        to: { y: 0, scale: 1 },
        config: { tension: 210, friction: 11 },
      });
    },
    [api],
  );

  return { recoilRef, recoilStyle: style, recoil };
}

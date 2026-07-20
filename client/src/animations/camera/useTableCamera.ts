import { useCallback, useRef } from "react";
import gsap from "gsap";

export interface CameraShakeOptions {
  /** Peak displacement in px. Default 6 — noticeable without ever moving
   *  seat chips out from under the felt's fixed percentage anchors. */
  intensity?: number;
  duration?: number;
  /** Skips the shake outright — wire from `AnimationConfig.reducedMotion`. */
  disabled?: boolean;
}

export interface CameraPunchOptions {
  /** Peak scale at the punch's apex. Default 1.035 — a snap, not a zoom. */
  scale?: number;
  duration?: number;
  disabled?: boolean;
}

export interface CameraTiltOptions {
  /** Peak rotation in degrees. Default 3.5 — a jolt, not a dizzying spin. */
  degrees?: number;
  duration?: number;
  disabled?: boolean;
}

/**
 * Imperative camera-FX surface for the felt. `cameraRef` attaches to the
 * board shell's table-mat wrapper (the element that visually IS "the
 * table"); `shake`/`punch` are GSAP-driven one-shot tweens fired from an
 * animation's timeline at its impact beat.
 *
 * A single instance lives in each board shell (`UnoBoardDesktop`/
 * `UnoBoardMobile`) and its `shake`/`punch` callbacks are threaded down
 * into whichever per-hit animation component needs them, so every future
 * animation (Reverse's camera tilt, +4's screen recoil, …) reuses the
 * exact same ref/timeline rather than each mounting its own GSAP context
 * on the same DOM node — concurrent contexts on one element fight each
 * other's transform.
 */
export function useTableCamera() {
  const cameraRef = useRef<HTMLDivElement | null>(null);

  const shake = useCallback((opts: CameraShakeOptions = {}) => {
    const el = cameraRef.current;
    if (!el || opts.disabled) return;
    const intensity = opts.intensity ?? 6;
    const duration = opts.duration ?? 0.4;
    gsap.killTweensOf(el);
    const tl = gsap.timeline({ onComplete: () => gsap.set(el, { x: 0, y: 0 }) });
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const decay = 1 - i / steps;
      tl.to(el, {
        x: (Math.random() * 2 - 1) * intensity * decay,
        y: (Math.random() * 2 - 1) * intensity * decay,
        duration: duration / steps,
        ease: "sine.inOut",
      });
    }
    tl.to(el, { x: 0, y: 0, duration: duration / steps, ease: "sine.out" });
  }, []);

  const punch = useCallback((opts: CameraPunchOptions = {}) => {
    const el = cameraRef.current;
    if (!el || opts.disabled) return;
    const scale = opts.scale ?? 1.035;
    const duration = opts.duration ?? 0.32;
    gsap.killTweensOf(el, "scale");
    gsap
      .timeline()
      .to(el, { scale, duration: duration * 0.35, ease: "power2.out" })
      .to(el, { scale: 1, duration: duration * 0.65, ease: "elastic.out(1, 0.5)" });
  }, []);

  /** Reverse's "camera tilt" — the table jolts a few degrees in the new
   *  direction's rotational sense, then snaps back. Distinct axis from
   *  `shake` (random xy jitter) and `punch` (uniform scale), so all
   *  three can share `cameraRef` without visually colliding. */
  const tilt = useCallback((opts: CameraTiltOptions = {}) => {
    const el = cameraRef.current;
    if (!el || opts.disabled) return;
    const degrees = opts.degrees ?? 3.5;
    const duration = opts.duration ?? 0.5;
    gsap.killTweensOf(el, "rotation");
    gsap
      .timeline()
      .to(el, { rotation: degrees, duration: duration * 0.3, ease: "power2.out" })
      .to(el, { rotation: -degrees * 0.5, duration: duration * 0.25, ease: "power1.inOut" })
      .to(el, { rotation: 0, duration: duration * 0.45, ease: "elastic.out(1, 0.55)" });
  }, []);

  return { cameraRef, shake, punch, tilt };
}

import { useEffect, useRef } from "react";
import { animate, createTimeline } from "animejs";
import type { JSAnimation } from "animejs";

/**
 * anime.js v4 helpers for gameplay micro-interactions.
 *
 * SCOPE, deliberately narrow: attention loops, one-shot accents, and FLIP
 * reorders. Not game state, not socket sync, not anything the engine owns —
 * every animation here is presentation over state that has already settled.
 *
 * v4, NOT v3. The API is `animate(targets, params)` and `createTimeline()` as
 * named exports; there is no `anime()` default export any more, and the
 * `@types/animejs` package on npm still describes v3 (it was installed here
 * and removed, because it shadows the correct types v4.5 ships itself).
 *
 * Three rules every helper below enforces so callers cannot forget them:
 *
 *   1. `transform` and `opacity` only. Both are GPU-composited; animating
 *      `top`/`left`/`width` forces layout on every frame and is what makes
 *      mid-range Android drop frames.
 *   2. Reduced motion is honoured at the source. Callers get the END STATE
 *      applied instantly rather than an animation that is merely faster —
 *      skipping the tween must never skip the result.
 *   3. Everything returns a cleanup, and the hooks call it on unmount. A
 *      looping timeline that outlives its component keeps ticking forever.
 */

/** OS-level reduced-motion preference. Read per call — users can change it live. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A looping "look at me" pulse.
 *
 * Sequenced rather than a single scale keyframe: swell, a small counter-rotate,
 * settle, then a REST BEAT before repeating. The rest is what keeps it from
 * reading as a nervous twitch — an attention cue that never stops moving stops
 * being noticed within a few seconds.
 *
 * Returns a stop function. No-ops under reduced motion.
 */
export function attentionPulse(
  el: Element | null,
  opts: { scale?: number; rotate?: number; period?: number } = {},
): () => void {
  if (!el || prefersReducedMotion()) return () => {};
  const { scale = 1.06, rotate = 1.5, period = 1500 } = opts;

  const tl = createTimeline({ loop: true })
    .add(el, { scale: [1, scale], rotate: [0, -rotate], duration: period * 0.22, ease: "outQuad" })
    .add(el, { scale, rotate: rotate, duration: period * 0.18, ease: "inOutQuad" })
    .add(el, { scale: 1, rotate: 0, duration: period * 0.24, ease: "outElastic(1, .6)" })
    // The rest beat. Nothing animates; the element simply holds still.
    .add(el, { scale: 1, duration: period * 0.36, ease: "linear" });

  return () => {
    tl.pause();
    tl.revert();
  };
}

/** Runs `attentionPulse` while `active`, and always cleans up. */
export function useAttentionPulse(
  ref: { current: Element | null },
  active: boolean,
  opts?: { scale?: number; rotate?: number; period?: number },
): void {
  // Kept in a ref so a caller passing an inline object literal does not
  // restart the loop on every render.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  useEffect(() => {
    if (!active) return;
    return attentionPulse(ref.current, optsRef.current);
  }, [ref, active]);
}

/** One-shot accent — a quick pop used to acknowledge a state change. */
export function popIn(el: Element | null, opts: { from?: number; duration?: number } = {}): JSAnimation | null {
  if (!el) return null;
  const { from = 0.82, duration = 420 } = opts;
  if (prefersReducedMotion()) return null;
  return animate(el, { scale: [from, 1], opacity: [0, 1], duration, ease: "outBack(1.6)" });
}

/* ── FLIP ────────────────────────────────────────────────────────────────── */

type Rect = { left: number; top: number };

/**
 * Snapshot positions before a reorder.
 *
 * FLIP is the correct technique for "the list rearranged" — you cannot tween
 * a DOM reorder directly, so you measure before, let React reorder, then
 * animate each element from its old position to its new one using a transform.
 * The layout only happens once; every frame after is composited.
 */
export function captureRects(nodes: Map<string, HTMLElement | null>): Map<string, Rect> {
  const out = new Map<string, Rect>();
  for (const [key, el] of nodes) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    out.set(key, { left: r.left, top: r.top });
  }
  return out;
}

/**
 * Play the reorder: invert each element back to where it was, then release.
 *
 * `stagger` spreads the starts so the group reads as cards being dealt into
 * place rather than one block sliding — which is the whole point of animating
 * an auto-arrange: the player should be able to FOLLOW where each card went.
 */
export function playFlip(
  nodes: Map<string, HTMLElement | null>,
  before: Map<string, Rect>,
  opts: { duration?: number; stagger?: number } = {},
): () => void {
  if (prefersReducedMotion()) return () => {};
  const { duration = 460, stagger: step = 22 } = opts;
  const running: JSAnimation[] = [];
  let i = 0;

  for (const [key, el] of nodes) {
    const prev = before.get(key);
    if (!el || !prev) continue;
    const now = el.getBoundingClientRect();
    const dx = prev.left - now.left;
    const dy = prev.top - now.top;
    // Sub-pixel drift is not movement — animating it just costs a frame.
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

    running.push(
      animate(el, {
        translateX: [dx, 0],
        translateY: [dy, 0],
        duration,
        delay: i * step,
        ease: "outCubic",
      }),
    );
    i += 1;
  }

  return () => {
    for (const a of running) {
      a.pause();
      a.revert();
    }
  };
}

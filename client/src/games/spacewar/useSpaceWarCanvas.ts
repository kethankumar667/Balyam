import { useEffect, useRef } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { SPACEWAR_TICK_HZ } from "@shared/types";
import { renderSpaceWarCanvas } from "./render";
import { interpolateSpaceWar, type Snapshot } from "./interpolate";

/**
 * Drives the Space War canvas.
 *
 * Replaces `useEffect(() => render(...), [state])`, which had three problems
 * stacked on each other:
 *
 *  1. **Frame rate was packet rate.** Painting only when a broadcast landed
 *     capped the game at 30fps and put canvas work inside a React commit.
 *  2. **No interpolation.** Thirty discrete positions a second is not
 *     motion, and it looked stepped on a flawless connection because it was
 *     never a connection problem.
 *  3. **Fixed backing store.** 480x640 device pixels stretched by CSS across
 *     a modern phone is a ~2.5x upscale — a soft, smeared picture.
 *
 * The loop below owns all three: it runs on requestAnimationFrame, draws a
 * blend of the last two broadcasts, and sizes the canvas to the pixels the
 * device actually has.
 */
export function useSpaceWarCanvas(
  state: SpaceWarPublicState,
  orientation: "horizontal" | "vertical",
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshots = useRef<{ prev: Snapshot | null; cur: Snapshot | null }>({
    prev: null,
    cur: null,
  });
  const lastState = useRef<SpaceWarPublicState | null>(null);

  // Shift the buffer on the render that carries a new broadcast. Doing this
  // in an effect instead would miss the frame it arrived on.
  if (lastState.current !== state) {
    lastState.current = state;
    snapshots.current = {
      prev: snapshots.current.cur,
      cur: { state, at: performance.now() },
    };
  }

  const logicalW = orientation === "vertical" ? 480 : 840;
  const logicalH = orientation === "vertical" ? 640 : 480;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tickMs = 1000 / SPACEWAR_TICK_HZ;

    /**
     * Match the backing store to the pixels the screen really has.
     *
     * The element keeps its CSS size and `object-contain`, so the layout is
     * untouched; only the resolution changes. DPR is capped at 2 because a
     * 3x phone would ask for a 1440x1920 buffer to show a 480x640 picture,
     * and the extra memory buys nothing anyone can see.
     */
    const resize = (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fit = Math.min(rect.width / logicalW, rect.height / logicalH);
      const scale = Math.max(1, fit * dpr);
      const w = Math.round(logicalW * scale);
      const h = Math.round(logicalH * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return scale;
    };

    const loop = () => {
      const canvas = canvasRef.current;
      const { prev, cur } = snapshots.current;
      if (canvas && cur) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const now = performance.now();
          const dt = now - last;
          last = now;

          const scale = resize(canvas);
          // The renderer draws in logical 480x640 (or 840x480) coordinates
          // and knows nothing about device pixels. This is what keeps that
          // true while the buffer underneath grows.
          ctx.setTransform(scale, 0, 0, scale, 0, 0);

          const alpha = Math.min(1, (now - cur.at) / tickMs);
          const view = prev ? interpolateSpaceWar(prev.state, cur.state, alpha) : cur.state;

          renderSpaceWarCanvas(ctx, view, orientation, dt / tickMs);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [orientation, logicalW, logicalH]);

  return canvasRef;
}

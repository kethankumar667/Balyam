import { useEffect, useRef, type MutableRefObject } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { SPACEWAR_TICK_HZ } from "@shared/types";
import { renderSpaceWarCanvas } from "./render";
import { interpolateSpaceWar } from "./interpolate";
import { SnapshotTimeline } from "../shared/snapshotTimeline";
import { advanceShipLead, type Vec2 } from "./predict";

const TICK_MS = 1000 / SPACEWAR_TICK_HZ;

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
 * blend of buffered broadcasts, and sizes the canvas to the pixels the device
 * actually has.
 *
 * Two things changed after the first pass, both because a phone is not a
 * desktop on Ethernet:
 *
 *  • The blend now runs off a jitter buffer rather than a fixed 33ms tween.
 *    The old alpha was `(now - arrival) / 33`, so a packet 10ms late meant
 *    10ms of frozen world, thirty times a second.
 *  • The local ship is predicted (see predict.ts). Everything else stays
 *    honestly interpolated; only the object whose input the server has not
 *    seen yet is allowed to run ahead.
 */
export function useSpaceWarCanvas(
  state: SpaceWarPublicState,
  orientation: "horizontal" | "vertical",
  /** Steering keys currently held, from useSpaceWarInput. Enables prediction. */
  held?: MutableRefObject<Set<string>>,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<SnapshotTimeline<SpaceWarPublicState> | null>(null);
  if (timelineRef.current === null) {
    timelineRef.current = new SnapshotTimeline<SpaceWarPublicState>({ stepMs: TICK_MS });
  }
  const lastState = useRef<SpaceWarPublicState | null>(null);
  const leadRef = useRef<Vec2>({ x: 0, y: 0 });

  // Buffer on the render that carries a new broadcast. Doing this in an effect
  // instead would miss the frame it arrived on.
  if (lastState.current !== state) {
    lastState.current = state;
    timelineRef.current.push(state, performance.now());
  }

  const logicalW = orientation === "vertical" ? 480 : 840;
  const logicalH = orientation === "vertical" ? 640 : 480;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

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
      const sample = timelineRef.current!.sample(performance.now());
      if (canvas && sample) {
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

          const view =
            sample.prev === sample.cur
              ? sample.cur
              : interpolateSpaceWar(sample.prev, sample.cur, sample.t);

          // A paused or finished run has no input to be ahead of, and a lead
          // left standing would drift the ship across a frozen board.
          const flying = held && !view.isPaused && !view.isOver;
          const lead = flying
            ? advanceShipLead(leadRef.current, held.current, view.player, dt)
            : { x: 0, y: 0 };
          leadRef.current = lead;

          const shown =
            lead.x === 0 && lead.y === 0
              ? view
              : {
                  ...view,
                  player: { ...view.player, x: view.player.x + lead.x, y: view.player.y + lead.y },
                };

          renderSpaceWarCanvas(ctx, shown, orientation, dt / TICK_MS);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [orientation, logicalW, logicalH, held]);

  return canvasRef;
}

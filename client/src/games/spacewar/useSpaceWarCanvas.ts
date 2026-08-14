import { useEffect, useRef, type MutableRefObject } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { SPACEWAR_TICK_HZ } from "@shared/types";
import { renderSpaceWarCanvas } from "./render";
import { interpolateSpaceWar } from "./interpolate";
import { SnapshotTimeline } from "../shared/snapshotTimeline";
import { advancePredictedShip, type Vec2 } from "./predict";

const TICK_MS = 1000 / SPACEWAR_TICK_HZ;

/**
 * Drives the Space War canvas with 60/120fps client-side ship prediction
 * and continuous multi-entity snapshot interpolation.
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
  const localPosRef = useRef<Vec2 | null>(null);

  // Buffer on the render that carries a new broadcast.
  if (lastState.current !== state) {
    lastState.current = state;
    timelineRef.current.push(state, performance.now());
  }

  const logicalW = orientation === "vertical" ? 480 : 840;
  const logicalH = orientation === "vertical" ? 640 : 480;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

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
          const dt = Math.min(40, Math.max(1, now - last));
          last = now;

          const scale = resize(canvas);
          ctx.setTransform(scale, 0, 0, scale, 0, 0);

          const view =
            sample.prev === sample.cur
              ? sample.cur
              : interpolateSpaceWar(sample.prev, sample.cur, sample.t);

          // Realtime predicted ship position directly responsive at 60/120fps
          const pred = advancePredictedShip(
            localPosRef.current,
            view.player,
            held?.current,
            dt,
            view.isPaused,
            view.isOver
          );
          localPosRef.current = pred;

          const shown = {
            ...view,
            player: { ...view.player, x: pred.x, y: pred.y },
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

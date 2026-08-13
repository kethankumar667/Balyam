import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SnakePublicState, SnakeTheme } from "@shared/types";
import {
  SNAKE_PALETTES,
  drawBackground,
  drawFood,
  drawObstacles,
  drawParticles,
  drawSnake,
  interpBody,
  spawnBurst,
  stepSignature,
  type Particle,
  type Pt,
} from "./snakeRender";
import { SnapshotTimeline } from "../shared/snapshotTimeline";

interface SnakeCanvasProps {
  state: SnakePublicState;
  selfId: string;
  theme: SnakeTheme;
  /** Fired once when the local player's score increases (ate food). */
  onEat?: () => void;
  /** Fired once when the local player's snake dies. */
  onDeath?: () => void;
  className?: string;
}

/** One logical step, kept as flat data so the render loop touches nothing else. */
interface Step {
  bodies: Record<string, Pt[]>;
  dirs: Record<string, string>;
  food: Pt;
}

function toStep(state: SnakePublicState): Step {
  const bodies: Record<string, Pt[]> = {};
  const dirs: Record<string, string> = {};
  for (const pid of Object.keys(state.snakes)) {
    bodies[pid] = state.snakes[pid].body.map((s) => ({ x: s.x, y: s.y }));
    dirs[pid] = state.snakes[pid].dir;
  }
  return { bodies, dirs, food: { ...state.food } };
}

/**
 * The whole playfield is drawn on one <canvas> via requestAnimationFrame.
 *
 * The server publishes discrete logical steps; rendering them raw would look
 * like a jittery slideshow. Instead the steps go into a small jitter buffer
 * (see SnapshotTimeline) and the loop draws a blend of the two that straddle a
 * render clock running a measured distance behind live.
 *
 * The previous version tweened the newest step over exactly `state.speedMs`.
 * That is correct only if packets arrive exactly one step apart — every
 * millisecond they run late, the tween had already finished and the snake sat
 * still. Eight steps a second on a phone meant eight small freezes a second,
 * which is what "the movement is not smooth" was. The buffer converts that
 * lateness into slack instead of stalls.
 *
 * The client still never decides game state; it only decides how to *draw* the
 * states it is given.
 */
export default function SnakeCanvas({ state, selfId, theme, onEat, onDeath, className }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Latest state + interpolation buffer (refs so the RAF loop reads fresh
  // values without re-subscribing every render).
  const stateRef = useRef(state);
  const timelineRef = useRef<SnapshotTimeline<Step> | null>(null);
  if (timelineRef.current === null) {
    timelineRef.current = new SnapshotTimeline<Step>({ stepMs: state.speedMs || 120 });
    timelineRef.current.push(toStep(state), performance.now());
  }
  const prevFoodRef = useRef<Pt>({ ...state.food });
  const sigRef = useRef<string>(stepSignature(state));
  const particlesRef = useRef<Particle[]>([]);
  const deadAtRef = useRef<Record<string, number>>({});
  const themeRef = useRef<SnakeTheme>(theme);
  const selfScoreRef = useRef<number>(state.players.find((p) => p.id === selfId)?.score ?? 0);

  const countdown = state.countdown ?? null;

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Ingest each new server state: detect a genuinely new step, roll the
  // interpolation buffers, and fire eat/death effects.
  useEffect(() => {
    stateRef.current = state;
    const sig = stepSignature(state);
    if (sig !== sigRef.current) {
      const now = performance.now();
      const timeline = timelineRef.current!;
      /**
       * `state.speedMs` is the authoritative step: the interval the engine
       * genuinely runs at (RoomManager re-arms its loop when the getter
       * changes), so the buffer paces against the real thing rather than
       * against wall-clock gaps that carry every scrap of network jitter.
       */
      const authoritative = state.speedMs || 0;
      if (authoritative > 0) timeline.setStepMs(Math.min(400, Math.max(50, authoritative)));
      prevFoodRef.current = timeline.latest()?.food ?? { ...state.food };
      timeline.push(toStep(state), now);
      sigRef.current = sig;

      // Eat burst when the local snake's score climbs.
      const myScore = state.players.find((p) => p.id === selfId)?.score ?? 0;
      if (myScore > selfScoreRef.current) {
        const pal = SNAKE_PALETTES[themeRef.current];
        particlesRef.current.push(...spawnBurst(prevFoodRef.current, pal.food));
        onEat?.();
      }
      selfScoreRef.current = myScore;

      // Death detection for fade-out + haptic.
      for (const p of state.players) {
        if (!p.isAlive && deadAtRef.current[p.id] === undefined) {
          deadAtRef.current[p.id] = now;
          if (p.id === selfId) onDeath?.();
        }
        if (p.isAlive && deadAtRef.current[p.id] !== undefined) {
          delete deadAtRef.current[p.id];
        }
      }
    }
  }, [state, selfId, onEat, onDeath]);

  // The render loop. Runs for the lifetime of the component.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastFrame = performance.now();
    let dpr = 1;
    let cssSize = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      cssSize = Math.max(120, Math.floor(Math.min(rect.width, rect.height)));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssSize * dpr);
      canvas.height = Math.floor(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now: number) => {
      const dt = Math.min(64, now - lastFrame);
      lastFrame = now;

      const st = stateRef.current;
      const pal = SNAKE_PALETTES[themeRef.current];
      const grid = st.gridSize;
      const cell = (cssSize * dpr) / grid;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // What the render clock says the world looks like right now: two
      // delivered steps and how far between them we are.
      const view = timelineRef.current!.sample(now);
      const prevStep = view?.prev ?? null;
      const curStep = view?.cur ?? null;
      const t = view ? view.t : 1;

      drawBackground(ctx, pal, grid, cell);
      drawObstacles(ctx, pal, st.obstacles ?? [], cell);
      drawFood(ctx, pal, curStep?.food ?? st.food, cell, now);

      // Draw opponents first, local snake last (on top).
      const ids = Object.keys(curStep?.bodies ?? st.snakes).sort((a, b) =>
        a === selfId ? 1 : b === selfId ? -1 : 0,
      );
      for (const pid of ids) {
        const snake = st.snakes[pid];
        const curBody = curStep?.bodies[pid] ?? snake?.body;
        if (!curBody || curBody.length === 0) continue;
        const body = interpBody(prevStep?.bodies[pid], curBody, t);
        let alpha = 1;
        const deadAt = deadAtRef.current[pid];
        if (deadAt !== undefined) {
          alpha = Math.max(0.18, 1 - (now - deadAt) / 600);
        }
        const dir = curStep?.dirs[pid] ?? snake?.dir ?? "RIGHT";
        drawSnake({ ctx, pal, body, dir, cell, isSelf: pid === selfId, alpha });
      }

      // Particles.
      const parts = particlesRef.current;
      for (const p of parts) {
        p.x += p.vx * (dt / 16.6);
        p.y += p.vy * (dt / 16.6);
        p.life -= dt / 520;
      }
      particlesRef.current = parts.filter((p) => p.life > 0);
      drawParticles(ctx, particlesRef.current, cell);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [selfId]);

  return (
    <div ref={wrapRef} className={`relative aspect-square w-full ${className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0 m-auto rounded-lg" />
      <AnimatePresence>
        {countdown && (
          <motion.div
            key={countdown}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <span
              className="font-mono text-6xl font-black tabular-nums drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              style={{ color: countdown === "GO!" ? "#4ade80" : "#fbbf24" }}
            >
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

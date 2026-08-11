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

type Snapshot = Record<string, Pt[]>;

function cloneBodies(state: SnakePublicState): Snapshot {
  const out: Snapshot = {};
  for (const pid of Object.keys(state.snakes)) {
    out[pid] = state.snakes[pid].body.map((s) => ({ x: s.x, y: s.y }));
  }
  return out;
}

/**
 * The whole playfield is drawn on one <canvas> via requestAnimationFrame.
 *
 * The server publishes discrete logical steps; rendering them raw would look
 * like a jittery slideshow. Instead we keep the previous and current step and
 * interpolate between them on the render clock, using the measured time between
 * arrivals as the tween duration. That decouples silky 60fps motion from the
 * (slower, slightly irregular) server tick without ever letting the client
 * decide game state — it only decides how to *draw* the states it is given.
 */
export default function SnakeCanvas({ state, selfId, theme, onEat, onDeath, className }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Latest state + interpolation buffers (refs so the RAF loop reads fresh
  // values without re-subscribing every render).
  const stateRef = useRef(state);
  const prevRef = useRef<Snapshot>(cloneBodies(state));
  const currRef = useRef<Snapshot>(cloneBodies(state));
  const prevFoodRef = useRef<Pt>({ ...state.food });
  const currFoodRef = useRef<Pt>({ ...state.food });
  const arrivalRef = useRef<number>(performance.now());
  const durationRef = useRef<number>(state.speedMs || 120);
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
      prevRef.current = currRef.current;
      currRef.current = cloneBodies(state);
      prevFoodRef.current = currFoodRef.current;
      currFoodRef.current = { ...state.food };
      const measured = now - arrivalRef.current;
      durationRef.current = Math.min(400, Math.max(70, measured || state.speedMs || 120));
      arrivalRef.current = now;
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

      drawBackground(ctx, pal, grid, cell);
      drawObstacles(ctx, pal, st.obstacles ?? [], cell);
      drawFood(ctx, pal, currFoodRef.current, cell, now);

      const t = Math.min(1, (now - arrivalRef.current) / durationRef.current);

      // Draw opponents first, local snake last (on top).
      const ids = Object.keys(st.snakes).sort((a, b) => (a === selfId ? 1 : b === selfId ? -1 : 0));
      for (const pid of ids) {
        const snake = st.snakes[pid];
        if (!snake || snake.body.length === 0) continue;
        const body = interpBody(prevRef.current[pid], currRef.current[pid] ?? snake.body, t);
        let alpha = 1;
        const deadAt = deadAtRef.current[pid];
        if (deadAt !== undefined) {
          alpha = Math.max(0.18, 1 - (now - deadAt) / 600);
        }
        drawSnake({ ctx, pal, body, dir: snake.dir, cell, isSelf: pid === selfId, alpha });
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

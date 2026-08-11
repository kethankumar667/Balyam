import type { SnakePublicState, SnakeTheme } from "@shared/types";

/**
 * Everything the <canvas> needs to paint a frame, kept framework-agnostic so
 * the render loop in SnakeCanvas stays declarative. Grid coordinates are in
 * "cells"; the renderer converts to pixels via `cell` (pixel size of one cell).
 */

export interface SnakePalette {
  /** Playfield backdrop. */
  screenBg: string;
  /** Faint grid lines drawn over the backdrop. */
  gridLine: string;
  /** Vignette / inner shadow tint, null to skip. */
  vignette: string | null;
  /** Body gradient stops for the local player's snake. */
  self: [string, string];
  selfGlow: string | null;
  /** Body gradient stops for opponents. */
  other: [string, string];
  otherGlow: string | null;
  eye: string;
  pupil: string;
  food: string;
  foodCore: string;
  foodGlow: string | null;
  obstacle: [string, string];
  obstacleEdge: string;
}

export const SNAKE_PALETTES: Record<SnakeTheme, SnakePalette> = {
  "nokia-monochrome": {
    screenBg: "#9ebd9e",
    gridLine: "rgba(28,36,21,0.10)",
    vignette: "rgba(28,36,21,0.22)",
    self: ["#1c2415", "#2d3725"],
    selfGlow: null,
    other: ["#4a573f", "#3b4731"],
    otherGlow: null,
    eye: "#9ebd9e",
    pupil: "#1c2415",
    food: "#1c2415",
    foodCore: "#3b4731",
    foodGlow: null,
    obstacle: ["#6b7a58", "#4a573f"],
    obstacleEdge: "#1c2415",
  },
  "nokia-color": {
    screenBg: "#16233b",
    gridLine: "rgba(56,189,248,0.10)",
    vignette: "rgba(2,6,23,0.55)",
    self: ["#4ade80", "#22c55e"],
    selfGlow: "rgba(74,222,128,0.55)",
    other: ["#60a5fa", "#3b82f6"],
    otherGlow: "rgba(96,165,250,0.5)",
    eye: "#f8fafc",
    pupil: "#0f172a",
    food: "#f43f5e",
    foodCore: "#fecdd3",
    foodGlow: "rgba(244,63,94,0.7)",
    obstacle: ["#d97706", "#92400e"],
    obstacleEdge: "#fbbf24",
  },
  "neon-modern": {
    screenBg: "#0d1322",
    gridLine: "rgba(168,85,247,0.12)",
    vignette: "rgba(5,8,15,0.6)",
    self: ["#c084fc", "#ec4899"],
    selfGlow: "rgba(217,70,239,0.7)",
    other: ["#fbbf24", "#f59e0b"],
    otherGlow: "rgba(251,191,36,0.6)",
    eye: "#ffffff",
    pupil: "#1e1b4b",
    food: "#10b981",
    foodCore: "#a7f3d0",
    foodGlow: "rgba(16,185,129,0.75)",
    obstacle: ["#f43f5e", "#be123c"],
    obstacleEdge: "#fda4af",
  },
};

export interface Pt {
  x: number;
  y: number;
}

/** Linear interpolation between two scalars. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate one snake body segment between two snapshots.
 *
 * A snake's segment i at the new step sits where segment i-1 sat last step, so
 * lerping prevBody[i] -> currBody[i] slides every segment exactly one cell along
 * the body — that is what makes the whole snake glide instead of teleporting.
 * When the head crosses a wrapped edge the two positions are a whole board
 * apart; we detect that (delta > 1) and snap rather than sweep across-screen.
 */
export function interpBody(prev: Pt[] | undefined, curr: Pt[], t: number): Pt[] {
  if (!prev || prev.length === 0) return curr.map((p) => ({ ...p }));
  const out: Pt[] = [];
  for (let i = 0; i < curr.length; i++) {
    const c = curr[i];
    const p = prev[i] ?? prev[prev.length - 1];
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      out.push({ x: c.x, y: c.y }); // wrapped — snap
    } else {
      out.push({ x: lerp(p.x, c.x, t), y: lerp(p.y, c.y, t) });
    }
  }
  return out;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  pal: SnakePalette,
  gridSize: number,
  cell: number,
): void {
  const size = gridSize * cell;
  ctx.fillStyle = pal.screenBg;
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.gridLine;
  ctx.beginPath();
  for (let i = 1; i < gridSize; i++) {
    const p = Math.round(i * cell) + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
  }
  ctx.stroke();

  if (pal.vignette) {
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, pal.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
}

export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  pal: SnakePalette,
  obstacles: Pt[],
  cell: number,
): void {
  for (const o of obstacles) {
    const x = o.x * cell;
    const y = o.y * cell;
    const inset = cell * 0.08;
    const g = ctx.createLinearGradient(x, y, x, y + cell);
    g.addColorStop(0, pal.obstacle[0]);
    g.addColorStop(1, pal.obstacle[1]);
    ctx.fillStyle = g;
    roundedRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.22);
    ctx.fill();
    ctx.lineWidth = Math.max(1, cell * 0.06);
    ctx.strokeStyle = pal.obstacleEdge;
    ctx.stroke();
  }
}

export function drawFood(
  ctx: CanvasRenderingContext2D,
  pal: SnakePalette,
  food: Pt,
  cell: number,
  time: number,
): void {
  const cx = food.x * cell + cell / 2;
  const cy = food.y * cell + cell / 2;
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  const r = cell * (0.28 + pulse * 0.07);

  if (pal.foodGlow) {
    ctx.save();
    ctx.shadowColor = pal.foodGlow;
    ctx.shadowBlur = cell * (0.6 + pulse * 0.6);
    ctx.fillStyle = pal.food;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = pal.food;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright core / shine.
  ctx.fillStyle = pal.foodCore;
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

export interface DrawSnakeOpts {
  ctx: CanvasRenderingContext2D;
  pal: SnakePalette;
  body: Pt[];
  dir: string;
  cell: number;
  isSelf: boolean;
  alpha: number;
}

/**
 * Paint a single snake as a connected rounded body with a distinct head and
 * eyes. The body is one round-capped, round-joined stroke so the segments read
 * as a continuous creature rather than a chain of squares.
 */
export function drawSnake({ ctx, pal, body, dir, cell, isSelf, alpha }: DrawSnakeOpts): void {
  if (body.length === 0) return;
  const stops = isSelf ? pal.self : pal.other;
  const glow = isSelf ? pal.selfGlow : pal.otherGlow;

  const pts = body.map((seg) => ({
    x: seg.x * cell + cell / 2,
    y: seg.y * cell + cell / 2,
  }));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Gradient along the head->tail axis for depth.
  const head = pts[0];
  const tail = pts[pts.length - 1];
  const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(1, stops[1]);

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = cell * 0.5;
  }

  // Body: taper slightly toward the tail by stroking in two passes.
  ctx.strokeStyle = grad;
  ctx.lineWidth = cell * 0.82;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // Tail taper: redraw the last stretch narrower with the backdrop punched out
  // would be costly; instead lay a small rounded cap of body colour at the tip.
  ctx.shadowBlur = 0;

  // Head bulge.
  ctx.fillStyle = stops[0];
  ctx.beginPath();
  ctx.arc(head.x, head.y, cell * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes, oriented by travel direction.
  const eyeR = cell * 0.11;
  const pupilR = cell * 0.055;
  let ex = 0;
  let ey = 0;
  if (dir === "LEFT") ex = -1;
  else if (dir === "RIGHT") ex = 1;
  else if (dir === "UP") ey = -1;
  else ey = 1;
  // Perpendicular offset for the two eyes.
  const px = ey;
  const py = ex;
  const fwd = cell * 0.18;
  const spread = cell * 0.2;
  for (const s of [-1, 1]) {
    const eyeX = head.x + ex * fwd + px * spread * s;
    const eyeY = head.y + ey * fwd + py * spread * s;
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.pupil;
    ctx.beginPath();
    ctx.arc(eyeX + ex * eyeR * 0.35, eyeY + ey * eyeR * 0.35, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

/** Spawn an eat-burst of particles (grid coords) at a food position. */
export function spawnBurst(food: Pt, color: string): Particle[] {
  const out: Particle[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const speed = 0.04 + Math.random() * 0.05;
    out.push({
      x: food.x + 0.5,
      y: food.y + 0.5,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 1,
      maxLife: 1,
      color,
    });
  }
  return out;
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cell: number): void {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * cell, p.y * cell, cell * 0.12 * alpha + cell * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A cheap, order-stable signature used to detect a genuinely new step. */
export function stepSignature(state: SnakePublicState): string {
  let sig = `${state.food.x},${state.food.y}|`;
  for (const pid of Object.keys(state.snakes)) {
    const s = state.snakes[pid];
    const h = s.body[0];
    sig += `${pid}:${h ? `${h.x},${h.y}` : "x"},${s.body.length},${s.isAlive ? 1 : 0}|`;
  }
  return sig;
}

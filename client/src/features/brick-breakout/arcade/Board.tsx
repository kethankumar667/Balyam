import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { COLORS, HEIGHT, PADDLE_Y, POWER_LABELS, RADIUS, WIDTH, type ArcadeState, type Orb, type Power } from "./rules";

const POWER_MARKS: Record<Power, string> = { multi: "3", expand: "W", shield: "S", pierce: "P" };
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface BoardProps {
  stateRef: MutableRefObject<ArcadeState>;
  effects: boolean;
  onMove: (x: number) => void;
  onLaunch: () => void;
  onPause: () => void;
}
function paintField(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#111d3d"); bg.addColorStop(0.55, "#070e22"); bg.addColorStop(1, "#14112c");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#99bbff0d"; ctx.lineWidth = 1;
  for (let x = 14; x < WIDTH; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
  for (let y = 0; y < HEIGHT; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  ctx.fillStyle = "#cbd5e1"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("BHALYAM / NEON SECTOR", 16, 25);
}
function paintBricks(ctx: CanvasRenderingContext2D, state: ArcadeState) {
  for (const brick of state.bricks) {
    if (brick.hp <= 0) continue;
    const color = COLORS[brick.color];
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4); ctx.fill();
    ctx.fillStyle = "#ffffff65"; ctx.fillRect(brick.x + 3, brick.y + 2, brick.w - 6, 2);
    ctx.fillStyle = "#071022"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(brick.hp === 1 ? (brick.drop ? "+" : "\u00b7") : "|".repeat(brick.hp), brick.x + brick.w / 2, brick.y + 14);
  }
}
function paintPaddle(ctx: CanvasRenderingContext2D, state: ArcadeState) {
  const left = state.paddleX - state.paddleWidth / 2;
  const gradient = ctx.createLinearGradient(left, 0, left + state.paddleWidth, 0);
  gradient.addColorStop(0, "#818cf8"); gradient.addColorStop(0.5, "#a5f3fc"); gradient.addColorStop(1, "#818cf8");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(left, PADDLE_Y, state.paddleWidth, 12, 6); ctx.fill();
  ctx.fillStyle = "#e0f2fe"; ctx.fillRect(state.paddleX - 10, PADDLE_Y + 2, 20, 2);
  ctx.strokeStyle = state.shield ? "#6ee7b7" : "#fda4af40";
  ctx.lineWidth = state.shield ? 3 : 1;
  ctx.beginPath(); ctx.moveTo(12, HEIGHT - 25); ctx.lineTo(WIDTH - 12, HEIGHT - 25); ctx.stroke();
}
function paintBall(ctx: CanvasRenderingContext2D, ball: Orb, piercing: boolean) {
  ctx.fillStyle = piercing ? "#fde68a" : "#f0fdff";
  ctx.beginPath(); ctx.arc(ball.x, ball.y, RADIUS, 0, Math.PI * 2); ctx.fill();
}
function paintDrops(ctx: CanvasRenderingContext2D, state: ArcadeState) {
  for (const drop of state.drops) {
    ctx.fillStyle = drop.power === "pierce" ? "#fde68a" : "#a5f3fc";
    ctx.beginPath(); ctx.roundRect(drop.x - 12, drop.y - 10, 24, 20, 5); ctx.fill();
    ctx.fillStyle = "#071022"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(POWER_MARKS[drop.power], drop.x, drop.y + 5);
  }
}
function spawnParticles(state: ArcadeState, previous: Set<number>, particles: Particle[]) {
  for (const brick of state.bricks) {
    if (brick.hp > 0 || !previous.has(brick.id)) continue;
    for (let i = 0; i < 5; i++) {
      particles.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
        vx: Math.cos(i * 1.3 + brick.id) * 2.5, vy: Math.sin(i * 1.3 + brick.id) * 2.5,
        life: 22, color: COLORS[brick.color] });
    }
  }
  particles.splice(0, Math.max(0, particles.length - 60));
}
export function NeonBoard({ stateRef, effects, onMove, onLaunch, onPause }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [size, setSize] = useState({ width: WIDTH, height: HEIGHT });
  useEffect(() => {
    const host = canvasRef.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.min(rect.width, rect.height * WIDTH / HEIGHT);
      setSize({ width, height: width * HEIGHT / WIDTH });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Brick Breakout needs a browser with Canvas 2D support.");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr; canvas.height = HEIGHT * dpr; ctx.scale(dpr, dpr);
    let raf = 0;
    let previous = new Set<number>();
    let particles: Particle[] = [];
    const trails = new Map<number, { x: number; y: number }[]>();
    const draw = () => {
      const state = stateRef.current;
      paintField(ctx); paintBricks(ctx, state); paintPaddle(ctx, state); paintDrops(ctx, state);
      if (effects && state.status === "playing") {
        spawnParticles(state, previous, particles);
        for (const ball of state.balls) {
          const trail = trails.get(ball.id) ?? [];
          trail.push({ x: ball.x, y: ball.y }); if (trail.length > 9) trail.shift();
          trails.set(ball.id, trail);
          trail.forEach((point, i) => { ctx.fillStyle = `rgba(103,232,249,${i / 35})`; ctx.beginPath(); ctx.arc(point.x, point.y, 2 + i / 3, 0, 7); ctx.fill(); });
        }
        particles = particles.filter(p => p.life-- > 0);
        for (const p of particles) { p.x += p.vx; p.y += p.vy; ctx.globalAlpha = p.life / 22; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }
        ctx.globalAlpha = 1;
      } else { particles = []; trails.clear(); }
      for (const id of trails.keys()) if (!state.balls.some(b => b.id === id)) trails.delete(id);
      for (const ball of state.balls) paintBall(ctx, ball, state.pierceUntil > state.elapsed);
      previous = new Set(state.bricks.filter(b => b.hp > 0).map(b => b.id));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [effects, stateRef]);
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onMove((event.clientX - rect.left) / rect.width * WIDTH);
  };
  return <canvas ref={canvasRef} role="img" aria-label="Neon Breakout arena. Move with arrows or A and D. Space to launch. P to pause."
    tabIndex={0} onKeyDown={event => {
      if (event.code === "Space") { event.preventDefault(); if (!event.repeat) onLaunch(); }
      if (event.code === "Escape" || event.code === "KeyP") { event.preventDefault(); if (!event.repeat) onPause(); }
    }}
    onPointerDown={event => {
      dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus(); move(event);
    }}
    onPointerMove={event => { if (dragging.current || event.pointerType === "mouse") move(event); }}
    onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { dragging.current = false; }}
    className="block shrink-0 touch-none rounded-2xl border border-cyan-300/40 shadow-[0_0_40px_-15px_#22d3ee80] outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
    style={size}>
    Move the paddle to bounce the ball and clear the bricks. Bricks marked + drop power-ups.
    {Object.values(POWER_LABELS).join(", ")} are available.
  </canvas>;
}

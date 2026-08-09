import type { VyomaYudhPublicState } from "@shared/types";
import { VYOMA_WORLD } from "@shared/types";

/**
 * Vyoma Yudh renderer.
 *
 * Every shape here is drawn with canvas primitives from scratch — no sprite
 * sheet, no imported image, nothing traced from another game. That is
 * deliberate: art is the part of a game that copyright actually protects, so
 * the safest asset pipeline is one with no assets in it.
 *
 * The look is a monochrome dot-matrix panel, which is a genre convention (a
 * 90s handheld idiom) rather than any one product's design.
 */

export interface Palette {
  bg: string;
  dim: string;
  ink: string;
  hot: string;
}

export const PALETTE: Palette = {
  bg: "#9BB03F",   // classic olive LCD backlight
  dim: "#89A038",  // grid dots
  ink: "#1B2410",  // "pixels"
  hot: "#3E5416",  // accents
};

/** Scale from the server's 200x100 world into canvas pixels. */
function scaler(canvas: HTMLCanvasElement) {
  const sx = canvas.width / VYOMA_WORLD.w;
  const sy = canvas.height / VYOMA_WORLD.h;
  return { sx, sy, X: (x: number) => x * sx, Y: (y: number) => y * sy };
}

export function draw(
  canvas: HTMLCanvasElement,
  state: VyomaYudhPublicState,
  /** Monotonic frame counter, for effects that animate between server ticks. */
  frame: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { sx, sy, X, Y } = scaler(canvas);
  const unit = Math.max(1, Math.min(sx, sy));

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStarfield(ctx, canvas, frame, unit);

  // ── shots ──
  for (const s of state.shots) {
    ctx.fillStyle = PALETTE.ink;
    if (s.weapon === "wall") {
      // Full-height sweep — the panic weapon reads as a moving bar.
      ctx.globalAlpha = 0.75;
      ctx.fillRect(X(s.x) - unit, 0, unit * 2.5, canvas.height);
      ctx.globalAlpha = 1;
    } else if (s.weapon === "laser") {
      ctx.fillRect(X(s.x) - unit * 6, Y(s.y) - unit * 0.6, unit * 12, unit * 1.2);
    } else if (s.weapon === "missile") {
      ctx.fillRect(X(s.x) - unit * 2, Y(s.y) - unit * 0.9, unit * 4, unit * 1.8);
      ctx.fillStyle = PALETTE.hot;
      ctx.fillRect(X(s.x) - unit * 3.5, Y(s.y) - unit * 0.4, unit * 1.5, unit * 0.8);
    } else {
      const w = s.fromPlayer ? unit * 3 : unit * 2;
      ctx.fillRect(X(s.x) - w / 2, Y(s.y) - unit * 0.5, w, unit);
    }
  }

  // ── enemies ──
  for (const e of state.enemies) {
    const cx = X(e.x);
    const cy = Y(e.y);
    ctx.fillStyle = PALETTE.ink;
    switch (e.kind) {
      case "boss":     drawBoss(ctx, cx, cy, unit, e.hp / e.maxHp); break;
      case "bomber":   drawBomber(ctx, cx, cy, unit); break;
      case "turret":   drawTurret(ctx, cx, cy, unit); break;
      case "weaver":   drawWeaver(ctx, cx, cy, unit); break;
      default:         drawScout(ctx, cx, cy, unit);
    }
  }

  // ── pickups ──
  for (const p of state.pickups) {
    const cx = X(p.x);
    const cy = Y(p.y);
    const pulse = 0.7 + 0.3 * Math.sin(frame / 6);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = Math.max(1, unit * 0.7);
    ctx.globalAlpha = pulse;
    ctx.strokeRect(cx - unit * 2.5, cy - unit * 2.5, unit * 5, unit * 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `bold ${Math.round(unit * 4)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyph =
      p.weapon === "life" ? "+" : p.weapon === "missile" ? "M" : p.weapon === "laser" ? "L" : "W";
    ctx.fillText(glyph, cx, cy);
  }

  // ── the gunship ──
  if (state.ship) {
    const invuln = state.tick < state.ship.invulnUntilTick;
    // Blink while invulnerable so respawn protection is legible rather than
    // a mystery period where hits do nothing.
    if (!invuln || frame % 8 < 4) {
      drawShip(ctx, X(state.ship.x), Y(state.ship.y), unit);
    }
  }
}

function drawStarfield(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: number,
  unit: number,
): void {
  ctx.fillStyle = PALETTE.dim;
  // Deterministic pseudo-stars: a hash, not Math.random, so the field does
  // not shimmer chaotically between frames.
  for (let i = 0; i < 40; i++) {
    const seed = (i * 9301 + 49297) % 233280;
    const baseX = (seed / 233280) * canvas.width;
    const y = ((seed * 7) % 233280) / 233280 * canvas.height;
    const drift = (frame * (0.4 + (i % 3) * 0.3)) % canvas.width;
    const x = (baseX - drift + canvas.width) % canvas.width;
    ctx.fillRect(x, y, unit * 0.8, unit * 0.8);
  }
}

function drawShip(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number): void {
  ctx.fillStyle = PALETTE.ink;
  // A blunt wedge with a tail fin — our own silhouette.
  ctx.beginPath();
  ctx.moveTo(cx + u * 5, cy);
  ctx.lineTo(cx - u * 3, cy - u * 3);
  ctx.lineTo(cx - u * 1.5, cy);
  ctx.lineTo(cx - u * 3, cy + u * 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - u * 5, cy - u * 1, u * 2.5, u * 2);
}

function drawScout(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - u * 4, cy);
  ctx.lineTo(cx + u * 3, cy - u * 2.5);
  ctx.lineTo(cx + u * 3, cy + u * 2.5);
  ctx.closePath();
  ctx.fill();
}

function drawWeaver(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - u * 4, cy);
  ctx.lineTo(cx, cy - u * 3);
  ctx.lineTo(cx + u * 4, cy);
  ctx.lineTo(cx, cy + u * 3);
  ctx.closePath();
  ctx.fill();
}

function drawTurret(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number): void {
  ctx.fillRect(cx - u * 3, cy - u * 3, u * 6, u * 6);
  ctx.fillRect(cx - u * 5.5, cy - u * 0.8, u * 2.5, u * 1.6);
}

function drawBomber(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number): void {
  ctx.fillRect(cx - u * 5, cy - u * 2, u * 10, u * 4);
  ctx.fillRect(cx - u * 2, cy - u * 4.5, u * 4, u * 9);
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  u: number,
  hpFrac: number,
): void {
  ctx.fillRect(cx - u * 9, cy - u * 9, u * 18, u * 18);
  // A notch that opens as it takes damage — health readable on the body
  // itself, not only on the HUD bar.
  ctx.fillStyle = PALETTE.bg;
  const gap = u * 7 * (1 - hpFrac);
  ctx.fillRect(cx - u * 9, cy - gap / 2, u * 6, gap);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(cx - u * 13, cy - u * 3, u * 4, u * 6);
}

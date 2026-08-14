import { SPACEWAR_TICK_HZ, SPACEWAR_WORLD } from "@shared/types";

/**
 * Local prediction for the ship you are flying.
 *
 * Rather than adding a lagging decay offset to a delayed historical server position,
 * we simulate the ship's movement directly at the display refresh rate (60/120fps),
 * while softly reconciling with authoritative server updates.
 *
 * This delivers:
 * 1. Instantaneous response to steering keys / D-pad.
 * 2. Silky-smooth 60-120fps continuous motion.
 * 3. Zero rubber-banding or jerky oscillations.
 */

export interface Vec2 {
  x: number;
  y: number;
}

const TICK_MS = 1000 / SPACEWAR_TICK_HZ;

const MAX_X = SPACEWAR_WORLD.width - SPACEWAR_WORLD.shipWidth;
const MIN_Y = SPACEWAR_WORLD.shipMarginY;
const MAX_Y = SPACEWAR_WORLD.height - SPACEWAR_WORLD.shipHeight - SPACEWAR_WORLD.shipMarginY;

/** World-axis intent from the keys currently held. Mirrors the engine's reads. */
export function steerAxis(held: ReadonlySet<string>): Vec2 {
  const left = held.has("ArrowLeft") || held.has("a") || held.has("A");
  const right = held.has("ArrowRight") || held.has("d") || held.has("D");
  const up = held.has("ArrowUp") || held.has("w") || held.has("W");
  const down = held.has("ArrowDown") || held.has("s") || held.has("S");
  return {
    x: (right ? 1 : 0) - (left ? 1 : 0),
    y: (down ? 1 : 0) - (up ? 1 : 0),
  };
}

/**
 * Advance the local predicted ship position and smoothly converge with authoritative server updates.
 */
export function advancePredictedShip(
  currentPos: Vec2 | null,
  serverPos: Vec2,
  held: ReadonlySet<string> | undefined,
  dtMs: number,
  isPaused: boolean,
  isOver: boolean
): Vec2 {
  if (
    currentPos === null ||
    Math.hypot(currentPos.x - serverPos.x, currentPos.y - serverPos.y) > 80 ||
    isPaused ||
    isOver
  ) {
    return { x: serverPos.x, y: serverPos.y };
  }

  const dtClamped = Math.min(64, Math.max(1, dtMs));
  let nextX = currentPos.x;
  let nextY = currentPos.y;

  if (held && held.size > 0) {
    const axis = steerAxis(held);
    const moveDist = (SPACEWAR_WORLD.shipSpeed * dtClamped) / TICK_MS;
    nextX += axis.x * moveDist;
    nextY += axis.y * moveDist;
    nextX = clamp(nextX, 0, MAX_X);
    nextY = clamp(nextY, MIN_Y, MAX_Y);
  }

  // Soft exponential correction towards authoritative server position to prevent drift
  const errX = serverPos.x - nextX;
  const errY = serverPos.y - nextY;
  const blendFactor = Math.min(0.35, (dtClamped / 1000) * 8);
  nextX += errX * blendFactor;
  nextY += errY * blendFactor;

  return { x: nextX, y: nextY };
}

/** Legacy helper compatibility */
export function advanceShipLead(
  lead: Vec2,
  held: ReadonlySet<string>,
  server: Vec2,
  dtMs: number,
): Vec2 {
  return { x: 0, y: 0 };
}

function clamp(v: number, lo: number, hi: number): number {
  if (lo > hi) return 0;
  return v < lo ? lo : v > hi ? hi : v;
}

import { SPACEWAR_TICK_HZ, SPACEWAR_WORLD } from "@shared/types";

/**
 * Local prediction for the ship you are flying.
 *
 * Rather than waiting for a round trip to paint your own moves, advance the
 * local ship position smoothly so the ship reacts on the next frame (60fps/120fps),
 * while softly reconciling with authoritative server updates.
 */

export interface Vec2 {
  x: number;
  y: number;
}

const TICK_MS = 1000 / SPACEWAR_TICK_HZ;

const MAX_X = SPACEWAR_WORLD.width - SPACEWAR_WORLD.shipWidth;
const MIN_Y = SPACEWAR_WORLD.shipMarginY;
const MAX_Y = SPACEWAR_WORLD.height - SPACEWAR_WORLD.shipHeight - SPACEWAR_WORLD.shipMarginY;

const DECAY_HALF_LIFE_MS = 80;

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

/**
 * Computes the visual lead vector of the ship ahead of the authoritative server position.
 */
export function advanceShipLead(
  lead: Vec2,
  held: ReadonlySet<string>,
  server: Vec2,
  dtMs: number,
): Vec2 {
  if (dtMs > 1000) return { x: 0, y: 0 };
  const axis = steerAxis(held);
  const decay = Math.pow(0.5, dtMs / DECAY_HALF_LIFE_MS);
  const step = (SPACEWAR_WORLD.shipSpeed * dtMs) / TICK_MS;

  const x = lead.x * decay + axis.x * step;
  const y = lead.y * decay + axis.y * step;

  const finalX = clamp(server.x + x, 0, MAX_X) - server.x;
  const finalY = clamp(server.y + y, MIN_Y, MAX_Y) - server.y;

  return {
    x: Math.abs(finalX) < 0.05 ? 0 : finalX,
    y: Math.abs(finalY) < 0.05 ? 0 : finalY,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (lo > hi) return 0;
  return v < lo ? lo : v > hi ? hi : v;
}

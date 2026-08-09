import type { CarromPiece } from "@shared/types.js";
import { CARROM_BOARD } from "@shared/types.js";

/**
 * Carrom physics — circles on a table with friction.
 *
 * Deliberately small and explicit rather than a physics library: the whole
 * simulation is ~40 bodies of one shape, it has to run identically on the
 * server for every client, and a dependency here would be a black box in the
 * one place the project cannot tolerate one (see principle #2 — the server IS
 * the truth, so its physics must be inspectable and testable).
 *
 * Integration is semi-implicit Euler at a fixed timestep, with collisions
 * resolved positionally after the move. At 60 Hz with these speeds a coin
 * travels well under its own radius per step, so tunnelling is not a concern
 * — and `MAX_SPEED` keeps it that way even for a maximum-power strike.
 */

/** Velocity below which a piece is considered stopped (units/second). */
export const REST_SPEED = 0.6;
/** Fraction of velocity retained per second — cloth friction. */
const FRICTION_PER_SECOND = 0.28;
/** Energy kept on a cushion bounce. */
const CUSHION_RESTITUTION = 0.62;
/** Energy kept in a coin-coin impact. */
const IMPACT_RESTITUTION = 0.92;
/** Hard ceiling on launch speed, so a strike can never tunnel a wall. */
export const MAX_SPEED = 150;

export function radiusOf(piece: CarromPiece): number {
  return piece.kind === "striker" ? CARROM_BOARD.strikerRadius : CARROM_BOARD.coinRadius;
}

export function massOf(piece: CarromPiece): number {
  // A striker is heavier than a coin — that mass ratio is what makes a strike
  // carry through a cluster instead of stopping dead on first contact.
  return piece.kind === "striker" ? 1.8 : 1;
}

export function speedOf(p: CarromPiece): number {
  return Math.hypot(p.vx, p.vy);
}

/** True when nothing on the board is still moving. */
export function allAtRest(pieces: CarromPiece[]): boolean {
  return pieces.every((p) => p.pocketed || speedOf(p) < REST_SPEED);
}

export function pocketCentres(): { x: number; y: number }[] {
  const { size, cushion } = CARROM_BOARD;
  const lo = cushion;
  const hi = size - cushion;
  return [
    { x: lo, y: lo },
    { x: hi, y: lo },
    { x: lo, y: hi },
    { x: hi, y: hi },
  ];
}

/**
 * Advance the simulation by `dt` seconds.
 *
 * Returns the pieces pocketed during this step, in the order they fell — the
 * rules layer needs that order to decide whether a queen was covered.
 */
export function step(pieces: CarromPiece[], dt: number): CarromPiece[] {
  const live = pieces.filter((p) => !p.pocketed);

  // ── integrate + friction ──
  const damping = Math.pow(FRICTION_PER_SECOND, dt);
  for (const p of live) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= damping;
    p.vy *= damping;
    if (speedOf(p) < REST_SPEED) {
      p.vx = 0;
      p.vy = 0;
    }
  }

  // ── cushions ──
  const { size, cushion } = CARROM_BOARD;
  for (const p of live) {
    const r = radiusOf(p);
    const lo = cushion + r;
    const hi = size - cushion - r;
    if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx) * CUSHION_RESTITUTION; }
    if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx) * CUSHION_RESTITUTION; }
    if (p.y < lo) { p.y = lo; p.vy = Math.abs(p.vy) * CUSHION_RESTITUTION; }
    if (p.y > hi) { p.y = hi; p.vy = -Math.abs(p.vy) * CUSHION_RESTITUTION; }
  }

  // ── piece-piece collisions ──
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      resolvePair(live[i], live[j]);
    }
  }

  // ── pockets ──
  const pocketed: CarromPiece[] = [];
  for (const p of live) {
    for (const pocket of pocketCentres()) {
      if (Math.hypot(p.x - pocket.x, p.y - pocket.y) <= CARROM_BOARD.pocketRadius) {
        p.pocketed = true;
        p.vx = 0;
        p.vy = 0;
        pocketed.push(p);
        break;
      }
    }
  }
  return pocketed;
}

/** Elastic collision between two circles, with positional de-overlap. */
function resolvePair(a: CarromPiece, b: CarromPiece): void {
  const ra = radiusOf(a);
  const rb = radiusOf(b);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const minDist = ra + rb;
  if (dist >= minDist) return;

  // Two pieces exactly on top of each other have no contact normal. Pick an
  // arbitrary axis, but keep `dist` at 0 so the overlap below is the FULL
  // separation. Setting dist = minDist here (the obvious-looking fix) makes
  // overlap zero and leaves them coincident forever.
  let nx: number;
  let ny: number;
  if (dist === 0) {
    nx = 1;
    ny = 0;
  } else {
    nx = dx / dist;
    ny = dy / dist;
  }
  const ma = massOf(a);
  const mb = massOf(b);

  // Separate first, weighted by mass, so the pair never stays interpenetrated
  // and re-triggers on the following step.
  const overlap = minDist - dist;
  const totalMass = ma + mb;
  a.x -= nx * overlap * (mb / totalMass);
  a.y -= ny * overlap * (mb / totalMass);
  b.x += nx * overlap * (ma / totalMass);
  b.y += ny * overlap * (ma / totalMass);

  // Relative velocity along the contact normal.
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const along = rvx * nx + rvy * ny;
  if (along > 0) return; // already separating

  const impulse = (-(1 + IMPACT_RESTITUTION) * along) / (1 / ma + 1 / mb);
  a.vx -= (impulse * nx) / ma;
  a.vy -= (impulse * ny) / ma;
  b.vx += (impulse * nx) / mb;
  b.vy += (impulse * ny) / mb;
}

/** Clamp a requested launch so no shot can exceed the simulation's limits. */
export function launchVelocity(angleRad: number, power01: number): { vx: number; vy: number } {
  const p = Math.max(0, Math.min(1, power01));
  const speed = p * MAX_SPEED;
  return { vx: Math.cos(angleRad) * speed, vy: Math.sin(angleRad) * speed };
}

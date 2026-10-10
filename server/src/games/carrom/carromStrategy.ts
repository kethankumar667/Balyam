import type { CarromColor, CarromMode, CarromPiece } from "@shared/types.js";
import { CARROM_BOARD } from "@shared/types.js";
import { allAtRest, launchVelocity, pocketCentres, step } from "./physics.js";

/**
 * Which shot a Carrom bot plays.
 *
 * The old bot aimed the striker straight at the nearest coin of its colour. That hits coins, but a coin hit
 * "at" its middle is sent straight on, nowhere near a pocket, so it rarely potted anything on purpose and it
 * never noticed when its shot would pot the OPPONENT's coin or the striker itself.
 *
 * This plays the shot a person would line up, then checks it against the game's own physics before taking it:
 *
 *   1. For every coin it may pot and every pocket, work out the "ghost" point the striker must reach so the
 *      coin leaves toward that pocket, and the striker position along the baseline it would shoot from.
 *   2. Throw out the geometrically poor ones (too thin a cut, a blocked line) and keep the best few.
 *   3. SIMULATE each with the real `step` physics and score what actually happened: its own coins potted,
 *      the queen, the opponent's coins (bad: they score), the striker (a foul).
 *   4. Play the best. When nothing pots, return null and the engine's plain shot is used.
 *
 * Because it uses the same physics the server plays the shot with, what it predicts is what happens, apart
 * from the aim noise a lower difficulty adds on purpose. Pure: pieces in, shot out.
 */

const DT = 1 / 60;
/** A shot that has not settled by then is judged on what it had done. */
const MAX_SIM_TICKS = 300;
const BASELINE_POSITIONS = 11;
/** Reject cuts thinner than this: cos of the angle between the striker's line and the coin's line to the pocket. */
const MIN_CUT_COS = 0.45;
const CLEARANCE = 0.25;

export interface CarromShotQuery {
  pieces: readonly CarromPiece[];
  color: CarromColor;
  mode: CarromMode;
  /** 0 shoots from the bottom baseline, 1 from the top. */
  turnIndex: number;
  /** How many of the best geometric candidates to simulate. */
  candidates: number;
  /** Radians of random error added to the final aim (a weaker bot misses a little). */
  aimNoise: number;
  rng: () => number;
}

export interface CarromShot {
  /** Striker position along the baseline, 0..1, as the `place` move takes it. */
  pos: number;
  angle: number;
  power: number;
  /** What the simulation says this shot is worth. */
  value: number;
}

interface Candidate {
  pos: number;
  angle: number;
  power: number;
  rank: number;
}

const { size, cushion, baseline, coinRadius, strikerRadius } = CARROM_BOARD;
const SPAN = size - cushion * 2 - strikerRadius * 2;

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The coins this player may aim at. */
function targetsFor(live: readonly CarromPiece[], color: CarromColor, mode: CarromMode): CarromPiece[] {
  if (mode === "freestyle") return live.filter((p) => p.kind !== "striker");
  const own = live.filter((p) => p.kind === color);
  const queen = mode === "discpool" ? [] : live.filter((p) => p.kind === "queen");
  // The queen is worth chasing early (she needs covering by an own coin), so she is always a target.
  return [...own, ...queen];
}

function candidatesFor(query: CarromShotQuery): Candidate[] {
  const live = query.pieces.filter((p) => !p.pocketed && p.kind !== "striker");
  const targets = targetsFor(live, query.color, query.mode);
  const y = query.turnIndex === 0 ? size - baseline : baseline;
  const forward = query.turnIndex === 0 ? -1 : 1;
  const pockets = pocketCentres();
  const out: Candidate[] = [];

  for (const target of targets) {
    for (const pocket of pockets) {
      const toPocketX = pocket.x - target.x;
      const toPocketY = pocket.y - target.y;
      const toPocket = Math.hypot(toPocketX, toPocketY);
      if (toPocket === 0) continue;
      const ux = toPocketX / toPocket;
      const uy = toPocketY / toPocket;
      // Where the striker's centre must be at the moment of contact.
      const gx = target.x - ux * (coinRadius + strikerRadius);
      const gy = target.y - uy * (coinRadius + strikerRadius);

      // The coin's own path to the pocket must be clear of other pieces.
      const coinPathBlocked = live.some(
        (o) => o.id !== target.id && distanceToSegment(o.x, o.y, target.x, target.y, pocket.x, pocket.y) < 2 * coinRadius + CLEARANCE,
      );
      if (coinPathBlocked) continue;

      for (let i = 0; i < BASELINE_POSITIONS; i++) {
        const pos = i / (BASELINE_POSITIONS - 1);
        const sx = cushion + strikerRadius + pos * SPAN;
        const vx = gx - sx;
        const vy = gy - y;
        const reach = Math.hypot(vx, vy);
        if (reach < 0.5 || vy * forward <= 0) continue;
        const cut = (vx / reach) * ux + (vy / reach) * uy;
        if (cut < MIN_CUT_COS) continue;
        const lineBlocked = live.some(
          (o) => o.id !== target.id && distanceToSegment(o.x, o.y, sx, y, gx, gy) < coinRadius + strikerRadius + CLEARANCE,
        );
        if (lineBlocked) continue;

        // A coin further from the pocket needs a harder hit; a thin cut loses most of the speed.
        const power = Math.max(0.4, Math.min(0.95, 0.32 + (reach + toPocket) / 150 + (1 - cut) * 0.25));
        out.push({ pos, angle: Math.atan2(vy, vx), power, rank: cut * 2 - (reach + toPocket) / 120 });
      }
    }
  }
  return out.sort((a, b) => b.rank - a.rank);
}

/** What a simulated shot is worth to the player taking it. */
function valueOf(potted: readonly CarromPiece[], color: CarromColor, mode: CarromMode): number {
  let value = 0;
  let ownPotted = 0;
  for (const p of potted) {
    if (p.kind === "striker") {
      value -= mode === "freestyle" ? 0.5 : 2.2;
    } else if (mode === "freestyle") {
      value += p.kind === "queen" ? 2.5 : p.kind === "white" ? 1 : 0.5;
    } else if (p.kind === color) {
      value += 1;
      ownPotted += 1;
    } else if (p.kind === "queen") {
      value += 0.6;
    } else {
      value -= 1.2; // the opponent's coin: it scores for them
    }
  }
  // Potting keeps the turn, and an own coin also covers the queen.
  if (value > 0 && (mode === "freestyle" || ownPotted > 0)) value += 0.5;
  return value;
}

function simulate(query: CarromShotQuery, candidate: Candidate): number {
  const y = query.turnIndex === 0 ? size - baseline : baseline;
  const sx = cushion + strikerRadius + candidate.pos * SPAN;
  const board: CarromPiece[] = query.pieces.map((p) => ({ ...p }));
  let striker = board.find((p) => p.kind === "striker");
  if (!striker) {
    striker = { id: "sim-striker", kind: "striker", x: sx, y, vx: 0, vy: 0, pocketed: false };
    board.push(striker);
  }
  Object.assign(striker, { x: sx, y, pocketed: false, ...launchVelocity(candidate.angle, candidate.power) });

  const potted: CarromPiece[] = [];
  for (let tick = 0; tick < MAX_SIM_TICKS; tick++) {
    potted.push(...step(board, DT));
    if (allAtRest(board)) break;
  }
  return valueOf(potted, query.color, query.mode);
}

/** The best shot found, or `null` when none of the candidates pots anything worth having. */
export function chooseCarromShot(query: CarromShotQuery): CarromShot | null {
  const ranked = candidatesFor(query).slice(0, Math.max(1, query.candidates));
  let best: { candidate: Candidate; value: number } | null = null;
  for (const candidate of ranked) {
    const value = simulate(query, candidate);
    if (!best || value > best.value) best = { candidate, value };
  }
  if (!best || best.value <= 0) return null;

  const noise = query.aimNoise > 0 ? (query.rng() + query.rng() + query.rng() - 1.5) * 2 * query.aimNoise : 0;
  return { pos: best.candidate.pos, angle: best.candidate.angle + noise, power: best.candidate.power, value: best.value };
}

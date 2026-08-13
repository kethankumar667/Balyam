import { describe, expect, it } from "vitest";
import type { VyomaYudhPublicState } from "@shared/types";
import { interpolateState, reconcileShipY } from "../interpolate";

function frame(over: Partial<VyomaYudhPublicState> = {}): VyomaYudhPublicState {
  return {
    kind: "vyomayudh",
    pilotId: "a",
    tick: 0,
    ship: { x: 20, y: 50, invulnUntilTick: 0 },
    lives: 3,
    score: 0,
    level: 1,
    ammo: { missile: 0, laser: 0, wall: 0 },
    enemies: [],
    shots: [],
    pickups: [],
    bossHp: null,
    result: null,
    isOver: false,
    winnerId: null,
    ...over,
  };
}

const enemy = (id: string, x: number, y: number) => ({
  id,
  x,
  y,
  kind: "scout" as const,
  hp: 1,
  maxHp: 1,
});

const shot = (id: string, x: number, y: number) => ({
  id,
  x,
  y,
  vx: -1,
  vy: 0,
  fromPlayer: false,
  weapon: "basic" as const,
});

/**
 * The world is simulated 20 times a second and drawn 60 times a second.
 *
 * Drawing the raw broadcast means every enemy and bullet holds perfectly
 * still for three frames and then jumps — which reads as stutter on a
 * PERFECT connection, because it is not a network problem at all. It is the
 * game showing 20 positions a second and calling it motion.
 */
describe("interpolateState", () => {
  it("draws an enemy part-way between where it was and where it is", () => {
    const prev = frame({ enemies: [enemy("e1", 100, 40)] });
    const cur = frame({ enemies: [enemy("e1", 80, 60)] });

    expect(interpolateState(prev, cur, 0).enemies[0]).toMatchObject({ x: 100, y: 40 });
    expect(interpolateState(prev, cur, 0.5).enemies[0]).toMatchObject({ x: 90, y: 50 });
    expect(interpolateState(prev, cur, 1).enemies[0]).toMatchObject({ x: 80, y: 60 });
  });

  it("matches entities by id, not by position in the array", () => {
    // The server rebuilds these arrays every tick and filters dead entries,
    // so index 0 is a different enemy from one frame to the next. Blending
    // by index would have every enemy smear toward whoever replaced it.
    const prev = frame({ enemies: [enemy("a", 10, 10), enemy("b", 90, 90)] });
    const cur = frame({ enemies: [enemy("b", 80, 80), enemy("a", 20, 20)] });

    const out = interpolateState(prev, cur, 0.5);
    expect(out.enemies.find((e) => e.id === "a")).toMatchObject({ x: 15, y: 15 });
    expect(out.enemies.find((e) => e.id === "b")).toMatchObject({ x: 85, y: 85 });
  });

  it("draws a newly spawned entity where it actually is", () => {
    // Nothing to smooth from. Inventing a start position would make new
    // bullets appear to fly out of the wrong place.
    const prev = frame({ shots: [] });
    const cur = frame({ shots: [shot("s1", 30, 50)] });
    expect(interpolateState(prev, cur, 0.5).shots[0]).toMatchObject({ x: 30, y: 50 });
  });

  it("drops entities that are gone", () => {
    const prev = frame({ enemies: [enemy("e1", 50, 50)] });
    const cur = frame({ enemies: [] });
    expect(interpolateState(prev, cur, 0.5).enemies).toHaveLength(0);
  });

  it("clamps alpha rather than extrapolating past the newest frame", () => {
    // If broadcasts stall, hold at the last known position. Extrapolating is
    // a guess that has to be visibly yanked back when packets resume.
    const prev = frame({ enemies: [enemy("e1", 100, 50)] });
    const cur = frame({ enemies: [enemy("e1", 80, 50)] });
    expect(interpolateState(prev, cur, 4).enemies[0].x).toBe(80);
    expect(interpolateState(prev, cur, -2).enemies[0].x).toBe(100);
  });

  it("carries the non-positional fields through untouched", () => {
    const prev = frame({ score: 10 });
    const cur = frame({ score: 40, lives: 2, bossHp: 0.5 });
    const out = interpolateState(prev, cur, 0.5);
    // Score must not be smoothed — a counter easing toward a number looks
    // broken, and the HUD reads this same object.
    expect(out.score).toBe(40);
    expect(out.lives).toBe(2);
    expect(out.bossHp).toBe(0.5);
  });
});

/**
 * The ship is the one thing the player controls, so it must not pay the
 * interpolation's one-tick lag on top of a network round trip.
 */
describe("reconcileShipY", () => {
  const SPEED = 55;
  const MIN = 4;
  const MAX = 96;

  it("moves immediately in the held direction, before the server replies", () => {
    // Press, wait for a round trip, then move is the difference between a
    // ship you are flying and a ship you are requesting.
    const next = reconcileShipY(50, 50, 1 / 60, -1, SPEED, MIN, MAX);
    expect(next).toBeLessThan(50);
  });

  it("holds still when nothing is held", () => {
    expect(reconcileShipY(50, 50, 1 / 60, 0, SPEED, MIN, MAX)).toBeCloseTo(50, 6);
  });

  it("converges on the server when the two disagree slightly", () => {
    let predicted = 50;
    for (let i = 0; i < 30; i++) {
      predicted = reconcileShipY(predicted, 54, 1 / 60, 0, SPEED, MIN, MAX);
    }
    expect(predicted).toBeCloseTo(54, 1);
  });

  it("snaps rather than glides when the ship is teleported", () => {
    /**
     * A respawn recentres the ship. Easing across that would send it
     * sliding through the middle of the screen while the player watches,
     * which is worse than the jump — they already know they died.
     */
    expect(reconcileShipY(8, 50, 1 / 60, 0, SPEED, MIN, MAX)).toBe(50);
  });

  it("never predicts outside the world", () => {
    let predicted = 50;
    for (let i = 0; i < 600; i++) {
      predicted = reconcileShipY(predicted, predicted, 1 / 60, -1, SPEED, MIN, MAX);
    }
    expect(predicted).toBe(MIN);
  });

  it("converges at the same real-world pace whatever the frame rate", () => {
    // A 30fps phone and a 120Hz tablet must not disagree about how fast the
    // correction is applied, or the same connection feels different on each.
    const run = (fps: number) => {
      let y = 50;
      for (let i = 0; i < fps; i++) y = reconcileShipY(y, 60, 1 / fps, 0, SPEED, MIN, MAX);
      return y;
    };
    expect(run(30)).toBeCloseTo(run(120), 4);
  });
});

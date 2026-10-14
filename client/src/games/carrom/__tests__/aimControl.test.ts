import { describe, expect, it } from "vitest";
import {
  ANGLE_FULL_TRUST_UNITS,
  DEAD_ZONE_UNITS,
  MAX_PULL_UNITS,
  RELEASE_LOOKBACK_MS,
  currentAim,
  moveGesture,
  releaseAim,
  startGesture,
  type AimGesture,
  type Point,
} from "../aimControl";

/**
 * Turning a finger into a shot.
 *
 * Aim used to be measured from the striker to wherever the finger happened to be, which meant the
 * first touch could already be full power, a second finger took over, the angle and the power shared
 * one short lever, and the finger rolling as it lifted changed the shot at the last instant. The aim
 * is now read from how far the finger has MOVED since it went down.
 */

const at = (x: number, y: number): Point => ({ x, y });
const ANCHOR = at(50, 80);

/** Plays a finger along `points`, 16 ms apart, starting at `t0`. */
function drag(points: Point[], opts: { anchor?: Point; pointerId?: number; t0?: number; step?: number } = {}): AimGesture {
  const { anchor = ANCHOR, pointerId = 1, t0 = 0, step = 16 } = opts;
  let g = startGesture(pointerId, anchor, t0);
  points.forEach((p, i) => {
    g = moveGesture(g, pointerId, p, t0 + (i + 1) * step);
  });
  return g;
}

describe("pulling back sets the shot", () => {
  it("shoots the opposite way to the pull, with power in proportion to its length", () => {
    // Finger pulled 20 units to the left of where it went down, so the striker flies to the right.
    const g = drag([at(30, 80)]);

    const aim = currentAim(g)!;
    expect(aim.angle).toBeCloseTo(0, 6);
    expect(aim.power).toBeCloseTo(20 / MAX_PULL_UNITS, 6);
  });

  it("shoots straight up the board when the finger is pulled straight down", () => {
    const aim = currentAim(drag([at(50, 100)]))!;

    expect(aim.angle).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("reaches full power at the maximum pull and never exceeds it", () => {
    expect(currentAim(drag([at(50 - MAX_PULL_UNITS, 80)]))!.power).toBeCloseTo(1, 6);
    expect(currentAim(drag([at(-200, 80)]))!.power).toBe(1);
  });

  it("gives the same shot wherever on the board the finger went down", () => {
    const near = currentAim(drag([at(30, 70)], { anchor: at(50, 80) }))!;
    const far = currentAim(drag([at(60, 20)], { anchor: at(80, 30) }))!;

    expect(far.angle).toBeCloseTo(near.angle, 9);
    expect(far.power).toBeCloseTo(near.power, 9);
  });

  it("records the pull vector it came from", () => {
    const aim = currentAim(drag([at(40, 90)]))!;

    expect(aim.dx).toBeCloseTo(10, 9);
    expect(aim.dy).toBeCloseTo(-10, 9);
  });
});

describe("a touch is not a shot", () => {
  it("has no aim at the instant the finger goes down", () => {
    expect(currentAim(startGesture(1, ANCHOR, 0))).toBeNull();
  });

  it("has no aim for a movement inside the dead zone, so a tap or a wobble never shoots", () => {
    const g = drag([at(50 - DEAD_ZONE_UNITS / 2, 80)]);

    expect(currentAim(g)).toBeNull();
    expect(releaseAim(g, 200)).toBeNull();
  });

  it("is cancelled by pulling back to where the finger started", () => {
    const g = drag([at(20, 80), at(35, 80), at(50, 80)]);

    expect(currentAim(g)).toBeNull();
    expect(releaseAim(g, 400)).toBeNull();
  });
});

describe("only the finger that started the aim counts", () => {
  it("ignores a second finger entirely", () => {
    const first = drag([at(30, 80)], { pointerId: 1 });

    const after = moveGesture(first, 2, at(90, 10), 100);

    expect(after).toBe(first);
    expect(currentAim(after)).toEqual(currentAim(first));
  });
});

describe("a steady hand: the angle is damped when the pull is short", () => {
  it("moves less than the raw angle for a jitter on a short pull", () => {
    const shortPull = 5;
    let g = drag([at(50 - shortPull, 80)]);
    const before = currentAim(g)!.angle;

    g = moveGesture(g, 1, at(50 - shortPull, 81), 100);
    const moved = Math.abs(currentAim(g)!.angle - before);
    const rawMove = Math.abs(Math.atan2(-1, shortPull) - before);

    expect(moved).toBeLessThan(rawMove * 0.5);
  });

  it("uses the raw angle once the pull is long enough to trust", () => {
    const longPull = ANGLE_FULL_TRUST_UNITS + 10;
    let g = drag([at(50 - longPull, 80)]);

    g = moveGesture(g, 1, at(50 - longPull, 81), 100);

    expect(currentAim(g)!.angle).toBeCloseTo(Math.atan2(-1, longPull), 9);
  });

  it("turns the short way round when the aim crosses straight left", () => {
    // Aiming just above straight left, then just below: angles +3.1 and -3.1 are 0.08 rad apart.
    let g = drag([at(50 + 12, 80 - 0.5)]);
    g = moveGesture(g, 1, at(50 + 12, 80 + 0.5), 100);

    expect(Math.abs(currentAim(g)!.angle)).toBeGreaterThan(3);
  });
});

describe("the finger rolling as it lifts does not change the shot", () => {
  it("fires the aim the player was holding, not the last twitch before release", () => {
    // Held steady for 200 ms, then the fingertip rolls sideways just before it leaves the glass.
    let g = startGesture(1, ANCHOR, 0);
    for (let t = 16; t <= 200; t += 16) g = moveGesture(g, 1, at(50 - 24, 80), t);
    const held = currentAim(g)!;
    g = moveGesture(g, 1, at(50 - 24, 80 + 7), 290);

    const fired = releaseAim(g, 300)!;

    expect(fired.angle).toBeCloseTo(held.angle, 9);
    expect(fired.power).toBeCloseTo(held.power, 9);
    expect(currentAim(g)!.angle).not.toBeCloseTo(held.angle, 3);
  });

  it("still fires a quick flick that is over inside the look-back window", () => {
    const g = drag([at(50 - 30, 80)], { step: 16 });

    const fired = releaseAim(g, 16 + RELEASE_LOOKBACK_MS / 2)!;

    expect(fired.power).toBeCloseTo(30 / MAX_PULL_UNITS, 6);
  });
});

describe("bookkeeping", () => {
  it("keeps only a short window of history however long the finger stays down", () => {
    let g = startGesture(1, ANCHOR, 0);
    for (let i = 1; i <= 1000; i++) g = moveGesture(g, 1, at(50 - 20 - (i % 3), 80), i * 10);

    expect(g.samples.length).toBeLessThanOrEqual(60);
  });

  it("never changes a gesture it was given", () => {
    const g = Object.freeze(startGesture(1, ANCHOR, 0));

    expect(() => moveGesture(g, 1, at(20, 80), 16)).not.toThrow();
    expect(g.samples).toHaveLength(1);
  });
});

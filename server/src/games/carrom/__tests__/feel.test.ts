import { describe, expect, it } from "vitest";
import type { CarromPiece, Player } from "@shared/types.js";
import { CarromEngine } from "../CarromEngine.js";
import { allAtRest, launchVelocity, speedOf, step } from "../physics.js";

/**
 * How a shot FEELS, pinned as numbers.
 *
 * Friction used to be purely viscous: speed fell by the same fraction every second, so a piece
 * slowed down and then crept for seconds before it finally stopped. Measured on the real engine,
 * every shot took 3.1 to 3.8 seconds to settle and over half of that was the creeping tail, and the
 * next player could not move until it ended. These tests hold the fix to two promises: shots end
 * quickly, and a hard shot still travels as far as it used to.
 */

const DT = 1 / 60;
/** Where a lone striker used to stop (units of path) at each power, with the viscous-only physics. */
const OLD_REACH_UNITS = { 0.3: 35, 0.5: 59, 0.6: 70, 0.8: 85, 1: 100 } as const;

function lone(power: number, angle = -Math.PI / 2): { pathUnits: number; settleSeconds: number } {
  const striker: CarromPiece = { id: "s", kind: "striker", x: 50, y: 80, vx: 0, vy: 0, pocketed: false };
  Object.assign(striker, launchVelocity(angle, power));
  const pieces = [striker];
  let path = 0;
  let ticks = 0;
  let last = { x: striker.x, y: striker.y };
  while (!allAtRest(pieces) && ticks < 2000) {
    step(pieces, DT);
    path += Math.hypot(striker.x - last.x, striker.y - last.y);
    last = { x: striker.x, y: striker.y };
    ticks++;
  }
  return { pathUnits: path, settleSeconds: ticks * DT };
}

describe("a shot ends promptly", () => {
  it.each([0.3, 0.5, 0.8, 1])("a lone striker at power %s is at rest within 2.5 seconds", (power) => {
    expect(lone(power).settleSeconds).toBeLessThanOrEqual(2.5);
  });

  it("a coin nudged to a crawl stops within half a second instead of creeping", () => {
    const coin: CarromPiece = { id: "c", kind: "white", x: 50, y: 50, vx: 10, vy: 0, pocketed: false };
    let ticks = 0;
    while (speedOf(coin) > 0 && ticks < 600) {
      step([coin], DT);
      ticks++;
    }
    expect(ticks * DT).toBeLessThanOrEqual(0.5);
  });

  it("a real shot into the rack is over within 2.6 seconds, from gentle to full power", () => {
    for (const power of [0.3, 0.6, 1]) {
      const players = [0, 1].map((i) => ({ id: `p${i}`, name: `P${i}`, isHost: i === 0, isReady: true, isConnected: true })) as Player[];
      const engine = new CarromEngine();
      engine.setRng(() => 0.5);
      engine.init(players);
      const shooter = engine.getPublicState().turnPlayerId!;
      const result = engine.applyMove({ playerId: shooter, type: "shoot", data: { angle: -Math.PI / 2, power } });
      expect(result.ok).toBe(true);
      let ticks = 0;
      while (engine.getPublicState().phase === "resolving" && ticks < 2000) {
        engine.simulateTick();
        ticks++;
      }
      expect(ticks * DT, `power ${power}`).toBeLessThanOrEqual(2.6);
    }
  });
});

describe("a piece at rest", () => {
  it("stays exactly where it is, with a real zero velocity and no NaN", () => {
    const coin: CarromPiece = { id: "c", kind: "black", x: 40, y: 55, vx: 0, vy: 0, pocketed: false };

    for (let i = 0; i < 120; i++) step([coin], DT);

    expect(coin).toMatchObject({ x: 40, y: 55, vx: 0, vy: 0 });
  });

  it("is never given a NaN speed by a neighbour that is still moving", () => {
    const still: CarromPiece = { id: "a", kind: "white", x: 30, y: 50, vx: 0, vy: 0, pocketed: false };
    const moving: CarromPiece = { id: "b", kind: "black", x: 60, y: 50, vx: -40, vy: 0, pocketed: false };

    for (let i = 0; i < 240; i++) step([still, moving], DT);

    for (const p of [still, moving]) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy)).toBe(true);
    }
  });
});

describe("a shot still goes as far as it did", () => {
  it.each(Object.entries(OLD_REACH_UNITS))("a lone striker at power %s travels at least 70%% of its old distance", (power, oldReach) => {
    expect(lone(Number(power)).pathUnits).toBeGreaterThanOrEqual(oldReach * 0.7);
  });

  it.each([0.5, 0.6, 0.8, 1])("and at power %s, at least 80%%", (power) => {
    const oldReach = OLD_REACH_UNITS[power as keyof typeof OLD_REACH_UNITS];
    expect(lone(power).pathUnits).toBeGreaterThanOrEqual(oldReach * 0.8);
  });

  it("a harder shot never travels less than a gentler one", () => {
    const reaches = [0.3, 0.5, 0.6, 0.8, 1].map((p) => lone(p).pathUnits);
    for (let i = 1; i < reaches.length; i++) expect(reaches[i]).toBeGreaterThanOrEqual(reaches[i - 1]);
  });
});

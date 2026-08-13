import { describe, it, expect } from "vitest";
import { SPACEWAR_TICK_HZ, SPACEWAR_WORLD } from "@shared/types";
import { advanceShipLead, steerAxis, type Vec2 } from "../predict";

const FRAME = 1000 / 60;
const TICK_MS = 1000 / SPACEWAR_TICK_HZ;
const MID = { x: 400, y: 200 };

/** Run `frames` rendered frames with `held` down, from a standing start. */
function fly(held: Set<string>, frames: number, server: Vec2 = MID, dt = FRAME): Vec2 {
  let lead: Vec2 = { x: 0, y: 0 };
  for (let i = 0; i < frames; i++) lead = advanceShipLead(lead, held, server, dt);
  return lead;
}

describe("advanceShipLead", () => {
  it("responds on the very first frame", () => {
    // The whole point: the thumb goes down and the ship has already moved by
    // the next paint, rather than after a round trip.
    const lead = advanceShipLead({ x: 0, y: 0 }, new Set(["ArrowRight"]), MID, FRAME);
    expect(lead.x).toBeGreaterThan(0);
    expect(lead.y).toBe(0);
  });

  it("settles at about one round trip of travel instead of running away", () => {
    const lead = fly(new Set(["ArrowRight"]), 240); // four seconds held
    const perTick = SPACEWAR_WORLD.shipSpeed;
    // Bounded to a fraction of a second of flight — it is a lag offset, not a
    // second simulation drifting away from the server's.
    expect(lead.x).toBeGreaterThan(perTick);
    expect(lead.x).toBeLessThan(perTick * 6);
  });

  it("converges rather than oscillating", () => {
    const held = new Set(["ArrowRight"]);
    let lead: Vec2 = { x: 0, y: 0 };
    const trail: number[] = [];
    for (let i = 0; i < 120; i++) {
      lead = advanceShipLead(lead, held, MID, FRAME);
      trail.push(lead.x);
    }
    for (let i = 1; i < trail.length; i++) expect(trail[i]).toBeGreaterThanOrEqual(trail[i - 1]);
    expect(trail[119] - trail[110]).toBeLessThan(0.5);
  });

  it("bleeds back to zero after the finger lifts", () => {
    let lead = fly(new Set(["ArrowRight"]), 60);
    expect(lead.x).toBeGreaterThan(1);
    const empty = new Set<string>();
    for (let i = 0; i < 18; i++) lead = advanceShipLead(lead, empty, MID, FRAME);
    // Most of it is gone within 300ms...
    expect(lead.x).toBeLessThan(2);
    for (let i = 0; i < 30; i++) lead = advanceShipLead(lead, empty, MID, FRAME);
    // ...and the drawn ship is back exactly on the authoritative one shortly
    // after. No snap at any point, because it decayed the whole way.
    expect(lead.x).toBe(0);
  });

  it("never draws the ship outside the flight envelope", () => {
    const maxX = SPACEWAR_WORLD.width - SPACEWAR_WORLD.shipWidth;
    const pinnedRight = { x: maxX, y: MID.y };
    const lead = fly(new Set(["ArrowRight"]), 120, pinnedRight);
    expect(lead.x).toBeLessThanOrEqual(0);

    const minY = SPACEWAR_WORLD.shipMarginY;
    const pinnedTop = { x: MID.x, y: minY };
    expect(fly(new Set(["ArrowUp"]), 120, pinnedTop).y).toBeGreaterThanOrEqual(0);
  });

  it("holds two directions at once", () => {
    const lead = fly(new Set(["ArrowRight", "ArrowDown"]), 60);
    expect(lead.x).toBeGreaterThan(0);
    expect(lead.y).toBeGreaterThan(0);
  });

  it("cancels opposing keys, like the engine does", () => {
    const lead = fly(new Set(["ArrowLeft", "ArrowRight"]), 60);
    expect(lead.x).toBe(0);
  });

  it("resets after a frame gap long enough to mean the tab was asleep", () => {
    const lead = advanceShipLead({ x: 40, y: 12 }, new Set(["ArrowRight"]), MID, 4000);
    expect(lead).toEqual({ x: 0, y: 0 });
  });

  it("is frame-rate independent", () => {
    // Same wall-clock hold, 60fps vs 30fps, must land in the same place —
    // otherwise a phone that drops frames flies a different ship.
    const at60 = fly(new Set(["ArrowRight"]), 120, MID, FRAME).x;
    const at30 = fly(new Set(["ArrowRight"]), 60, MID, FRAME * 2).x;
    expect(Math.abs(at60 - at30)).toBeLessThan(2);
  });

  it("predicts at the speed the engine actually flies", () => {
    // One tick of input, before any decay has had time to matter.
    const lead = advanceShipLead({ x: 0, y: 0 }, new Set(["ArrowRight"]), MID, TICK_MS);
    expect(lead.x).toBeGreaterThan(SPACEWAR_WORLD.shipSpeed * 0.7);
    expect(lead.x).toBeLessThanOrEqual(SPACEWAR_WORLD.shipSpeed);
  });
});

describe("steerAxis", () => {
  it("reads the same keys the engine reads", () => {
    expect(steerAxis(new Set(["ArrowRight"]))).toEqual({ x: 1, y: 0 });
    expect(steerAxis(new Set(["d"]))).toEqual({ x: 1, y: 0 });
    expect(steerAxis(new Set(["A"]))).toEqual({ x: -1, y: 0 });
    expect(steerAxis(new Set(["ArrowUp"]))).toEqual({ x: 0, y: -1 });
    expect(steerAxis(new Set(["s"]))).toEqual({ x: 0, y: 1 });
    expect(steerAxis(new Set([" ", "x"]))).toEqual({ x: 0, y: 0 });
  });
});

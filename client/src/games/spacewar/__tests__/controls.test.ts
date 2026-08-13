import { describe, it, expect } from "vitest";
import { SPACEWAR_WORLD } from "@shared/types";
import { shipKeyFor, STEERING_KEYS } from "../controls";
import { steerAxis } from "../predict";
import type { PadDir } from "../../../components/quadPad";

/**
 * The portrait transform from render.ts, as arithmetic.
 *
 *   ctx.translate(0, 640); ctx.rotate(-PI/2); ctx.scale(640/840, 1)
 *
 * A world point therefore lands at (wy, 640 - wx * 640/840). These tests
 * compose pad press -> engine key -> world motion -> screen motion, which is
 * the only chain that can catch a rotation being ignored: every link was
 * individually correct while UP flew the ship down.
 */
function worldToScreen(wx: number, wy: number) {
  return { x: wy, y: 640 - wx * (640 / 840) };
}

/** Where the ship ends up on screen after one tick of holding `dir`. */
function screenStep(dir: PadDir) {
  const key = shipKeyFor(dir, "vertical");
  const axis = steerAxis(new Set([key]));
  const from = { x: 400, y: 240 };
  const to = {
    x: from.x + axis.x * SPACEWAR_WORLD.shipSpeed,
    y: from.y + axis.y * SPACEWAR_WORLD.shipSpeed,
  };
  const a = worldToScreen(from.x, from.y);
  const b = worldToScreen(to.x, to.y);
  return { dx: b.x - a.x, dy: b.y - a.y };
}

describe("space war steering, portrait", () => {
  it("moves the ship UP the screen when the pilot presses up", () => {
    const { dx, dy } = screenStep("UP");
    expect(dy).toBeLessThan(0);
    expect(dx).toBe(0);
  });

  it("moves the ship DOWN the screen when the pilot presses down", () => {
    const { dx, dy } = screenStep("DOWN");
    expect(dy).toBeGreaterThan(0);
    expect(dx).toBe(0);
  });

  it("moves left and right the way they are drawn", () => {
    expect(screenStep("LEFT").dx).toBeLessThan(0);
    expect(screenStep("RIGHT").dx).toBeGreaterThan(0);
    expect(screenStep("LEFT").dy).toBe(0);
    expect(screenStep("RIGHT").dy).toBe(0);
  });

  it("maps the quarter turn explicitly", () => {
    // Forward in the simulation (+x, toward the enemies) is up the phone.
    expect(shipKeyFor("UP", "vertical")).toBe("ArrowRight");
    expect(shipKeyFor("DOWN", "vertical")).toBe("ArrowLeft");
    expect(shipKeyFor("LEFT", "vertical")).toBe("ArrowUp");
    expect(shipKeyFor("RIGHT", "vertical")).toBe("ArrowDown");
  });

  it("passes screen directions straight through in landscape", () => {
    expect(shipKeyFor("UP", "horizontal")).toBe("ArrowUp");
    expect(shipKeyFor("DOWN", "horizontal")).toBe("ArrowDown");
    expect(shipKeyFor("LEFT", "horizontal")).toBe("ArrowLeft");
    expect(shipKeyFor("RIGHT", "horizontal")).toBe("ArrowRight");
  });

  it("routes every key the engine steers with", () => {
    // The desktop board decides what goes through the held-key path by asking
    // this set; anything missing would fly on keydown and never stop.
    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]) {
      expect(STEERING_KEYS.has(key)).toBe(true);
    }
    expect(STEERING_KEYS.has(" ")).toBe(false);
    expect(STEERING_KEYS.has("p")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { geometryOf, resolveDir } from "../quadPad";

// A 200x200 pad whose top-left corner sits at (40, 60).
const geo = geometryOf({ left: 40, top: 60, width: 200, height: 200 });

describe("resolveDir", () => {
  it("locates the pad centre and radius from its box", () => {
    expect(geo).toEqual({ cx: 140, cy: 160, radius: 100 });
  });

  it("claims the whole quarter, not just the middle of it", () => {
    // Points scattered across the UP wedge — near the rim, near the diagonals,
    // near the hub — all steer up. Under the old capsule pads only the third
    // of these was live.
    expect(resolveDir(geo, 140, 65)).toBe("UP");
    expect(resolveDir(geo, 75, 95)).toBe("UP");
    expect(resolveDir(geo, 205, 95)).toBe("UP");
    expect(resolveDir(geo, 140, 120)).toBe("UP");
  });

  it("splits the sectors on the diagonals", () => {
    expect(resolveDir(geo, 220, 160)).toBe("RIGHT");
    expect(resolveDir(geo, 140, 250)).toBe("DOWN");
    expect(resolveDir(geo, 50, 160)).toBe("LEFT");
  });

  it("resolves a hair either side of a diagonal", () => {
    // 45 degrees up-right: one pixel of horizontal bias makes it RIGHT.
    expect(resolveDir(geo, 140 + 61, 160 - 60)).toBe("RIGHT");
    expect(resolveDir(geo, 140 + 60, 160 - 61)).toBe("UP");
  });

  it("ignores the hub so a resting thumb cannot chatter", () => {
    expect(resolveDir(geo, 140, 160)).toBeNull();
    expect(resolveDir(geo, 145, 165)).toBeNull();
    // Just outside the dead zone (22% of a 100px radius) it engages again.
    expect(resolveDir(geo, 140, 160 - 25)).toBe("UP");
  });

  it("keeps steering when the finger slides off the rim mid-drag", () => {
    // Well outside the circle. Releasing here would read as the control
    // dropping out from under the player.
    expect(resolveDir(geo, 140, -400)).toBe("UP");
    expect(resolveDir(geo, 900, 160)).toBe("RIGHT");
  });

  it("honours a custom dead zone", () => {
    expect(resolveDir(geo, 140, 160 - 40, 0.5)).toBeNull();
    expect(resolveDir(geo, 140, 160 - 60, 0.5)).toBe("UP");
    expect(resolveDir(geo, 140, 160 - 2, 0)).toBe("UP");
  });

  it("resolves a perfect diagonal deterministically", () => {
    expect(resolveDir(geo, 140 + 50, 160 - 50)).toBe("UP");
    expect(resolveDir(geo, 140 + 50, 160 + 50)).toBe("DOWN");
  });
});

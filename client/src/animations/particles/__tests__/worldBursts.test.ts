import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@shared/worlds";
import LUDO_ANIMATIONS from "../../../games/ludo/LudoAnimations.tsx?raw";
import LUDO_COMPOSITES from "../../../games/ludo/ludo-board-composites.tsx?raw";
import RUMMY_ANIMATIONS from "../../../games/rummy/RummyAnimations.tsx?raw";
import { WORLD_BURSTS, worldBurstOptions } from "../worldBursts";

/**
 * What a burst is made of in each world. The classic table must keep its own bursts (the function says "not mine" by
 * returning null), and no two worlds may throw the same thing.
 */

const ANCHOR = { left: "40%", top: "60%" };

describe("the options for a burst in a world", () => {
  it("has none for the classic table, which keeps its own comic dust and sparkle", () => {
    expect(worldBurstOptions("classic", "impact", ANCHOR, 1)).toBeNull();
    expect(worldBurstOptions("classic", "cheer", ANCHOR, 1)).toBeNull();
  });

  it("has a look for every other world and puts it at the anchor", () => {
    for (const id of WORLD_IDS.filter((world) => world !== "classic")) {
      const options = worldBurstOptions(id, "impact", ANCHOR, 1);
      expect(options, id).not.toBeNull();
      expect(options?.position, id).toEqual({ x: 40, y: 60 });
    }
  });

  it("throws something different in each world", () => {
    const looks = Object.values(WORLD_BURSTS).map((look) => JSON.stringify([look.colors, look.shapes, look.gravity]));
    expect(new Set(looks).size).toBe(looks.length);
  });

  it("lets bubbles rise and everything else fall or hang", () => {
    expect(WORLD_BURSTS.reef.gravity).toBeLessThan(0);
    expect(WORLD_BURSTS.neon.gravity).toBe(0);
    for (const world of ["toy", "zen", "palace"] as const) expect(WORLD_BURSTS[world].gravity, world).toBeGreaterThan(0);
  });

  it("draws the palace's pieces as marigold petals", () => {
    const options = worldBurstOptions("palace", "impact", ANCHOR, 1);
    expect(options?.shapes).toEqual(["emoji"]);
    expect(options?.shapeOptions).toEqual({ emoji: { value: ["🌼"] } });
  });

  it("throws more, wider and harder to cheer than to cut, and scales with intensity", () => {
    const impact = worldBurstOptions("toy", "impact", ANCHOR, 1);
    const cheer = worldBurstOptions("toy", "cheer", ANCHOR, 1);
    expect(cheer?.count).toBeGreaterThan(impact?.count ?? 0);
    expect(cheer?.spread).toBeGreaterThan(impact?.spread ?? 0);
    expect(cheer?.startVelocity).toBeGreaterThan(impact?.startVelocity ?? 0);
    expect(worldBurstOptions("toy", "impact", ANCHOR, 0.5)?.count).toBeLessThan(impact?.count ?? 0);
  });
});

describe("the bursts reach the moments of both games", () => {
  it("fires the world's own burst for a Ludo cut and a Ludo token coming home", () => {
    expect(LUDO_ANIMATIONS).toContain("fireWorldImpact(world");
    expect(LUDO_ANIMATIONS).toContain("fireWorldCheer(world");
    expect(LUDO_COMPOSITES).toContain("world={m.world}");
  });

  it("fires the world's own finale for a Rummy winner", () => {
    expect(RUMMY_ANIMATIONS).toContain("fireWorldFireworks(world");
  });
});

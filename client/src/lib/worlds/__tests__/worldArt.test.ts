import { describe, expect, it } from "vitest";
import { WORLD_IDS, worldsFor } from "@shared/worlds";
import { artWorldsFor, drawnWorld } from "../worldArt";

/**
 * The server accepts every world on the list for a game with worlds, but a game can only draw the worlds it has art
 * for. These tests pin the rule that keeps the two honest: the picker offers only what is drawn, and a table that
 * somehow names a world with no art for it still looks like the classic one rather than like nothing.
 */
describe("which worlds a game can draw", () => {
  it("always includes the classic world for a game that has worlds", () => {
    for (const game of ["ludo", "rummy"] as const) expect(artWorldsFor(game)).toContain("classic");
  });

  it("is a part of what the server accepts, never more", () => {
    for (const game of ["ludo", "rummy"] as const) {
      for (const id of artWorldsFor(game)) expect(worldsFor(game), `${game} draws ${id}`).toContain(id);
    }
  });

  it("offers nothing for a game that has no worlds", () => {
    expect(artWorldsFor("rps")).toEqual([]);
    expect(artWorldsFor("uno")).toEqual([]);
  });

  it("keeps the order of the world list, so the picker reads the same everywhere", () => {
    const ludo = artWorldsFor("ludo");
    expect(ludo).toEqual(WORLD_IDS.filter((id) => ludo.includes(id)));
  });

  it("draws every world on the list in Ludo", () => {
    expect(artWorldsFor("ludo")).toEqual([...WORLD_IDS]);
  });

  it("draws every world on the list in Rummy too, so the two games offer the same six", () => {
    expect(artWorldsFor("rummy")).toEqual([...WORLD_IDS]);
  });
});

describe("drawnWorld", () => {
  it("gives back a world the game can draw", () => {
    expect(drawnWorld("ludo", "palace")).toBe("palace");
    expect(drawnWorld("rummy", "toy")).toBe("toy");
    expect(drawnWorld("ludo", "toy")).toBe("toy");
    expect(drawnWorld("ludo", "classic")).toBe("classic");
  });

  it("gives back each world as itself in both games", () => {
    for (const id of WORLD_IDS) {
      expect(drawnWorld("ludo", id), `ludo ${id}`).toBe(id);
      expect(drawnWorld("rummy", id), `rummy ${id}`).toBe(id);
    }
  });

  it("falls back to the classic world for a missing or unknown value", () => {
    expect(drawnWorld("ludo", undefined)).toBe("classic");
    expect(drawnWorld("ludo", "lava" as never)).toBe("classic");
  });

  it("is the classic world for a game with no worlds at all", () => {
    expect(drawnWorld("rps", "palace")).toBe("classic");
  });
});

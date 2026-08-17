import { describe, it, expect } from "vitest";
import { filterGames } from "../../bhalyam/CategoryFilter";
import { BHALYAM_GAMES } from "../../bhalyam/data";

describe("Game Catalog Discovery & Filtering", () => {
  it("returns all active games when category is 'all'", () => {
    const all = filterGames({ category: "all" }, true);
    expect(all.length).toBeGreaterThan(15);
  });

  it("filters classic retro 90s titles accurately", () => {
    const retro = filterGames({ category: "retro" }, true);
    expect(retro.some((g) => g.slug === "snake")).toBe(true);
    expect(retro.some((g) => g.slug === "roadrash")).toBe(true);
    expect(retro.some((g) => g.slug === "brickblocks" || g.slug === "tetris")).toBe(true);
  });

  it("filters board games accurately", () => {
    const board = filterGames({ category: "board" }, true);
    expect(board.some((g) => g.slug === "ludo")).toBe(true);
    expect(board.some((g) => g.slug === "snl")).toBe(true);
    expect(board.some((g) => g.slug === "rummy")).toBe(true);
  });

  it("filters multiplayer titles accurately", () => {
    const mp = filterGames({ category: "multiplayer" }, true);
    expect(mp.some((g) => g.slug === "uno")).toBe(true);
    expect(mp.some((g) => g.slug === "handcricket")).toBe(true);
  });

  it("searches games by title, blurb, and tags", () => {
    const query = "cricket";
    const matched = BHALYAM_GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.blurb.toLowerCase().includes(query) ||
        g.tags.some((t) => t.toLowerCase().includes(query)),
    );
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some((g) => g.slug === "handcricket" || g.slug === "nokiacricket")).toBe(true);
  });
});

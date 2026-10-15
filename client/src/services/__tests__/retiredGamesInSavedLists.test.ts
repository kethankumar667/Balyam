import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Someone who favourited or played a game before it was removed still has it saved in their browser.
 * Left alone it would inflate the Favourites count and ask the lists to draw a tile that no longer
 * exists. Each manager caches on first load, so these tests seed storage and then import a FRESH copy,
 * which is exactly what opening the site on an old browser does.
 */

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("saved favourites", () => {
  it("drop a removed game and keep the rest, in order", async () => {
    localStorage.setItem("bhalyam.favourites", JSON.stringify(["ludo", "carrom", "chess"]));

    const { FavouritesManager } = await import("../FavouritesManager");

    expect(FavouritesManager.getFavourites()).toEqual(["ludo", "chess"]);
  });

  it("do not count a removed game", async () => {
    localStorage.setItem("bhalyam.favourites", JSON.stringify(["carrom"]));

    const { FavouritesManager } = await import("../FavouritesManager");

    expect(FavouritesManager.getFavourites()).toHaveLength(0);
    expect(FavouritesManager.isFavourite("carrom" as never)).toBe(false);
  });
});

describe("saved recently-played games", () => {
  it("drop a removed game and keep the rest", async () => {
    const now = Date.now();
    localStorage.setItem(
      "bhalyam.recently_played",
      JSON.stringify([
        { slug: "carrom", lastPlayedAt: now, playCount: 4 },
        { slug: "uno", lastPlayedAt: now - 1000, playCount: 2 },
      ]),
    );

    const { RecentlyPlayedManager } = await import("../RecentlyPlayedManager");

    expect(RecentlyPlayedManager.getRecentlyPlayed().map((r) => r.slug)).toEqual(["uno"]);
  });

  it("leave an ordinary history untouched", async () => {
    const now = Date.now();
    localStorage.setItem(
      "bhalyam.recently_played",
      JSON.stringify([
        { slug: "ludo", lastPlayedAt: now, playCount: 1 },
        { slug: "rummy", lastPlayedAt: now - 1000, playCount: 1 },
      ]),
    );

    const { RecentlyPlayedManager } = await import("../RecentlyPlayedManager");

    expect(RecentlyPlayedManager.getRecentlyPlayed().map((r) => r.slug)).toEqual(["ludo", "rummy"]);
  });
});

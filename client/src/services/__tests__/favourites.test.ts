import { describe, it, expect, beforeEach } from "vitest";
import { FavouritesManager } from "../FavouritesManager";

describe("FavouritesManager", () => {
  beforeEach(() => {
    localStorage.clear();
    FavouritesManager.clearFavourites();
  });

  it("adds and checks favourite games", () => {
    expect(FavouritesManager.isFavourite("ludo")).toBe(false);
    FavouritesManager.addFavourite("ludo");
    expect(FavouritesManager.isFavourite("ludo")).toBe(true);
    expect(FavouritesManager.getFavourites()).toContain("ludo");
  });

  it("removes favourite games", () => {
    FavouritesManager.addFavourite("rummy");
    expect(FavouritesManager.isFavourite("rummy")).toBe(true);

    FavouritesManager.removeFavourite("rummy");
    expect(FavouritesManager.isFavourite("rummy")).toBe(false);
  });

  it("toggles favourite state", () => {
    const state1 = FavouritesManager.toggleFavourite("uno");
    expect(state1).toBe(true);
    expect(FavouritesManager.isFavourite("uno")).toBe(true);

    const state2 = FavouritesManager.toggleFavourite("uno");
    expect(state2).toBe(false);
    expect(FavouritesManager.isFavourite("uno")).toBe(false);
  });

  it("preserves ordering of favourites added", () => {
    FavouritesManager.addFavourite("snake");
    FavouritesManager.addFavourite("carrom");
    FavouritesManager.addFavourite("chess");

    expect(FavouritesManager.getFavourites()).toEqual(["snake", "carrom", "chess"]);
  });

  it("notifies subscribers upon toggle", () => {
    let notified = 0;
    const unsub = FavouritesManager.subscribe(() => {
      notified++;
    });

    FavouritesManager.toggleFavourite("snl");
    expect(notified).toBe(1);

    unsub();
    FavouritesManager.toggleFavourite("snl");
    expect(notified).toBe(1);
  });

  it("regression: clearFavourites resets the in-memory cache and notifies subscribers — a raw localStorage.clear() elsewhere cannot", () => {
    FavouritesManager.addFavourite("ludo");
    FavouritesManager.addFavourite("rummy");
    expect(FavouritesManager.getFavourites()).toEqual(["ludo", "rummy"]);

    // Simulates sign-out's blanket storage wipe happening in a DIFFERENT
    // module, which this singleton's private `cache` field can't see.
    localStorage.clear();
    expect(FavouritesManager.getFavourites()).toEqual(["ludo", "rummy"]);

    let notified = 0;
    const unsub = FavouritesManager.subscribe(() => notified++);
    FavouritesManager.clearFavourites();
    unsub();

    expect(FavouritesManager.getFavourites()).toEqual([]);
    expect(notified).toBe(1);
  });
});

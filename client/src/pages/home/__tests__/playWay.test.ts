import { describe, it, expect, vi } from "vitest";
import {
  PLAY_WAY_STORAGE_KEY,
  gameFitsWay,
  gamesForWay,
  gamesPathFor,
  isPlayWay,
  readStoredWay,
  resolveInitialWay,
  storeWay,
} from "../playWay";
import { BHALYAM_GAMES, isLocked, type GameTag } from "../../../components/bhalyam/data";
import { filterGames } from "../../../components/bhalyam/CategoryFilter";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("isPlayWay", () => {
  it("accepts only the two known ways", () => {
    expect(isPlayWay("friends")).toBe(true);
    expect(isPlayWay("solo")).toBe(true);
    expect(isPlayWay("bots")).toBe(false);
    expect(isPlayWay(null)).toBe(false);
    expect(isPlayWay(undefined)).toBe(false);
  });
});

describe("gameFitsWay", () => {
  const bySlug = (slug: string) => {
    const game = BHALYAM_GAMES.find((g) => g.slug === slug);
    if (!game) throw new Error(`missing fixture game ${slug}`);
    return game;
  };

  it("lists a multiplayer board game under friends", () => {
    expect(gameFitsWay(bySlug("ludo"), "friends")).toBe(true);
  });

  it("keeps single-player puzzles out of friends", () => {
    expect(gameFitsWay(bySlug("brainvita"), "friends")).toBe(false);
    expect(gameFitsWay(bySlug("2048"), "friends")).toBe(false);
  });

  it("lists one-player games under solo", () => {
    expect(gameFitsWay(bySlug("brainvita"), "solo")).toBe(true);
    expect(gameFitsWay(bySlug("sudoku"), "solo")).toBe(true);
  });

  it("keeps a game that needs a table out of solo, even though bots can fill it", () => {
    expect(gameFitsWay(bySlug("ludo"), "solo")).toBe(false);
    expect(gameFitsWay(bySlug("tictactoe"), "solo")).toBe(false);
  });

  it("lists a game under both ways when it seats one to four", () => {
    const snake = bySlug("snake");
    expect(gameFitsWay(snake, "friends")).toBe(true);
    expect(gameFitsWay(snake, "solo")).toBe(true);
  });

  it("makes the two ways differ, so choosing one actually narrows the list", () => {
    const friends = gamesForWay(BHALYAM_GAMES, "friends").length;
    const solo = gamesForWay(BHALYAM_GAMES, "solo").length;
    expect(friends).toBeLessThan(BHALYAM_GAMES.length);
    expect(solo).toBeLessThan(BHALYAM_GAMES.length);
  });

  it("leaves no catalogue game without a way to find it", () => {
    const orphans = BHALYAM_GAMES.filter(
      (g) => !gameFitsWay(g, "friends") && !gameFitsWay(g, "solo"),
    ).map((g) => g.slug);
    expect(orphans).toEqual([]);
  });
});

describe("gamesPathFor", () => {
  it("sends each way to the games page, filtered to its category", () => {
    expect(gamesPathFor("solo")).toBe("/games?c=solo");
    expect(gamesPathFor("friends")).toBe("/games?c=multiplayer");
  });

  it("uses categories the games page accepts, holding exactly the games the box counts", () => {
    (["solo", "friends"] as const).forEach((way) => {
      const category = new URL(gamesPathFor(way), "https://example.test").searchParams.get("c") as GameTag;

      // The games page only honours a category some game actually carries.
      expect(BHALYAM_GAMES.some((g) => g.tags.includes(category))).toBe(true);

      // What the player lands on, and what the box promised, are the same games.
      const onThatPage = filterGames({ category }, true).map((g) => g.slug).sort();
      const onTheBox = gamesForWay(
        BHALYAM_GAMES.filter((g) => !isLocked(g)),
        way,
      )
        .map((g) => g.slug)
        .sort();
      expect(onThatPage).toEqual(onTheBox);
    });
  });
});

describe("gamesForWay", () => {
  it("returns a new array and leaves the input untouched", () => {
    const before = [...BHALYAM_GAMES];
    const result = gamesForWay(BHALYAM_GAMES, "friends");
    expect(result).not.toBe(BHALYAM_GAMES);
    expect([...BHALYAM_GAMES]).toEqual(before);
  });

  it("returns every game when no way is chosen", () => {
    expect(gamesForWay(BHALYAM_GAMES, null)).toHaveLength(BHALYAM_GAMES.length);
  });
});

describe("resolveInitialWay", () => {
  it("prefers a valid link parameter over the stored choice", () => {
    expect(resolveInitialWay("solo", "friends")).toBe("solo");
  });

  it("falls back to the stored choice when the parameter is missing or unknown", () => {
    expect(resolveInitialWay(null, "friends")).toBe("friends");
    expect(resolveInitialWay("nonsense", "solo")).toBe("solo");
  });

  it("returns null when neither is usable", () => {
    expect(resolveInitialWay(null, null)).toBeNull();
    expect(resolveInitialWay("nonsense", null)).toBeNull();
  });
});

describe("readStoredWay / storeWay", () => {
  it("round-trips a choice", () => {
    const storage = memoryStorage();
    storeWay("solo", storage);
    expect(storage.store[PLAY_WAY_STORAGE_KEY]).toBe("solo");
    expect(readStoredWay(storage)).toBe("solo");
  });

  it("removes the stored choice when cleared", () => {
    const storage = memoryStorage({ [PLAY_WAY_STORAGE_KEY]: "friends" });
    storeWay(null, storage);
    expect(readStoredWay(storage)).toBeNull();
  });

  it("ignores a stored value it does not recognise", () => {
    expect(readStoredWay(memoryStorage({ [PLAY_WAY_STORAGE_KEY]: "bots" }))).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    expect(readStoredWay(throwingStorage)).toBeNull();
    expect(() => storeWay("friends", throwingStorage)).not.toThrow();
    expect(() => storeWay(null, throwingStorage)).not.toThrow();
  });

  it("uses window.localStorage by default", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("friends");
    expect(readStoredWay()).toBe("friends");
    spy.mockRestore();
  });
});

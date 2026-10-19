import { describe, it, expect } from "vitest";
import {
  NO_FIT,
  PEOPLE_MAX,
  PEOPLE_MIN,
  fitForWay,
  gameFitsTable,
  gamesFittingTable,
  isFiltering,
  parseRange,
  stepPeople,
} from "../tableFit";
import { BHALYAM_GAMES } from "../../../components/bhalyam/data";

const bySlug = (slug: string) => {
  const game = BHALYAM_GAMES.find((g) => g.slug === slug);
  if (!game) throw new Error(`missing fixture game ${slug}`);
  return game;
};

describe("parseRange", () => {
  it("reads a span of players", () => {
    expect(parseRange("2–6 Players")).toEqual({ min: 2, max: 6 });
  });

  it("reads a single number as a span of one", () => {
    expect(parseRange("1 Player")).toEqual({ min: 1, max: 1 });
    expect(parseRange("2 Players")).toEqual({ min: 2, max: 2 });
  });

  it("reads minutes, with an en dash or a plain hyphen", () => {
    expect(parseRange("10–20 min")).toEqual({ min: 10, max: 20 });
    expect(parseRange("5-10 min")).toEqual({ min: 5, max: 10 });
  });

  it("returns null for text it cannot read", () => {
    expect(parseRange(undefined)).toBeNull();
    expect(parseRange("")).toBeNull();
    expect(parseRange("a handful")).toBeNull();
  });
});

describe("the catalogue's own text", () => {
  it("parses for every game, so a new card cannot silently drop out of the filter", () => {
    const unreadable = BHALYAM_GAMES.filter(
      (g) => parseRange(g.playerRange) === null || parseRange(g.duration) === null,
    ).map((g) => g.slug);
    expect(unreadable).toEqual([]);
  });
});

describe("gameFitsTable", () => {
  it("fits everything when nothing is asked", () => {
    BHALYAM_GAMES.forEach((g) => expect(gameFitsTable(g, NO_FIT)).toBe(true));
  });

  it("keeps a game whose seats cover the headcount", () => {
    expect(gameFitsTable(bySlug("ludo"), { people: 5, minutes: null })).toBe(true);
  });

  it("drops a game that seats fewer people than asked", () => {
    expect(gameFitsTable(bySlug("handcricket"), { people: 5, minutes: null })).toBe(false);
  });

  it("keeps a two-player game for a table of two", () => {
    expect(gameFitsTable(bySlug("handcricket"), { people: 2, minutes: null })).toBe(true);
  });

  it("keeps a game that finishes within the time", () => {
    expect(gameFitsTable(bySlug("rps"), { people: null, minutes: 10 })).toBe(true);
  });

  it("drops a game that can run past the time", () => {
    expect(gameFitsTable(bySlug("ludo"), { people: null, minutes: 10 })).toBe(false);
    expect(gameFitsTable(bySlug("ludo"), { people: null, minutes: 20 })).toBe(false);
  });

  it("asks both questions together", () => {
    const fit = { people: 4, minutes: 20 };
    expect(gameFitsTable(bySlug("uno"), fit)).toBe(true);
    expect(gameFitsTable(bySlug("ludo"), fit)).toBe(false);
  });

  it("does not hide a game whose text it cannot read", () => {
    const unknown = { playerRange: "a handful", duration: "a while" };
    expect(gameFitsTable(unknown, { people: 5, minutes: 10 })).toBe(true);
  });
});

describe("gamesFittingTable", () => {
  it("keeps the catalogue order and leaves the input untouched", () => {
    const before = [...BHALYAM_GAMES];
    const result = gamesFittingTable(BHALYAM_GAMES, { people: 3, minutes: null });
    expect([...BHALYAM_GAMES]).toEqual(before);
    const order = result.map((g) => BHALYAM_GAMES.indexOf(g));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("narrows the list when a headcount is set", () => {
    const all = gamesFittingTable(BHALYAM_GAMES, NO_FIT).length;
    expect(gamesFittingTable(BHALYAM_GAMES, { people: 7, minutes: null }).length).toBeLessThan(all);
  });
});

describe("fitForWay", () => {
  it("keeps both answers for a table", () => {
    expect(fitForWay("friends", { people: 5, minutes: 20 })).toEqual({ people: 5, minutes: 20 });
  });

  it("drops the headcount for a one-player game and keeps the time", () => {
    expect(fitForWay("solo", { people: 5, minutes: 20 })).toEqual({ people: null, minutes: 20 });
  });

  it("leaves the answers alone when no way is chosen", () => {
    expect(fitForWay(null, { people: 5, minutes: 20 })).toEqual({ people: 5, minutes: 20 });
  });
});

describe("isFiltering", () => {
  it("is false only when neither question is answered", () => {
    expect(isFiltering(NO_FIT)).toBe(false);
    expect(isFiltering({ people: 4, minutes: null })).toBe(true);
    expect(isFiltering({ people: null, minutes: 10 })).toBe(true);
  });
});

describe("stepPeople", () => {
  it("starts at the smallest table when going up from Any", () => {
    expect(stepPeople(null, 1)).toBe(PEOPLE_MIN);
  });

  it("returns to Any when going down from the smallest table", () => {
    expect(stepPeople(PEOPLE_MIN, -1)).toBeNull();
  });

  it("moves one at a time and stops at the largest table", () => {
    expect(stepPeople(4, 1)).toBe(5);
    expect(stepPeople(4, -1)).toBe(3);
    expect(stepPeople(PEOPLE_MAX, 1)).toBe(PEOPLE_MAX);
  });

  it("stays on Any when going down from Any", () => {
    expect(stepPeople(null, -1)).toBeNull();
  });
});

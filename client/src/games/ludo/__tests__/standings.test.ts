import { describe, it, expect } from "vitest";
import { ordinal, standingsFor } from "@shared/ludo-rules";

/**
 * Standings must come from `finishOrder`, never from `finishedCount`.
 *
 * Every player who placed has finishedCount 4, so sorting by it leaves the
 * placed players in whatever order the roster happened to be in — 2nd and 3rd
 * would be decided by array position rather than by who actually got home
 * first. That is invisible in a 2-player game and wrong in every other.
 */

describe("standingsFor", () => {
  const order = ["p0", "p1", "p2", "p3"];

  it("puts placed players in the order they finished, not roster order", () => {
    // p3 finished first, then p1. Roster order would have said p1 before p3.
    const finished = { p0: 2, p1: 4, p2: 0, p3: 4 };
    expect(standingsFor(order, ["p3", "p1"], finished)).toEqual(["p3", "p1", "p0", "p2"]);
  });

  it("ranks the unplaced by how close they got", () => {
    const finished = { p0: 1, p1: 4, p2: 3, p3: 0 };
    expect(standingsFor(order, ["p1"], finished)).toEqual(["p1", "p2", "p0", "p3"]);
  });

  it("is stable when nobody has finished yet", () => {
    const finished = { p0: 0, p1: 0, p2: 0, p3: 0 };
    expect(standingsFor(order, [], finished)).toHaveLength(4);
  });

  it("ignores a finisher who has since left the table", () => {
    // removePlayer strips them from playerOrder; standings must not resurrect
    // a seat that no longer exists.
    const finished = { p0: 4, p2: 1 };
    expect(standingsFor(["p0", "p2"], ["p0", "p1"], finished)).toEqual(["p0", "p2"]);
  });

  it("never drops or duplicates a seat", () => {
    const finished = { p0: 4, p1: 4, p2: 4, p3: 1 };
    const out = standingsFor(order, ["p2", "p0", "p1"], finished);
    expect(out).toHaveLength(order.length);
    expect(new Set(out).size).toBe(order.length);
    expect(out[out.length - 1]).toBe("p3"); // the one who never got home
  });
});

describe("ordinal", () => {
  it("handles the places a Ludo table can produce", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
    ]);
  });

  it("handles the teens correctly", () => {
    expect([11, 12, 13].map(ordinal)).toEqual(["11th", "12th", "13th"]);
  });
});

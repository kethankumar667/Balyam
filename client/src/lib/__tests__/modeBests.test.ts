import { describe, it, expect } from "vitest";
import { readModeBest, withModeBest } from "../modeBests";

describe("withModeBest", () => {
  it("keeps one best per mode so a short run never overwrites a long one", () => {
    const afterLong = withModeBest(undefined, "classic_10", 140);
    const afterShort = withModeBest(afterLong, "classic_1", 12);
    expect(afterShort).toEqual({ classic_10: 140, classic_1: 12 });
  });

  it("keeps the higher score when a mode is played again", () => {
    const first = withModeBest({ chase_5: 60 }, "chase_5", 48);
    expect(first.chase_5).toBe(60);
    expect(withModeBest(first, "chase_5", 72).chase_5).toBe(72);
  });

  it("returns a new object and leaves the one it was given untouched", () => {
    const before = Object.freeze({ classic_2: 30 });
    const after = withModeBest(before, "classic_2", 44);
    expect(after).not.toBe(before);
    expect(before).toEqual({ classic_2: 30 });
  });
});

describe("readModeBest", () => {
  it("reads the best for the mode asked about, and for no other", () => {
    const bests = { classic_5: 96, chase_5: 52 };
    expect(readModeBest(bests, "classic_5")).toBe(96);
    expect(readModeBest(bests, "chase_5")).toBe(52);
    expect(readModeBest(bests, "chase_10")).toBeNull();
  });

  it("answers null for anything that is not a usable best", () => {
    expect(readModeBest(undefined, "classic_5")).toBeNull();
    expect(readModeBest(null, "classic_5")).toBeNull();
    expect(readModeBest("96", "classic_5")).toBeNull();
    expect(readModeBest({ classic_5: 0 }, "classic_5")).toBeNull();
    expect(readModeBest({ classic_5: "96" }, "classic_5")).toBeNull();
    expect(readModeBest({ classic_5: Number.NaN }, "classic_5")).toBeNull();
  });

  it("does not read inherited keys", () => {
    expect(readModeBest({}, "constructor")).toBeNull();
    expect(readModeBest({}, "__proto__")).toBeNull();
  });
});

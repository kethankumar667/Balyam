import { describe, expect, it } from "vitest";
import { nextBingoLook } from "../bingoLook";

describe("nextBingoLook", () => {
  it("goes from light to dark whether or not the slate is owned", () => {
    expect(nextBingoLook("light", false)).toBe("dark");
    expect(nextBingoLook("light", true)).toBe("dark");
  });

  it("offers the slate after dark only to an account that owns it", () => {
    expect(nextBingoLook("dark", true)).toBe("slate");
    expect(nextBingoLook("dark", false)).toBe("light");
  });

  it("always returns from the slate to light", () => {
    expect(nextBingoLook("slate", true)).toBe("light");
    expect(nextBingoLook("slate", false)).toBe("light");
  });

  it("visits every look once before it comes round again", () => {
    const seen = ["light"] as ReturnType<typeof nextBingoLook>[];
    for (let step = 0; step < 3; step += 1) seen.push(nextBingoLook(seen[seen.length - 1]!, true));
    expect(seen).toEqual(["light", "dark", "slate", "light"]);
  });
});

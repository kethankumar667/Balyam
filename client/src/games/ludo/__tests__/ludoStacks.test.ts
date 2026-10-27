import { describe, expect, it } from "vitest";
import type { LudoToken } from "@shared/types";
import { indexTokenStacks, stackKeyOf } from "../ludoStacks";

const pawn = (id: string, patch: Partial<LudoToken> = {}): LudoToken => ({
  id, color: "red", state: "track", trackPos: 10, ...patch,
});

describe("Ludo presentation stack index", () => {
  it("uses physical cells rather than colours and keeps stable slots on reordered input", () => {
    const entries = [
      { pid: "a", token: pawn("red-2") },
      { pid: "b", token: pawn("green-0", { color: "green" }) },
      { pid: "a", token: pawn("red-0") },
    ];
    const arms = { a: "purple" as const, b: "yellow" as const };
    expect(indexTokenStacks(entries, arms).get("t:10")).toEqual(["green-0", "red-0", "red-2"]);
    expect(indexTokenStacks([...entries].reverse(), arms)).toEqual(indexTokenStacks(entries, arms));
    expect(entries.map(entry => entry.token.id)).toEqual(["red-2", "green-0", "red-0"]);
  });

  it("separates home lanes by arm even when the paint colours agree", () => {
    const entries = ["a", "b"].map((pid, i) => ({
      pid, token: pawn(`red-${i}`, { state: "stretch", stretchPos: 0 }),
    }));
    const stacks = indexTokenStacks(entries, { a: "green", b: "blue" });
    expect(stacks.get("s:green:0")).toEqual(["red-0"]);
    expect(stacks.get("s:blue:0")).toEqual(["red-1"]);
  });

  it.each(["yard", "home"] as const)("never groups separately indexed %s slots", state => {
    expect(stackKeyOf(pawn("red-0", { state }), "red")).toBeNull();
    expect(indexTokenStacks([{ pid: "a", token: pawn("red-0", { state }) }], { a: "red" }).size).toBe(0);
  });

  it("handles cell zero and excludes missing cell coordinates", () => {
    expect(stackKeyOf(pawn("red-0", { trackPos: 0 }), "red")).toBe("t:0");
    expect(stackKeyOf(pawn("red-0", { trackPos: undefined }), "red")).toBeNull();
    expect(stackKeyOf(pawn("red-0", { state: "stretch", stretchPos: undefined }), "red")).toBeNull();
    expect(indexTokenStacks([], {}).size).toBe(0);
  });

  it("counts a full eight-player safe-square crowd without truncating", () => {
    const entries = Array.from({ length: 32 }, (_, i) => ({
      pid: `seat-${Math.floor(i / 4)}`, token: pawn(`pawn-${i}`),
    }));
    expect(indexTokenStacks(entries, {}).get("t:10")).toHaveLength(32);
  });
});

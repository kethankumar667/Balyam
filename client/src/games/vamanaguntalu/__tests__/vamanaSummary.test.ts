import { describe, expect, it } from "vitest";
import type { VamanaLastMove } from "@shared/types.js";
import { describeLastMove } from "../vamanaSummary";

const nameOf = (id: string): string => (id === "a" ? "Alice" : "Bob");

describe("describeLastMove", () => {
  it("says nothing before the first move", () => {
    expect(describeLastMove(null, nameOf)).toBe("");
  });

  it("describes a plain sow with no relay and no capture", () => {
    const move: VamanaLastMove = { playerId: "b", lifts: [{ pit: 10, seeds: 1 }], capture: null, truncated: false };
    expect(describeLastMove(move, nameOf)).toBe("Bob sowed 1 seed from pit 4.");
  });

  it("counts the relays and the captured seeds, with the right plurals", () => {
    const move: VamanaLastMove = {
      playerId: "a",
      lifts: [
        { pit: 0, seeds: 5 },
        { pit: 6, seeds: 5 },
        { pit: 12, seeds: 5 },
      ],
      capture: { pit: 5, seeds: 7 },
      truncated: false,
    };
    expect(describeLastMove(move, nameOf)).toBe("Alice sowed 5 seeds from pit 1, relayed 2 times, and captured 7 seeds.");
  });

  it("uses the singular for one relay and one captured seed", () => {
    const move: VamanaLastMove = {
      playerId: "a",
      lifts: [
        { pit: 2, seeds: 3 },
        { pit: 5, seeds: 2 },
      ],
      capture: { pit: 9, seeds: 1 },
      truncated: false,
    };
    expect(describeLastMove(move, nameOf)).toBe("Alice sowed 3 seeds from pit 3, relayed 1 time, and captured 1 seed.");
  });

  it("describes a relay that ended without a capture", () => {
    const move: VamanaLastMove = {
      playerId: "a",
      lifts: [
        { pit: 1, seeds: 2 },
        { pit: 3, seeds: 4 },
      ],
      capture: null,
      truncated: false,
    };
    expect(describeLastMove(move, nameOf)).toBe("Alice sowed 2 seeds from pit 2 and relayed 1 time.");
  });

  it("says so when a very long turn was cut short", () => {
    const move: VamanaLastMove = { playerId: "a", lifts: [{ pit: 0, seeds: 5 }], capture: null, truncated: true };
    expect(describeLastMove(move, nameOf)).toContain("hit the relay limit");
  });
});

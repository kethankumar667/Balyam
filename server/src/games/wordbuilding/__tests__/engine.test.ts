import { describe, expect, it } from "vitest";
import { WordBuildingEngine } from "../WordBuildingEngine.js";
import type { Player } from "@shared/types.js";

function mockPlayers(count = 2): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("WordBuildingEngine — Player Capacity", () => {
  it("initializes with up to 8 players", () => {
    const engine = new WordBuildingEngine();
    const players = mockPlayers(8);
    expect(() => engine.init(players)).not.toThrow();
    const pub = engine.getPublicState() as any;
    expect(pub.playerOrder.length).toBe(8);
  });

  it("rejects more than 8 players", () => {
    const engine = new WordBuildingEngine();
    const players = mockPlayers(9);
    expect(() => engine.init(players)).toThrow(/Word Building requires 2-8 players/);
  });
});

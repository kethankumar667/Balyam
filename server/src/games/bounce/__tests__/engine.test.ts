import { describe, expect, it } from "vitest";
import { BounceEngine } from "../BounceEngine.js";
import type { Player } from "@shared/types.js";

function mockPlayers(count = 1): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("BounceEngine", () => {
  it("initializes red ball physics and rings", () => {
    const engine = new BounceEngine();
    engine.init(mockPlayers(1));

    const state = engine.getPublicState();
    expect(state.kind).toBe("bounce");
    expect(state.balls.p1).toBeDefined();
    expect(state.rings.length).toBeGreaterThan(0);
  });

  it("handles move and jump physics", () => {
    const engine = new BounceEngine();
    engine.init(mockPlayers(1));

    const jumpRes = engine.applyMove({ playerId: "p1", type: "move", data: { dir: "JUMP" } });
    expect(jumpRes.ok).toBe(true);

    // The server owns the clock: this engine declares tickRateHz, so
    // RoomManager drives simulateTick(). Accepting a client `tick` on top of
    // that meant the physics advanced once per server step PLUS once per
    // connected client, so two players ran the game roughly twice as fast as
    // one — and the rate was whatever a client chose to send.
    const tickRes = engine.applyMove({ playerId: "p1", type: "tick" });
    expect(tickRes.ok).toBe(false);

    // Physics still advances — through the server-owned path.
    expect(engine.simulateTick().ok).toBe(true);
  });
});

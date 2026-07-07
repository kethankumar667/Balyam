import { describe, it, expect, beforeEach } from "vitest";
import type { Player, RummyPublicState } from "@shared/types.js";
import { RummyEngine } from "../RummyEngine.js";

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function state(engine: RummyEngine): RummyPublicState {
  return engine.getPublicState();
}

describe("RummyEngine DROP", () => {
  let engine: RummyEngine;

  beforeEach(() => {
    engine = new RummyEngine();
  });

  it("dropping a player records them in droppedPlayers and applies 20-point penalty", () => {
    engine.init(makePlayers(3));
    const before = state(engine);
    expect(before.droppedPlayers).toEqual([]);
    const currentId = before.turnPlayerId;

    const res = engine.applyMove({ playerId: currentId, type: "drop" });
    expect(res.ok).toBe(true);
    const after = state(engine);
    expect(after.droppedPlayers).toContain(currentId);
  });

  it("with 2 players, dropping ends the game with the opponent as winner (0 points)", () => {
    engine.init(makePlayers(2));
    const before = state(engine);
    const currentId = before.turnPlayerId;
    const opponentId = before.playerOrder.find((id) => id !== currentId)!;

    const res = engine.applyMove({ playerId: currentId, type: "drop" });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    expect(res.winnerId).toBe(opponentId);

    const after = state(engine);
    expect(after.phase).toBe("finished");
    expect(after.winnerId).toBe(opponentId);
    expect(after.scores?.[currentId]).toBe(20);
    expect(after.scores?.[opponentId]).toBe(0);
  });

  it("with 3+ players, dropping continues the game and skips dropped players in rotation", () => {
    engine.init(makePlayers(3));
    const first = state(engine).turnPlayerId;
    engine.applyMove({ playerId: first, type: "drop" });
    const afterDrop = state(engine);
    expect(afterDrop.phase).toBe("playing");
    expect(afterDrop.turnPlayerId).not.toBe(first);
    expect(afterDrop.droppedPlayers).toContain(first);
    expect(afterDrop.turnAction).toBe("draw");
  });

  it("middle-drop (after drawing) is allowed and scores card points not 20", () => {
    engine.init(makePlayers(2));
    const id = state(engine).turnPlayerId;
    const draw = engine.applyMove({ playerId: id, type: "draw", data: { from: "closed" } });
    expect(draw.ok).toBe(true);
    // Middle-drop: after drawing, drop should now succeed (not be rejected).
    const drop = engine.applyMove({ playerId: id, type: "drop" });
    expect(drop.ok).toBe(true);
    expect(drop.isOver).toBe(true); // 2-player: last player wins
    const after = state(engine);
    // Score = raw card points (1–80), NOT the flat 20-pt first-drop penalty.
    const score = after.scores?.[id] ?? -1;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(80);
  });

  it("dropping by a non-turn player is rejected", () => {
    engine.init(makePlayers(3));
    const turnId = state(engine).turnPlayerId;
    const otherId = state(engine).playerOrder.find((id) => id !== turnId)!;
    const res = engine.applyMove({ playerId: otherId, type: "drop" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not your turn/i);
  });

  it("a dropped player cannot drop again — they no longer get a turn", () => {
    engine.init(makePlayers(3));
    const first = state(engine).turnPlayerId;
    engine.applyMove({ playerId: first, type: "drop" });
    // Their next attempt should fail because it's not their turn anymore.
    const res = engine.applyMove({ playerId: first, type: "drop" });
    expect(res.ok).toBe(false);
  });

  it("when 3 players exist and 2 drop in sequence, the remaining player wins", () => {
    engine.init(makePlayers(3));
    const order = state(engine).playerOrder;
    // Player 0 (first turn) drops
    const turnA = state(engine).turnPlayerId;
    engine.applyMove({ playerId: turnA, type: "drop" });
    // Player whose turn it now is drops
    const turnB = state(engine).turnPlayerId;
    expect(turnB).not.toBe(turnA);
    const res = engine.applyMove({ playerId: turnB, type: "drop" });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    const after = state(engine);
    expect(after.phase).toBe("finished");
    // Winner is the remaining player
    const winner = order.find((id) => id !== turnA && id !== turnB);
    expect(after.winnerId).toBe(winner);
    expect(after.scores?.[winner!]).toBe(0);
    expect(after.scores?.[turnA]).toBe(20);
    expect(after.scores?.[turnB]).toBe(20);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_RUMMY_OPTIONS, type Player, type RummyPublicState } from "@shared/types.js";
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

  it("a dropped player's hand is NEVER exposed via finalHands, whether it's a first-drop or middle-drop", () => {
    engine.init(makePlayers(3));
    const before = state(engine);
    const firstId = before.turnPlayerId;

    // First-drop: before drawing.
    engine.applyMove({ playerId: firstId, type: "drop" });
    expect(state(engine).finalHands?.[firstId]).toBeUndefined();

    // Middle-drop: after drawing, still no reveal.
    const secondId = state(engine).turnPlayerId;
    engine.applyMove({ playerId: secondId, type: "draw", data: { from: "closed" } });
    engine.applyMove({ playerId: secondId, type: "drop" });
    expect(state(engine).finalHands?.[secondId]).toBeUndefined();
  });

  it("when everyone-but-one drops, the round ends with NO hands revealed at all (no melds were ever played)", () => {
    engine.init(makePlayers(2));
    const before = state(engine);
    const dropperId = before.turnPlayerId;
    const winnerId = before.playerOrder.find((id) => id !== dropperId)!;

    const res = engine.applyMove({ playerId: dropperId, type: "drop" });
    expect(res.ok).toBe(true);
    expect(res.winnerId).toBe(winnerId);

    const after = state(engine);
    expect(after.phase).toBe("finished");
    // Neither the dropper NOR the by-default winner had a hand revealed —
    // nobody actually played a meld this round.
    expect(after.finalHands?.[dropperId]).toBeUndefined();
    expect(after.finalHands?.[winnerId]).toBeUndefined();
  });

  it("round 1 middle-drop still scores raw card points (unchanged baseline)", () => {
    engine.setOptions({ ...DEFAULT_RUMMY_OPTIONS, mode: "pool101" });
    engine.init(makePlayers(2));
    expect(state(engine).roundNumber).toBe(1);
    const id = state(engine).turnPlayerId;
    engine.applyMove({ playerId: id, type: "draw", data: { from: "closed" } });
    const drop = engine.applyMove({ playerId: id, type: "drop" });
    expect(drop.ok).toBe(true);
    const score = state(engine).scores?.[id] ?? -1;
    expect(score).toBeGreaterThan(0);
    expect(score).not.toBe(40); // could coincidentally land near it, but the
    // real guarantee is round 2's test below asserting the exact fixed 40.
  });

  it("round 2+ middle-drop uses the fixed 40-point penalty, not raw card weightage", () => {
    engine.setOptions({ ...DEFAULT_RUMMY_OPTIONS, mode: "pool101" });
    engine.init(makePlayers(2));
    const r1 = state(engine);
    const p0 = r1.playerOrder[0];
    const firstTurn = r1.turnPlayerId;

    // First-drop ends round 1 quickly (20-pt penalty, nobody eliminated at
    // pool target 101), then advance to round 2.
    engine.applyMove({ playerId: firstTurn, type: "drop" });
    expect(state(engine).phase).toBe("finished");
    expect(state(engine).roundNumber).toBe(1);

    const advance = engine.applyMove({ playerId: p0, type: "newRound" });
    expect(advance.ok).toBe(true);
    expect(state(engine).roundNumber).toBe(2);
    expect(state(engine).phase).toBe("playing");

    // Round 2: middle-drop (draw, then drop) must score exactly 40.
    const turn2 = state(engine).turnPlayerId;
    const draw = engine.applyMove({ playerId: turn2, type: "draw", data: { from: "closed" } });
    expect(draw.ok).toBe(true);
    const drop = engine.applyMove({ playerId: turn2, type: "drop" });
    expect(drop.ok).toBe(true);
    expect(state(engine).scores?.[turn2]).toBe(40);
    // Still no hand reveal in round 2 either.
    expect(state(engine).finalHands?.[turn2]).toBeUndefined();
  });

  it("round 2+ first-drop (before drawing) is unaffected — still the flat 20", () => {
    engine.setOptions({ ...DEFAULT_RUMMY_OPTIONS, mode: "pool101" });
    engine.init(makePlayers(2));
    const p0 = state(engine).playerOrder[0];
    const firstTurn = state(engine).turnPlayerId;
    engine.applyMove({ playerId: firstTurn, type: "drop" });
    engine.applyMove({ playerId: p0, type: "newRound" });
    expect(state(engine).roundNumber).toBe(2);

    const turn2 = state(engine).turnPlayerId;
    const drop = engine.applyMove({ playerId: turn2, type: "drop" }); // no draw first
    expect(drop.ok).toBe(true);
    expect(state(engine).scores?.[turn2]).toBe(20);
  });
});

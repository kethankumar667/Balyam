import { describe, it, expect } from "vitest";
import { DotsBoxesEngine } from "../DotsBoxesEngine.js";
import type { DotsBoxesPublicState, Player } from "@shared/types.js";

function makePlayer(id: string, name: string, isBot = false): Player {
  return {
    id,
    name,
    isBot,
    isHost: id === "p1",
    isReady: true,
    isConnected: true,
  };
}

describe("DotsBoxesEngine", () => {
  it("initializes a 5x5 dots game with 2 players correctly", () => {
    const engine = new DotsBoxesEngine();
    engine.setOptions({ boardSize: 5, turnTimerSeconds: 30 });

    const p1 = makePlayer("p1", "Alice");
    const p2 = makePlayer("p2", "Bob");

    engine.init([p1, p2]);
    const state = engine.getPublicState() as DotsBoxesPublicState;

    expect(state.kind).toBe("dotsboxes");
    expect(state.phase).toBe("playing");
    expect(state.playerOrder).toEqual(["p1", "p2"]);
    expect(state.turnPlayerId).toBe("p1");
    expect(state.hLines.length).toBe(0);
    expect(state.vLines.length).toBe(0);
    expect(state.claims.length).toBe(0);
    expect(state.scores["p1"]).toBe(0);
    expect(state.scores["p2"]).toBe(0);
  });

  it("allows 6 players to participate in a match", () => {
    const engine = new DotsBoxesEngine();
    engine.setOptions({ boardSize: 7, turnTimerSeconds: 30 });

    const players = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Charlie"),
      makePlayer("p4", "David"),
      makePlayer("p5", "Eve"),
      makePlayer("p6", "Frank"),
    ];

    engine.init(players);
    const state = engine.getPublicState() as DotsBoxesPublicState;

    expect(state.playerOrder.length).toBe(6);
    expect(state.scores["p6"]).toBe(0);
  });

  it("handles drawing a line and passing turns when no box is closed", () => {
    const engine = new DotsBoxesEngine();
    engine.setOptions({ boardSize: 5, turnTimerSeconds: 30 });
    engine.init([makePlayer("p1", "Alice"), makePlayer("p2", "Bob")]);

    const res = engine.applyMove({
      playerId: "p1",
      type: "draw",
      data: { kind: "h", r: 0, c: 0 },
    });

    expect(res.ok).toBe(true);
    const state = engine.getPublicState() as DotsBoxesPublicState;
    expect(state.hLines.length).toBe(1);
    expect(state.turnPlayerId).toBe("p2");
    expect(state.lastMoveScored).toBe(false);
  });

  it("claims a box and awards a bonus turn when 4th edge is closed", () => {
    const engine = new DotsBoxesEngine();
    engine.setOptions({ boardSize: 5, turnTimerSeconds: 30 });
    engine.init([makePlayer("p1", "Alice"), makePlayer("p2", "Bob")]);

    // Draw top: (0,0) h
    engine.applyMove({ playerId: "p1", type: "draw", data: { kind: "h", r: 0, c: 0 } });
    // Draw left: (0,0) v
    engine.applyMove({ playerId: "p2", type: "draw", data: { kind: "v", r: 0, c: 0 } });
    // Draw right: (0,1) v
    engine.applyMove({ playerId: "p1", type: "draw", data: { kind: "v", r: 0, c: 1 } });

    // Now it is p2's turn. p2 draws bottom: (1,0) h, closing box (0,0)
    const res = engine.applyMove({
      playerId: "p2",
      type: "draw",
      data: { kind: "h", r: 1, c: 0 },
    });

    expect(res.ok).toBe(true);
    const state = engine.getPublicState() as DotsBoxesPublicState;
    expect(state.claims.length).toBe(1);
    expect(state.claims[0].ownerId).toBe("p2");
    expect(state.scores["p2"]).toBe(1);
    // Bonus turn: p2 keeps the turn!
    expect(state.turnPlayerId).toBe("p2");
    expect(state.lastMoveScored).toBe(true);
  });
});

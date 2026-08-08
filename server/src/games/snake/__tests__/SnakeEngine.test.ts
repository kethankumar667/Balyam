import { describe, it, expect, beforeEach } from "vitest";
import { SnakeEngine } from "../SnakeEngine.js";
import type { Player } from "@shared/types.js";

describe("SnakeEngine", () => {
  let engine: SnakeEngine;
  const players: Player[] = [
    { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    { id: "p2", name: "Player 2", isBot: false, isHost: false, isLocal: false, isReady: true, isConnected: true },
  ];

  beforeEach(() => {
    engine = new SnakeEngine();
    engine.init(players);
  });

  it("initializes players and food correctly", () => {
    const state = engine.getPublicState();
    expect(state.kind).toBe("snake");
    expect(state.players.length).toBe(2);
    expect(state.isOver).toBe(false);
    expect(state.food).toBeDefined();
    expect(state.snakes["p1"]).toBeDefined();
    expect(state.snakes["p2"]).toBeDefined();
  });

  it("handles valid turn inputs and queues turns", () => {
    const res = engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "DOWN" },
    });
    expect(res.ok).toBe(true);

    engine.applyMove({ playerId: "p1", type: "tick" });
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("DOWN");
  });

  it("ignores opposite direction inputs", () => {
    // Initial dir is RIGHT, opposite is LEFT
    engine.applyMove({
      playerId: "p1",
      type: "turn",
      data: { dir: "LEFT" },
    });
    engine.applyMove({ playerId: "p1", type: "tick" });
    const state = engine.getPublicState();
    expect(state.snakes["p1"].dir).toBe("RIGHT");
  });

  it("handles wrap around mode correctly", () => {
    const singlePlayer: Player[] = [
      { id: "p1", name: "Player 1", isBot: false, isHost: true, isLocal: false, isReady: true, isConnected: true },
    ];
    engine.setOptions({ wallMode: "wrap", gridSize: 10 });
    engine.init(singlePlayer);

    // Turn p1 UP and move off grid top boundary
    engine.applyMove({ playerId: "p1", type: "turn", data: { dir: "UP" } });
    for (let i = 0; i < 6; i++) {
      engine.applyMove({ playerId: "p1", type: "tick" });
    }

    const state = engine.getPublicState();
    expect(state.snakes["p1"].isAlive).toBe(true);
    // Head wrapped from y=0 -> y=9
    expect(state.snakes["p1"].body[0].y).toBe(9);
  });
});

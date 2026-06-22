import { describe, it, expect, beforeEach } from "vitest";
import { UnoEngine } from "../UnoEngine.js";
import type { Player } from "@shared/types.js";

describe("UnoEngine", () => {
  let engine: UnoEngine;
  let players: Player[];

  beforeEach(() => {
    engine = new UnoEngine();
    players = [
      {
        id: "p1",
        name: "Alice",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: true,
        isConnected: true,
      },
      {
        id: "p2",
        name: "Bob",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      },
      {
        id: "p3",
        name: "Charlie",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      },
    ];
  });

  describe("init", () => {
    it("should initialize with 3 players", () => {
      engine.init(players);
      const state = engine.getPublicState();
      expect(state.phase).toBe("playing");
      expect(state.playerOrder).toEqual(["p1", "p2", "p3"]);
      expect(state.turnPlayerId).toBe("p1");
    });

    it("should deal 7 cards to each player", () => {
      engine.init(players);
      const p1State = engine.getStateFor("p1");
      const p2State = engine.getStateFor("p2");
      const p3State = engine.getStateFor("p3");
      expect(p1State.myHand.length).toBe(7);
      expect(p2State.myHand.length).toBe(7);
      expect(p3State.myHand.length).toBe(7);
    });

    it("should set a top card", () => {
      engine.init(players);
      const state = engine.getPublicState();
      expect(state.topCard).toBeDefined();
      expect(state.topCard.id).toBeDefined();
    });

    it("should reject fewer than 2 players", () => {
      expect(() => engine.init([players[0]!])).toThrow();
    });

    it("should reject more than 8 players", () => {
      const manyPlayers: Player[] = Array.from({ length: 9 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      }));
      expect(() => engine.init(manyPlayers)).toThrow();
    });
  });

  describe("game basics", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should not be over at start", () => {
      expect(engine.isOver()).toBe(false);
    });

    it("should identify current player as pending actor", () => {
      const pending = engine.pendingActors();
      expect(pending).toEqual(["p1"]);
    });

    it("should return valid moves for current player", () => {
      const p1State = engine.getStateFor("p1");
      expect(p1State.validMoves).toBeDefined();
      expect(p1State.validMoves.length).toBeGreaterThan(0);
    });
  });

  describe("applyMove - draw", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should add a card to player's hand", () => {
      const stateBefore = engine.getStateFor("p1");
      const handSizeBefore = stateBefore.myHand.length;

      engine.applyMove({
        playerId: "p1",
        type: "draw",
      });

      const stateAfter = engine.getStateFor("p1");
      expect(stateAfter.myHand.length).toBe(handSizeBefore + 1);
    });

    it("should reject drawing twice in a turn", () => {
      engine.applyMove({
        playerId: "p1",
        type: "draw",
      });

      const result = engine.applyMove({
        playerId: "p1",
        type: "draw",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Already drew this turn");
    });
  });

  describe("applyMove - pass", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should reject pass without drawing first", () => {
      const result = engine.applyMove({
        playerId: "p1",
        type: "pass",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Can only pass after drawing");
    });

    it("should advance turn after draw + pass", () => {
      const stateBefore = engine.getPublicState();
      expect(stateBefore.turnPlayerId).toBe("p1");

      engine.applyMove({ playerId: "p1", type: "draw" });
      engine.applyMove({ playerId: "p1", type: "pass" });

      const stateAfter = engine.getPublicState();
      expect(stateAfter.turnPlayerId).toBe("p2");
    });
  });

  describe("player removal", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should remove disconnected player from turn order", () => {
      const stateBefore = engine.getPublicState();
      expect(stateBefore.playerOrder).toContain("p2");

      engine.removePlayer("p2");

      const stateAfter = engine.getPublicState();
      expect(stateAfter.playerOrder).not.toContain("p2");
    });

    it("should end game if only one player remains", () => {
      engine.removePlayer("p2");
      engine.removePlayer("p3");
      expect(engine.isOver()).toBe(true);
    });
  });

  describe("bot auto-move", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should apply an auto-move for a bot", () => {
      const result = engine.applyAutoMove("p1");
      expect(result.ok).toBe(true);
    });
  });
});

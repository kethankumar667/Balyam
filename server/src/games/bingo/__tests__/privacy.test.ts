import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { BingoEngine } from "../BingoEngine.js";

function createEngine(stopOnFirstWin = true) {
  const engine = new BingoEngine();
  engine.setOptions({ callIntervalMs: 4000, stopOnFirstWin });
  const players: Player[] = ["a", "b"].map(id => ({
    id, name: id, isReady: false, isConnected: true, isHost: id === "a",
  }));
  engine.init(players);
  return engine;
}

describe("Bingo board privacy", () => {
  it("reveals boards on an accepted claim even with the legacy stopOnFirstWin option disabled", () => {
    const engine = createEngine(false);
    for (const id of ["a", "b"]) {
      engine.applyMove({ playerId: id, type: "setAutoMark", data: { enabled: true } });
      engine.applyMove({ playerId: id, type: "lockBoard" });
    }
    for (let number = 1; number <= 25; number++) {
      const caller = engine.getPublicState().currentTurnPlayerId!;
      expect(engine.applyMove({ playerId: caller, type: "callNumber", data: { number } }).ok).toBe(true);
      if (engine.getStateFor("a").canClaimBingo) {
        expect(engine.getStateFor("b").players.every(player => player.board.length === 0)).toBe(true);
        expect(engine.applyMove({ playerId: "a", type: "claim" }).ok).toBe(true);
        break;
      }
    }
    expect(engine.getPublicState().winners.some(winner => winner.playerId === "a")).toBe(true);
    expect(engine.getPublicState().phase).toBe("finished");
    expect(engine.getStateFor("b").players.every(player => player.board.length === 25)).toBe(true);
  });

  it("withholds public boards during arrangement and play, including reconnect and spectator reads", () => {
    const engine = createEngine();
    for (const phase of ["arranging", "playing"]) {
      expect(engine.getPublicState().phase).toBe(phase);
      expect(engine.getPublicState().players.every(player => player.board.length === 0)).toBe(true);
      for (const id of ["a", "b", "spectator"]) {
        const state = engine.getStateFor(id);
        expect(state.players.every(player => player.board.length === 0)).toBe(true);
        expect(state.myBoard).toHaveLength(id === "spectator" ? 0 : 25);
        expect(engine.getStateFor(id)).toEqual(state);
      }
      for (const id of ["a", "b"]) engine.applyMove({ playerId: id, type: "lockBoard" });
    }
  });

  it("reveals every original board with its marks after the match finishes", () => {
    const engine = createEngine();
    const originals = ["a", "b"].map(id => engine.getStateFor(id).myBoard);
    for (const id of ["a", "b"]) {
      engine.applyMove({ playerId: id, type: "setAutoMark", data: { enabled: true } });
      engine.applyMove({ playerId: id, type: "lockBoard" });
    }
    for (let number = 1; number <= 25 && !engine.isOver(); number++) {
      const caller = engine.getPublicState().currentTurnPlayerId!;
      expect(engine.applyMove({ playerId: caller, type: "callNumber", data: { number } }).ok).toBe(true);
      if (engine.getStateFor("a").canClaimBingo) {
        expect(engine.applyMove({ playerId: "a", type: "claim" }).ok).toBe(true);
      }
    }
    expect(engine.getPublicState().phase).toBe("finished");
    for (const viewer of ["a", "b", "spectator"]) {
      const state = engine.getStateFor(viewer);
      state.players.forEach((player, index) => {
        expect(player.board).toHaveLength(25);
        expect(player.board.map(cell => cell.value)).toEqual(originals[index].map(cell => cell.value));
        expect(player.board).toEqual(engine.getStateFor(player.id).myBoard);
        expect(player.board.some(cell => cell.marked)).toBe(true);
      });
    }
  });
});

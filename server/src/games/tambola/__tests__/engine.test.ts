import { describe, expect, it } from "vitest";
import { TambolaEngine } from "../TambolaEngine.js";
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

describe("TambolaEngine", () => {
  it("initializes game in arranging phase and allows shuffling ticket", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);

    const pub = engine.getPublicState();
    expect(pub.kind).toBe("tambola");
    expect(pub.phase).toBe("arranging");
    expect(pub.calledNumbers.length).toBe(0);

    const playerState = engine.getStateFor("p1");
    expect(playerState.myTicket).toHaveLength(3);
    expect(playerState.myTicket[0]).toHaveLength(9);

    const res = engine.applyMove({ playerId: "p1", type: "shuffleTicket" });
    expect(res.ok).toBe(true);
  });

  it("switches to playing phase when all players lock ticket", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);

    engine.applyMove({ playerId: "p1", type: "lockTicket" });
    expect(engine.getPublicState().phase).toBe("arranging");

    engine.applyMove({ playerId: "p2", type: "ready" });
    expect(engine.getPublicState().phase).toBe("playing");
    expect(engine.getPublicState().calledNumbers.length).toBe(1);
    expect(engine.getPublicState().currentCall).toBeGreaterThanOrEqual(1);
    expect(engine.getPublicState().currentCall).toBeLessThanOrEqual(90);
  });

  it("marks cell when number has been called", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);
    engine.applyMove({ playerId: "p1", type: "lockTicket" });
    engine.applyMove({ playerId: "p2", type: "lockTicket" });

    const p1State = engine.getStateFor("p1");
    const currentCall = p1State.currentCall!;

    // Find row, col of currentCall on p1's ticket if present
    let foundRow = -1;
    let foundCol = -1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        if (p1State.myTicket[r][c] === currentCall) {
          foundRow = r;
          foundCol = c;
          break;
        }
      }
    }

    if (foundRow >= 0) {
      const res = engine.applyMove({
        playerId: "p1",
        type: "markCell",
        data: { row: foundRow, col: foundCol },
      });
      expect(res.ok).toBe(true);
      expect(engine.getStateFor("p1").myMarkedCells[foundRow][foundCol]).toBe(true);
    }
  });

  it("rejects bogus claims", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);
    engine.applyMove({ playerId: "p1", type: "lockTicket" });
    engine.applyMove({ playerId: "p2", type: "lockTicket" });

    const res = engine.applyMove({
      playerId: "p1",
      type: "claim",
      data: { claimType: "fullHouse" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Bogus claim");
  });

  it("draws next numbers on resolveDeadline", () => {
    const engine = new TambolaEngine();
    engine.init(mockPlayers(1));
    engine.applyMove({ playerId: "p1", type: "lockTicket" });
    expect(engine.getPublicState().calledNumbers.length).toBe(1);

    engine.resolveDeadline();
    expect(engine.getPublicState().calledNumbers.length).toBe(2);

    engine.resolveDeadline();
    expect(engine.getPublicState().calledNumbers.length).toBe(3);
  });

  it("supports playing with AI bots who auto-ready and auto-mark numbers", () => {
    const engine = new TambolaEngine();
    const players: Player[] = [
      { id: "p1", name: "Human", isHost: true, isReady: true, isConnected: true },
      { id: "bot1", name: "Bot Rani", isHost: false, isReady: true, isConnected: true, isBot: true },
    ];
    engine.init(players);

    // Bot is auto-ready
    const pubArranging = engine.getPublicState();
    expect(pubArranging.players.find((p) => p.id === "bot1")?.isReady).toBe(true);

    // Human locks in ticket
    engine.applyMove({ playerId: "p1", type: "lockTicket" });
    expect(engine.getPublicState().phase).toBe("playing");

    // Advance calls and verify bots play without errors
    for (let i = 0; i < 30; i++) {
      if (engine.isOver()) break;
      engine.resolveDeadline();
    }
    const pubPlaying = engine.getPublicState();
    expect(pubPlaying.calledNumbers.length).toBeGreaterThan(1);
  });
});

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
  it("initializes game with tickets and draws first number", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);

    const pub = engine.getPublicState();
    expect(pub.kind).toBe("tambola");
    expect(pub.phase).toBe("playing");
    expect(pub.calledNumbers.length).toBe(1);
    expect(pub.currentCall).toBeGreaterThanOrEqual(1);
    expect(pub.currentCall).toBeLessThanOrEqual(90);

    const playerState = engine.getStateFor("p1");
    expect(playerState.myTicket).toHaveLength(3);
    expect(playerState.myTicket[0]).toHaveLength(9);
  });

  it("marks cell when number has been called", () => {
    const engine = new TambolaEngine();
    const players = mockPlayers(2);
    engine.init(players);

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

    const res = engine.applyMove({
      playerId: "p1",
      type: "claim",
      data: { claimType: "fullHouse" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Bogus claim");
  });
});

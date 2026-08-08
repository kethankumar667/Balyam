import { describe, it, expect } from "vitest";
import type { Player } from "@shared/types.js";
import { BingoEngine } from "../BingoEngine.js";

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    isBot: i > 0,
  }));
}

describe("BingoEngine Bot support", () => {
  it("auto-locks board for bots in arranging phase", () => {
    const e = new BingoEngine();
    e.init(players(2));
    expect(e.getPublicState().phase).toBe("arranging");
    // p1 is bot, so auto-ready
    const p1 = e.getPublicState().players.find((p) => p.id === "p1");
    expect(p1?.isReady).toBe(true);
  });

  it("plays auto move on turn in playing phase", () => {
    const e = new BingoEngine();
    e.init(players(2));
    e.applyMove({ playerId: "p0", type: "lockBoard" });
    expect(e.getPublicState().phase).toBe("playing");

    // p0 calls number
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 1 } });
    expect(e.getPublicState().currentTurnPlayerId).toBe("p1");

    // p1 (bot) plays auto move
    const autoRes = e.applyAutoMove("p1");
    expect(autoRes.ok).toBe(true);
    expect(e.getPublicState().calledNumbers.length).toBe(2);
  });
});

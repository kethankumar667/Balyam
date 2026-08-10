import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { ChessEngine } from "../ChessEngine.js";

function makePlayers(): Player[] {
  return [
    { id: "p1", name: "Alice", isHost: true, isReady: true, isConnected: true },
    { id: "p2", name: "Bob", isHost: false, isReady: true, isConnected: true },
  ];
}

function newGame(): ChessEngine {
  const e = new ChessEngine();
  e.init(makePlayers());
  return e;
}

describe("ChessEngine rules and logic", () => {
  it("initializes to standard opening FEN and White turn", () => {
    const e = newGame();
    const st = e.getPublicState();
    expect(st.kind).toBe("chess");
    expect(st.phase).toBe("aiming");
    expect(st.turn).toBe("w");
    expect(st.fen).toContain("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
    expect(st.whitePlayerId).toBe("p1");
    expect(st.blackPlayerId).toBe("p2");
    expect(st.history).toHaveLength(0);
  });

  it("executes legal pawn move e2->e4", () => {
    const e = newGame();
    const res = e.applyMove({ playerId: "p1", type: "move", data: { from: "e2", to: "e4" } });
    expect(res.ok).toBe(true);

    const st = e.getPublicState();
    expect(st.turn).toBe("b");
    expect(st.history).toHaveLength(1);
    expect(st.history[0].san).toBe("e4");
    expect(st.lastMove).toEqual({ from: "e2", to: "e4" });
  });

  it("rejects out-of-turn move", () => {
    const e = newGame();
    const res = e.applyMove({ playerId: "p2", type: "move", data: { from: "e7", to: "e5" } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Not your turn");
  });

  it("rejects illegal move", () => {
    const e = newGame();
    const res = e.applyMove({ playerId: "p1", type: "move", data: { from: "e2", to: "e6" } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Illegal move");
  });

  it("handles resignation cleanly", () => {
    const e = newGame();
    const res = e.applyMove({ playerId: "p1", type: "resign" });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    expect(res.winnerId).toBe("p2");

    const st = e.getPublicState();
    expect(st.isOver).toBe(true);
    expect(st.winnerId).toBe("p2");
    expect(st.drawReason).toBe("Resignation");
  });

  it("executes Scholar's Mate checkmate sequence", () => {
    const e = newGame();
    // 1. e4 e5
    e.applyMove({ playerId: "p1", type: "move", data: { from: "e2", to: "e4" } });
    e.applyMove({ playerId: "p2", type: "move", data: { from: "e7", to: "e5" } });
    // 2. Bc4 Nc6
    e.applyMove({ playerId: "p1", type: "move", data: { from: "f1", to: "c4" } });
    e.applyMove({ playerId: "p2", type: "move", data: { from: "b8", to: "c6" } });
    // 3. Qh5 Nf6
    e.applyMove({ playerId: "p1", type: "move", data: { from: "d1", to: "h5" } });
    e.applyMove({ playerId: "p2", type: "move", data: { from: "g8", to: "f6" } });
    // 4. Qxf7#
    const res = e.applyMove({ playerId: "p1", type: "move", data: { from: "h5", to: "f7" } });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    expect(res.winnerId).toBe("p1");

    const st = e.getPublicState();
    expect(st.isCheckmate).toBe(true);
    expect(st.drawReason).toBe("Checkmate");
  });

  it("executes Bot auto move", () => {
    const e = newGame();
    e.applyMove({ playerId: "p1", type: "move", data: { from: "e2", to: "e4" } });
    // Now Black's turn (p2)
    const pending = e.pendingActors();
    expect(pending).toEqual(["p2"]);

    const botRes = e.applyAutoMove("p2");
    expect(botRes.ok).toBe(true);
    expect(e.getPublicState().history).toHaveLength(2);
  });
});

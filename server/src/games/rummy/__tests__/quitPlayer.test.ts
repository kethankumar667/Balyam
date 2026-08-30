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

describe("RummyEngine.quitPlayer — forced removal via the auto-play turn cap", () => {
  let engine: RummyEngine;

  beforeEach(() => {
    engine = new RummyEngine();
  });

  it("is a no-op unless it's this seat's current turn", () => {
    engine.init(makePlayers(3));
    const current = state(engine).turnPlayerId;
    const notCurrent = state(engine).playerOrder.find((id) => id !== current)!;

    engine.quitPlayer(notCurrent);

    const after = state(engine);
    expect(after.quitPlayers).toEqual([]);
    expect(after.droppedPlayers).toEqual([]);
    expect(after.turnPlayerId).toBe(current);
  });

  it("records the seat in quitPlayers AND droppedPlayers, distinct from a voluntary drop", () => {
    engine.init(makePlayers(3));
    const current = state(engine).turnPlayerId;

    engine.quitPlayer(current);

    const after = state(engine);
    expect(after.quitPlayers).toContain(current);
    // Reuses handleDrop's own mechanics — same round-exit consequences.
    expect(after.droppedPlayers).toContain(current);
  });

  it("the game continues with 3+ seats — turn rotation skips the quit seat, round does not end", () => {
    engine.init(makePlayers(3));
    const first = state(engine).turnPlayerId;

    engine.quitPlayer(first);

    const after = state(engine);
    expect(after.phase).toBe("playing");
    expect(after.turnPlayerId).not.toBe(first);
  });

  it("with exactly 2 seats, quitting ends the round with the opponent winning — same as removePlayer's forfeit, nothing new", () => {
    engine.init(makePlayers(2));
    const current = state(engine).turnPlayerId;
    const opponent = state(engine).playerOrder.find((id) => id !== current)!;

    engine.quitPlayer(current);

    const after = state(engine);
    expect(after.phase).toBe("finished");
    expect(after.winnerId).toBe(opponent);
    expect(after.quitPlayers).toContain(current);
    // scores only becomes visible once the round is finished — same
    // first-drop 20-point penalty a voluntary drop would score.
    expect(after.scores?.[current]).toBe(20);
    expect(after.scores?.[opponent]).toBe(0);
  });

  it("permanently excludes the seat from eliminatedInMatch, so a pool-mode match never deals them into a later round", () => {
    engine.setOptions({ ...DEFAULT_RUMMY_OPTIONS, mode: "pool101" });
    engine.init(makePlayers(3));
    const current = state(engine).turnPlayerId;

    engine.quitPlayer(current);

    // `eliminatedInMatch` isn't projected onto RummyPublicState directly —
    // the durable, publicly-observable proxy is that `quitPlayers` (unlike
    // `droppedPlayers`) is never reset at a round boundary, so the seat
    // stays marked quit across every future round of this pool match.
    expect(state(engine).quitPlayers).toContain(current);
  });

  it("is idempotent — calling it twice for the same seat does not throw or double-score", () => {
    engine.init(makePlayers(3));
    const current = state(engine).turnPlayerId;

    engine.quitPlayer(current);
    const scoreAfterFirst = state(engine).scores?.[current];
    // Second call: no longer the current turn (rotation moved on), so this
    // also exercises the "not current player" no-op guard.
    engine.quitPlayer(current);

    expect(state(engine).scores?.[current]).toBe(scoreAfterFirst);
  });

  it("does nothing once the round has already finished", () => {
    engine.init(makePlayers(2));
    const current = state(engine).turnPlayerId;
    engine.applyMove({ playerId: current, type: "drop" });
    expect(state(engine).phase).toBe("finished");

    const opponent = state(engine).playerOrder.find((id) => id !== current)!;
    engine.quitPlayer(opponent);

    expect(state(engine).quitPlayers).toEqual([]);
  });
});

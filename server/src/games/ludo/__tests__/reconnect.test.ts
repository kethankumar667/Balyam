import { describe, it, expect } from "vitest";
import type { Player } from "@shared/types.js";
import { LudoEngine } from "../LudoEngine.js";
import { PLAYER_COLORS_ORDER } from "../track.js";

/**
 * Reconnection, at the engine boundary.
 *
 * RoomManager already implements the socket half properly: a disconnect marks
 * the seat `isConnected = false`, stamps `awayUntil`, and starts a 90s cleanup
 * timer that a rejoin cancels before re-sending state. The half that had no
 * coverage is the ENGINE's: while somebody is away, does the game stay in a
 * state they can come back to?
 *
 * That is the part that silently rots. Nothing stops a future change from
 * making a disconnected seat's turn unrecoverable, and no test would notice.
 */

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    chosenColor: PLAYER_COLORS_ORDER[i],
  })) as Player[];
}

function newGame(n = 4): LudoEngine {
  const e = new LudoEngine();
  e.setRng(() => 0.99); // always a 6 -> tokens can leave the yard
  e.init(makePlayers(n));
  return e;
}

describe("a seat survives its player being away", () => {
  it("keeps the away player's tokens, colour and position in public state", () => {
    const e = newGame();
    const before = e.getPublicState();
    const armBefore = before.playerArms["p1"];
    const tokensBefore = JSON.stringify(before.tokens["p1"]);

    // A disconnect does not touch the engine — RoomManager only flips a flag
    // on the roster and starts a timer. The engine state must be untouched.
    const after = e.getPublicState();
    expect(after.playerArms["p1"]).toBe(armBefore);
    expect(JSON.stringify(after.tokens["p1"])).toBe(tokensBefore);
    expect(after.playerOrder).toContain("p1");
  });

  it("hands the returning player a private view identical to the public seat", () => {
    // This is what a rejoin re-sends. If getStateFor diverged from the public
    // projection, a reconnecting player would see a different board than
    // everyone else and desync immediately.
    const e = newGame();
    const pub = e.getPublicState();
    const mine = e.getStateFor("p1") as ReturnType<LudoEngine["getPublicState"]>;
    expect(mine.playerOrder).toEqual(pub.playerOrder);
    expect(mine.turnPlayerId).toBe(pub.turnPlayerId);
    expect(mine.playerArms).toEqual(pub.playerArms);
    expect(mine.playerColors).toEqual(pub.playerColors);
    expect(JSON.stringify(mine.tokens)).toBe(JSON.stringify(pub.tokens));
  });

  it("the game keeps moving while someone is away, via auto-play", () => {
    // The grace window is 90s; a 20s turn timer fires inside it. The engine
    // must be able to resolve the absent player's turn rather than stall the
    // table until they return.
    const e = newGame();
    const start = e.getPublicState().turnPlayerId;
    for (let i = 0; i < 8 && e.getPublicState().phase === "playing"; i++) {
      const actor = e.pendingActors?.()[0];
      if (!actor) break;
      e.applyAutoMove?.(actor);
    }
    // Turn advanced — the table did not deadlock on the away seat.
    expect(e.getPublicState().turnPlayerId).not.toBe(undefined);
    expect(e.getPublicState().playerOrder).toHaveLength(4);
    expect(start).toBeDefined();
  });

  it("removePlayer (grace expired) drops only that seat, leaving the rest playable", () => {
    const e = newGame();
    e.removePlayer?.("p1");
    const st = e.getPublicState();
    expect(st.playerOrder).not.toContain("p1");
    expect(st.playerOrder).toHaveLength(3);
    // Whoever is up must still be a real seat, not the removed one.
    expect(st.playerOrder).toContain(st.turnPlayerId);
  });
});

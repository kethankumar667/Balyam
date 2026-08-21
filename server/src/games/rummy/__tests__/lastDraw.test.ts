import { describe, it, expect, beforeEach } from "vitest";
import type { Player } from "@shared/types.js";
import { RummyEngine } from "../RummyEngine.js";

/**
 * Regression for the "open-deck card still lands in an existing meld"
 * bug: the client used to infer "did I just draw from open" via a
 * component-instance ref, which a page refresh, a reconnect, or the board
 * swapping between Desktop/Mobile silently reset. `lastDrawnCardId`/
 * `lastDrawSource` are now server-authoritative, per-viewer state instead
 * — these tests pin the engine's half of that contract.
 */
function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

describe("RummyEngine — lastDraw (server-authoritative open/closed draw tracking)", () => {
  let engine: RummyEngine;

  beforeEach(() => {
    engine = new RummyEngine();
  });

  it("drawing from the open pile reports lastDrawSource 'open' and the exact card id, to the drawer only", () => {
    engine.init(makePlayers(2));
    const before = engine.getPublicState();
    const drawerId = before.turnPlayerId;
    const opponentId = before.playerOrder.find((id) => id !== drawerId)!;
    const expectedCardId = before.topOfOpenPile!.id;

    const res = engine.applyMove({ playerId: drawerId, type: "draw", data: { from: "open" } });
    expect(res.ok).toBe(true);

    const drawerView = engine.getStateFor(drawerId);
    expect(drawerView.lastDrawSource).toBe("open");
    expect(drawerView.lastDrawnCardId).toBe(expectedCardId);
    // The drawn card must actually be in the drawer's hand.
    expect(drawerView.myHand.some((c) => c.id === expectedCardId)).toBe(true);

    // Scoped — an opponent's own view never reflects someone else's draw.
    const opponentView = engine.getStateFor(opponentId);
    expect(opponentView.lastDrawnCardId).toBeNull();
    expect(opponentView.lastDrawSource).toBeNull();
  });

  it("drawing from the closed deck reports lastDrawSource 'closed'", () => {
    engine.init(makePlayers(2));
    const drawerId = engine.getPublicState().turnPlayerId;

    const res = engine.applyMove({ playerId: drawerId, type: "draw", data: { from: "closed" } });
    expect(res.ok).toBe(true);

    const drawerView = engine.getStateFor(drawerId);
    expect(drawerView.lastDrawSource).toBe("closed");
    expect(drawerView.lastDrawnCardId).not.toBeNull();
    expect(drawerView.myHand.some((c) => c.id === drawerView.lastDrawnCardId)).toBe(true);
  });

  it("discarding clears lastDraw for the player who just acted", () => {
    engine.init(makePlayers(2));
    const drawerId = engine.getPublicState().turnPlayerId;
    engine.applyMove({ playerId: drawerId, type: "draw", data: { from: "open" } });

    const midTurnView = engine.getStateFor(drawerId);
    expect(midTurnView.lastDrawnCardId).not.toBeNull();

    // Discard any card from the (now 14-card) hand.
    const discardCardId = midTurnView.myHand[0].id;
    const res = engine.applyMove({ playerId: drawerId, type: "discard", data: { cardId: discardCardId } });
    expect(res.ok).toBe(true);

    const afterDiscardView = engine.getStateFor(drawerId);
    expect(afterDiscardView.lastDrawnCardId).toBeNull();
    expect(afterDiscardView.lastDrawSource).toBeNull();
  });

  it("before any draw this round, lastDraw is null for every player", () => {
    engine.init(makePlayers(3));
    for (const p of makePlayers(3)) {
      const view = engine.getStateFor(p.id);
      expect(view.lastDrawnCardId).toBeNull();
      expect(view.lastDrawSource).toBeNull();
    }
  });
});

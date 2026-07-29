import { describe, it, expect } from "vitest";
import type { Player, StarPlayerView } from "@shared/types.js";
import { STAR_THEMES } from "@shared/star-themes.js";
import { StarGameEngine } from "../StarGameEngine.js";

/**
 * Regression net for the "I keep getting my own chit back" relay bug.
 *
 * A received card is APPENDED to the recipient's hand, and several code paths
 * default to passing `hand[hand.length - 1]`. Where those two meet, every seat
 * forwards exactly what it was just handed, so one chit orbits the table
 * forever, the player who started the lap receives their own card back round
 * after round, and every real hand stays frozen.
 */

const COLORS = STAR_THEMES[0].values;
const HUMAN = "p0";

function newGame(n: number): StarGameEngine {
  const e = new StarGameEngine();
  e.setRng(() => 0.42);
  e.setOptions({ themeId: "colors", totalRounds: 1, passSpeed: "normal" });
  e.init(
    Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      isHost: i === 0,
      isReady: true,
      isConnected: true,
      isBot: i >= 1, // p0 is the human, the rest are bots
    })) as Player[],
  );
  for (let i = 0; i < n; i++) {
    e.applyMove({ playerId: `p${i}`, type: "selectValue", data: { value: COLORS[i] } });
  }
  e.applyMove({ playerId: e.getPublicState().starterId!, type: "shuffle" });
  // themeSelect -> shuffle -> deal -> pass: the deal window closes on its own.
  if (e.getPublicState().phase === "deal") e.resolveDeadline();
  return e;
}

const handOf = (e: StarGameEngine, pid: string) =>
  ((e.getStateFor(pid) as StarPlayerView).myHand ?? []).map((c) => c.id);

/**
 * Run one full circulation. Bots auto-play; when it is the human's turn they
 * deliberately send their FIRST card, which is never the one they just
 * received (received cards land at the end of the hand).
 */
function runLap(e: StarGameEngine): { sent: string; received: string } | null {
  const before = handOf(e, HUMAN);
  let sent = "";
  for (let guard = 0; guard < 60; guard++) {
    if (e.getPublicState().phase !== "pass") break;
    const actor = e.pendingActors()[0];
    if (!actor) break;
    if (actor === HUMAN) {
      if (sent) break; // lap closed — the human is up again
      sent = handOf(e, HUMAN)[0];
      e.applyMove({ playerId: HUMAN, type: "selectCard", data: { cardId: sent } });
      e.applyMove({ playerId: HUMAN, type: "pass" });
    } else {
      e.applyAutoMove(actor);
    }
  }
  if (!sent) return null;
  const received = handOf(e, HUMAN).find((id) => !before.includes(id)) ?? "";
  return { sent, received };
}

describe("StarGameEngine — pass relay never orbits a single chit", () => {
  it("the human never receives back the exact chit they just passed", () => {
    const e = newGame(4);
    expect(e.getPublicState().phase).toBe("pass");
    const laps: { sent: string; received: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const lap = runLap(e);
      if (!lap) break;
      laps.push(lap);
    }
    expect(laps.length).toBeGreaterThan(0);
    expect(laps.filter((l) => l.sent && l.sent === l.received)).toEqual([]);
  });

  it("bots change their own hands rather than relaying one chit", () => {
    const e = newGame(4);
    const before = handOf(e, "p1").slice().sort().join(",");
    for (let i = 0; i < 4; i++) if (!runLap(e)) break;
    expect(handOf(e, "p1").slice().sort().join(",")).not.toBe(before);
  });

  it("a lapsed deadline does not blindly forward the just-received chit", () => {
    // resolveDeadline() -> handlePass() falls back to hand[last], which is
    // precisely the card just received. A seat timing out mid-relay must not
    // turn into the orbiting bug.
    const e = newGame(4);
    const first = e.pendingActors()[0]!;
    const firstHand = handOf(e, first);
    e.applyMove({ playerId: first, type: "selectCard", data: { cardId: firstHand[0] } });
    e.applyMove({ playerId: first, type: "pass" });

    const next = e.pendingActors()[0]!;
    const nextHand = handOf(e, next);
    const justReceived = nextHand[nextHand.length - 1];
    expect(justReceived).toBe(firstHand[0]); // it really is the received card

    e.resolveDeadline(); // `next` times out
    const after = e.pendingActors()[0]!;
    expect(handOf(e, after)).not.toContain(justReceived);
  });
});

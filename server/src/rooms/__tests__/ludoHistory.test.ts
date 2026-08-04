import { describe, it, expect } from "vitest";
import type { LudoState, Player } from "@shared/types.js";
import { LudoEngine } from "../../games/ludo/LudoEngine.js";
import { PLAYER_COLORS_ORDER, STRETCH_LENGTH } from "../../games/ludo/track.js";

/**
 * Ludo's match history — the "photo album" every other game in this codebase
 * already has (Rummy `history`, UNO `unoHistory`, Bingo `bingoHistory`).
 *
 * Everything recorded is a number the engine ALREADY counts during play. There
 * is deliberately no XP, coin, level or streak-bonus in here: none of those
 * exist in this game, and inventing them would be showing players a number the
 * code cannot honour. A real record of what the table actually did is the
 * honest version of "a reason to come back".
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

/** Drive a player's last token home through a real move. */
function finishViaPlay(e: LudoEngine, pid: string): void {
  const s = e as unknown as {
    s: {
      tokens: Map<string, { id: string; state: string; trackPos?: number; stretchPos?: number }[]>;
      finishedCount: Map<string, number>;
      turnIndex: number;
      playerOrder: string[];
      turnPhase: string;
      diceValue: number | null;
      movableTokenIds: string[];
    };
  };
  const toks = s.s.tokens.get(pid)!;
  for (let i = 0; i < 3; i++) {
    toks[i].state = "home";
    toks[i].trackPos = undefined;
    toks[i].stretchPos = undefined;
  }
  s.s.finishedCount.set(pid, 3);
  const last = toks[3];
  last.state = "stretch";
  last.stretchPos = STRETCH_LENGTH - 1;
  s.s.turnIndex = s.s.playerOrder.indexOf(pid);
  s.s.turnPhase = "moving";
  s.s.diceValue = 1;
  s.s.movableTokenIds = [last.id];
  e.applyMove({ playerId: pid, type: "move", data: { tokenId: last.id } });
}

describe("a finished Ludo match produces an honest recap", () => {
  it("carries the standings, not just a winner", () => {
    const e = new LudoEngine();
    e.init(makePlayers(4));
    finishViaPlay(e, "p2");
    finishViaPlay(e, "p0");
    finishViaPlay(e, "p3");

    const st = e.getPublicState() as LudoState;
    expect(st.phase).toBe("finished");
    // The order people actually got home — the only record of 2nd vs 3rd.
    expect(st.finishOrder).toEqual(["p2", "p0", "p3"]);
    // p1 never finished and is not in the placings.
    expect(st.playerOrder).toContain("p1");
    expect(st.finishOrder).not.toContain("p1");
  });

  it("every stat in the recap is one the engine really counted", () => {
    const e = new LudoEngine();
    e.setRng(() => 0.99); // always rolls a 6
    e.init(makePlayers(2));

    // Play a handful of real turns so the counters are non-trivial.
    for (let i = 0; i < 10 && e.getPublicState().phase === "playing"; i++) {
      const actor = e.pendingActors()[0];
      if (!actor) break;
      e.applyAutoMove(actor);
    }

    const st = e.getPublicState() as LudoState;
    const totalRolls = Object.values(st.stats.rollCount).reduce((a, b) => a + b, 0);
    expect(totalRolls).toBeGreaterThan(0);
    // Every six was also counted as a roll — the counters are consistent, not
    // decorative.
    for (const pid of st.playerOrder) {
      expect(st.stats.sixCount[pid] ?? 0).toBeLessThanOrEqual(st.stats.rollCount[pid] ?? 0);
      expect(st.stats.biggestStreak[pid] ?? 0).toBeLessThanOrEqual(st.stats.sixCount[pid] ?? 0);
      expect(st.finishedCount[pid] ?? 0).toBeLessThanOrEqual(4);
    }
    expect(st.stats.startedAt).toBeGreaterThan(0);
  });

  it("duration is measurable and non-negative once the match ends", () => {
    const e = new LudoEngine();
    e.init(makePlayers(2));
    finishViaPlay(e, "p0");
    const st = e.getPublicState() as LudoState;
    expect(st.stats.endedAt).not.toBeNull();
    expect((st.stats.endedAt ?? 0) - st.stats.startedAt).toBeGreaterThanOrEqual(0);
  });

  it("biggestStreak is tracked even though nothing rendered it before", () => {
    // The engine has always counted this; the end card showed rolls, captures
    // and sixes but never the best six-streak, so the number was dead weight.
    const e = new LudoEngine();
    e.setRng(() => 0.99);
    e.init(makePlayers(2));
    for (let i = 0; i < 6 && e.getPublicState().phase === "playing"; i++) {
      const actor = e.pendingActors()[0];
      if (!actor) break;
      e.applyAutoMove(actor);
    }
    const st = e.getPublicState() as LudoState;
    const best = Math.max(...st.playerOrder.map((p) => st.stats.biggestStreak[p] ?? 0));
    expect(best).toBeGreaterThan(0);
  });
});

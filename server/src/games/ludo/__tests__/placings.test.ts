import { describe, it, expect } from "vitest";
import type { LudoState, Player } from "@shared/types.js";
import { LudoEngine } from "../LudoEngine.js";
import { PLAYER_COLORS_ORDER, STRETCH_LENGTH } from "../track.js";

/**
 * Ludo does not end when the FIRST player gets home.
 *
 * It used to: the moment any seat had four tokens home the engine set
 * `phase = "finished"` and everyone else's game was over, with no 2nd or 3rd
 * place and no last-place decided. In a four-player game three people were
 * robbed of their result by the first person to finish.
 *
 * The real rule: play continues for the remaining places, and the game ends
 * when everyone but one has placed — the straggler is last.
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

/** Park `count` of a player's tokens in "home" directly, bypassing play. */
function sendHome(e: LudoEngine, pid: string, count: number): void {
  const s = e as unknown as {
    s: {
      tokens: Map<string, { state: string; trackPos?: number; stretchPos?: number }[]>;
      finishedCount: Map<string, number>;
    };
  };
  const toks = s.s.tokens.get(pid)!;
  for (let i = 0; i < count; i++) {
    toks[i].state = "home";
    toks[i].trackPos = undefined;
    toks[i].stretchPos = undefined;
  }
  s.s.finishedCount.set(pid, count);
}

/** Drive `pid`'s last token home through a real move so the engine's own
 *  finish path runs (this is what actually records a placing). */
function finishViaPlay(e: LudoEngine, pid: string): void {
  const s = e as unknown as {
    s: {
      tokens: Map<string, { id: string; state: string; stretchPos?: number }[]>;
      finishedCount: Map<string, number>;
      turnIndex: number;
      playerOrder: string[];
      turnPhase: string;
      diceValue: number | null;
      movableTokenIds: string[];
    };
  };
  sendHome(e, pid, 3);
  const last = s.s.tokens.get(pid)![3];
  last.state = "stretch";
  last.stretchPos = STRETCH_LENGTH - 1; // one step from home
  // Force it to be this player's turn, mid-move, with a 1 showing.
  s.s.turnIndex = s.s.playerOrder.indexOf(pid);
  s.s.turnPhase = "moving";
  s.s.diceValue = 1;
  s.s.movableTokenIds = [last.id];
  e.applyMove({ playerId: pid, type: "move", data: { tokenId: last.id } });
}

const pub = (e: LudoEngine) => e.getPublicState() as LudoState;

describe("finishing takes a PLACE, it does not end the game", () => {
  it("4 players: the first finisher does not end it", () => {
    const e = new LudoEngine();
    e.init(makePlayers(4));
    finishViaPlay(e, "p1");

    const st = pub(e);
    expect(st.finishOrder).toEqual(["p1"]);
    expect(st.winnerId).toBe("p1");
    // The point of the bug report: three other people are still playing.
    expect(st.phase).toBe("playing");
  });

  it("4 players: it ends when the THIRD player places, leaving one last", () => {
    const e = new LudoEngine();
    e.init(makePlayers(4));
    finishViaPlay(e, "p1");
    expect(pub(e).phase).toBe("playing");
    finishViaPlay(e, "p3");
    expect(pub(e).phase).toBe("playing");
    finishViaPlay(e, "p0");

    const st = pub(e);
    expect(st.phase).toBe("finished");
    expect(st.finishOrder).toEqual(["p1", "p3", "p0"]);
    // 1st place stays the winner; p2 never placed and is last.
    expect(st.winnerId).toBe("p1");
    expect(st.finishOrder).not.toContain("p2");
  });

  it("2 players: the first finisher DOES end it (nobody left to place)", () => {
    const e = new LudoEngine();
    e.init(makePlayers(2));
    finishViaPlay(e, "p0");
    const st = pub(e);
    expect(st.phase).toBe("finished");
    expect(st.finishOrder).toEqual(["p0"]);
  });

  it("3 players: ends on the second placing", () => {
    const e = new LudoEngine();
    e.init(makePlayers(3));
    finishViaPlay(e, "p2");
    expect(pub(e).phase).toBe("playing");
    finishViaPlay(e, "p0");
    expect(pub(e).phase).toBe("finished");
    expect(pub(e).finishOrder).toEqual(["p2", "p0"]);
  });

  it("a placed player never gets another turn", () => {
    const e = new LudoEngine();
    e.setRng(() => 0.99);
    e.init(makePlayers(4));
    finishViaPlay(e, "p1");
    expect(pub(e).phase).toBe("playing");

    // Run a good many sub-moves; p1 must never come up again.
    for (let i = 0; i < 40 && pub(e).phase === "playing"; i++) {
      const actor = e.pendingActors()[0];
      if (!actor) break;
      expect(actor).not.toBe("p1");
      e.applyAutoMove(actor);
    }
  });

  it("a placed player is still listed, so the UI can show their rank", () => {
    const e = new LudoEngine();
    e.init(makePlayers(4));
    finishViaPlay(e, "p1");
    const st = pub(e);
    expect(st.playerOrder).toContain("p1");
    expect(st.finishedCount["p1"]).toBe(4);
  });
});

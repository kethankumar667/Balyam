import { describe, expect, it } from "vitest";
import { WordBuildingEngine } from "../WordBuildingEngine.js";
import { isDictionaryWord } from "../dictionary.js";
import { DEFAULT_WORDBUILDING_OPTIONS, type Player, type WordBuildingPublicState } from "@shared/types.js";

/**
 * claimToScoreMode — the player-claim + opponent-consensus scoring flow.
 * See the feature plan: place a letter, claim the straight-line word it
 * completed, an opponent's single accept scores it (or every opponent
 * explicitly rejecting doesn't), and a timeout always resolves toward
 * acceptance.
 */

function mockPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function makeEngine(count: number, overrides: Partial<typeof DEFAULT_WORDBUILDING_OPTIONS> = {}): WordBuildingEngine {
  const engine = new WordBuildingEngine();
  engine.setOptions({ ...DEFAULT_WORDBUILDING_OPTIONS, claimToScoreMode: true, ...overrides });
  engine.init(mockPlayers(count));
  return engine;
}

function pub(engine: WordBuildingEngine): WordBuildingPublicState {
  return engine.getPublicState() as WordBuildingPublicState;
}

function place(engine: WordBuildingEngine, playerId: string, r: number, c: number, letter: string) {
  return engine.applyMove({ playerId, type: "place", data: { r, c, letter } });
}

describe("WordBuildingEngine — legacy mode (claimToScoreMode: false) is unaffected", () => {
  it("still auto-scores a real dictionary word with zero player involvement", () => {
    const engine = new WordBuildingEngine();
    engine.setOptions({ ...DEFAULT_WORDBUILDING_OPTIONS, claimToScoreMode: false });
    engine.init(mockPlayers(2));
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    const res = place(engine, "p1", 0, 2, "T");
    expect(res.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.scoredWords.some((w) => w.word.toLowerCase() === "cat")).toBe(true);
    expect(s.scores.p1).toBe(3);
    // Turn already advanced automatically — no claim step exists in this mode.
    expect(s.turnPlayerId).toBe("p2");
  });
});

describe("WordBuildingEngine — claim opens only on a qualifying run", () => {
  it("no run long enough: turn advances immediately, no claim opens", () => {
    const engine = makeEngine(2);
    const res = place(engine, "p1", 0, 0, "Q");
    expect(res.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.turnPlayerId).toBe("p2");
  });

  it("a qualifying run opens a claim and holds the turn", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    const res = place(engine, "p1", 0, 2, "T");
    expect(res.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim).not.toBeNull();
    expect(s.pendingClaim!.status).toBe("collecting");
    expect(s.pendingClaim!.claimantId).toBe("p1");
    expect(s.pendingClaim!.anchor).toEqual({ r: 0, c: 2 });
    // Turn holds on the claimant while the claim is unresolved.
    expect(s.turnPlayerId).toBe("p1");
  });

  it("rejects a normal 'place' move while a claim is pending", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    const res = place(engine, "p1", 1, 1, "X");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/pending word claim/i);
  });
});

describe("WordBuildingEngine — claimWord validation", () => {
  it("rejects a path shorter than minWordLength", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    const res = engine.applyMove({
      playerId: "p1",
      type: "claimWord",
      data: { cells: [{ r: 0, c: 1 }, { r: 0, c: 2 }] },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a bent path against a real pending claim", () => {
    const engine = makeEngine(3);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p3", 6, 6, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 5, 6, "Z");
    place(engine, "p3", 6, 7, "Z");
    place(engine, "p1", 0, 2, "T");
    const s = pub(engine);
    expect(s.pendingClaim?.status).toBe("collecting");
    const res = engine.applyMove({
      playerId: "p1",
      type: "claimWord",
      data: {
        cells: [
          { r: 0, c: 0 },
          { r: 0, c: 1 },
          { r: 0, c: 2 },
          { r: 1, c: 2 }, // bend — also unfilled, but the shape check runs first
        ],
      },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/must all be filled/i);
  });

  it("rejects a genuinely bent path built from real, filled cells", () => {
    const engine = makeEngine(3);
    // Every p2/p3 filler below is placed with a gap from its predecessor —
    // three CONSECUTIVE fillers would form their own qualifying run and
    // open someone else's claim first, which is exactly the trap this
    // comment is here to warn future edits away from.
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p3", 6, 6, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 5, 7, "Z");
    place(engine, "p3", 6, 8, "Z");
    // (1,1) is filled but off-axis from the eventual (0,0)-(0,2) row run.
    place(engine, "p1", 1, 1, "X");
    place(engine, "p2", 5, 9, "Z");
    place(engine, "p3", 7, 6, "Z");
    place(engine, "p1", 0, 2, "T"); // completes CAT, opens the claim
    const res = engine.applyMove({
      playerId: "p1",
      type: "claimWord",
      data: {
        cells: [
          { r: 0, c: 0 },
          { r: 0, c: 1 },
          { r: 1, c: 1 }, // real bend — all three cells are filled
        ],
      },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/straight line/i);
  });

  it("rejects a path that omits the anchor cell", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T"); // anchor = (0,2)
    const s1 = pub(engine);
    expect(s1.pendingClaim?.anchor).toEqual({ r: 0, c: 2 });
    const res = engine.applyMove({
      playerId: "p1",
      type: "claimWord",
      data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }] },
    });
    expect(res.ok).toBe(false);
  });

  it("accepts a valid straight-line claim and moves to voting", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    const res = engine.applyMove({
      playerId: "p1",
      type: "claimWord",
      data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
    });
    expect(res.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim?.status).toBe("voting");
    expect(s.pendingClaim?.word).toBe("CAT");
    expect(s.pendingClaim?.voters).toEqual(["p2"]);
  });

  it("rejects a claim for a word already scored this match", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "accept" } });
    expect(pub(engine).scoredWords.some((w) => w.word === "CAT")).toBe(true);

    // Build a second, independent "CAT" run elsewhere and try to claim it again.
    place(engine, "p2", 2, 0, "C");
    place(engine, "p1", 8, 0, "Q");
    place(engine, "p2", 2, 1, "A");
    place(engine, "p1", 8, 1, "Q");
    place(engine, "p2", 2, 2, "T");
    const res = engine.applyMove({
      playerId: "p2",
      type: "claimWord",
      data: { cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/already/i);
  });
});

describe("WordBuildingEngine — vote resolution", () => {
  function openVote(engine: WordBuildingEngine): void {
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p3", 6, 6, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 5, 6, "Z");
    place(engine, "p3", 6, 7, "Z");
    place(engine, "p1", 0, 2, "T");
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
  }

  it("a single accept resolves the claim immediately, even with other voters outstanding", () => {
    const engine = makeEngine(3);
    openVote(engine);
    expect(pub(engine).pendingClaim?.voters).toEqual(["p2", "p3"]);
    const res = engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "accept" } });
    expect(res.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.scores.p1).toBe(3);
    expect(s.turnPlayerId).toBe("p2");

    // p3's late vote has nothing to land on.
    const late = engine.applyMove({ playerId: "p3", type: "voteClaim", data: { decision: "reject" } });
    expect(late.ok).toBe(false);
  });

  it("only resolves REJECTED once every voter has explicitly rejected", () => {
    const engine = makeEngine(3);
    openVote(engine);
    const first = engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "reject" } });
    expect(first.ok).toBe(true);
    expect(pub(engine).pendingClaim).not.toBeNull(); // still open — p3 hasn't voted
    const second = engine.applyMove({ playerId: "p3", type: "voteClaim", data: { decision: "reject" } });
    expect(second.ok).toBe(true);
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.scores.p1).toBe(0);
    expect(s.scoredWords.length).toBe(0);
    expect(s.turnPlayerId).toBe("p2");
  });

  it("a voter cannot vote twice", () => {
    const engine = makeEngine(3);
    openVote(engine);
    engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "reject" } });
    const again = engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "accept" } });
    expect(again.ok).toBe(false);
  });
});

describe("WordBuildingEngine — timeout behavior", () => {
  it("getTimeoutActor() targets the claimant while collecting, and is null while voting", () => {
    const engine = makeEngine(2);
    expect(engine.getTimeoutActor()).toBe("p1"); // no claim yet — ordinary turn player
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    expect(engine.getTimeoutActor()).toBe("p1"); // claimant, collecting
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    expect(engine.getTimeoutActor()).toBeNull(); // voting — no single forced actor
  });

  it("resolvePendingClaimOnTimeout() resolves ACCEPTED even with a reject already recorded (silence leans toward acceptance)", () => {
    const engine = makeEngine(3);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p3", 6, 6, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 5, 6, "Z");
    place(engine, "p3", 6, 7, "Z");
    place(engine, "p1", 0, 2, "T");
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "reject" } });
    expect(pub(engine).pendingClaim).not.toBeNull(); // p3 still outstanding

    engine.resolvePendingClaimOnTimeout();
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.scores.p1).toBe(3);
    expect(s.scoredWords.some((w) => w.word === "CAT")).toBe(true);
  });

  it("resolvePendingClaimOnTimeout() is a no-op when nothing is pending, or a claim is still collecting", () => {
    const engine = makeEngine(2);
    expect(() => engine.resolvePendingClaimOnTimeout()).not.toThrow();
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    expect(pub(engine).pendingClaim?.status).toBe("collecting");
    engine.resolvePendingClaimOnTimeout(); // status is "collecting", not "voting" — no-op
    expect(pub(engine).pendingClaim?.status).toBe("collecting");
  });
});

describe("WordBuildingEngine — bot auto-play under claimToScoreMode", () => {
  it("a bot claimant only submits a claim for a real dictionary word", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    expect(isDictionaryWord("CAT")).toBe(true);
    engine.applyAutoMove("p1");
    const s = pub(engine);
    expect(s.pendingClaim?.status).toBe("voting");
    expect(s.pendingClaim?.word).toBe("CAT");
  });

  it("a bot claimant skips (0 points) when the run isn't a real word", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "Q");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "X");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "J");
    expect(isDictionaryWord("QXJ")).toBe(false);
    expect(pub(engine).pendingClaim?.status).toBe("collecting");
    engine.applyAutoMove("p1");
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull();
    expect(s.scores.p1).toBe(0);
    expect(s.turnPlayerId).toBe("p2");
  });

  it("a bot voter accepts a real word purely via the dictionary", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    place(engine, "p1", 0, 2, "T");
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    engine.applyAutoMove("p2");
    const s = pub(engine);
    expect(s.pendingClaim).toBeNull(); // p2 accepted -> resolved
    expect(s.scores.p1).toBe(3);
  });
});

describe("WordBuildingEngine — end-of-game with a claim pending", () => {
  it("does not finalize the match while a claim is still unresolved, even though filledCells already reflects the placement", () => {
    const engine = makeEngine(2, { boardSize: 8 });
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 1, 0, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 1, 1, "Y");
    const res = place(engine, "p1", 0, 2, "T");
    expect(res.ok).toBe(true);
    expect(res.isOver).toBeUndefined();
    const s = pub(engine);
    expect(s.pendingClaim).not.toBeNull();
    expect(s.phase).toBe("playing");
    expect(engine.isOver()).toBe(false);
  });
});

describe("WordBuildingEngine — turn advances exactly once per full cycle", () => {
  it("place -> claimWord -> voteClaim changes turnPlayerId exactly once", () => {
    const engine = makeEngine(2);
    place(engine, "p1", 0, 0, "C");
    place(engine, "p2", 5, 5, "Z");
    place(engine, "p1", 0, 1, "A");
    place(engine, "p2", 6, 6, "Y");
    expect(pub(engine).turnPlayerId).toBe("p1");
    place(engine, "p1", 0, 2, "T");
    expect(pub(engine).turnPlayerId).toBe("p1"); // still p1 — claim pending
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    expect(pub(engine).turnPlayerId).toBe("p1"); // still p1 — vote pending
    engine.applyMove({ playerId: "p2", type: "voteClaim", data: { decision: "accept" } });
    expect(pub(engine).turnPlayerId).toBe("p2"); // advanced exactly once, here
  });
});

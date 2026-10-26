import { describe, expect, it } from "vitest";
import { WordBuildingEngine } from "../WordBuildingEngine.js";
import { DEFAULT_WORDBUILDING_OPTIONS, type Player } from "@shared/types.js";
import { extractRankedParticipants } from "../../../rooms/economyPlacements.js";

const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`, identityId: `identity${i}`, name: `Player ${i}`,
  isHost: i === 0, isReady: true, isConnected: true,
}));
function setup(count = 2, claimToScoreMode = false, quick = false) {
  const engine = new WordBuildingEngine();
  engine.setOptions({ ...DEFAULT_WORDBUILDING_OPTIONS, boardSize: 8, claimToScoreMode, matchLength: quick ? "quick" : "classic" });
  engine.init(players.slice(0, count));
  return engine;
}
function place(engine: WordBuildingEngine, r: number, c: number, letter: string) {
  return engine.applyMove({ playerId: engine.getPublicState().turnPlayerId, type: "place", data: { r, c, letter } });
}
describe("Word Building player experience", () => {
  it("declares an all-zero full board a draw and refuses an arbitrary paid ranking", () => {
    const engine = setup();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) place(engine, r, c, "Q");
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().winnerId).toBeNull();
    expect(extractRankedParticipants({ game: "wordbuilding", engine, players: new Map(players.slice(0, 2).map(p => [p.id, p])) }).isValidRanking).toBe(false);
  });
  it("requires a majority of opponents, not one acceptance, and rejects ties", () => {
    const engine = setup(3, true);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    expect(engine.applyMove({ playerId: "p2", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } }).ok).toBe(true);
    engine.applyMove({ playerId: "p0", type: "voteClaim", data: { decision: "accept" } });
    expect(engine.getPublicState().pendingClaim).not.toBeNull();
    engine.applyMove({ playerId: "p1", type: "voteClaim", data: { decision: "reject" } });
    expect(engine.getPublicState().pendingClaim).toBeNull();
    expect(engine.getPublicState().scores.p2).toBe(0);
  });
  it("passes a human timeout without placing or scoring and bounds Quick Match to eight turns per seat", () => {
    const engine = setup(2, false, true);
    for (let i = 0; i < 16; i++) engine.handleHumanTimeout(engine.getPublicState().turnPlayerId);
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().filledCells).toBe(0);
    expect(engine.getPublicState().winnerId).toBeNull();
    expect(engine.getPublicState().turnsTaken).toEqual({ p0: 8, p1: 8 });
  });
  it("finishes Quick Match after equal placement opportunities and keeps contributor credit separate", () => {
    const engine = setup(2, false, true);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    const word = engine.getPublicState().scoredWords[0];
    expect(word.contributorIds).toEqual(["p0", "p1"]);
    expect(engine.getPublicState().scores).toEqual({ p0: 3, p1: 0 });
    for (let i = 3; i < 16; i++) place(engine, Math.floor(i / 8) + 2, i % 8, "Q");
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().turnsTaken).toEqual({ p0: 8, p1: 8 });
  });
  it("does not replace an unfinished human claim with a bot-selected word on timeout", () => {
    const engine = setup(2, true);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    engine.handleHumanTimeout("p0");
    expect(engine.getPublicState().pendingClaim).toBeNull();
    expect(engine.getPublicState().scores.p0).toBe(0);
    expect(engine.getPublicState().turnPlayerId).toBe("p1");
  });
  it.each([2, 3, 4, 6])("uses a strict opponent majority at %i seats without double awards", count => {
    const engine = setup(count, true);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    const claimantId = engine.getPublicState().pendingClaim!.claimantId;
    engine.applyMove({ playerId: claimantId, type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    const voters = engine.getPublicState().pendingClaim!.voters;
    const needed = Math.floor(voters.length / 2) + 1;
    for (let i = 0; i < needed; i++) {
      engine.applyMove({ playerId: voters[i], type: "voteClaim", data: { decision: "accept" } });
      expect(engine.getPublicState().scores[claimantId]).toBe(i + 1 === needed ? 3 : 0);
    }
    expect(engine.applyMove({ playerId: voters[0], type: "voteClaim", data: { decision: "accept" } }).ok).toBe(false);
    expect(engine.getPublicState().scoredWords).toHaveLength(1);
  });
  it("recalculates the majority after a voter leaves without changing the claimant", () => {
    const engine = setup(4, true);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    engine.applyMove({ playerId: "p2", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    engine.applyMove({ playerId: "p1", type: "voteClaim", data: { decision: "accept" } });
    engine.removePlayer("p0");
    expect(engine.getPublicState().turnPlayerId).toBe("p2");
    expect(engine.getPublicState().pendingClaim).not.toBeNull();
    engine.applyMove({ playerId: "p3", type: "voteClaim", data: { decision: "accept" } });
    expect(engine.getPublicState().scores.p2).toBe(3);
    expect(engine.getPublicState().turnPlayerId).toBe("p3");
  });
  it("waits for the final Quick Match claim before ending", () => {
    const engine = setup(2, true, true);
    for (let i = 0; i < 13; i++) engine.handleHumanTimeout(engine.getPublicState().turnPlayerId);
    place(engine, 0, 0, "C"); place(engine, 0, 1, "A"); place(engine, 0, 2, "T");
    expect(engine.isOver()).toBe(false);
    engine.applyMove({ playerId: "p1", type: "claimWord", data: { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] } });
    engine.applyMove({ playerId: "p0", type: "voteClaim", data: { decision: "accept" } });
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().winnerId).toBe("p1");
    expect(engine.getPublicState().turnsTaken).toEqual({ p0: 8, p1: 8 });
  });
  it("keeps Classic defaults and enforces the Quick preset on the server", () => {
    const engine = setup();
    expect(engine.getPublicState().options.matchLength).toBe("classic");
    const quick = setup(2, false, true);
    expect(quick.getPublicState().options).toMatchObject({ boardSize: 8, turnTimerSeconds: 15 });
  });
  it.each([false, true])("rejects malformed placement coordinates without throwing (claims=%s)", claim => {
    const engine = setup(2, claim);
    for (const r of [0.5, NaN, Infinity, -1, 8]) {
      expect(engine.applyMove({ playerId: "p0", type: "place", data: { r, c: 0, letter: "A" } }).ok).toBe(false);
    }
    expect(engine.getPublicState().filledCells).toBe(0);
  });
  it.each([[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]])(
    "scores words in direction (%i,%i)", (dr, dc) => {
      const engine = setup();
      "CAT".split("").forEach((letter, i) => place(engine, 3 + i * dr, 3 + i * dc, letter));
      expect(engine.getPublicState().scoredWords).toHaveLength(1);
      expect(engine.getPublicState().scores.p0).toBe(3);
    },
  );
  it("scores only one crossing word and prefers a row on equal lengths", () => {
    const engine = setup();
    place(engine, 0, 2, "C"); place(engine, 1, 2, "A");
    place(engine, 2, 0, "B"); place(engine, 2, 1, "A"); place(engine, 2, 2, "T");
    expect(engine.getPublicState().scoredWords.map(word => word.word)).toEqual(["BAT"]);
    expect(engine.getPublicState().scores.p0).toBe(3);
  });
  it("ends Quick Match when the only remaining unfinished seat leaves", () => {
    const engine = setup(3, false, true);
    for (let i = 0; i < 23; i++) engine.handleHumanTimeout(engine.getPublicState().turnPlayerId);
    expect(engine.isOver()).toBe(false);
    engine.removePlayer("p2");
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().turnsTaken).toMatchObject({ p0: 8, p1: 8 });
    expect(engine.getPublicState().winnerId).toBeNull();
  });
});

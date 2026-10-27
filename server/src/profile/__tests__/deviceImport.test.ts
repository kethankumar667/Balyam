import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BRICK_BLOCKS_ARCADE_MODE_IDS, GAME_MODE_REGISTRY } from "@shared/profile/GameModes.js";
import {
  MAX_DEVICE_IMPORT_ENTRIES,
  type AllGameSlug,
  type PlayerScorecardArchive,
} from "@shared/profile/Scorecard.js";
import { InMemoryProgressionRepository, setProgressionRepository } from "../../persistence/index.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { ScorecardService } from "../ScorecardService.js";
import { applyDeviceImports, parseDeviceImportBody } from "../deviceImport.js";
import { persistDeviceImports, persistScorecard, readPersistedScorecards } from "../scorecardPersistence.js";

/**
 * A browser keeps a player's bests in its own storage, and signing out used to wipe that. Bringing them to the
 * account is a choice the player makes, and the result is private: shown in My Records, never ranked, because
 * a browser's save is easy to edit.
 */

const PLAYER = "member-import";
const NOW = 1_700_000_000_000;

const SOLO_MODES = Object.entries(GAME_MODE_REGISTRY)
  .filter(([, config]) => !config.serverScored)
  .flatMap(([game, config]) => config.modes.map((mode) => ({ game: game as AllGameSlug, mode })));
const HIGHER = SOLO_MODES.find((entry) => entry.mode.scoringDirection === "HIGHER_IS_BETTER")!;
const LOWER = SOLO_MODES.find((entry) => entry.mode.scoringDirection === "LOWER_IS_BETTER")!;

const entry = (score: number, target = HIGHER) => ({ game: target.game, modeId: target.mode.modeId, score });

function archiveWithBest(score: number, target = HIGHER): PlayerScorecardArchive {
  const service = new ScorecardService(false);
  service.recordScore(PLAYER, { game: target.game, modeId: target.mode.modeId, score, matchId: "m1", context: "SOLO" }, NOW);
  return service.getScorecards(PLAYER);
}

const emptyArchive = (): PlayerScorecardArchive => ({ playerId: PLAYER, games: {}, totalPersonalBestsBeaten: 0, updatedAt: 0 });

describe("applyDeviceImports", () => {
  it("keeps six current Brick Blocks imports private without replacing historical formats", () => {
    const entries = Object.values(BRICK_BLOCKS_ARCADE_MODE_IDS).map(modeId => ({ game: "brickblocks", modeId, score: 125 }));
    const result = applyDeviceImports(emptyArchive(), entries, NOW);
    expect(result.accepted).toEqual(entries);
    expect(result.archive.games).toEqual({});
    expect(Object.keys(result.archive.deviceImports?.brickblocks ?? {})).toEqual(entries.map(entry => entry.modeId));
    expect(result.archive.deviceImports?.brickblocks?.classic).toBeUndefined();
    expect(result.archive.deviceImports?.brickblocks?.pentix).toBeUndefined();
  });
  it("keeps all Neon Breakout imports private and separate from historical classic", () => {
    const entries = ["neon_campaign", "neon_score_attack", "neon_daily"].map(modeId => ({ game: "breakout", modeId, score: 1200 }));
    const result = applyDeviceImports(emptyArchive(), entries, NOW);
    expect(result.accepted).toEqual(entries);
    expect(result.archive.games).toEqual({});
    expect(Object.keys(result.archive.deviceImports?.breakout ?? {})).toEqual(entries.map(e => e.modeId));
    expect(result.archive.deviceImports?.breakout?.classic).toBeUndefined();
  });
  it("keeps an imported best apart from the ranked records", () => {
    const result = applyDeviceImports(emptyArchive(), [entry(500)], NOW);

    expect(result.accepted).toEqual([entry(500)]);
    expect(result.archive.deviceImports?.[HIGHER.game]?.[HIGHER.mode.modeId]).toEqual({ score: 500, importedAt: NOW });
    expect(result.archive.games).toEqual({});
  });

  it("leaves the archive it was given untouched", () => {
    const before = emptyArchive();
    applyDeviceImports(before, [entry(500)], NOW);
    expect(before).toEqual(emptyArchive());
  });

  it("skips a best the account already beats or equals, and accepts one that beats it", () => {
    const archive = archiveWithBest(800);

    const equal = applyDeviceImports(archive, [entry(800)], NOW);
    expect(equal.accepted).toEqual([]);
    expect(equal.skipped).toEqual([{ game: HIGHER.game, modeId: HIGHER.mode.modeId, reason: "not_better" }]);

    expect(applyDeviceImports(archive, [entry(300)], NOW).accepted).toEqual([]);
    expect(applyDeviceImports(archive, [entry(900)], NOW).accepted).toEqual([entry(900)]);
  });

  it("reads 'better' the way each mode does, so a lower time is the improvement where lower wins", () => {
    const archive = archiveWithBest(60, LOWER);

    expect(applyDeviceImports(archive, [entry(80, LOWER)], NOW).accepted).toEqual([]);
    expect(applyDeviceImports(archive, [entry(40, LOWER)], NOW).accepted).toEqual([entry(40, LOWER)]);
  });

  it("keeps only the better of two imports for the same mode", () => {
    const first = applyDeviceImports(emptyArchive(), [entry(500)], NOW).archive;

    expect(applyDeviceImports(first, [entry(400)], NOW + 1).accepted).toEqual([]);
    const better = applyDeviceImports(first, [entry(700)], NOW + 2);
    expect(better.archive.deviceImports?.[HIGHER.game]?.[HIGHER.mode.modeId]).toEqual({ score: 700, importedAt: NOW + 2 });
  });

  it.each([
    ["an unknown game", { game: "not_a_game", modeId: "x", score: 10 }, "unknown_mode"],
    ["an unknown mode", { game: HIGHER.game, modeId: "not_a_mode", score: 10 }, "unknown_mode"],
    ["a game the server scores itself", { game: "rummy", modeId: "single", score: 10 }, "server_scored"],
    ["a negative score", entry(-5), "invalid"],
    ["a score beyond any real play", entry(5_000_000_000), "invalid"],
    ["a score that is not a number", { ...entry(1), score: "9999" }, "invalid"],
    ["a name Object already owns", { game: HIGHER.game, modeId: "constructor", score: 10 }, "invalid"],
    ["something that is not an entry", "nonsense", "invalid"],
  ])("refuses %s", (_label, bad, reason) => {
    const result = applyDeviceImports(emptyArchive(), [bad, entry(50)], NOW);

    expect(result.skipped[0]?.reason).toBe(reason);
    expect(result.accepted).toEqual([entry(50)]);
    expect(Object.keys(result.archive.deviceImports ?? {})).toEqual([HIGHER.game]);
  });
});

describe("parseDeviceImportBody", () => {
  it("accepts a list of entries", () => {
    expect(parseDeviceImportBody({ entries: [entry(1)] })).toEqual({ ok: true, entries: [entry(1)] });
  });

  it.each([
    ["no body", undefined],
    ["entries that are not a list", { entries: "all of them" }],
    ["an empty list", { entries: [] }],
    ["more entries than there are modes", { entries: Array.from({ length: MAX_DEVICE_IMPORT_ENTRIES + 1 }, () => entry(1)) }],
  ])("refuses %s", (_label, body) => {
    expect(parseDeviceImportBody(body).ok).toBe(false);
  });
});

describe("persistDeviceImports", () => {
  beforeEach(async () => {
    await progressionSync.drain();
    const repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    await repo.upsertIdentity({ playerId: PLAYER, kind: "member", authUserId: PLAYER, lastSeenAt: 1 });
  });
  afterEach(async () => {
    await progressionSync.drain();
    setProgressionRepository(null);
  });

  it("stores the import so another device reads it, and repeating it changes nothing", async () => {
    const first = await persistDeviceImports(PLAYER, [entry(500)], NOW);
    const again = await persistDeviceImports(PLAYER, [entry(500)], NOW + 10);

    expect(first.accepted).toEqual([entry(500)]);
    expect(again.accepted).toEqual([]);
    const archive = await readPersistedScorecards(PLAYER);
    expect(archive.deviceImports?.[HIGHER.game]?.[HIGHER.mode.modeId]).toEqual({ score: 500, importedAt: NOW });
  });

  it("survives a real score recorded afterwards, and never turns into a ranked record", async () => {
    await persistDeviceImports(PLAYER, [entry(500)], NOW);
    await persistScorecard(PLAYER, { game: HIGHER.game, modeId: HIGHER.mode.modeId, score: 100, matchId: "real", context: "SOLO" }, NOW + 5);

    const archive = await readPersistedScorecards(PLAYER);
    expect(archive.deviceImports?.[HIGHER.game]?.[HIGHER.mode.modeId]?.score).toBe(500);
    expect(archive.games[HIGHER.game]?.modes[HIGHER.mode.modeId]).toMatchObject({ bestScore: 100, timesPlayed: 1 });
  });

  it("does not write anything when nothing is better than what the account holds", async () => {
    await persistScorecard(PLAYER, { game: HIGHER.game, modeId: HIGHER.mode.modeId, score: 900, matchId: "real", context: "SOLO" }, NOW);
    const result = await persistDeviceImports(PLAYER, [entry(500)], NOW + 1);

    expect(result.accepted).toEqual([]);
    expect((await readPersistedScorecards(PLAYER)).deviceImports).toBeUndefined();
  });

  it("does not acknowledge a database failure as a successful import", async () => {
    const repo = new InMemoryProgressionRepository();
    repo.commitScorecard = async () => { throw new Error("Database unavailable"); };
    setProgressionRepository(repo);

    await expect(persistDeviceImports(PLAYER, [entry(500)], NOW)).rejects.toThrow("Database unavailable");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRecords, formatRecordScore, goalProgress, orderGamesByRecency, readDeviceBest, recordSummary, RECORD_GAMES, tileImageForGame } from "../records";
import type { AllGameSlug, ModeScorecard, PlayerScorecardArchive } from "@shared/profile/Scorecard";

beforeEach(() => localStorage.clear());

function scorecard(modeId: string, bestScore = 42): ModeScorecard {
  return {
    modeId, modeDisplayName: modeId, bestScore, timesPlayed: 2, bestScoreAchievedAt: 123,
    bestScoreMatchId: "old-match", recentScores: [bestScore, 20],
    scoringDirection: "HIGHER_IS_BETTER", totalScoreAccumulated: 62, averageScore: 31,
    bestContext: "SOLO", secondaryMetrics: {}, foilTier: "carbon",
    radar: { velocity: 0, clutch: 0, efficiency: 0, consistency: 0, aggression: 0 },
  };
}

function archived(game: AllGameSlug, modes: Record<string, ModeScorecard>): PlayerScorecardArchive {
  return { playerId: "test", totalPersonalBestsBeaten: 0, updatedAt: 123, games: {
    [game]: { game, gameDisplayName: game, modes, lastPlayedAt: 123, totalModesPlayed: Object.keys(modes).length },
  } };
}

describe("orderGamesByRecency", () => {
  const game = (id: string, lastPlayedAt?: number) => ({ id, lastPlayedAt });
  const ids = (games: ReadonlyArray<{ id: string }>) => games.map((entry) => entry.id);

  it("puts the game played last first, then the one before it, then the rest in their usual order", () => {
    const games = [game("handcricket"), game("rummy"), game("ludo"), game("uno"), game("chess")];
    const ordered = orderGamesByRecency(games, [
      { slug: "ludo", lastPlayedAt: 100 },
      { slug: "rummy", lastPlayedAt: 300 },
    ]);
    expect(ids(ordered)).toEqual(["rummy", "ludo", "handcricket", "uno", "chess"]);
  });

  it("keeps the usual order when nothing has been played", () => {
    const games = [game("handcricket"), game("rummy"), game("ludo")];
    expect(ids(orderGamesByRecency(games, []))).toEqual(["handcricket", "rummy", "ludo"]);
  });

  it("counts the account's own last-played time, so a game played on another device rises too", () => {
    const games = [game("handcricket", 10), game("rummy"), game("ludo", 500)];
    expect(ids(orderGamesByRecency(games, [{ slug: "rummy", lastPlayedAt: 200 }]))).toEqual(["ludo", "rummy", "handcricket"]);
  });

  it("uses the later of the account time and this browser's time for the same game", () => {
    const games = [game("handcricket", 900), game("rummy", 100)];
    // Rummy was recorded to the account long ago, but a match started on this browser just now.
    expect(ids(orderGamesByRecency(games, [{ slug: "rummy", lastPlayedAt: 1000 }]))).toEqual(["rummy", "handcricket"]);
  });

  it("reads a catalogue tile under the id its records use", () => {
    const games = [game("handcricket"), game("nokiasnake"), game("brickblocks")];
    const ordered = orderGamesByRecency(games, [
      { slug: "snake", lastPlayedAt: 50 },
      { slug: "tetris", lastPlayedAt: 80 },
    ]);
    expect(ids(ordered)).toEqual(["brickblocks", "nokiasnake", "handcricket"]);
  });

  it("ignores a recent game that has no records entry, and never changes the list it was given", () => {
    const games = [game("handcricket"), game("rummy")];
    const copy = [...games];
    expect(ids(orderGamesByRecency(games, [{ slug: "mystery", lastPlayedAt: 999 }]))).toEqual(["handcricket", "rummy"]);
    expect(games).toEqual(copy);
  });

  it("orders the real record games, with a played game first and the rest as before", () => {
    const usual = ids(buildRecords(null, false));
    const ordered = ids(orderGamesByRecency(buildRecords(null, false), [{ slug: "rummy", lastPlayedAt: 1 }]));
    expect(ordered[0]).toBe("rummy");
    expect(ordered.slice(1)).toEqual(usual.filter((id) => id !== "rummy"));
  });
});

describe("bests brought from a device", () => {
  const withImport = (score: number, saved?: ModeScorecard): PlayerScorecardArchive => ({
    ...(saved ? archived("nokiacricket", { classic_1: saved }) : { playerId: "test", games: {}, totalPersonalBestsBeaten: 0, updatedAt: 1 }),
    deviceImports: { nokiacricket: { classic_1: { score, importedAt: 5 } } },
  });
  const classic1 = (archive: PlayerScorecardArchive | null) =>
    buildRecords(archive, false).find((entry) => entry.id === "nokiacricket")!.modes.find((mode) => mode.modeId === "classic_1")!;

  it("shows an imported best as the account's own, labelled as imported, with no date or match count", () => {
    expect(classic1(withImport(150))).toMatchObject({ best: 150, imported: true, deviceOnly: false, timesPlayed: 0, achievedAt: undefined });
  });

  it("keeps a real recorded best when it is higher than the import", () => {
    expect(classic1(withImport(150, scorecard("classic_1", 200)))).toMatchObject({ best: 200, imported: false, timesPlayed: 2 });
  });

  it("shows the import when it is higher than the real record, without borrowing that record's date", () => {
    expect(classic1(withImport(300, scorecard("classic_1", 200)))).toMatchObject({ best: 300, imported: true, achievedAt: undefined });
  });

  it("counts an imported best as a personal best but never as a recorded match", () => {
    const game = buildRecords(withImport(150), false).find((entry) => entry.id === "nokiacricket")!;
    expect(recordSummary([game])).toMatchObject({ personalBests: 1, matches: 0 });
  });

  it("stops calling a device score device-only once the account holds it, and exposes the raw device best either way", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ modeBestScores: { classic_1: 150 } }));

    expect(buildRecords(null, true).find((entry) => entry.id === "nokiacricket")!.modes.find((mode) => mode.modeId === "classic_1"))
      .toMatchObject({ best: 150, deviceOnly: true, deviceBest: 150, imported: false });
    expect(buildRecords(withImport(150), true).find((entry) => entry.id === "nokiacricket")!.modes.find((mode) => mode.modeId === "classic_1")).toMatchObject({
      best: 150, imported: true, deviceOnly: false, deviceBest: 150,
    });
  });
});

describe("personal records data", () => {
  it("reads each current Brick Blocks mode without assigning a failed sprint a completion time", () => {
    localStorage.setItem("bhalyam_brick_tetris_save_v1", JSON.stringify({ arcade: { records: [
      { mode: "marathon", score: 3200 }, { mode: "pentix", score: 2400 },
      { mode: "attack", score: 1600 }, { mode: "practice", score: 1000 },
      { mode: "sprint", score: 9999, elapsedMs: 20000, complete: false },
      { mode: "sprint", elapsedMs: 125000, complete: true },
      { mode: "daily", elapsedMs: 140000, complete: true },
      { mode: "daily", elapsedMs: 135000, complete: true },
    ] } }));
    const game = buildRecords(null).find(item => item.id === "brickblocks")!;
    for (const [modeId, best] of Object.entries({
      arcade_marathon: 3200, arcade_pentix: 2400, arcade_attack: 1600, arcade_practice: 1000,
      arcade_sprint: 125, arcade_daily: 135,
    })) expect(game.modes.find(mode => mode.modeId === modeId)).toMatchObject({ best, deviceOnly: true, timesPlayed: 0 });
  });
  it("preserves older cache snapshots locally without inventing synced matches or overwriting account bests", () => {
    const old = archived("handcricket", { t20: scorecard("t20", 200), international_t20: scorecard("international_t20", 180) });
    const synced = archived("handcricket", { international_t20: scorecard("international_t20", 140) });
    const game = buildRecords(synced, true, old).find((entry) => entry.id === "handcricket")!;
    expect(game.modes.find((mode) => mode.modeId === "international_t20")?.best).toBe(140);
    expect(game.previousModeRecords).toHaveLength(2);
    expect(game.previousModeRecords.every((saved) => saved.deviceOnly && saved.timesPlayed === 0 && saved.bestScoreAchievedAt === 0)).toBe(true);
    expect(recordSummary([game]).matches).toBe(2);
    expect(buildRecords(old, true, old).find((entry) => entry.id === "handcricket")!.previousModeRecords).toHaveLength(1);
  });

  it("keeps cricket categories independent and preserves older category-unknown formats", () => {
    const game = buildRecords(archived("handcricket", {
      international_t20: scorecard("international_t20", 140),
      franchise_t20: scorecard("franchise_t20", 180),
      t20: scorecard("t20", 200),
    })).find((entry) => entry.id === "handcricket")!;
    expect(game.modes.find((mode) => mode.modeId === "international_t20")?.best).toBe(140);
    expect(game.modes.find((mode) => mode.modeId === "franchise_t20")?.best).toBe(180);
    expect(game.previousModeRecords.map((saved) => saved.modeId)).toEqual(["t20"]);
  });

  it.each(RECORD_GAMES)("retains current and historical archive records for $id", ({ id, config }) => {
    const currentId = config.defaultModeId;
    const archive = archived(id, { [currentId]: scorecard(currentId), retired_format: scorecard("retired_format", 21) });
    const unchanged = JSON.stringify(archive);
    const game = buildRecords(archive).find((entry) => entry.id === id)!;
    expect(game.modes.find((mode) => mode.modeId === currentId)!.best).toBe(42);
    expect(game.previousModeRecords).toEqual([scorecard("retired_format", 21)]);
    expect(recordSummary([game])).toMatchObject({ gamesExplored: 1, personalBests: 2, matches: 4, modesPlayed: 2 });
    expect(JSON.stringify(archive)).toBe(unchanged);
  });

  it("keeps arcade Breakout device bests separate from the historical classic score", () => {
    localStorage.setItem("bhalyam_brick_breakout_v1", JSON.stringify({
      highScore: 700,
      arcade: { version: 1, records: [
        { mode: "campaign", score: 1200 }, { mode: "score-attack", score: 900 },
        { mode: "daily", date: "2026-10-27", score: 800 }, { mode: "daily", date: "2026-10-28", score: 600 },
      ] },
    }));
    expect(readDeviceBest("breakout", "classic")).toBe(700);
    expect(readDeviceBest("breakout", "neon_campaign")).toBe(1200);
    expect(readDeviceBest("breakout", "neon_score_attack")).toBe(900);
    expect(readDeviceBest("breakout", "neon_daily")).toBe(800);
  });

  it.each([
    ["2048", "bhalyam.2048.stats.v1", { bestScore: { battle: 512, timeattack: 256, zen: 1024 }, dailyBestScore: 128, bestRaceTimeMs: 125000 }, { battle: 512, timeattack: 256, zen: 1024, daily: 128, race: 125 }],
    ["nokiasnake", "bhalyam_retro_snake_v1", { modeBestScores: { classic_walled: 80, borderless_wrap: 90 } }, { classic_walled: 80, borderless_wrap: 90 }],
    ["nokiacricket", "bhalyam_nokia_cricket_data_v1", { modeBestScores: { classic_10: 140, chase_2: 25 } }, { classic_10: 140, chase_2: 25 }],
    ["roadrash", "bhalyam_brick_racer_v1", { highScore: 350 }, { circuit_rush: 350 }],
    ["brickblocks", "bhalyam_brick_tetris_save_v1", { bestClassicScore: 500, bestPentixScore: 600 }, { classic: 500, pentix: 600 }],
    ["breakout", "bhalyam_brick_breakout_v1", { highScore: 700 }, { classic: 700 }],
    ["blockblast", "bb.best", 800, { classic_endless: 800 }],
  ] as const)("reads verified device records for %s without writing storage", (id, key, data, expected) => {
    const raw = JSON.stringify(data);
    localStorage.setItem(key, raw);
    const game = buildRecords(null).find((entry) => entry.id === id)!;
    for (const [modeId, best] of Object.entries(expected)) {
      expect(game.modes.find((mode) => mode.modeId === modeId)).toMatchObject({ best, deviceOnly: true, timesPlayed: 0, achievedAt: undefined, recentScores: [] });
    }
    expect(localStorage.getItem(key)).toBe(raw);
    expect(readDeviceBest(id, "unknown_mode")).toBeNull();
  });

  it.each([
    ["nokiasnake", "bhalyam_retro_snake_v1", JSON.stringify({ highScore: 95 }), 95],
    ["snake", "mpg.snake.best", "75", 75],
  ] as const)("retains %s overall scores without guessing a mode", (id, key, raw, best) => {
    localStorage.setItem(key, raw);
    const game = buildRecords(null).find((entry) => entry.id === id)!;
    expect(game.previousOverallBest).toBe(best);
    expect(game.modes.every((mode) => mode.best === null)).toBe(true);
    expect(localStorage.getItem(key)).toBe(raw);
    expect(buildRecords(null, false).find((entry) => entry.id === id)!.previousOverallBest).toBeNull();
  });

  it("keeps older Brick Blocks archives under the Tetris alias without duplicating modern records", () => {
    const archive = archived("tetris", { classic: scorecard("classic", 800), pentix: scorecard("pentix", 500) });
    const current = archived("brickblocks", { classic: scorecard("classic", 900) });
    archive.games.brickblocks = current.games.brickblocks;
    const game = buildRecords(archive).find((entry) => entry.id === "brickblocks")!;
    expect(game.modes.find((mode) => mode.modeId === "classic")!.best).toBe(900);
    expect(game.modes.find((mode) => mode.modeId === "pentix")!.best).toBe(500);
    expect(recordSummary([game]).matches).toBe(4);
  });

  it("preserves high-score-list-only Brick Blocks saves with their recorded mode", () => {
    localStorage.setItem("bhalyam_brick_tetris_save_v1", JSON.stringify({ highScores: [
      { mode: "CLASSIC", score: 400 }, { mode: "CLASSIC", score: 700 },
      { mode: "PENTIX", score: 500 }, { mode: "UNKNOWN", score: 9999 },
    ] }));
    expect(readDeviceBest("brickblocks", "classic")).toBe(700);
    expect(readDeviceBest("brickblocks", "pentix")).toBe(500);
  });

  it("does not duplicate Retro Snake's overall best when a saved mode accounts for it", () => {
    localStorage.setItem("bhalyam_retro_snake_v1", JSON.stringify({ highScore: 95, modeBestScores: { borderless_wrap: 95 } }));
    const game = buildRecords(null).find((entry) => entry.id === "nokiasnake")!;
    expect(game.previousOverallBest).toBeNull();
    expect(game.modes.find((mode) => mode.modeId === "borderless_wrap")!.best).toBe(95);
  });

  it("preserves a lower-is-better historical zero without applying current goals", () => {
    const old = { ...scorecard("old_rules", 0), scoringDirection: "LOWER_IS_BETTER" as const };
    const game = buildRecords(archived("rummy", { old_rules: old })).find((entry) => entry.id === "rummy")!;
    expect(game.previousModeRecords).toEqual([old]);
    expect(recordSummary([game])).toMatchObject({ personalBests: 1, matches: 2, goalsReached: 0 });
  });

  it("does not count invalid or unplayed historical archive scores", () => {
    const game = buildRecords(archived("rummy", {
      invalid: scorecard("invalid", NaN), unplayed: { ...scorecard("unplayed"), timesPlayed: 0 },
    })).find((entry) => entry.id === "rummy")!;
    expect(game.previousModeRecords).toEqual([]);
    expect(recordSummary([game]).matches).toBe(0);
  });

  it("does not convert Sudoku puzzle progress into a personal best", () => {
    localStorage.setItem("bhalyam.sudoku.progress.v1", '{"easy":50,"medium":20}');
    localStorage.setItem("bhalyam.sudoku.saved.v1", '{"elapsedSeconds":123,"isComplete":false}');
    const game = buildRecords(null).find((entry) => entry.id === "sudoku")!;
    expect(recordSummary([game])).toMatchObject({ gamesExplored: 0, personalBests: 0, matches: 0 });
  });

  it("preserves old Rummy penalty scores without showing them as winning-point records", () => {
    const old = { ...scorecard("single", 0), scoringDirection: "LOWER_IS_BETTER" as const };
    const archive = archived("rummy", { single: old });
    const before = JSON.stringify(archive);
    const game = buildRecords(archive).find((entry) => entry.id === "rummy")!;
    expect(game.modes.find((mode) => mode.modeId === "single")).toMatchObject({
      best: null, scoringDirection: "HIGHER_IS_BETTER", goal: undefined,
    });
    expect(game.previousModeRecords[0]).toMatchObject({ bestScore: 0, modeId: "legacy_penalty_single" });
    expect(JSON.stringify(archive)).toBe(before);
  });

  it.each(["NaN", "Infinity", "-10", "0", '"123"', "null", "{}", "[]", "123oops"])("rejects invalid standalone saved scores: %s", (raw) => {
    localStorage.setItem("bb.best", raw);
    localStorage.setItem("mpg.snake.best", raw);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(readDeviceBest("blockblast", "classic_endless")).toBeNull();
      expect(buildRecords(null).find((game) => game.id === "snake")!.previousOverallBest).toBeNull();
      expect(localStorage.getItem("bb.best")).toBe(raw);
    } finally { warn.mockRestore(); }
  });

  it("formats timed modes as time and includes a score unit only once", () => {
    const games = buildRecords(null);
    const game = games.find((entry) => entry.id === "2048")!;
    expect(formatRecordScore(game, game.modes.find((entry) => entry.modeId === "race")!, 125)).toBe("2m 05s");
    expect(formatRecordScore(game, game.modes[0]!, 1200)).toBe("1,200 pts");
    const cricket = games.find((entry) => entry.id === "handcricket")!;
    expect(formatRecordScore(cricket, cricket.modes[0]!, 184)).toBe("184 runs");
  });
  it("never fabricates games played, matches, dates or results from an empty archive", () => {
    const games = buildRecords(null);
    expect(recordSummary(games)).toMatchObject({ gamesExplored: 0, modesPlayed: 0, matches: 0, personalBests: 0, goalsReached: 0 });
    expect(games.every((game) => game.modes.every((mode) => mode.best === null && mode.achievedAt === undefined && !mode.recentScores.length))).toBe(true);
  });

  it("does not apply a mode's saved best to another mode", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ modeBestScores: { classic_10: 140 }, highScore: 200 }));
    expect(readDeviceBest("nokiacricket", "classic_10")).toBe(140);
    expect(readDeviceBest("nokiacricket", "classic_1")).toBeNull();
  });

  it("preserves an older overall cricket best without assigning it a mode", () => {
    const saved = JSON.stringify({ highScore: 140, matchesPlayed: 7 });
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", saved);
    const games = buildRecords(null);
    const cricket = games.find((game) => game.id === "nokiacricket")!;
    expect(cricket.previousOverallBest).toBe(140);
    expect(cricket.modes.every((mode) => mode.best === null && mode.timesPlayed === 0 && mode.achievedAt === undefined)).toBe(true);
    expect(recordSummary(games)).toMatchObject({ gamesExplored: 1, personalBests: 1, modesPlayed: 0, matches: 0, goalsReached: 0 });
    expect(localStorage.getItem("bhalyam_nokia_cricket_data_v1")).toBe(saved);
    expect(buildRecords(null, false).find((game) => game.id === "nokiacricket")!.previousOverallBest).toBeNull();
  });

  it("keeps an older overall best separate from newer per-mode scores", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ highScore: 200, modeBestScores: { classic_10: 140 } }));
    const cricket = buildRecords(null).find((game) => game.id === "nokiacricket")!;
    expect(cricket.previousOverallBest).toBe(200);
    expect(cricket.modes.find((mode) => mode.modeId === "classic_10")!.best).toBe(140);
    expect(cricket.modes.find((mode) => mode.modeId === "classic_1")!.best).toBeNull();
  });

  it("does not duplicate an overall best already identified by a mode", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ highScore: 140, modeBestScores: { classic_10: 140 } }));
    expect(buildRecords(null).find((game) => game.id === "nokiacricket")!.previousOverallBest).toBeNull();
  });

  it.each([undefined, 0, -1, "140", null])("does not invent an overall record from %s", (highScore) => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ highScore }));
    expect(buildRecords(null).find((game) => game.id === "nokiacricket")!.previousOverallBest).toBeNull();
  });

  it("reports malformed cricket data without changing it", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", "{invalid");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(buildRecords(null).find((game) => game.id === "nokiacricket")!.previousOverallBest).toBeNull();
      expect(warning).toHaveBeenCalled();
      expect(localStorage.getItem("bhalyam_nokia_cricket_data_v1")).toBe("{invalid");
    } finally {
      warning.mockRestore();
    }
  });

  it("keeps a valid zero-point record and reaches a lower-is-better zero goal", () => {
    const empty = buildRecords(null);
    const game = empty.find((entry) => entry.id === "rummy")!;
    const mode = { ...game.modes[0]!, best: 0, goal: 0, scoringDirection: "LOWER_IS_BETTER" as const };
    expect(goalProgress(mode)).toBe(100);
    expect(goalProgress({ ...mode, best: 10 })).toBeNull();
  });

  it("prefers archive scores, keeps five results oldest-first and never invents device dates", () => {
    localStorage.setItem("bhalyam_retro_snake_v1", JSON.stringify({ modeBestScores: { classic_walled: 999 } }));
    const archive: PlayerScorecardArchive = {
      playerId: "test", totalPersonalBestsBeaten: 0, updatedAt: 1,
      games: { nokiasnake: { game: "nokiasnake", gameDisplayName: "Retro Snake", lastPlayedAt: 1, totalModesPlayed: 1,
        modes: { classic_walled: {
          modeId: "classic_walled", modeDisplayName: "Classic", bestScore: 30, timesPlayed: 8,
          bestScoreAchievedAt: 123, bestScoreMatchId: "m1", recentScores: [30, 20, 10, 9, 8, 7],
          scoringDirection: "HIGHER_IS_BETTER", totalScoreAccumulated: 100, averageScore: 12.5,
          bestContext: "SOLO", secondaryMetrics: {}, foilTier: "carbon",
          radar: { velocity: 0, clutch: 0, efficiency: 0, consistency: 0, aggression: 0 },
        } },
      } },
    };
    const mode = buildRecords(archive).find((entry) => entry.id === "nokiasnake")!.modes.find((entry) => entry.modeId === "classic_walled")!;
    expect(mode.best).toBe(30);
    expect(mode.recentScores).toEqual([8, 9, 10, 20, 30]);
    expect(mode.achievedAt).toBe(123);
    const device = buildRecords(null).find((entry) => entry.id === "nokiasnake")!.modes[0]!;
    expect(device.timesPlayed).toBe(0);
    expect(device.achievedAt).toBeUndefined();
  });
});

describe("tileImageForGame", () => {
  it("gives the tile art of the game a record was set in", () => {
    expect(tileImageForGame("handcricket")).toBe("/HandCricketTile.png");
    expect(tileImageForGame("nokiasnake")).toBe("/Snake Game Tile.png");
  });

  it("has art for every game that keeps records, so the new-record popup never shows an empty medal", () => {
    expect(RECORD_GAMES.filter((game) => !tileImageForGame(game.id)).map((game) => game.id)).toEqual([]);
  });

  it("gives null for a game it does not know", () => {
    expect(tileImageForGame("not-a-game")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  GAME_MODE_REGISTRY,
  getGameModeConfig,
  nokiaCricketModeId,
  nokiaSnakeModeId,
  resolveModeId,
} from "@shared/profile/GameModes.js";
import { ScorecardService } from "../ScorecardService.js";

/**
 * The leaderboard lists `GAME_MODE_REGISTRY`'s modes; the games and the server decide which mode a
 * finished run is filed under. When those two drift apart a player sees modes they can never play
 * ("Quick 2-Token" in a Ludo that always has four tokens) or plays modes the board has no row for
 * (a 1-over Retro Cricket run filed under 2 overs).
 *
 * `LOBBY_CHOICES` is what a player can ACTUALLY pick, read from each game's lobby. Every choice must
 * land in a registered mode, and every registered mode must be reachable from some choice.
 */

type Choice = { options?: Record<string, unknown>; expect: string };

const LOBBY_CHOICES: Record<string, Choice[]> = {
  handcricket: [
    { options: { mode: "single", category: "international", format: "t20" }, expect: "international_t20" },
    { options: { mode: "single", category: "international", format: "odi" }, expect: "international_odi" },
    { options: { mode: "single", category: "international", format: "test" }, expect: "international_test" },
    { options: { mode: "single", category: "ipl", format: "t20" }, expect: "franchise_t20" },
    { options: { mode: "single", category: "ipl", format: "odi" }, expect: "franchise_odi" },
    { options: { mode: "single", category: "ipl", format: "test" }, expect: "franchise_test" },
    { options: { mode: "tournament", format: "t20" }, expect: "international_t20" },
    { options: { mode: "galli", format: "t20", galliOvers: 2 }, expect: "galli_quick" },
    { options: { mode: "galli", format: "t20", galliOvers: 5 }, expect: "galli_quick" },
    { options: { mode: "galli", format: "t20", galliOvers: 6 }, expect: "galli_standard" },
    { options: { mode: "galli", format: "t20", galliOvers: 10 }, expect: "galli_standard" },
    { options: { mode: "galli", format: "t20", galliOvers: 11 }, expect: "galli_long" },
    { options: { mode: "galli", format: "t20", galliOvers: 20 }, expect: "galli_long" },
    // The engine defaults a missing galliOvers to 5 and clamps to 2..20.
    { options: { mode: "galli", format: "t20" }, expect: "galli_quick" },
    { options: { mode: "galli", format: "t20", galliOvers: 1 }, expect: "galli_quick" },
    { options: { mode: "galli", format: "t20", galliOvers: 99 }, expect: "galli_long" },
    { expect: "international_t20" },
  ],
  "2048": [
    { options: { mode: "daily" }, expect: "daily" },
    { options: { mode: "battle" }, expect: "battle" },
    { options: { mode: "race" }, expect: "race" },
    { options: { mode: "timeattack" }, expect: "timeattack" },
    { options: { mode: "zen" }, expect: "zen" },
  ],
  snake: [
    { options: { wallMode: "solid", speedMs: 140 }, expect: "classic_walled" },
    { options: { wallMode: "solid", speedMs: 100 }, expect: "classic_walled" },
    { options: { wallMode: "wrap", speedMs: 140 }, expect: "borderless_wrap" },
    { options: { wallMode: "wrap", speedMs: 100 }, expect: "borderless_wrap" },
    { options: { wallMode: "solid", speedMs: 70 }, expect: "speed_rush" },
    { options: { wallMode: "wrap", speedMs: 70 }, expect: "speed_rush" },
  ],
  nokiasnake: [
    { options: { gameMode: "CLASSIC" }, expect: "classic_walled" },
    { options: { gameMode: "WRAP_AROUND" }, expect: "borderless_wrap" },
  ],
  nokiacricket: ["classic", "chase"].flatMap((kind) =>
    [1, 2, 5, 10].map((overs): Choice => ({ options: { kind, overs }, expect: `${kind}_${overs}` })),
  ),
  ludo: [{ expect: "classic_4token" }],
  rummy: [
    { options: { mode: "single" }, expect: "single" },
    { options: { mode: "pool101" }, expect: "pool101" },
    { options: { mode: "pool201" }, expect: "pool201" },
  ],
  uno: [
    { options: { targetScore: null }, expect: "single" },
    { options: { targetScore: 300 }, expect: "race_300" },
    { options: { targetScore: 500 }, expect: "race_500" },
    { options: { targetScore: 1000 }, expect: "race_1000" },
    // Not a lobby choice, but the wire accepts any number: file it with the nearest race.
    { options: { targetScore: 400 }, expect: "race_500" },
    { options: { targetScore: 2000 }, expect: "race_1000" },
  ],
  snl: [
    { options: { difficulty: "easy" }, expect: "easy" },
    { options: { difficulty: "medium" }, expect: "medium" },
    { options: { difficulty: "hard" }, expect: "hard" },
    { options: { difficulty: "extreme" }, expect: "extreme" },
  ],
  dotsboxes: [
    { options: { boardSize: 5 }, expect: "grid_5x5" },
    { options: { boardSize: 7 }, expect: "grid_7x7" },
    { options: { boardSize: 9 }, expect: "grid_9x9" },
  ],
  wordbuilding: [
    { options: { dictionaryMode: "common", matchLength: "quick" }, expect: "classroom_quick" },
    { options: { dictionaryMode: "tournament", matchLength: "quick" }, expect: "tournament_quick" },
    { options: { dictionaryMode: "common", boardSize: 10 }, expect: "classroom_10x10" },
    { options: { dictionaryMode: "common", boardSize: 8 }, expect: "classroom_8x8" },
    { options: { dictionaryMode: "tournament", boardSize: 10 }, expect: "tournament_10x10" },
    { options: { dictionaryMode: "tournament", boardSize: 8 }, expect: "tournament_8x8" },
  ],
  stargame: [3, 5, 7, 10].map((totalRounds): Choice => ({
    options: { totalRounds },
    expect: { 3: "sprint_3", 5: "classic_5", 7: "extended_7", 10: "marathon_10" }[totalRounds]!,
  })),
  bingo: [
    { options: { stopOnFirstWin: true, callIntervalMs: 4000 }, expect: "first_win" },
    { options: { stopOnFirstWin: true, callIntervalMs: 6000 }, expect: "first_win" },
    { options: { stopOnFirstWin: true, callIntervalMs: 2500 }, expect: "fast_2500" },
    { options: { stopOnFirstWin: false, callIntervalMs: 4000 }, expect: "all_win" },
    { options: { stopOnFirstWin: false, callIntervalMs: 2500 }, expect: "all_win" },
  ],
  namesplaceanimal: [3, 5, 7, 10].map((totalRounds): Choice => ({
    options: { totalRounds },
    expect: { 3: "quick_3rds", 5: "medium_5rds", 7: "extended_7rds", 10: "marathon_10rds" }[totalRounds]!,
  })),
  chess: [
    { options: { timeControl: "bullet_1_0", initialSeconds: 60 }, expect: "bullet_1m" },
    { options: { timeControl: "blitz_3_2", initialSeconds: 180 }, expect: "blitz_3m" },
    { options: { timeControl: "rapid_10_0", initialSeconds: 600 }, expect: "rapid_10m" },
    { options: { timeControl: "custom", initialSeconds: 90 }, expect: "bullet_1m" },
    { options: { timeControl: "custom", initialSeconds: 300 }, expect: "blitz_3m" },
    { options: { timeControl: "custom", initialSeconds: 1800 }, expect: "rapid_10m" },
  ],
  rps: [{ expect: "first_to_10" }],
  spacewar: [{ expect: "arcade_survival" }],
  blockblast: [{ expect: "classic_endless" }],
  roadrash: [{ expect: "circuit_rush" }],
  brickblocks: [
    { options: { mode: "CLASSIC" }, expect: "classic" },
    { options: { mode: "PENTIX" }, expect: "pentix" },
  ],
  breakout: [{ expect: "classic" }],
  sudoku: ["easy", "medium", "hard", "expert"].map((d): Choice => ({ options: { difficulty: d }, expect: d })),
  brainvita: [{ expect: "classic" }],
  tictactoe: [
    { options: { mode: "quantum" }, expect: "quantum" },
    { options: { mode: "classic" }, expect: "classic" },
  ],
  connect4: [{ expect: "classic" }],
  vamanaguntalu: [{ expect: "classic" }],
};

/** Games whose recorder lives in the client and derives its own mode id from the game's own state. */
const CLIENT_DERIVED: Record<string, (options: Record<string, unknown>) => string> = {
  nokiacricket: (o) => nokiaCricketModeId(o.kind as "classic" | "chase", o.overs as number),
  nokiasnake: (o) => nokiaSnakeModeId(o.gameMode as "CLASSIC" | "WRAP_AROUND"),
  // The next three are recorded by the client straight from the game's own mode name.
  "2048": (o) => String(o.mode),
  brickblocks: (o) => (o.mode === "PENTIX" ? "pentix" : "classic"),
  sudoku: (o) => String(o.difficulty),
};

function modeFor(game: string, choice: Choice): string {
  const derive = CLIENT_DERIVED[game];
  if (derive && choice.options) return derive(choice.options);
  return resolveModeId(game, choice.options);
}

describe("game mode registry is internally consistent", () => {
  const games = Object.entries(GAME_MODE_REGISTRY);

  it.each(games)("%s: one default, unique ids and names, nothing blank", (_slug, cfg) => {
    const ids = cfg.modes.map((m) => m.modeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(cfg.modes.map((m) => m.displayName)).size).toBe(cfg.modes.length);
    expect(ids).toContain(cfg.defaultModeId);
    expect(cfg.modes.filter((m) => m.isDefault).map((m) => m.modeId)).toEqual([cfg.defaultModeId]);
    for (const m of cfg.modes) {
      expect(m.displayName.trim()).not.toBe("");
      expect(m.description.trim()).not.toBe("");
      expect(m.unit.trim()).not.toBe("");
    }
  });

  it("lists a game once: aliases resolve to their game instead of being a second entry", () => {
    expect(Object.keys(GAME_MODE_REGISTRY)).not.toContain("tetris");
    expect(getGameModeConfig("tetris").game).toBe("brickblocks");
    const names = games.map(([, cfg]) => cfg.displayName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("every lobby choice lands on a registered mode, and every mode can be reached", () => {
  it("describes how to reach every game in the registry", () => {
    expect(Object.keys(LOBBY_CHOICES).sort()).toEqual(Object.keys(GAME_MODE_REGISTRY).sort());
  });

  for (const [game, choices] of Object.entries(LOBBY_CHOICES)) {
    describe(game, () => {
      const registered = new Set(getGameModeConfig(game).modes.map((m) => m.modeId));

      it.each(choices.map((c) => [JSON.stringify(c.options ?? "defaults"), c] as const))("%s", (_label, choice) => {
        const modeId = modeFor(game, choice);
        expect(modeId).toBe(choice.expect);
        expect(registered.has(modeId), `${game}/${modeId} is not in the registry`).toBe(true);
      });

      it("leaves no registered mode that no choice can reach", () => {
        const reached = new Set(choices.map((c) => modeFor(game, c)));
        expect([...registered].filter((id) => !reached.has(id))).toEqual([]);
      });
    });
  }
});

describe("Retro Cricket: Classic and Chase, each at every over length the game offers", () => {
  it("files a run under the match type AND the overs actually played", () => {
    expect(nokiaCricketModeId("classic", 1)).toBe("classic_1");
    expect(nokiaCricketModeId("classic", 2)).toBe("classic_2");
    expect(nokiaCricketModeId("classic", 5)).toBe("classic_5");
    expect(nokiaCricketModeId("classic", 10)).toBe("classic_10");
    expect(nokiaCricketModeId("chase", 1)).toBe("chase_1");
    expect(nokiaCricketModeId("chase", 5)).toBe("chase_5");
    expect(nokiaCricketModeId("chase", 10)).toBe("chase_10");
  });

  it("offers exactly those eight on the leaderboard, Classic first", () => {
    const ids = getGameModeConfig("nokiacricket").modes.map((m) => m.modeId);
    expect(ids).toEqual([
      "classic_1", "classic_2", "classic_5", "classic_10",
      "chase_1", "chase_2", "chase_5", "chase_10",
    ]);
  });

  it("names each mode by its type and length so two modes never read alike", () => {
    const names = getGameModeConfig("nokiacricket").modes.map((m) => m.displayName);
    expect(names).toContain("Classic · 2 Overs Blitz");
    expect(names).toContain("Chase · 5 Overs Match");
  });
});

describe("the seeded leaderboard only seeds modes that exist", () => {
  it("seeds every registered mode, and nothing the registry does not list", () => {
    const service = new ScorecardService();
    service.seedInitialLeaderboards();
    const bots = ["bot_lounge_champ", "bot_retro_master", "bot_gully_legend"];
    const seeded = new Map<string, Set<string>>();
    for (const bot of bots) {
      for (const [game, card] of Object.entries(service.getScorecards(bot).games)) {
        const set = seeded.get(game) ?? new Set<string>();
        for (const modeId of Object.keys(card?.modes ?? {})) set.add(modeId);
        seeded.set(game, set);
      }
    }
    for (const [game, cfg] of Object.entries(GAME_MODE_REGISTRY)) {
      const registered = cfg.modes.map((m) => m.modeId).sort();
      expect([...(seeded.get(game) ?? [])].sort(), `${game} seeds`).toEqual(registered);
    }
    for (const game of seeded.keys()) expect(Object.keys(GAME_MODE_REGISTRY), `${game} seeded but unregistered`).toContain(game);
  });
});

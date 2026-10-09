import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, GameKind, Player, RoomPublicState, ServerToClientEvents } from "@shared/types.js";
import { sanitizePublicPresentation } from "@shared/cosmetics.js";
import { BOT_HOMETOWNS, BOT_TAGLINES_BY_GAME, buildBotProfile, pickBotCosmetics } from "@shared/bot-profile.js";
import { RoomManager } from "../RoomManager.js";

/** Same fake Socket.IO harness as botAvatar.test.ts. */
function makeFakeIO() {
  const emitted: Array<{ socketId?: string; room?: string; event: string; payload: unknown }> = [];
  const sockets = new Map<string, { id: string; join: () => void; emit: (event: string, payload: unknown) => void }>();

  function addSocket(id: string) {
    sockets.set(id, {
      id,
      join: () => {},
      emit: (event: string, payload: unknown) => emitted.push({ socketId: id, event, payload }),
    });
  }

  const io = {
    sockets: { sockets },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, addSocket, emitted };
}

const GAMES = Object.keys(BOT_TAGLINES_BY_GAME) as GameKind[];
const NAMES = ["Sachin", "Pintu", "Anand", "Lakshmi", "Gabbar", "Teacher Padma", "Pencil", "NEXUS-9", "Rider", "Kanakam", "Vishy", "Stacker"];

describe("buildBotProfile", () => {
  it("is the same for the same game, name and level, every time", () => {
    expect(buildBotProfile("ludo", "Pintu", { level: 5 })).toEqual(buildBotProfile("ludo", "Pintu", { level: 5 }));
  });

  it("has a tagline and a hometown from the fixed lists, for every game", () => {
    for (const game of GAMES) {
      const profile = buildBotProfile(game, "Sachin", { level: 4 });
      expect(BOT_TAGLINES_BY_GAME[game]).toContain(profile.tagline);
      expect(BOT_HOMETOWNS).toContain(profile.hometown);
    }
  });

  it("covers every game the bot names cover, with a pool big enough to vary", () => {
    for (const game of GAMES) expect(BOT_TAGLINES_BY_GAME[game].length).toBeGreaterThanOrEqual(5);
  });

  it("gives different bots different personalities", () => {
    const taglines = new Set(NAMES.map((n) => buildBotProfile("ludo", n, { level: 4 }).tagline));
    const towns = new Set(NAMES.map((n) => buildBotProfile("ludo", n, { level: 4 }).hometown));

    expect(taglines.size).toBeGreaterThanOrEqual(3);
    expect(towns.size).toBeGreaterThanOrEqual(4);
  });

  it("keeps every tagline short enough for a phone seat", () => {
    for (const game of GAMES) for (const t of BOT_TAGLINES_BY_GAME[game]) expect(t.length).toBeLessThanOrEqual(44);
  });

  it("keeps the simulated record plausible and internally consistent", () => {
    for (const name of NAMES) {
      for (const level of [2, 5, 9]) {
        const { stats } = buildBotProfile("rummy", name, { level });
        expect(stats.matches).toBeGreaterThan(0);
        expect(stats.wins).toBeGreaterThanOrEqual(0);
        expect(stats.wins).toBeLessThanOrEqual(stats.matches);
        expect(stats.bestStreak).toBeLessThanOrEqual(stats.wins);
        const rate = stats.wins / stats.matches;
        expect(rate).toBeGreaterThanOrEqual(0.3);
        expect(rate).toBeLessThanOrEqual(0.7);
      }
    }
  });

  it("gives a higher level a longer record", () => {
    const low = buildBotProfile("uno", "Sultan", { level: 2 }).stats.matches;
    const high = buildBotProfile("uno", "Sultan", { level: 9 }).stats.matches;

    expect(high).toBeGreaterThan(low);
  });

  describe("play style", () => {
    it("is the real difficulty in bingo, where the seat carries one", () => {
      expect(buildBotProfile("bingo", "Padma", { level: 4, difficulty: "easy" })).toMatchObject({ playStyle: "Casual", styleIsReal: true });
      expect(buildBotProfile("bingo", "Padma", { level: 4, difficulty: "medium" })).toMatchObject({ playStyle: "Balanced", styleIsReal: true });
      expect(buildBotProfile("bingo", "Padma", { level: 4, difficulty: "hard" })).toMatchObject({ playStyle: "Sharp", styleIsReal: true });
    });

    it("is only a persona, and says so, in a game whose bots have no difficulty setting", () => {
      for (const name of NAMES) {
        const profile = buildBotProfile("ludo", name, { level: 4, difficulty: "hard" });
        expect(profile.styleIsReal).toBe(false);
        expect(["Cautious", "Balanced", "Daring"]).toContain(profile.playStyle);
      }
    });
  });
});

describe("pickBotCosmetics", () => {
  it("only ever picks things the catalogue knows", () => {
    for (const game of GAMES) {
      for (const name of NAMES) {
        const picked = pickBotCosmetics(game, name);
        expect(sanitizePublicPresentation(picked)).toEqual(picked);
      }
    }
  });

  it("gives every bot an aura and a title", () => {
    for (const game of GAMES) {
      const picked = pickBotCosmetics(game, "Sachin");
      expect(picked.avatarAura).toBeTruthy();
      expect(picked.podiumTitle).toBeTruthy();
    }
  });

  it("only gives a token skin where the game has tokens, and dice where it has dice", () => {
    expect(pickBotCosmetics("ludo", "Pintu").tokenSkin).toBeTruthy();
    expect(pickBotCosmetics("ludo", "Pintu").diceSkin).toBeTruthy();
    expect(pickBotCosmetics("rummy", "Anand").tokenSkin).toBeUndefined();
    expect(pickBotCosmetics("rummy", "Anand").diceSkin).toBeUndefined();
  });

  it("is stable for the same game and name", () => {
    expect(pickBotCosmetics("ludo", "Pintu")).toEqual(pickBotCosmetics("ludo", "Pintu"));
  });
});

describe("RoomManager — bot profiles", () => {
  const latestState = (emitted: ReturnType<typeof makeFakeIO>["emitted"], code: string) =>
    [...emitted].reverse().find((e) => e.event === "room:state" && e.room === code)?.payload as RoomPublicState;

  it.each<GameKind>(["rummy", "ludo", "handcricket", "uno", "chess", "bingo"])(
    "addBot gives the %s bot a profile and cosmetics that reach every client",
    (game) => {
      const { io, addSocket, emitted } = makeFakeIO();
      addSocket("s0");
      const rooms = new RoomManager(io);

      const { code } = rooms.createRoom("s0", "Anand", game);
      rooms.addBot("s0", "Sachin");

      const bot = latestState(emitted, code).players.find((p) => p.isBot) as Player;
      // A bingo bot added with no stated difficulty really plays on "medium", and its profile says so.
      expect(bot.botProfile).toEqual(buildBotProfile(game, "Sachin", { level: bot.level, difficulty: "medium" }));
      expect(bot.cosmetics).toEqual(pickBotCosmetics(game, "Sachin"));
    },
  );

  it("never gives a human seat a bot profile", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "ludo");
    rooms.addBot("s0", "Pintu");

    const human = latestState(emitted, code).players.find((p) => !p.isBot) as Player;
    expect(human.botProfile).toBeUndefined();
  });

  it("carries the bingo difficulty the host picked into the play style", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "bingo");
    rooms.addBot("s0", "Padma", "hard");

    const bot = latestState(emitted, code).players.find((p) => p.isBot) as Player;
    expect(bot.botProfile).toMatchObject({ playStyle: "Sharp", styleIsReal: true });
  });

  it("renameBot gives the renamed bot the profile of its new name", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "uno");
    rooms.addBot("s0", "Jugadu");
    const botId = (latestState(emitted, code).players.find((p) => p.isBot) as Player).id;

    rooms.renameBot("s0", botId, "Sultan");

    const renamed = latestState(emitted, code).players.find((p) => p.id === botId) as Player;
    expect(renamed.botProfile).toEqual(buildBotProfile("uno", "Sultan", { level: renamed.level }));
    expect(renamed.cosmetics).toEqual(pickBotCosmetics("uno", "Sultan"));
  });
});

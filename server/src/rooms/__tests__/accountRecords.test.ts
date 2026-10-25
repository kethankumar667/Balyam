import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { createEngine } from "../../games/registry.js";
import { scorecardService } from "../../profile/ScorecardService.js";
import { readPersistedScorecards } from "../../profile/scorecardPersistence.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { recentPlayersService } from "../../ranking/RecentPlayersService.js";
import { InMemoryProgressionRepository, setProgressionRepository } from "../../persistence/index.js";
import type { ClientToServerEvents, HcGameOptions, ServerToClientEvents } from "@shared/types.js";

let sequence = 0;
beforeEach(async () => {
  await progressionSync.drain();
  setProgressionRepository(new InMemoryProgressionRepository());
});
afterEach(async () => {
  await progressionSync.drain();
  setProgressionRepository(null);
  recentPlayersService.reset();
  vi.restoreAllMocks();
});

function table(game: "handcricket" | "rummy", options: object, account: string, versusBot: boolean) {
  const io = {
    to: () => ({ emit() {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit() {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  const manager = new RoomManager(io);
  const args: unknown[] = ["record-socket", "Member", game, ...Array(manager.createRoom.length - 3).fill(undefined)];
  args[game === "handcricket" ? 6 : 5] = options;
  args[manager.createRoom.length - 3] = "member";
  args[manager.createRoom.length - 2] = account;
  const created = manager.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
  const room = (manager as unknown as { rooms: Map<string, Room> }).rooms.get(created.code)!;
  room.engine = createEngine(game);
  const host = [...room.players.values()][0]!;
  room.players.set("opponent", {
    ...host, id: "opponent", name: "Opponent", isBot: versusBot,
    identityId: versusBot ? undefined : `${account}-opponent`,
  });
  room.matchStartedAt = Date.now() - 120000 - sequence++;
  const record = async (state: Record<string, unknown>) => {
    vi.spyOn(room.engine!, "getPublicState").mockReturnValue(state);
    (manager as unknown as { recordPostMatchStats(room: Room): void }).recordPostMatchStats(room);
    await progressionSync.drain();
    scorecardService.deleteScorecards(account);
    return readPersistedScorecards(account);
  };
  return { room, host, record };
}

describe("finished rooms project account-based personal records", () => {
  it("records recent opponents under persistent owners for profile and frame lookups", async () => {
    const account = `recent-owners-${sequence++}`;
    const { host, record } = table("handcricket", { mode: "single", format: "t20" }, account, false);
    const recent = vi.spyOn(recentPlayersService, "recordMatch");
    await record({ winnerId: host.id });
    expect(recent).toHaveBeenCalledWith(expect.objectContaining({
      participants: expect.arrayContaining([
        expect.objectContaining({ playerId: account }),
        expect.objectContaining({ playerId: `${account}-opponent` }),
      ]),
    }));
    expect(recentPlayersService.getRecentPlayers(account)).toEqual([
      expect.objectContaining({ playerId: `${account}-opponent` }),
    ]);
    expect(recentPlayersService.getRecentPlayers(host.id)).toEqual([]);
  });

  it.each([
    [{ mode: "single", category: "international", format: "t20" }, "international_t20"],
    [{ mode: "single", category: "international", format: "odi" }, "international_odi"],
    [{ mode: "single", category: "international", format: "test" }, "international_test"],
    [{ mode: "single", category: "ipl", format: "t20" }, "franchise_t20"],
    [{ mode: "single", category: "ipl", format: "odi" }, "franchise_odi"],
    [{ mode: "single", category: "ipl", format: "test" }, "franchise_test"],
    [{ mode: "galli", galliOvers: 3 }, "galli_quick"],
    [{ mode: "galli", galliOvers: 8 }, "galli_standard"],
    [{ mode: "galli", galliOvers: 15 }, "galli_long"],
  ] as const)("files an entire Hand Cricket innings under its real format: %s", async (options, modeId) => {
    const account = `cricket-${modeId}-${sequence++}`;
    const { host, record } = table("handcricket", options satisfies Partial<HcGameOptions>, account, true);
    const archive = await record({
      winnerId: "opponent",
      innings1: { battingPlayerId: host.id, runs: 140, balls: 60, batterStats: { squadA: { runs: 90 }, squadB: { runs: 50 } } },
      innings2: { battingPlayerId: "opponent", runs: 145, balls: 60, batterStats: {} },
    });
    expect(archive.games.handcricket?.modes[modeId]).toMatchObject({ bestScore: 140, bestContext: "VS_BOTS" });
    expect(Object.keys(archive.games.handcricket!.modes)).toEqual([modeId]);
  });

  it.each([true, false])("retains the best cricket innings after lower and higher results (bot=%s)", async (versusBot) => {
    const account = `cricket-best-${sequence++}`;
    for (const score of [140, 100, 180]) {
      const { host, record } = table("handcricket", { mode: "single", format: "t20" }, account, versusBot);
      await record({ winnerId: host.id, innings1: { battingPlayerId: host.id, runs: score, balls: 60, batterStats: {} } });
    }
    expect((await readPersistedScorecards(account)).games.handcricket?.modes.international_t20)
      .toMatchObject({ bestScore: 180, timesPlayed: 3, bestContext: versusBot ? "VS_BOTS" : "PVP_MULTIPLAYER" });
  });

  it("never lets one category's score overwrite the same account's other category", async () => {
    const account = `cricket-categories-${sequence++}`;
    for (const [category, score] of [["international", 140], ["ipl", 180]] as const) {
      const { host, record } = table("handcricket", { mode: "single", format: "t20", category }, account, true);
      await record({ winnerId: host.id, innings1: { battingPlayerId: host.id, runs: score, balls: 60, batterStats: {} } });
    }
    const modes = (await readPersistedScorecards(account)).games.handcricket!.modes;
    expect(modes.international_t20?.bestScore).toBe(140);
    expect(modes.franchise_t20?.bestScore).toBe(180);
  });

  it.each(["single", "pool101", "pool201"])("keeps only greatest winning-round points for %s", async (mode) => {
    const account = `rummy-${mode}-${sequence++}`;
    for (const [won, score] of [[true, 75], [false, 80], [true, 40], [true, 120]] as const) {
      const { host, record } = table("rummy", { mode }, account, false);
      await record({
        phase: "finished", matchMode: mode, matchOver: true, winnerId: won ? host.id : "opponent",
        matchWinnerId: won ? host.id : "opponent", playerOrder: [host.id, "opponent"],
        scores: won ? { [host.id]: 0, opponent: score } : { [host.id]: score, opponent: 0 },
        cumulativeScores: { [host.id]: 250, opponent: 350 },
      });
    }
    expect((await readPersistedScorecards(account)).games.rummy?.modes[mode])
      .toMatchObject({ bestScore: 120, timesPlayed: 3, scoringDirection: "HIGHER_IS_BETTER" });
  });
});

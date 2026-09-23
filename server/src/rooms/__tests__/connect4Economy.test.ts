import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { findFullBoardSequence } from "../../games/connect4/__tests__/connect4TestUtils.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * Real coins ride on this game, so the money paths are proven through the real RoomManager and the
 * in-memory economy: two signed-in members at a 100-coin table, from a 5 000 balance.
 *   host or joiner wins -> winner 5 060 (80% of the 200 pot), loser 4 900
 *   draw                -> both back to 5 000 (REFUNDED)
 *   a player leaves     -> the opponent is paid
 * and each credit lands within moments of the last move, exactly once.
 */

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";
const STAKE_BALANCE = "5000";
const WINNER_BALANCE = "5060";
const LOSER_BALANCE = "4900";

function makeIo() {
  return {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}
const peek = (rooms: RoomManager, code: string): Room => (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;

function createRoomAs(rooms: RoomManager, socketId: string, name: string, game: GameKind, hostKind: AccountKind, identityId: string | null) {
  // Derived from the signature so a new per-game options parameter never shifts the trailing arguments.
  const optionsCount = rooms.createRoom.length - 3 - 4;
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

async function startPaidMatch() {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  for (const id of [MEMBER_A, MEMBER_B]) {
    repo.testFixture.seedWallet({ identityId: id, identityKind: "member", balance: STAKE_BALANCE, lifetimeGranted: STAKE_BALANCE, starterGranted: true });
  }
  const rooms = new RoomManager(makeIo(), service);
  rooms.startEconomyRecovery(); // exactly what index.ts does in production
  const host = createRoomAs(rooms, "s_a", "Alice", "connect4", "member", MEMBER_A);
  const joined = rooms.joinRoom("s_b", "Bob", host.code, undefined, undefined, undefined, "member", MEMBER_B);
  expect(joined.ok).toBe(true);
  rooms.setReady("s_a", true);
  rooms.setReady("s_b", true);
  await rooms.requestGameStart("s_a");
  const room = peek(rooms, host.code);
  const attempt = room.activeStartAttempt;
  if (attempt) {
    for (const [sId, pId] of room.socketToPlayer.entries()) {
      if (attempt.requiredHumanPlayerIds.has(pId)) {
        await rooms.acknowledgeStart(sId, { startAttemptId: attempt.id, roomRevision: attempt.roomRevision, visible: true, orientationSatisfied: true });
      }
    }
  }
  expect(room.phase).toBe("playing");
  return { rooms, room, service, matchId: room.currentMatchId! };
}

/** Alice (s_a) moves first; the two alternate. */
async function play(rooms: RoomManager, columns: readonly number[]) {
  for (let i = 0; i < columns.length; i++) {
    await rooms.applyMove(i % 2 === 0 ? "s_a" : "s_b", "drop", { column: columns[i] });
  }
}

const ALICE_WINS = [0, 0, 1, 1, 2, 2, 3];
const BOB_WINS = [5, 0, 6, 0, 5, 0, 6, 0];

describe("paid Connect 4 match — two signed-in members, 100-coin stake", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const balances = async (service: EconomyService) => ({
    a: (await service.getWallet(MEMBER_A)).balance,
    b: (await service.getWallet(MEMBER_B)).balance,
  });

  it("debits both players when the match starts", async () => {
    const { service } = await startPaidMatch();
    expect(await balances(service)).toEqual({ a: LOSER_BALANCE, b: LOSER_BALANCE });
  });

  it.each([
    ["the host", ALICE_WINS, { a: WINNER_BALANCE, b: LOSER_BALANCE }],
    ["the joining player", BOB_WINS, { a: LOSER_BALANCE, b: WINNER_BALANCE }],
  ] as const)("credits %s the winning amount within moments of the last disc, not on the next 5 s sweep", async (_who, moves, expected) => {
    const { rooms, room, service, matchId } = await startPaidMatch();
    await play(rooms, moves);
    expect(room.engine!.isOver()).toBe(true);

    await vi.advanceTimersByTimeAsync(100); // far less than the 5 000 ms periodic sweep
    expect(await balances(service)).toEqual(expected);
    expect((await service.getSettlement(matchId))?.status).toBe("SETTLED");
  });

  it("refunds both players in full when the board fills with no four-in-a-row", async () => {
    const { rooms, room, service, matchId } = await startPaidMatch();
    await play(rooms, findFullBoardSequence("draw")!);
    expect((room.engine!.getPublicState() as unknown as { isDraw: boolean }).isDraw).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    expect(await balances(service)).toEqual({ a: STAKE_BALANCE, b: STAKE_BALANCE });
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
  });

  it("pays the opponent when a player leaves mid-match", async () => {
    const { rooms, room, service, matchId } = await startPaidMatch();
    await rooms.applyMove("s_a", "drop", { column: 3 });
    await rooms.leaveRoom("s_a"); // the host walks away: Bob is the last one standing
    expect(room.engine!.isOver()).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    expect((await service.getWallet(MEMBER_B)).balance).toBe(WINNER_BALANCE);
    expect((await service.getWallet(MEMBER_A)).balance).toBe(LOSER_BALANCE);
    expect((await service.getSettlement(matchId))?.status).toBe("SETTLED");
  });

  it("settles exactly once even when the periodic sweep fires many times afterwards", async () => {
    const { rooms, service } = await startPaidMatch();
    await play(rooms, ALICE_WINS);
    await vi.advanceTimersByTimeAsync(20_000); // several periodic sweeps after the kick
    expect(await balances(service)).toEqual({ a: WINNER_BALANCE, b: LOSER_BALANCE }); // not 5 220: no double payout
  });

  it("leaves each paying player a `match` ledger row for the match id, so both may read their settlement", async () => {
    const { rooms, service, matchId } = await startPaidMatch();
    await play(rooms, BOB_WINS);
    await vi.advanceTimersByTimeAsync(100);
    const hasMatchRow = async (identityId: string) =>
      (await service.getLedger(identityId, { limit: 100, offset: 0 })).some((e) => e.sourceKind === "match" && e.sourceId === matchId);
    expect(await hasMatchRow(MEMBER_A)).toBe(true);
    expect(await hasMatchRow(MEMBER_B)).toBe(true);
  });
});

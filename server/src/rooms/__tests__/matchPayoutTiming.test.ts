import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * A finished paid match must credit the winner promptly — not on the next
 * 5-second recovery sweep. Reported live: two signed-in members finished a Dots &
 * Boxes match, both had been debited, and the winner's wallet still showed the
 * debited balance. The ledger itself was always right (the winner ends at
 * +160 on a 100-coin table); the credit simply waited for the periodic timer,
 * and nothing told the winner when it landed.
 */

const MEMBER_A = "aaaaaaaa-1111-2222-3333-444444444444";
const MEMBER_B = "bbbbbbbb-1111-2222-3333-444444444444";
const STRANGER = "dddddddd-1111-2222-3333-444444444444";
const STAKE_BALANCE = "5000";

function makeIo() {
  return {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}
const peek = (rooms: RoomManager, code: string): Room => (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;

function createRoomAs(rooms: RoomManager, socketId: string, name: string, game: GameKind, hostKind: AccountKind, identityId: string | null) {
  const optionsCount = rooms.createRoom.length - 3 - 4;
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

const MEMBER_C = "cccccccc-1111-2222-3333-444444444444";

async function startPaidMatch(withThirdMember = false) {
  const repo = new InMemoryEconomyRepository();
  const service = new EconomyService(repo, { delay: async () => undefined });
  for (const id of [MEMBER_A, MEMBER_B, MEMBER_C, STRANGER]) {
    repo.testFixture.seedWallet({ identityId: id, identityKind: "member", balance: STAKE_BALANCE, lifetimeGranted: STAKE_BALANCE, starterGranted: true });
  }
  const rooms = new RoomManager(makeIo(), service);
  rooms.startEconomyRecovery(); // exactly what index.ts does in production
  const host = createRoomAs(rooms, "s_a", "Alice", "dotsboxes", "member", MEMBER_A);
  const joined = rooms.joinRoom("s_b", "Bob", host.code, undefined, undefined, undefined, "member", MEMBER_B);
  expect(joined.ok).toBe(true);
  let thirdPlayerId = "";
  if (withThirdMember) {
    const third = rooms.joinRoom("s_c", "Cleo", host.code, undefined, undefined, undefined, "member", MEMBER_C);
    expect(third.ok).toBe(true);
    thirdPlayerId = (third as { playerId: string }).playerId;
    rooms.setReady("s_c", true);
  }
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
  const guestPlayerId = (joined as { playerId: string }).playerId;
  return { rooms, room, service, hostId: host.playerId, joinerId: guestPlayerId, thirdId: thirdPlayerId, matchId: room.currentMatchId! };
}

/** Plays Dots & Boxes through the real applyMove path; `strategy` deterministically decides who wins. */
async function playToTheEnd(rooms: RoomManager, room: Room, socketOf: Record<string, string>, strategy: number) {
  for (let guard = 0; guard < 400 && !room.engine!.isOver(); guard++) {
    const s = room.engine!.getPublicState() as unknown as {
      options: { boardSize: number };
      hLines: { kind: string; r: number; c: number }[];
      vLines: { kind: string; r: number; c: number }[];
      turnPlayerId: string;
    };
    const size = s.options.boardSize;
    const drawn = new Set([...s.hLines, ...s.vLines].map((l) => `${l.kind}${l.r}_${l.c}`));
    const lines: { kind: "h" | "v"; r: number; c: number }[] = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size - 1; c++) if (!drawn.has(`h${r}_${c}`)) lines.push({ kind: "h", r, c });
    for (let r = 0; r < size - 1; r++) for (let c = 0; c < size; c++) if (!drawn.has(`v${r}_${c}`)) lines.push({ kind: "v", r, c });
    await rooms.applyMove(socketOf[s.turnPlayerId]!, "draw", lines[(guard * strategy) % lines.length]!);
  }
  expect(room.engine!.isOver()).toBe(true);
}

// Strategies chosen for a deterministic outcome on the default board: 5 -> host wins, 7 -> joiner wins, 1 -> tie.
const HOST_WINS = 5;
const JOINER_WINS = 7;
const TIE = 1;

describe("paid match payout timing — Dots & Boxes, two signed-in members", () => {
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

  it.each([
    ["the host", HOST_WINS, { a: "5060", b: "4900" }],
    ["the joining player", JOINER_WINS, { a: "4900", b: "5060" }],
  ] as const)("credits %s the winning amount within moments of the final line, not on the next 5 s sweep", async (_who, strategy, expected) => {
    const { rooms, room, service, hostId, joinerId, matchId } = await startPaidMatch();
    expect(await balances(service)).toEqual({ a: "4900", b: "4900" }); // both staked at creation

    await playToTheEnd(rooms, room, { [hostId]: "s_a", [joinerId]: "s_b" }, strategy);
    const winner = (room.engine!.getPublicState() as unknown as { winnerId: string | null }).winnerId;
    expect(winner).toBe(strategy === HOST_WINS ? hostId : joinerId);

    await vi.advanceTimersByTimeAsync(100); // far less than the 5 000 ms periodic sweep
    expect(await balances(service)).toEqual(expected);
    expect((await service.getSettlement(matchId))?.status).toBe("SETTLED");
  });

  it("refunds both players promptly when the match is a tie", async () => {
    const { rooms, room, service, hostId, joinerId, matchId } = await startPaidMatch();
    await playToTheEnd(rooms, room, { [hostId]: "s_a", [joinerId]: "s_b" }, TIE);
    expect((room.engine!.getPublicState() as unknown as { winnerId: string | null }).winnerId).toBeNull();

    await vi.advanceTimersByTimeAsync(100);
    expect(await balances(service)).toEqual({ a: STAKE_BALANCE, b: STAKE_BALANCE });
    expect((await service.getSettlement(matchId))?.status).toBe("REFUNDED");
  });

  it("leaves each paying player a `match` ledger row for the match id — the evidence the settlement endpoint accepts for a non-host", async () => {
    const { rooms, room, service, hostId, joinerId, matchId } = await startPaidMatch();
    await playToTheEnd(rooms, room, { [hostId]: "s_a", [joinerId]: "s_b" }, JOINER_WINS);
    await vi.advanceTimersByTimeAsync(100);

    const hasMatchRow = async (identityId: string) =>
      (await service.getLedger(identityId, { limit: 100, offset: 0 })).some((e) => e.sourceKind === "match" && e.sourceId === matchId);

    expect(await hasMatchRow(MEMBER_A)).toBe(true); // the host (loser)
    expect(await hasMatchRow(MEMBER_B)).toBe(true); // the JOINING winner — the player who used to get a 403
    expect(await hasMatchRow(STRANGER)).toBe(false); // someone who never played
  });

  // Three seats: 1st and 2nd are paid (5/8 and 3/8 of the 80% pool), 3rd gets nothing. Before score
  // ranking existed, every 3+ seat Dots & Boxes match was refunded even with a clear winner.
  it("pays 1st and 2nd — and nothing to 3rd — at a three-member table, or refunds everyone on a paid-place tie", async () => {
    const outcomes = new Set<string>();
    for (const strategy of [1, 2, 3, 5, 7, 11, 13]) {
      const { rooms, room, service, hostId, joinerId, thirdId, matchId } = await startPaidMatch(true);
      await playToTheEnd(rooms, room, { [hostId]: "s_a", [joinerId]: "s_b", [thirdId]: "s_c" }, strategy);
      const { scores } = room.engine!.getPublicState() as unknown as { scores: Record<string, number> };
      await vi.advanceTimersByTimeAsync(100);

      const all = { a: (await service.getWallet(MEMBER_A)).balance, b: (await service.getWallet(MEMBER_B)).balance, c: (await service.getWallet(MEMBER_C)).balance };
      const ranked = [hostId, joinerId, thirdId].sort((x, y) => scores[y]! - scores[x]!);
      const unambiguous = scores[ranked[0]!] !== scores[ranked[1]!] && scores[ranked[1]!] !== scores[ranked[2]!];
      const settlement = await service.getSettlement(matchId);

      if (!unambiguous) {
        expect(settlement?.status).toBe("REFUNDED");
        expect(all).toEqual({ a: STAKE_BALANCE, b: STAKE_BALANCE, c: STAKE_BALANCE });
        outcomes.add("refunded");
        continue;
      }
      expect(settlement?.status).toBe("SETTLED");
      const byPlayer: Record<string, string> = { [hostId]: all.a, [joinerId]: all.b, [thirdId]: all.c };
      expect(byPlayer[ranked[0]!]).toBe("5050"); // 5000 - 100 stake + 150 (5/8 of 240)
      expect(byPlayer[ranked[1]!]).toBe("4990"); // 5000 - 100 stake + 90  (3/8 of 240)
      expect(byPlayer[ranked[2]!]).toBe("4900"); // stake lost, nothing paid
      outcomes.add("settled");
    }
    expect(outcomes.has("settled")).toBe(true); // at least one strategy must exercise the paid path
  });

  it("still settles exactly once when the periodic sweep also fires", async () => {
    const { rooms, room, service, hostId, joinerId } = await startPaidMatch();
    await playToTheEnd(rooms, room, { [hostId]: "s_a", [joinerId]: "s_b" }, HOST_WINS);
    await vi.advanceTimersByTimeAsync(20_000); // several periodic sweeps after the kick
    expect(await balances(service)).toEqual({ a: "5060", b: "4900" }); // not 5220: no double payout
  });
});

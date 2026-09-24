import type { Server } from "socket.io";
import { RoomManager, type Room } from "../RoomManager.js";
import type { AccountKind, ClientToServerEvents, GameKind, ServerToClientEvents } from "@shared/types.js";

/**
 * The small harness room tests share: a room manager with a do-nothing socket
 * server, seats created with a verified `identityId`, and an RPS match played to
 * its end. It is the harness `terminalResolutionIdempotency.test.ts` established,
 * kept in one place so each new room test does not carry its own copy.
 */

export function makeIo(): Server<ClientToServerEvents, ServerToClientEvents> {
  return {
    to: () => ({ emit: () => undefined }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

export function peek(rooms: RoomManager, code: string): Room {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.get(code)!;
}

export function createRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  game: GameKind,
  hostKind: AccountKind,
  identityId: string | null,
) {
  const totalParams = rooms.createRoom.length;
  const optionsCount = totalParams - 3 - 4; // socketId,name,game lead; avatar,hostKind,identityId,entryStakeCoins trail
  const args: unknown[] = [socketId, name, game];
  for (let i = 0; i < optionsCount; i++) args.push(undefined);
  args.push(undefined, hostKind, identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

export function joinRoomAs(
  rooms: RoomManager,
  socketId: string,
  name: string,
  code: string,
  accountKind: AccountKind,
  identityId: string | null,
) {
  return rooms.joinRoom(socketId, name, code, undefined, undefined, undefined, accountKind, identityId);
}

/** RPS, forced outcome: the socket that always calls "rock" beats one that always calls "scissors", first to 10. */
export function playRpsToCompletion(rooms: RoomManager, winnerSocket: string, loserSocket: string): void {
  for (let round = 0; round < 10; round++) {
    rooms.applyMove(winnerSocket, "choose", { choice: "rock" });
    rooms.applyMove(loserSocket, "choose", { choice: "scissors" });
  }
}

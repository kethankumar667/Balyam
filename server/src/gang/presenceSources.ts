import type { Server } from "socket.io";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { GangPresenceSources } from "./GangService.js";

/**
 * The two live facts Gang presence is made from, read straight off the running server.
 *
 * "Connected" is a signed-in connection sitting in the person's own `user:<id>` room: the
 * room `gang:authenticate` puts every authenticated socket in, and the one the rest of
 * Gang already uses to reach someone anywhere in the app. "In a game" is a live seat in
 * a game that is under way, looked up by the verified account id — the same id a Gang
 * knows its members by.
 */
export function createPresenceSources(
  io: Pick<Server, "sockets">,
  rooms: Pick<RoomManager, "getActiveGamesByPlayer"> & Partial<Pick<RoomManager, "getWatchableRoomsByPlayer">>,
): GangPresenceSources {
  return {
    isConnected: (playerId) => (io.sockets.adapter.rooms.get(`user:${playerId}`)?.size ?? 0) > 0,
    activeGames: () => rooms.getActiveGamesByPlayer(),
    watchRooms: () => rooms.getWatchableRoomsByPlayer?.() ?? new Map<string, string>(),
  };
}

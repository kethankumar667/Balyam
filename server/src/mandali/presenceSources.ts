import type { Server } from "socket.io";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { MandaliPresenceSources } from "./MandaliService.js";

/**
 * The two live facts Mandali presence is made from, read straight off the running server.
 *
 * "Connected" is a signed-in connection sitting in the person's own `user:<id>` room: the
 * room `mandali:authenticate` puts every authenticated socket in, and the one the rest of
 * Mandali already uses to reach someone anywhere in the app. "In a game" is a live seat in
 * a game that is under way, looked up by the verified account id — the same id a Mandali
 * knows its members by.
 */
export function createPresenceSources(
  io: Pick<Server, "sockets">,
  rooms: Pick<RoomManager, "getActiveGamesByPlayer">,
): MandaliPresenceSources {
  return {
    isConnected: (playerId) => (io.sockets.adapter.rooms.get(`user:${playerId}`)?.size ?? 0) > 0,
    activeGames: () => rooms.getActiveGamesByPlayer(),
  };
}

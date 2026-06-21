import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import type { RoomManager } from "../rooms/RoomManager.js";

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  rooms: RoomManager
): void {
  socket.on("room:create", (payload, ack) => {
    try {
      const { code, playerId } = rooms.createRoom(
        socket.id,
        payload.name,
        payload.game,
        payload.playerId,
        payload.ludoOptions,
        payload.snlOptions,
        payload.rummyOptions,
        payload.hcOptions
      );
      ack({ ok: true, code, playerId });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to create room";
      ack({ ok: false, error });
    }
  });

  socket.on("room:join", (payload, ack) => {
    const result = rooms.joinRoom(socket.id, payload.name, payload.code, payload.playerId);
    if (!result.ok) {
      ack({ ok: false, error: result.error });
      return;
    }
    ack({ ok: true, playerId: result.playerId });
  });

  socket.on("room:leave", () => {
    rooms.leaveRoom(socket.id);
  });

  socket.on("room:setReady", (ready) => {
    rooms.setReady(socket.id, ready);
  });

  socket.on("room:addBot", () => {
    rooms.addBot(socket.id);
  });

  socket.on("room:removeBot", (botId) => {
    rooms.removeBot(socket.id, botId);
  });

  socket.on("room:chooseColor", (color) => {
    rooms.chooseColor(socket.id, color);
  });

  socket.on("room:chooseCoinColor", (color) => {
    rooms.chooseCoinColor(socket.id, color);
  });

  socket.on("room:setTokenNicknames", ({ nicknames }) => {
    rooms.setTokenNicknames(socket.id, nicknames);
  });

  socket.on("room:startGame", () => {
    rooms.startGame(socket.id);
  });

  socket.on("chat:send", ({ text }) => {
    rooms.sendChat(socket.id, text);
  });

  socket.on("game:move", ({ type, data, playerId }) => {
    rooms.applyMove(socket.id, type, data, playerId);
  });

  socket.on("room:addLocalPlayer", (name) => {
    rooms.addLocalPlayer(socket.id, name);
  });

  socket.on("room:removeLocalPlayer", (playerId) => {
    rooms.removeLocalPlayer(socket.id, playerId);
  });

  socket.on("webrtc:signal", ({ toPlayerId, signal }) => {
    rooms.relayWebRtcSignal(socket.id, toPlayerId, signal);
  });

  socket.on("room:reaction", ({ emoji }) => {
    rooms.sendReaction(socket.id, emoji);
  });

  socket.on("room:cursor", ({ x, y }) => {
    rooms.relayCursor(socket.id, x, y);
  });

  socket.on("rematch:request", () => {
    rooms.requestRematch(socket.id);
  });

  socket.on("rematch:respond", (response) => {
    rooms.respondRematch(socket.id, response);
  });

  // Rummy-specific: client streams the player's drag-and-drop arrangement
  // so the server can score the player's actual groups on round end —
  // keeping the live in-game points and the scorecard's points + decks
  // in lockstep. Payload is { groups: string[][] } where each group is
  // an ordered list of card ids; anything not listed is ungrouped.
  socket.on("rummy:arrangement", ({ groups }) => {
    rooms.setRummyArrangement(socket.id, groups);
  });
}

import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import { globalRateLimiter } from "../lib/rateLimiter.js";
import { logger } from "../lib/logger.js";

/**
 * Events that arrive WITHOUT a person doing anything — negotiation traffic and
 * device/lifecycle reports the client sends on its own.
 *
 * Everything else is treated as proof the player is at the keyboard, which is
 * what clears an idle takeover. Kept as a deny-list rather than an allow-list
 * on purpose: a new interactive event added later should count as presence by
 * default, and the failure mode of guessing wrong in that direction (one
 * wasted turn timer) is far cheaper than the other one (a player locked out of
 * their own seat).
 */
const MACHINE_EVENTS = new Set<string>([
  "webrtc:signal",
  "room:setOrientation",
  "rummy:arrangement",
]);

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  rooms: RoomManager
): void {
  // Runs before the specific handlers below, so even an event this file
  // rejects (an out-of-turn move, say) still registers as a sign of life.
  socket.onAny((event: string) => {
    // Check rate limit threshold per socket
    const { allowed } = globalRateLimiter.consume(socket.id);
    if (!allowed) {
      logger.warn({ message: `Rate limit exceeded for event ${event}`, socketId: socket.id, module: "RATE_LIMIT" });
      return;
    }

    if (MACHINE_EVENTS.has(event)) return;
    rooms.noteSocketActivity(socket.id);
  });

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
        payload.hcOptions,
        payload.wordBuildingOptions,
        payload.dotsBoxesOptions,
        payload.starGameOptions,
        payload.unoOptions,
        payload.bingoOptions,
        payload.namesplaceanimalOptions,
        payload.tambolaOptions,
        payload.samethaluOptions,
        payload.teluguCinemaluOptions,
        payload.snakeOptions,
        payload.spaceImpactOptions,
        payload.bounceOptions,
        payload.roadRashOptions
      );
      ack({ ok: true, code, playerId });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to create room";
      ack({ ok: false, error });
    }
  });

  socket.on("room:join", (payload, ack) => {
    try {
      const result = rooms.joinRoom(socket.id, payload.name, payload.code, payload.playerId);
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }
      ack({ ok: true, playerId: result.playerId });
    } catch (err) {
      // Without this, a thrown error here (e.g. a stale engine reference on
      // a room left mid-rematch-failure) never calls `ack` — the client has
      // no timeout of its own on this call, so it spins on "Connecting to
      // room" forever with no error and no escape. `room:create` already
      // guards the same way; this brings `room:join` in line with it.
      const error = err instanceof Error ? err.message : "Failed to join room";
      ack({ ok: false, error });
    }
  });

  socket.on("room:leave", () => {
    rooms.leaveRoom(socket.id);
  });

  socket.on("room:setReady", (ready) => {
    rooms.setReady(socket.id, ready);
  });

  socket.on("room:setOrientation", (needsRotation) => {
    rooms.setOrientation(socket.id, needsRotation);
  });

  socket.on("room:setName", (name) => {
    rooms.setRoomName(socket.id, name);
  });

  socket.on("room:addBot", (botName, difficulty) => {
    rooms.addBot(socket.id, botName, difficulty);
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

  // The `onAny` hook above already did the work; this exists so the event is
  // registered and type-checked rather than silently unhandled.
  socket.on("room:awake", () => {
    rooms.noteSocketActivity(socket.id);
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

  socket.on("room:reaction", ({ emoji, targetPlayerId }) => {
    rooms.sendReaction(socket.id, emoji, targetPlayerId);
  });

  socket.on("room:sound", ({ clipId, targetPlayerId }) => {
    rooms.sendSound(socket.id, clipId, targetPlayerId);
  });

  socket.on("coach:hint", (ack) => {
    if (typeof ack !== "function") return;
    rooms.requestHint(socket.id, ack);
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

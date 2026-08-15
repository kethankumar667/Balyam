import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import type { RoomManager } from "../rooms/RoomManager.js";
import { globalRateLimiter } from "../lib/rateLimiter.js";
import { logger } from "../lib/logger.js";
import { buildIceConfig } from "../lib/iceServers.js";
import { resolveAccountKind } from "../lib/supabaseAuth.js";

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
  "webrtc:iceConfig",
  "net:ping",
  "room:spectate",
  "room:stopSpectate",
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

  /**
   * Both room entry points resolve the account kind before touching the
   * RoomManager, which is why they are async where nothing else here is.
   *
   * The await is a signature check against the session — free in `jwt-secret`
   * mode, one cached HTTP call in `auth-api` mode, and skipped entirely when
   * verification is off. It sits ahead of `createRoom` rather than inside it
   * so the RoomManager keeps taking a settled `AccountKind` and its own tests
   * keep working without a token in sight.
   */
  socket.on("room:create", async (payload, ack) => {
    try {
      const hostKind = await resolveAccountKind(payload.hostKind, payload.accessToken);
      const { code, playerId, seatToken } = rooms.createRoom(
        socket.id,
        payload.name,
        payload.game,
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
        payload.snakeOptions,
        payload.carromOptions,
        payload.chessOptions,
        payload.blockBlastOptions,
        payload.spaceWarOptions,
        payload.avatar,
        hostKind
      );
      // `seatToken` goes to this socket's ack only — never into a broadcast.
      ack({ ok: true, code, playerId, seatToken });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to create room";
      ack({ ok: false, error });
    }
  });

  socket.on("room:join", async (payload, ack) => {
    try {
      const accountKind = await resolveAccountKind(payload.accountKind, payload.accessToken);
      const result = rooms.joinRoom(
        socket.id,
        payload.name,
        payload.code,
        payload.playerId,
        payload.seatToken,
        payload.avatar,
        accountKind
      );
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }
      ack({ ok: true, playerId: result.playerId, seatToken: result.seatToken });
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

  socket.on("room:spectate", (code, ack) => {
    const res = rooms.spectateRoom(socket.id, typeof code === "string" ? code : "");
    if (typeof ack === "function") ack(res);
  });

  socket.on("room:stopSpectate", () => {
    rooms.stopSpectating(socket.id);
  });

  socket.on("net:ping", (ack) => {
    if (typeof ack === "function") ack();
  });

  socket.on("webrtc:iceConfig", (ack) => {
    if (typeof ack !== "function") return;
    // Socket id is enough of an identity: it is stable for the connection and
    // makes relay logs traceable without exposing anything about the player.
    ack(buildIceConfig(socket.id));
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

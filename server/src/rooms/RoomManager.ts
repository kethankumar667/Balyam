import type { Server } from "socket.io";
import type {
  ChatMessage,
  ClientToServerEvents,
  CoinColor,
  GameKind,
  HcGameOptions,
  LudoColor,
  LudoGameOptions,
  Player,
  RoomPublicState,
  RummyGameOptions,
  ServerToClientEvents,
  SnlGameOptions,
  WebRTCSignal,
} from "@shared/types.js";
import {
  COIN_COLORS,
  DEFAULT_HC_OPTIONS,
  DEFAULT_LUDO_OPTIONS,
  DEFAULT_RUMMY_OPTIONS,
  DEFAULT_SNL_OPTIONS,
} from "@shared/types.js";
import { generateRoomCode } from "./codeGenerator.js";
import { createEngine, getGameLimits } from "../games/registry.js";
import type { GameEngine } from "../games/GameEngine.js";
import { LudoEngine } from "../games/ludo/LudoEngine.js";
import { SnlEngine } from "../games/snl/SnlEngine.js";
import { RummyEngine } from "../games/rummy/RummyEngine.js";
import { HandCricketEngine } from "../games/handcricket/HandCricketEngine.js";

const GRACE_PERIOD_MS = 90_000;

/**
 * Per-game bot name pools. Each pool draws from the cultural texture of
 * the game itself so a Hand Cricket bot reads like a cricket legend and
 * a Ludo bot reads like a neighbourhood kid you'd actually play with.
 *
 * Order matters — the first bot at the table gets index 0. Lists are sized
 * to comfortably cover the per-game max (Ludo 4, SnL 10, Rummy 6, others 2).
 */
const BOT_NAMES_BY_GAME: Record<GameKind, ReadonlyArray<string>> = {
  handcricket: ["Sachin", "Dhoni", "Kohli", "Yuvraj", "Sehwag", "Dravid"],
  ludo: ["Pintu", "Chintu", "Bunty", "Babli"],
  snl: ["Sneha", "Lalita", "Babu", "Chiklu", "Anu", "Gopi", "Ravi", "Suma", "Kiran", "Mounika"],
  rummy: ["Anand", "Babji", "Chinna", "Damodar", "Eswari", "Lakshmi"],
  rps: ["Rocky", "Bhola", "Chotu", "Dolly"],
  uno: ["Red", "Blue", "Green", "Yellow"],
};

function pickBotName(game: GameKind, idx: number): string {
  const pool = BOT_NAMES_BY_GAME[game];
  return pool[idx % pool.length] ?? `Bot ${idx + 1}`;
}

interface Room {
  code: string;
  game: GameKind;
  phase: "lobby" | "playing" | "finished";
  hostId: string;
  players: Map<string, Player>;
  socketToPlayer: Map<string, string>;
  engine: GameEngine | null;
  cleanupTimers: Map<string, NodeJS.Timeout>;
  turnTimer: NodeJS.Timeout | null;
  ludoOptions: LudoGameOptions;
  snlOptions: SnlGameOptions;
  rummyOptions: RummyGameOptions;
  hcOptions: HcGameOptions;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();

  constructor(private io: IO) {}

  private toPublicState(room: Room): RoomPublicState {
    const { min, max } = getGameLimits(room.game);
    return {
      code: room.code,
      game: room.game,
      phase: room.phase,
      players: Array.from(room.players.values()),
      hostId: room.hostId,
      maxPlayers: max,
    };
  }

  createRoom(
    socketId: string,
    name: string,
    game: GameKind,
    existingPlayerId?: string,
    ludoOptions?: Partial<LudoGameOptions>,
    snlOptions?: Partial<SnlGameOptions>,
    rummyOptions?: Partial<RummyGameOptions>,
    hcOptions?: Partial<HcGameOptions>
  ): { code: string; playerId: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const playerId = existingPlayerId ?? `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || "Player",
      isHost: true,
      isReady: false,
      isConnected: true,
    };

    const room: Room = {
      code,
      game,
      phase: "lobby",
      hostId: playerId,
      players: new Map([[playerId, player]]),
      socketToPlayer: new Map([[socketId, playerId]]),
      engine: null,
      cleanupTimers: new Map(),
      turnTimer: null,
      ludoOptions: { ...DEFAULT_LUDO_OPTIONS, ...(ludoOptions ?? {}) },
      snlOptions: { ...DEFAULT_SNL_OPTIONS, ...(snlOptions ?? {}) },
      rummyOptions: { ...DEFAULT_RUMMY_OPTIONS, ...(rummyOptions ?? {}) },
      hcOptions: { ...DEFAULT_HC_OPTIONS, ...(hcOptions ?? {}) },
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);

    const socket = this.io.sockets.sockets.get(socketId);
    socket?.join(code);

    this.broadcastRoomState(room);
    return { code, playerId };
  }

  joinRoom(
    socketId: string,
    name: string,
    code: string,
    existingPlayerId?: string
  ): { ok: true; playerId: string } | { ok: false; error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };

    if (existingPlayerId && room.players.has(existingPlayerId)) {
      const player = room.players.get(existingPlayerId)!;
      player.isConnected = true;
      delete player.awayUntil;
      const timer = room.cleanupTimers.get(existingPlayerId);
      if (timer) {
        clearTimeout(timer);
        room.cleanupTimers.delete(existingPlayerId);
      }
      room.socketToPlayer.set(socketId, existingPlayerId);
      this.socketToRoom.set(socketId, room.code);
      this.io.sockets.sockets.get(socketId)?.join(room.code);
      this.broadcastRoomState(room);
      if (room.engine) {
        const state = room.engine.getStateFor(existingPlayerId);
        this.io.sockets.sockets.get(socketId)?.emit("game:state", state);
      }
      return { ok: true, playerId: existingPlayerId };
    }

    const { max } = getGameLimits(room.game);
    if (room.players.size >= max) return { ok: false, error: "Room is full" };
    if (room.phase !== "lobby") return { ok: false, error: "Game already in progress" };

    const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || "Player",
      isHost: false,
      isReady: false,
      isConnected: true,
    };
    room.players.set(playerId, player);
    room.socketToPlayer.set(socketId, playerId);
    this.socketToRoom.set(socketId, room.code);
    this.io.sockets.sockets.get(socketId)?.join(room.code);

    this.broadcastRoomState(room);
    return { ok: true, playerId };
  }

  leaveRoom(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return;

    room.players.delete(playerId);
    room.socketToPlayer.delete(socketId);
    this.socketToRoom.delete(socketId);
    this.io.sockets.sockets.get(socketId)?.leave(code);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return;
    }

    if (room.hostId === playerId) {
      const next = room.players.values().next().value;
      if (next) {
        room.hostId = next.id;
        next.isHost = true;
      }
    }
    if (room.engine) room.engine.removePlayer(playerId);
    this.broadcastRoomState(room);
  }

  addBot(socketId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Only host can add bots");
      return;
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot add bots mid-game");
      return;
    }
    const { max } = getGameLimits(room.game);
    if (room.players.size >= max) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Room is full");
      return;
    }
    const botCount = [...room.players.values()].filter((p) => p.isBot).length;
    const botId = `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const botName = pickBotName(room.game, botCount);
    const bot: Player = {
      id: botId,
      name: botName,
      isHost: false,
      isReady: true,
      isConnected: true,
      isBot: true,
    };
    room.players.set(botId, bot);
    this.broadcastRoomState(room);
  }

  removeBot(socketId: string, botId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    if (room.phase !== "lobby") return;
    const target = room.players.get(botId);
    if (!target?.isBot) return;
    room.players.delete(botId);
    this.broadcastRoomState(room);
  }

  setReady(socketId: string, ready: boolean): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    player.isReady = ready;
    this.broadcastRoomState(room);
  }

  chooseColor(socketId: string, color: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.game !== "ludo") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Color is only chooseable for Ludo");
      return;
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot change color during game");
      return;
    }
    const validColors: string[] = [
      "red", "green", "yellow", "blue",
      "purple", "cyan", "orange", "brown",
    ];
    if (!validColors.includes(color)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Invalid color");
      return;
    }
    for (const other of room.players.values()) {
      if (other.id !== player.id && other.chosenColor === color) {
        this.io.sockets.sockets.get(socketId)?.emit("room:error", `${other.name} already picked ${color}`);
        return;
      }
    }
    player.chosenColor = color as LudoColor;
    this.broadcastRoomState(room);
  }

  chooseCoinColor(socketId: string, color: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.game !== "snl") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Coin color is only chooseable for Snakes & Ladders");
      return;
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot change color during game");
      return;
    }
    if (!(COIN_COLORS as readonly string[]).includes(color)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Invalid coin color");
      return;
    }
    for (const other of room.players.values()) {
      if (other.id !== player.id && other.coinColor === color) {
        this.io.sockets.sockets.get(socketId)?.emit("room:error", `${other.name} already picked ${color}`);
        return;
      }
    }
    player.coinColor = color as CoinColor;
    this.broadcastRoomState(room);
  }

  startGame(socketId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Only host can start");
      return;
    }
    const { min, max } = getGameLimits(room.game);
    const playersList = Array.from(room.players.values());
    if (playersList.length < min) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", `Need at least ${min} players`);
      return;
    }
    if (playersList.length > max) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", `Max ${max} players`);
      return;
    }
    if (!playersList.every((p) => p.isReady)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "All players must be ready");
      return;
    }
    try {
      const engine = createEngine(room.game);
      if (engine instanceof LudoEngine) {
        engine.setOptions(room.ludoOptions);
      }
      if (engine instanceof SnlEngine) {
        engine.setOptions(room.snlOptions);
      }
      if (engine instanceof RummyEngine) {
        engine.setOptions(room.rummyOptions);
      }
      if (engine instanceof HandCricketEngine) {
        engine.setOptions(room.hcOptions);
      }
      engine.init(playersList);
      room.engine = engine;
      room.phase = "playing";
      this.broadcastRoomState(room);
      this.broadcastGameState(room);
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      this.io.sockets.sockets.get(socketId)?.emit("room:error", msg);
    }
  }

  applyMove(socketId: string, type: string, data: unknown): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player || !room.engine) return;
    const result = room.engine.applyMove({ playerId: player.id, type, data });
    if (!result.ok) {
      this.io.sockets.sockets.get(socketId)?.emit("game:error", result.error ?? "Invalid move");
      return;
    }
    this.broadcastGameState(room);
    if (room.engine.isOver()) {
      room.phase = "finished";
      for (const p of room.players.values()) p.isReady = false;
      this.clearTurnTimer(room);
      this.broadcastRoomState(room);
    } else {
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    }
  }

  setTokenNicknames(socketId: string, nicknames: Record<string, string>): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(nicknames)) {
      if (typeof v !== "string") continue;
      const name = v.trim().slice(0, 16);
      if (name.length > 0 && k.length < 64) cleaned[k] = name;
    }
    player.tokenNicknames = cleaned;
    this.broadcastRoomState(room);
  }

  // ----- Turn timer -----

  /**
   * Generic bot scheduler. Works for any engine that implements both
   * `pendingActors()` and `applyAutoMove()` on the GameEngine interface.
   *
   * Algorithm:
   *   1. Ask the engine which players can act right now.
   *   2. Intersect with the bot roster.
   *   3. For each bot that needs to act, run `applyAutoMove` in a loop —
   *      one move at a time — until that bot is no longer pending (covers
   *      multi-step turns like Ludo roll-then-move) or the game ends.
   *   4. Broadcast, then recurse (so back-to-back bot turns chain).
   *
   * Adds a small delay so a human watching never sees bots flash through
   * their moves; gives the dice / cards a moment to animate.
   */
  private scheduleBotMoveIfNeeded(room: Room): void {
    if (room.phase !== "playing") return;
    const engine = room.engine;
    if (!engine) return;
    if (typeof engine.pendingActors !== "function") return;
    if (typeof engine.applyAutoMove !== "function") return;

    const pending = engine.pendingActors();
    const botActors = pending.filter((id) => room.players.get(id)?.isBot);
    if (botActors.length === 0) return;

    // If a human is also pending (e.g. RPS where both players choose
    // simultaneously), keep the human timer running. Otherwise pause it —
    // the bot owns this beat.
    const humansPending = pending.some((id) => !room.players.get(id)?.isBot);
    if (!humansPending) this.clearTurnTimer(room);

    const delayMs = 1200 + Math.random() * 600;
    setTimeout(() => {
      if (room.phase !== "playing") return;
      if (room.engine !== engine) return;

      const apply = engine.applyAutoMove;
      const actors = engine.pendingActors;
      if (typeof apply !== "function" || typeof actors !== "function") return;

      for (const botId of botActors) {
        // Bound the inner loop — multi-step turns shouldn't exceed a handful
        // of sub-moves. The cap is defensive against any bot getting stuck
        // looping forever on a degenerate engine state.
        for (let safety = 0; safety < 32; safety++) {
          if (engine.isOver()) break;
          const cur = actors.call(engine);
          if (!cur.includes(botId)) break;
          const res = apply.call(engine, botId);
          if (!res.ok) break;
        }
      }
      this.broadcastGameState(room);

      if (engine.isOver()) {
        room.phase = "finished";
        for (const p of room.players.values()) p.isReady = false;
        this.clearTurnTimer(room);
        this.broadcastRoomState(room);
        return;
      }
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    }, delayMs);
  }

  private clearTurnTimer(room: Room): void {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
  }

  private scheduleTurnTimer(room: Room): void {
    this.clearTurnTimer(room);
    if (room.phase !== "playing") return;
    if (room.engine instanceof LudoEngine) {
      const opts = room.ludoOptions;
      const ms = Math.max(5, opts.turnTimerSeconds) * 1000;
      room.engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    if (room.engine instanceof RummyEngine) {
      const pub = room.engine.getPublicState();
      // Don't schedule between rounds in pool mode (or in a finished single-round game).
      if (pub.phase !== "playing") {
        room.engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = Math.max(5, room.engine.getTurnTimerSeconds()) * 1000;
      room.engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
  }

  private onTurnTimeout(room: Room): void {
    if (room.phase !== "playing") return;
    if (room.engine instanceof LudoEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      const pid = state.turnPlayerId;
      if (state.turnPhase === "rolling") {
        engine.applyMove({ playerId: pid, type: "roll" });
      }
      const state2 = engine.getPublicState();
      if (state2.phase === "playing" && state2.turnPhase === "moving") {
        const tokenId = engine.pickAiMove(pid);
        if (tokenId) {
          engine.applyMove({ playerId: pid, type: "move", data: { tokenId } });
        }
      }
      this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof RummyEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      engine.applyAutoMove(state.turnPlayerId);
      this.afterAutoMove(room, engine.isOver());
      return;
    }
  }

  private afterAutoMove(room: Room, isOver: boolean): void {
    this.broadcastGameState(room);
    if (isOver) {
      room.phase = "finished";
      for (const p of room.players.values()) p.isReady = false;
      this.clearTurnTimer(room);
      this.broadcastRoomState(room);
      return;
    }
    this.scheduleTurnTimer(room);
    this.scheduleBotMoveIfNeeded(room);
  }

  sendReaction(socketId: string, emoji: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const ALLOWED = new Set([
      "👍", "😂", "😢", "🔥", "🎉", "💯", "😮", "👏",
      "🤔", "😭", "😡", "🙌", "💪", "🎯", "🤝", "💔",
    ]);
    if (!ALLOWED.has(emoji)) return;
    this.io.to(room.code).emit("room:reaction", {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: player.id,
      emoji,
      ts: Date.now(),
    });
  }

  relayCursor(socketId: string, x: number | null, y: number | null): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const payload = { fromPlayerId: player.id, x, y };
    // Send to others only (not back to sender) — small efficiency
    for (const [otherSocketId, pid] of room.socketToPlayer.entries()) {
      if (pid === player.id) continue;
      this.io.sockets.sockets.get(otherSocketId)?.emit("room:cursor", payload);
    }
  }

  relayWebRtcSignal(socketId: string, toPlayerId: string, signal: WebRTCSignal): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (!room.players.has(toPlayerId)) return;
    let targetSocketId: string | null = null;
    for (const [sid, pid] of room.socketToPlayer.entries()) {
      if (pid === toPlayerId) {
        targetSocketId = sid;
        break;
      }
    }
    if (!targetSocketId) return;
    this.io.sockets.sockets.get(targetSocketId)?.emit("webrtc:signal", {
      fromPlayerId: player.id,
      signal,
    });
  }

  sendChat(socketId: string, text: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerId: player.id,
      playerName: player.name,
      text: trimmed,
      ts: Date.now(),
    };
    this.io.to(room.code).emit("chat:message", msg);
  }

  handleDisconnect(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return;

    const player = room.players.get(playerId);
    if (player) {
      player.isConnected = false;
      player.awayUntil = Date.now() + GRACE_PERIOD_MS;
    }
    room.socketToPlayer.delete(socketId);
    this.socketToRoom.delete(socketId);

    const timer = setTimeout(() => {
      const stillRoom = this.rooms.get(code);
      if (!stillRoom) return;
      const stillPlayer = stillRoom.players.get(playerId);
      if (stillPlayer && !stillPlayer.isConnected) {
        stillRoom.players.delete(playerId);
        if (stillRoom.engine) stillRoom.engine.removePlayer(playerId);
        if (stillRoom.players.size === 0) {
          this.rooms.delete(code);
          return;
        }
        if (stillRoom.hostId === playerId) {
          const next = stillRoom.players.values().next().value;
          if (next) {
            stillRoom.hostId = next.id;
            next.isHost = true;
          }
        }
        this.broadcastRoomState(stillRoom);
        if (stillRoom.engine) this.broadcastGameState(stillRoom);
      }
      stillRoom.cleanupTimers.delete(playerId);
    }, GRACE_PERIOD_MS);

    room.cleanupTimers.set(playerId, timer);
    this.broadcastRoomState(room);
  }

  getRoomState(socketId: string): RoomPublicState | null {
    const { room } = this.lookup(socketId);
    return room ? this.toPublicState(room) : null;
  }

  private lookup(socketId: string): { room: Room | null; player: Player | null } {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { room: null, player: null };
    const room = this.rooms.get(code);
    if (!room) return { room: null, player: null };
    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return { room, player: null };
    return { room, player: room.players.get(playerId) ?? null };
  }

  private broadcastRoomState(room: Room): void {
    this.io.to(room.code).emit("room:state", this.toPublicState(room));
  }

  private broadcastGameState(room: Room): void {
    if (!room.engine) return;
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      const state = room.engine.getStateFor(playerId);
      this.io.sockets.sockets.get(socketId)?.emit("game:state", state);
    }
  }
}

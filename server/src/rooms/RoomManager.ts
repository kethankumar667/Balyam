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
  WordBuildingOptions,
  DotsBoxesOptions,
  MemoryMatchOptions,
} from "@shared/types.js";
import {
  COIN_COLORS,
  DEFAULT_HC_OPTIONS,
  DEFAULT_LUDO_OPTIONS,
  DEFAULT_RUMMY_OPTIONS,
  DEFAULT_SNL_OPTIONS,
  DEFAULT_WORDBUILDING_OPTIONS,
  DEFAULT_DOTSBOXES_OPTIONS,
  DEFAULT_MEMORYMATCH_OPTIONS,
} from "@shared/types.js";
import { generateRoomCode } from "./codeGenerator.js";
import { createEngine, getGameLimits } from "../games/registry.js";
import type { RematchState } from "@shared/types.js";
import type { GameEngine } from "../games/GameEngine.js";
import { LudoEngine } from "../games/ludo/LudoEngine.js";
import { SnlEngine } from "../games/snl/SnlEngine.js";
import { RummyEngine } from "../games/rummy/RummyEngine.js";
import { HandCricketEngine } from "../games/handcricket/HandCricketEngine.js";
import { WordBuildingEngine } from "../games/wordbuilding/WordBuildingEngine.js";
import { DotsBoxesEngine } from "../games/dotsboxes/DotsBoxesEngine.js";
import { MemoryMatchEngine } from "../games/memorymatch/MemoryMatchEngine.js";

const GRACE_PERIOD_MS = 90_000;
/** How long the host's rematch request stays open before auto-cancelling. */
const REMATCH_REQUEST_WINDOW_MS = 30_000;
/** Countdown shown to everyone after all responses are in before the new game auto-starts. */
const REMATCH_COUNTDOWN_MS = 3_000;

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
  wordbuilding: ["Teacher Padma", "Master Ravi", "Miss Lakshmi", "Sir Krishna"],
  dotsboxes: ["Pencil", "Eraser", "Sharpener", "Ruler"],
  memorymatch: ["Polaroid", "Kodak", "Snapshot", "Album"],
};

function pickBotName(game: GameKind, idx: number): string {
  const pool = BOT_NAMES_BY_GAME[game];
  return pool[idx % pool.length] ?? `Bot ${idx + 1}`;
}

const LUDO_COLOR_ORDER: ReadonlyArray<LudoColor> = [
  "red", "green", "yellow", "blue", "purple", "cyan", "orange", "brown",
];

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
  wordBuildingOptions: WordBuildingOptions;
  dotsBoxesOptions: DotsBoxesOptions;
  memoryMatchOptions: MemoryMatchOptions;
  /**
   * Memory Match's reveal-phase flip-back timer. After a non-matching
   * pair is flipped the engine enters REVEAL state with a deadline; we
   * schedule a setTimeout here to call `engine.resolveReveal()` then
   * broadcast. Separate from `turnTimer` so the two never collide.
   */
  memoryMatchRevealTimer: NodeJS.Timeout | null;
  /** Active rematch negotiation (or idle). Refer to the RematchState type. */
  rematch: RematchState;
  /** Timer that auto-cancels a pending rematch when the window expires. */
  rematchTimer: NodeJS.Timeout | null;
  /** Timer that auto-starts the new game once everyone accepts. */
  rematchStartTimer: NodeJS.Timeout | null;
}

function emptyRematchState(): RematchState {
  return {
    status: "idle",
    requesterId: null,
    responses: {},
    expiresAt: null,
    startsAt: null,
    declinedBy: null,
  };
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
    hcOptions?: Partial<HcGameOptions>,
    wordBuildingOptions?: Partial<WordBuildingOptions>,
    dotsBoxesOptions?: Partial<DotsBoxesOptions>,
    memoryMatchOptions?: Partial<MemoryMatchOptions>
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
      wordBuildingOptions: { ...DEFAULT_WORDBUILDING_OPTIONS, ...(wordBuildingOptions ?? {}) },
      dotsBoxesOptions: { ...DEFAULT_DOTSBOXES_OPTIONS, ...(dotsBoxesOptions ?? {}) },
      memoryMatchOptions: { ...DEFAULT_MEMORYMATCH_OPTIONS, ...(memoryMatchOptions ?? {}) },
      memoryMatchRevealTimer: null,
      rematch: emptyRematchState(),
      rematchTimer: null,
      rematchStartTimer: null,
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
      // Catch the rejoiner up on any rematch vote in progress so they don't
      // see a stale "Game Over" with no prompt.
      this.io.sockets.sockets.get(socketId)?.emit("rematch:state", room.rematch);
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
    // If the leaver was part of a pending rematch vote, cancel it —
    // proceeding would either deadlock (waiting on someone who's gone) or
    // start a game with a smaller table than the host requested.
    if (
      room.rematch.status === "pending" &&
      playerId in room.rematch.responses
    ) {
      this.cancelRematch(room, playerId);
    } else if (room.rematch.status === "accepted" && room.hostId !== playerId) {
      // Already counted-down; if a non-host leaves at the last second, the
      // start will still go through with current players.
    }
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

  /**
   * Pass & Play: host adds a local human seat. Unlike a bot, the seat will
   * NOT auto-move — it just waits its turn while the host's UI shows a
   * "pass the phone" overlay between turns. Local players are marked
   * isLocal=true and are always considered "ready" so the host can start
   * the game immediately without any other socket connecting.
   *
   * Supported only for open-information games (Ludo, Snakes & Ladders) where
   * sharing the screen between players is fair. Other games would expose
   * private hands to the wrong person on a shared device.
   */
  addLocalPlayer(socketId: string, name: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Only host can add local players");
      return;
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot add local players mid-game");
      return;
    }
    if (
      room.game !== "ludo" &&
      room.game !== "snl" &&
      room.game !== "wordbuilding" &&
      room.game !== "dotsboxes" &&
      room.game !== "memorymatch"
    ) {
      // Pass & Play is fair only for open-information games — everyone
      // looks at the same board state, no private hands. Word Building,
      // Dots & Boxes, and Memory Match all qualify (every card flip
      // is visible to everyone). Rummy / UNO etc. would leak hidden
      // information to the wrong player on a shared device.
      this.io.sockets.sockets.get(socketId)?.emit(
        "room:error",
        "Pass & Play is only available for Ludo, Snakes & Ladders, Word Building, Dots & Boxes, and Memory Match"
      );
      return;
    }
    const { max } = getGameLimits(room.game);
    if (room.players.size >= max) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Room is full");
      return;
    }
    const cleanName = name.trim().slice(0, 20) || `Player ${room.players.size + 1}`;
    const localId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const seat: Player = {
      id: localId,
      name: cleanName,
      isHost: false,
      isReady: true,
      isConnected: true,
      isLocal: true,
    };
    // Auto-assign a free color so the host doesn't have to pick separately
    // for each pass-and-play seat. The host's own color is still picked
    // through the normal lobby flow.
    if (room.game === "ludo") {
      const taken = new Set(
        [...room.players.values()].map((p) => p.chosenColor).filter(Boolean) as string[]
      );
      const free = LUDO_COLOR_ORDER.find((c) => !taken.has(c));
      if (free) seat.chosenColor = free;
    } else if (room.game === "snl") {
      const taken = new Set(
        [...room.players.values()].map((p) => p.coinColor).filter(Boolean) as string[]
      );
      const free = (COIN_COLORS as readonly string[]).find((c) => !taken.has(c));
      if (free) seat.coinColor = free as CoinColor;
    }
    room.players.set(localId, seat);
    this.broadcastRoomState(room);
  }

  removeLocalPlayer(socketId: string, localId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    if (room.phase !== "lobby") return;
    const target = room.players.get(localId);
    if (!target?.isLocal) return;
    room.players.delete(localId);
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
    // The standard Ludo board only paints four cardinal yards (red / green
    // / yellow / blue). Earlier this also accepted purple / cyan / orange /
    // brown, but those fell through to red's coordinates in board-layout,
    // so a player who picked one ended up with an invisible yard and four
    // tokens rendered under the red player's tokens. Lock the picker to
    // the four supported colors instead.
    const validColors: string[] = ["red", "green", "yellow", "blue"];
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
      if (engine instanceof WordBuildingEngine) {
        engine.setOptions(room.wordBuildingOptions);
      }
      if (engine instanceof DotsBoxesEngine) {
        engine.setOptions(room.dotsBoxesOptions);
      }
      if (engine instanceof MemoryMatchEngine) {
        engine.setOptions(room.memoryMatchOptions);
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

  applyMove(socketId: string, type: string, data: unknown, onBehalfOf?: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player || !room.engine) return;

    // Pass & Play: the host's socket can play moves for any local seat in
    // the room. Every other proxy attempt falls back to the caller's own id.
    let effectivePlayerId = player.id;
    if (onBehalfOf && onBehalfOf !== player.id) {
      const target = room.players.get(onBehalfOf);
      if (
        player.id === room.hostId &&
        target?.isLocal === true
      ) {
        effectivePlayerId = onBehalfOf;
      } else {
        this.io.sockets.sockets.get(socketId)?.emit(
          "game:error",
          "Not allowed to play for that seat"
        );
        return;
      }
    }

    const result = room.engine.applyMove({ playerId: effectivePlayerId, type, data });
    if (!result.ok) {
      this.io.sockets.sockets.get(socketId)?.emit("game:error", result.error ?? "Invalid move");
      return;
    }
    this.broadcastGameState(room);
    if (room.engine.isOver()) {
      room.phase = "finished";
      for (const p of room.players.values()) p.isReady = false;
      this.clearTurnTimer(room);
      this.clearMemoryMatchRevealTimer(room);
      this.broadcastRoomState(room);
    } else {
      // Memory Match: if the engine entered the REVEAL phase (a
      // non-matching pair is face-up), schedule the auto-flip-back here
      // instead of advancing the turn timer. The reveal timer fires
      // resolveReveal + a fresh broadcast + then schedules the next
      // turn / bot move.
      if (room.engine instanceof MemoryMatchEngine && room.engine.isRevealing()) {
        this.scheduleMemoryMatchReveal(room);
      } else {
        this.scheduleTurnTimer(room);
        this.scheduleBotMoveIfNeeded(room);
      }
    }
  }

  private clearMemoryMatchRevealTimer(room: Room): void {
    if (room.memoryMatchRevealTimer) {
      clearTimeout(room.memoryMatchRevealTimer);
      room.memoryMatchRevealTimer = null;
    }
  }

  /**
   * Memory Match — after a non-matching pair the engine is in `reveal`
   * phase with a wall-clock deadline. Schedule a setTimeout to flip the
   * cards back and resume play. Pause the turn timer while revealing
   * (the active player isn't waiting on a move during this beat).
   */
  private scheduleMemoryMatchReveal(room: Room): void {
    if (!(room.engine instanceof MemoryMatchEngine)) return;
    this.clearMemoryMatchRevealTimer(room);
    this.clearTurnTimer(room);
    const remaining = Math.max(0, room.engine.revealRemainingMs());
    room.memoryMatchRevealTimer = setTimeout(() => {
      if (!(room.engine instanceof MemoryMatchEngine)) return;
      room.engine.resolveReveal();
      this.broadcastGameState(room);
      if (room.engine.isOver()) {
        room.phase = "finished";
        for (const p of room.players.values()) p.isReady = false;
        this.broadcastRoomState(room);
        return;
      }
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    }, remaining);
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

    // One sub-move per tick so multi-step turns (Ludo roll → move,
    // Rummy draw → discard) feel like the bot is actually thinking between
    // steps. After each sub-move we broadcast immediately and recurse via
    // scheduleBotMoveIfNeeded, which adds a fresh humanised delay before
    // the next sub-move fires.
    const delayMs = 1200 + Math.random() * 800;
    setTimeout(() => {
      if (room.phase !== "playing") return;
      if (room.engine !== engine) return;

      const apply = engine.applyAutoMove;
      const actors = engine.pendingActors;
      if (typeof apply !== "function" || typeof actors !== "function") return;

      // Pick the first bot still pending — same one we delayed for.
      const stillPending = actors.call(engine).filter(
        (id) => room.players.get(id)?.isBot,
      );
      const botId = stillPending[0];
      if (!botId) {
        // Pending bot list shifted between scheduling and firing (e.g. the
        // human discarded into a different bot). Fall through to a fresh
        // schedule pass to pick up whoever is next.
        this.scheduleBotMoveIfNeeded(room);
        return;
      }

      if (!engine.isOver()) {
        apply.call(engine, botId);
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
      // Recurse — if the same bot is still mid-turn (draw → discard) this
      // schedules another paced sub-move; otherwise it picks up the next bot.
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
      // Carry forward unused seconds when the SAME player is still on the
      // clock (the draw → discard within-turn transition). If the turn
      // just advanced, the engine returns 0 and we reset to the full
      // window for the new player. Floor is the natural timer for the
      // current action, so a slow drawer still gets a fresh 15 s discard.
      //
      // On top of that we add any pending animation pause the engine has
      // queued (e.g. the 2.4 s joker celebration) so the player doesn't
      // bleed seconds while a celebration covers the screen.
      const baseMs = Math.max(5, room.engine.getTurnTimerSeconds()) * 1000;
      const carryMs = room.engine.getRemainingForCurrentTurnOwner(Date.now());
      const animMs = room.engine.consumePendingAnimationPauseMs();
      const ms = Math.max(baseMs, carryMs) + animMs;
      room.engine.setTurnDeadline(Date.now() + ms, pub.turnPlayerId);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    if (room.engine instanceof WordBuildingEngine) {
      const seconds = room.engine.getTurnTimerSeconds();
      // 0 disables the timer entirely (player-friendly mode).
      if (seconds <= 0) {
        room.engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = Math.max(5, seconds) * 1000;
      room.engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    if (room.engine instanceof DotsBoxesEngine) {
      const seconds = room.engine.getTurnTimerSeconds();
      if (seconds <= 0) {
        room.engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = Math.max(5, seconds) * 1000;
      room.engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    if (room.engine instanceof MemoryMatchEngine) {
      // Don't tick the turn clock during the reveal phase — the next
      // active beat is the auto-flip-back, scheduled separately.
      if (room.engine.isRevealing()) return;
      const seconds = room.engine.getTurnTimerSeconds();
      if (seconds <= 0) {
        room.engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = Math.max(5, seconds) * 1000;
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
    if (room.engine instanceof WordBuildingEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      engine.applyAutoMove(state.turnPlayerId);
      this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof DotsBoxesEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      engine.applyAutoMove(state.turnPlayerId);
      this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof MemoryMatchEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      engine.applyAutoMove(state.turnPlayerId);
      // After a bot's flip pair, the engine may have entered REVEAL —
      // schedule the auto-flip-back instead of the next turn timer.
      this.broadcastGameState(room);
      if (engine.isOver()) {
        room.phase = "finished";
        for (const p of room.players.values()) p.isReady = false;
        this.clearTurnTimer(room);
        this.clearMemoryMatchRevealTimer(room);
        this.broadcastRoomState(room);
        return;
      }
      if (engine.isRevealing()) {
        this.scheduleMemoryMatchReveal(room);
      } else {
        this.scheduleTurnTimer(room);
        this.scheduleBotMoveIfNeeded(room);
      }
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

  /**
   * Pass the player's Rummy hand arrangement (drag-and-drop groups) into
   * the live engine. Only valid when the room is in a Rummy game; other
   * games / phases silently ignore the event.
   */
  setRummyArrangement(socketId: string, groups: unknown): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.game !== "rummy") return;
    if (!Array.isArray(groups)) return;
    if (!room.engine) return;
    const engine = room.engine as unknown as {
      setArrangement?: (pid: string, groups: string[][]) => void;
    };
    if (!engine.setArrangement) return;
    // Defensive shape check — the socket boundary is the right place to
    // reject malformed payloads before they reach the engine.
    const normalised: string[][] = [];
    for (const g of groups as unknown[]) {
      if (!Array.isArray(g)) continue;
      const ids: string[] = [];
      for (const id of g as unknown[]) {
        if (typeof id === "string") ids.push(id);
      }
      normalised.push(ids);
    }
    engine.setArrangement(player.id, normalised);
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

  /* ───────────────────────────── Rematch flow ───────────────────────────── */

  /**
   * Host requests a rematch with the same players. Anyone connected (humans
   * only — bots auto-accept) gets a prompt to accept/decline. If everyone
   * accepts the new round starts after a short countdown; any decline (or
   * timeout) cancels.
   *
   * Idempotent for the host: requesting again while pending just keeps the
   * existing state and broadcasts. Quietly refused for non-hosts.
   */
  requestRematch(socketId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Only host can request rematch");
      return;
    }
    if (room.phase !== "finished") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Can only rematch after a game ends");
      return;
    }
    if (room.rematch.status === "pending" || room.rematch.status === "accepted") {
      // Already pending — re-broadcast so the host's UI catches up if needed.
      this.broadcastRematch(room);
      return;
    }
    const responses: Record<string, "pending" | "accept" | "decline"> = {};
    for (const p of room.players.values()) {
      if (p.id === player.id) {
        // The requester implicitly accepts their own request.
        responses[p.id] = "accept";
      } else if (p.isBot) {
        // Bots are always willing to play another round.
        responses[p.id] = "accept";
      } else {
        responses[p.id] = "pending";
      }
    }
    room.rematch = {
      status: "pending",
      requesterId: player.id,
      responses,
      expiresAt: Date.now() + REMATCH_REQUEST_WINDOW_MS,
      startsAt: null,
      declinedBy: null,
    };

    this.clearRematchTimers(room);
    room.rematchTimer = setTimeout(() => {
      // Timeout = treat as a decline by "no one in particular".
      this.cancelRematch(room, null);
    }, REMATCH_REQUEST_WINDOW_MS);

    this.broadcastRematch(room);
    // Edge case: if everyone except host is a bot, all responses are already
    // "accept" — settle immediately so the host doesn't see a no-op pending
    // state.
    this.maybeSettleRematch(room);
  }

  respondRematch(socketId: string, response: "accept" | "decline"): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.rematch.status !== "pending") return;
    if (!(player.id in room.rematch.responses)) return;
    if (room.rematch.responses[player.id] !== "pending") return;

    room.rematch.responses[player.id] = response;
    if (response === "decline") {
      this.cancelRematch(room, player.id);
      return;
    }
    this.broadcastRematch(room);
    this.maybeSettleRematch(room);
  }

  /** Called after each acceptance — promotes to "accepted" once all are in. */
  private maybeSettleRematch(room: Room): void {
    if (room.rematch.status !== "pending") return;
    const allAccepted = Object.values(room.rematch.responses).every(
      (r) => r === "accept"
    );
    if (!allAccepted) return;

    // Flip to "accepted" with a brief countdown so players get visual
    // confirmation before the screen swaps to the next game's setup.
    room.rematch = {
      ...room.rematch,
      status: "accepted",
      expiresAt: null,
      startsAt: Date.now() + REMATCH_COUNTDOWN_MS,
    };
    this.clearRematchTimers(room);
    room.rematchStartTimer = setTimeout(() => {
      this.startRematch(room);
    }, REMATCH_COUNTDOWN_MS);
    this.broadcastRematch(room);
  }

  private cancelRematch(room: Room, declinedBy: string | null): void {
    if (room.rematch.status === "idle") return;
    room.rematch = {
      ...emptyRematchState(),
      status: "declined",
      declinedBy,
    };
    this.clearRematchTimers(room);
    this.broadcastRematch(room);
    // Short delay then return to idle so the UI has time to show the
    // "declined" badge before clearing.
    setTimeout(() => {
      if (room.rematch.status === "declined") {
        room.rematch = emptyRematchState();
        this.broadcastRematch(room);
      }
    }, 2_500);
  }

  /** Actually start a new round — wraps the same flow as startGame() but skips
   *  the ready-check (everyone has already opted in via the rematch vote). */
  private startRematch(room: Room): void {
    if (room.rematch.status !== "accepted") return;
    const playersList = Array.from(room.players.values());
    try {
      const engine = createEngine(room.game);
      if (engine instanceof LudoEngine) engine.setOptions(room.ludoOptions);
      if (engine instanceof SnlEngine) engine.setOptions(room.snlOptions);
      if (engine instanceof RummyEngine) engine.setOptions(room.rummyOptions);
      if (engine instanceof HandCricketEngine) engine.setOptions(room.hcOptions);
      if (engine instanceof WordBuildingEngine) engine.setOptions(room.wordBuildingOptions);
      if (engine instanceof DotsBoxesEngine) engine.setOptions(room.dotsBoxesOptions);
      if (engine instanceof MemoryMatchEngine) engine.setOptions(room.memoryMatchOptions);
      engine.init(playersList);
      room.engine = engine;
      room.phase = "playing";
      // Mark everyone "ready" so any UI that checks readiness behaves
      // correctly post-restart.
      for (const p of room.players.values()) p.isReady = true;
      room.rematch = emptyRematchState();
      this.clearRematchTimers(room);
      this.broadcastRoomState(room);
      this.broadcastGameState(room);
      this.broadcastRematch(room);
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start rematch";
      this.io.to(room.code).emit("room:error", msg);
      this.cancelRematch(room, null);
    }
  }

  private clearRematchTimers(room: Room): void {
    if (room.rematchTimer) {
      clearTimeout(room.rematchTimer);
      room.rematchTimer = null;
    }
    if (room.rematchStartTimer) {
      clearTimeout(room.rematchStartTimer);
      room.rematchStartTimer = null;
    }
  }

  private broadcastRematch(room: Room): void {
    this.io.to(room.code).emit("rematch:state", room.rematch);
  }
}

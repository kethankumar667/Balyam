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
  RummyChampion,
  RummyRoundRecap,
  RummyGameOptions,
  ServerToClientEvents,
  SnlGameOptions,
  WebRTCSignal,
  WordBuildingOptions,
  DotsBoxesOptions,
  StarGameOptions,
  UnoGameOptions,
  UnoChampion,
  UnoRoundRecap,
} from "@shared/types.js";
import {
  COIN_COLORS,
  DEFAULT_HC_OPTIONS,
  DEFAULT_LUDO_OPTIONS,
  DEFAULT_RUMMY_OPTIONS,
  DEFAULT_SNL_OPTIONS,
  DEFAULT_WORDBUILDING_OPTIONS,
  DEFAULT_DOTSBOXES_OPTIONS,
  DEFAULT_STARGAME_OPTIONS,
  DEFAULT_UNO_OPTIONS,
} from "@shared/types.js";
import { generateRoomCode } from "./codeGenerator.js";
import { createEngine, getGameLimits } from "../games/registry.js";
import type { RematchState } from "@shared/types.js";
import type { GameEngine } from "../games/GameEngine.js";
import { LudoEngine } from "../games/ludo/LudoEngine.js";
import { PLAYER_COLORS_ORDER } from "../games/ludo/track.js";
import { SnlEngine } from "../games/snl/SnlEngine.js";
import { RummyEngine } from "../games/rummy/RummyEngine.js";
import { HandCricketEngine } from "../games/handcricket/HandCricketEngine.js";
import { WordBuildingEngine } from "../games/wordbuilding/WordBuildingEngine.js";
import { DotsBoxesEngine } from "../games/dotsboxes/DotsBoxesEngine.js";
import { RpsEngine } from "../games/rps/RpsEngine.js";
import { StarGameEngine } from "../games/stargame/StarGameEngine.js";
import { UnoEngine } from "../games/uno/UnoEngine.js";

const GRACE_PERIOD_MS = 90_000;
/** How long the host's rematch request stays open before auto-cancelling. */
const REMATCH_REQUEST_WINDOW_MS = 30_000;
/** Countdown shown to everyone after all responses are in before the new game auto-starts. */
const REMATCH_COUNTDOWN_MS = 3_000;
/** Last N finished rounds kept per room (docs/rummy/roadmap.md B.1). */
const MAX_RUMMY_HISTORY = 20;
/** Last N finished rounds kept per room, UNO's own history. */
const MAX_UNO_HISTORY = 20;

/**
 * Per-game bot name pools. Each pool draws from the cultural texture of
 * the game itself so a Hand Cricket bot reads like a cricket legend and
 * a Ludo bot reads like a neighbourhood kid you'd actually play with.
 *
 * Order matters — the first bot at the table gets index 0. Lists are sized
 * to comfortably cover the per-game max (Ludo 8, SnL 10, Rummy 6, others 2).
 */
const BOT_NAMES_BY_GAME: Record<GameKind, ReadonlyArray<string>> = {
  handcricket: ["Sachin", "Dhoni", "Kohli", "Yuvraj", "Sehwag", "Dravid"],
  ludo: ["Pintu", "Chintu", "Bunty", "Babli", "Raju", "Munna", "Golu", "Tinku"],
  snl: ["Sneha", "Lalita", "Babu", "Chiklu", "Anu", "Gopi", "Ravi", "Suma", "Kiran", "Mounika"],
  rummy: ["Anand", "Babji", "Chinna", "Damodar", "Eswari", "Lakshmi"],
  rps: ["Rocky", "Bhola", "Chotu", "Dolly"],
  uno: ["Baazi", "Chikki", "Gabbar", "Jugadu"],
  wordbuilding: ["Teacher Padma", "Master Ravi", "Miss Lakshmi", "Sir Krishna"],
  dotsboxes: ["Pencil", "Eraser", "Sharpener", "Ruler"],
  stargame: ["Pinky", "Chinnu", "Guddu", "Sweety", "Bujji", "Chitti", "Lucky", "Appu"],
};

function pickBotName(game: GameKind, idx: number): string {
  const pool = BOT_NAMES_BY_GAME[game];
  return pool[idx % pool.length] ?? `Bot ${idx + 1}`;
}

/**
 * One static "tell" per Rummy bot — surfaced once in chat at the start of
 * a match the bot is seated in (docs/rummy/roadmap.md A.6; brief's
 * "Belonging" pillar: bot names already feel like family, lean further
 * in with a tiny personality quirk). Pure cosmetic — the bot's actual
 * play (botArrange.ts) doesn't change to match these yet; see roadmap D.5.
 * One line per match, never a chat torrent (anti-patterns.md).
 */
const RUMMY_BOT_TELLS: Record<string, string> = {
  Anand: "Anand always hoards jokers. Old habits.",
  Babji: "Babji discards spades first. Every single time.",
  Chinna: "Chinna never drops early. Stubborn as ever.",
  Damodar: "Damodar counts cards out loud. Can't help it.",
  Eswari: "Eswari always goes for the pure sequence first.",
  Lakshmi: "Lakshmi remembers every card you've discarded.",
};

const LUDO_COLOR_ORDER: ReadonlyArray<LudoColor> = [
  "red", "green", "yellow", "blue", "purple", "cyan", "orange", "brown",
];

interface Room {
  code: string;
  game: GameKind;
  phase: "lobby" | "playing" | "finished";
  hostId: string;
  /** Host-chosen table name ("Friday Rummy Nights") — null until set via room:setName. */
  name: string | null;
  /** Finished rounds this room has played, oldest first (Rummy only). docs/rummy/roadmap.md B.1. */
  history: RummyRoundRecap[];
  /** UNO's own finished-round history, oldest first — separate array,
   *  same "copy the pattern per game" rationale as its shared-types
   *  doc comment (RoomPublicState.unoHistory). */
  unoHistory: UnoRoundRecap[];
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
  starGameOptions: StarGameOptions;
  unoOptions: UnoGameOptions;
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
  /** "House Champion" per room table name — outlives any single room/code. docs/rummy/roadmap.md B.3. */
  private champions = new Map<string, RummyChampion>();
  /** UNO's own "House Champion" per room table name — separate map, same rationale as `unoHistory`. */
  private unoChampions = new Map<string, UnoChampion>();
  /** Last round number recorded into room.history per engine instance, so a fresh rematch's round 1 isn't mistaken for an already-seen round 1. */
  private lastRecordedRound = new WeakMap<RummyEngine, number>();
  /** Same idempotency guard as `lastRecordedRound`, scoped to UNO's own engine instances. */
  private lastRecordedUnoRound = new WeakMap<UnoEngine, number>();

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
      name: room.name,
      history: room.history,
      champion: room.name ? this.champions.get(room.name) ?? null : null,
      unoHistory: room.unoHistory,
      unoChampion: room.name ? this.unoChampions.get(room.name) ?? null : null,
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
    starGameOptions?: Partial<StarGameOptions>,
    unoOptions?: Partial<UnoGameOptions>
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
      name: null,
      history: [],
      unoHistory: [],
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
      starGameOptions: { ...DEFAULT_STARGAME_OPTIONS, ...(starGameOptions ?? {}) },
      unoOptions: { ...DEFAULT_UNO_OPTIONS, ...(unoOptions ?? {}) },
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

    // Idempotency guard. A single socket maps to exactly one player in one
    // room at a time, so a second join from a socket that's already seated
    // here is never a new player — it's a duplicate emit (React StrictMode
    // double-invokes the join effect in dev, and in prod the synchronous
    // initial join races the async "connect" rejoin). Without this, each
    // duplicate minted a fresh player and overwrote socketToPlayer, leaving
    // the previous record orphaned: a ghost seat that never disconnects.
    const seatedId = room.socketToPlayer.get(socketId);
    if (seatedId && room.players.has(seatedId)) {
      this.broadcastRoomState(room);
      return { ok: true, playerId: seatedId };
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

    // No humans left (empty, or only bots remain) → abandon the room rather
    // than have the engine crown a leftover bot the winner. A remaining HUMAN
    // is still a legit forfeit win, so that path is untouched below.
    if (!this.hasHumanPlayer(room)) {
      this.abandonRoom(room);
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

  addBot(socketId: string, customName?: string): void {
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
    const cleaned = customName?.trim().slice(0, 20);
    const botName = cleaned && cleaned.length > 0 ? cleaned : pickBotName(room.game, botCount);
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
      room.game !== "dotsboxes"
    ) {
      // Pass & Play is fair only for open-information games — everyone
      // looks at the same board state, no private hands. Word Building
      // and Dots & Boxes both qualify (every move is visible to
      // everyone). Rummy / UNO etc. would leak hidden information to
      // the wrong player on a shared device.
      this.io.sockets.sockets.get(socketId)?.emit(
        "room:error",
        "Pass & Play is only available for Ludo, Snakes & Ladders, Word Building, and Dots & Boxes"
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

  /**
   * Reports whether a player's own client currently needs to rotate to
   * landscape (small portrait viewport). Valid in any phase/game — only
   * Rummy boards use it today, to gate the synchronized deal animation and
   * surface who's still rotating to the rest of the room. No phase gate
   * (unlike chooseColor/chooseCoinColor): players can drop their phone and
   * pick it back up mid-round just as easily as at game start.
   */
  setOrientation(socketId: string, needsRotation: boolean): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.needsRotation === needsRotation) return;
    player.needsRotation = needsRotation;
    this.broadcastRoomState(room);
  }

  /**
   * Host-only. Names (or renames) the room — "Friday Rummy Nights" etc.
   * Not game-specific: the field lives on every Room, any host can set it.
   * Empty/whitespace-only input clears the name back to null.
   */
  setRoomName(socketId: string, name: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    const cleaned = name.trim().slice(0, 40);
    room.name = cleaned.length > 0 ? cleaned : null;
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
    // All 8 seats are valid picks now: the classic 2-4 player cross board
    // only paints the first four cardinal colors, but the 5-8 player
    // print-design board (client/src/games/ludo/print-board.ts) has real
    // coordinates for all 8. A pick outside the eventual game's actual
    // player-count pool isn't a dead end either — LudoEngine's color
    // assignment (colorOf resolution in LudoEngine.ts) only honors
    // chosenColor when it falls within `PLAYER_COLORS_ORDER.slice(0,
    // players.length)`, silently falling back to the next free pool color
    // otherwise, so accepting all 8 here can never leave a player stuck
    // with an invisible yard.
    const validColors: string[] = PLAYER_COLORS_ORDER;
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
      if (engine instanceof StarGameEngine) {
        engine.setOptions(room.starGameOptions);
      }
      if (engine instanceof UnoEngine) {
        engine.setOptions(room.unoOptions);
      }
      engine.init(playersList);
      room.engine = engine;
      room.phase = "playing";
      this.emitRummyBotTells(room);
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
      // Structured-logging gap closed for PLAN_REVIEW_REPORT.md §6.13 (Phase
      // 5) — a rejected move was previously invisible outside the client's
      // own toast. Generic (every game shares this one applyMove path, not
      // just UNO), following the existing `[tag] message` console.log
      // convention (server/src/index.ts) rather than introducing a logging
      // library this codebase doesn't otherwise use.
      console.log(
        `[move] rejected room=${room.code} game=${room.game} type=${type} player=${effectivePlayerId} error=${result.error ?? "Invalid move"}`
      );
      this.io.sockets.sockets.get(socketId)?.emit("game:error", result.error ?? "Invalid move");
      return;
    }
    this.broadcastGameState(room);
    if (room.engine.isOver()) {
      room.phase = "finished";
      for (const p of room.players.values()) p.isReady = false;
      this.clearTurnTimer(room);
      this.broadcastRoomState(room);
      // Cheapest possible version of UNO_GAME_PLAN.md §3's "measurable now"
      // match-completion metric — a queryable log line, not a real
      // analytics pipeline (still correctly deferred, needs accounts/
      // persistence). Generic across every game for the same reason as the
      // move-rejection log above.
      console.log(`[match] finished room=${room.code} game=${room.game} players=${room.players.size}`);
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

    // One sub-move per tick so multi-step turns (Ludo roll → move,
    // Rummy draw → discard) feel like the bot is actually thinking between
    // steps. After each sub-move we broadcast immediately and recurse via
    // scheduleBotMoveIfNeeded, which adds a fresh humanised delay before
    // the next sub-move fires.
    const delayMs =
      typeof engine.getBotThinkDelayMs === "function"
        ? engine.getBotThinkDelayMs()
        : 1200 + Math.random() * 800;
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

  /**
   * Tear a room down with no result. Used when the last HUMAN leaves a game in
   * progress: the engine's `removePlayer` awards the win to the remaining
   * opponent, and when that opponent is a bot this produced the "bot declared
   * winner mid-match" bug. There's nobody left to watch a bot win, so we abandon
   * the room instead — no `removePlayer`, no bot-win broadcast.
   *
   * Setting `phase = "finished"` also makes any in-flight bot-move closures bail
   * (they guard on `phase === "playing"`), so no stray timers fire after delete.
   */
  private abandonRoom(room: Room): void {
    room.phase = "finished";
    this.clearTurnTimer(room);
    for (const t of room.cleanupTimers.values()) clearTimeout(t);
    room.cleanupTimers.clear();
    this.rooms.delete(room.code);
  }

  /** True while at least one seated player is a real human (not a bot). */
  private hasHumanPlayer(room: Room): boolean {
    return [...room.players.values()].some((p) => !p.isBot);
  }

  private scheduleTurnTimer(room: Room): void {
    this.clearTurnTimer(room);
    if (room.phase !== "playing") return;
    if (room.engine instanceof RpsEngine) {
      const engine = room.engine;
      // RPS is simultaneous: one 30 s deadline per round shared by both
      // players. armRoundDeadline keeps the same deadline if a round is
      // already mid-flight (one player threw), so a slow opponent isn't gifted
      // a fresh window. On timeout we auto-throw for whoever didn't pick.
      if (engine.isOver()) {
        engine.clearRoundDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = engine.armRoundDeadline(engine.getRoundTimerSeconds() * 1000);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
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
      // Post-show rearrange window: no turn timer — instead a single timer that
      // fires when the 15 s window closes and scores the round.
      if (pub.phase === "arranging") {
        const deadline = room.engine.getArrangeDeadline() ?? Date.now() + 15_000;
        this.broadcastGameState(room);
        room.turnTimer = setTimeout(
          () => this.onTurnTimeout(room),
          Math.max(0, deadline - Date.now()),
        );
        return;
      }
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
    if (room.engine instanceof StarGameEngine) {
      const engine = room.engine;
      if (engine.isOver()) {
        engine.clearDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = engine.armDeadline(engine.getPhaseTimerSeconds() * 1000);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    if (room.engine instanceof UnoEngine) {
      const engine = room.engine;
      const seconds = engine.getTurnTimerSeconds();
      if (seconds <= 0) {
        engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      const ms = Math.max(5, seconds) * 1000;
      engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
  }

  private onTurnTimeout(room: Room): void {
    if (room.phase !== "playing") return;
    if (room.engine instanceof RpsEngine) {
      const engine = room.engine;
      if (engine.isOver()) return;
      // Auto-throw a random move for every player who let the 30 s lapse
      // (could be the human, the bot, or both). The last throw resolves the
      // round; afterAutoMove broadcasts and arms the next round's timer.
      for (const pid of engine.choosersRemaining()) {
        if (engine.isOver()) break;
        engine.applyAutoMove(pid);
      }
      this.afterAutoMove(room, engine.isOver());
      return;
    }
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
      // Rearrange window elapsed → score the round on players' actual hands.
      if (state.phase === "arranging") {
        engine.finalizeArrangingRound();
        this.afterAutoMove(room, engine.isOver());
        return;
      }
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
    if (room.engine instanceof StarGameEngine) {
      const engine = room.engine;
      if (engine.isOver()) return;
      engine.resolveDeadline();
      this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof UnoEngine) {
      const engine = room.engine;
      if (engine.isOver()) return;
      // getTimeoutActor(), not pendingActors() — forces the real turn/
      // challenge holder's move, never auto-declares UNO for a human who
      // merely hasn't declared yet (that must stay a social "catch"
      // mechanic, not something the clock does for them).
      const actorId = engine.getTimeoutActor();
      if (actorId) engine.applyAutoMove(actorId);
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

  sendReaction(socketId: string, emoji: string, targetPlayerId?: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const ALLOWED = new Set([
      "👍", "😂", "😢", "🔥", "🎉", "💯", "😮", "👏",
      "🤔", "😭", "😡", "🙌", "💪", "🎯", "🤝", "💔",
    ]);
    if (!ALLOWED.has(emoji)) return;
    const validTarget = targetPlayerId && room.players.has(targetPlayerId) ? targetPlayerId : undefined;
    this.io.to(room.code).emit("room:reaction", {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: player.id,
      emoji,
      targetPlayerId: validTarget,
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
        // If the departing human was the last human in the room, abandon it —
        // never let the grace-timeout resolve into a bot being crowned winner.
        // Only a REMAINING human counts as a forfeit win, so removePlayer runs
        // solely in that case.
        if (!this.hasHumanPlayer(stillRoom)) {
          this.abandonRoom(stillRoom);
          return;
        }
        if (stillRoom.engine) stillRoom.engine.removePlayer(playerId);
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

  /**
   * Emits each seated bot's static "tell" to room chat, once per match
   * start (fresh game or rematch). Rummy only; no-op for every other game
   * and for rooms with no bots. See RUMMY_BOT_TELLS above.
   */
  private emitRummyBotTells(room: Room): void {
    if (room.game !== "rummy") return;
    for (const p of room.players.values()) {
      if (!p.isBot) continue;
      const tell = RUMMY_BOT_TELLS[p.name];
      if (!tell) continue;
      const msg: ChatMessage = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        playerId: p.id,
        playerName: p.name,
        text: tell,
        ts: Date.now(),
      };
      this.io.to(room.code).emit("chat:message", msg);
    }
  }

  private broadcastGameState(room: Room): void {
    if (!room.engine) return;
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      const state = room.engine.getStateFor(playerId);
      this.io.sockets.sockets.get(socketId)?.emit("game:state", state);
    }
    this.recordRummyRoundIfFinished(room);
    this.recordUnoRoundIfFinished(room);
  }

  /**
   * Append a finished Rummy round to room.history (docs/rummy/roadmap.md
   * B.1) and, once a pool match is fully decided, crown the room's table
   * name a "House Champion" (B.3). Idempotent per engine instance + round
   * number, so it's safe to call after every broadcast rather than chasing
   * down every call site that can end a round (direct move, bot auto-move,
   * disconnect-forced finish all funnel through here).
   */
  private recordRummyRoundIfFinished(room: Room): void {
    if (!(room.engine instanceof RummyEngine)) return;
    const engine = room.engine;
    const state = engine.getPublicState();
    if (state.phase !== "finished") return;
    if (this.lastRecordedRound.get(engine) === state.roundNumber) return;
    this.lastRecordedRound.set(engine, state.roundNumber);

    const playerNames: Record<string, string> = {};
    for (const p of room.players.values()) playerNames[p.id] = p.name;

    room.history.push({
      roundNumber: state.roundNumber,
      winnerId: state.winnerId ?? null,
      invalidDeclareBy: state.invalidDeclareBy ?? null,
      scores: state.scores ?? {},
      playerNames,
      ts: Date.now(),
      wildJoker: state.wildJoker ?? null,
      finalHands: state.finalHands ?? {},
      finalMelds: state.finalMelds ?? {},
      endedByDisconnect: state.endedByDisconnect ?? null,
    });
    if (room.history.length > MAX_RUMMY_HISTORY) room.history.shift();

    if (state.matchOver && state.matchWinnerId && room.name) {
      const winner = room.players.get(state.matchWinnerId);
      this.champions.set(room.name, {
        playerId: state.matchWinnerId,
        playerName: winner?.name ?? "Unknown",
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  /**
   * Append a finished UNO round to room.unoHistory and, once a
   * race-to-target-score match is fully decided, crown the room's table
   * name a "House Champion" — UNO's own parallel to
   * `recordRummyRoundIfFinished` above (same idempotent-per-broadcast
   * shape), reading `UnoEngine.getPublicState().lastRoundRecap` instead
   * of gating on `phase === "finished"` alone: UNO's engine resolves a
   * mid-match round transition (`startNewRound()`) atomically within one
   * `applyMove` call — `phase` never surfaces an intermediate "this round
   * just ended" state the way Rummy's does, so `lastRoundRecap` is the
   * signal the engine sets specifically so this method has something
   * durable to read at EVERY round boundary, not just the final one.
   * Champion-crowning stays gated on `targetScore != null` — matching
   * Rummy's "single mode never crowns a champion" precedent, since a
   * single UNO round (no target score) is the whole match by definition
   * and was never a "pool" in the first place.
   */
  private recordUnoRoundIfFinished(room: Room): void {
    if (!(room.engine instanceof UnoEngine)) return;
    const engine = room.engine;
    const state = engine.getPublicState();
    const recap = state.lastRoundRecap;
    if (!recap) return;
    if (this.lastRecordedUnoRound.get(engine) === recap.roundNumber) return;
    this.lastRecordedUnoRound.set(engine, recap.roundNumber);

    const playerNames: Record<string, string> = {};
    for (const p of room.players.values()) playerNames[p.id] = p.name;

    room.unoHistory.push({
      roundNumber: recap.roundNumber,
      winnerId: recap.winnerId,
      winnerName: playerNames[recap.winnerId] ?? "Someone",
      scores: recap.scores,
      playerNames,
      ts: recap.ts,
    });
    if (room.unoHistory.length > MAX_UNO_HISTORY) room.unoHistory.shift();

    if (state.phase === "finished" && state.targetScore != null && room.name) {
      const winner = room.players.get(recap.winnerId);
      this.unoChampions.set(room.name, {
        playerId: recap.winnerId,
        playerName: winner?.name ?? playerNames[recap.winnerId] ?? "Unknown",
        date: new Date().toISOString().slice(0, 10),
        finalScore: recap.scores[recap.winnerId] ?? 0,
      });
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
      if (engine instanceof StarGameEngine) engine.setOptions(room.starGameOptions);
      if (engine instanceof UnoEngine) engine.setOptions(room.unoOptions);
      engine.init(playersList);
      room.engine = engine;
      room.phase = "playing";
      this.emitRummyBotTells(room);
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

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
  DotsBoxesColor,
  StarGameOptions,
  UnoGameOptions,
  UnoChampion,
  UnoRoundRecap,
  BingoGameOptions,
  BingoRoundRecap,
  BotDifficulty,
  LudoMatchRecap,
  NamePlaceAnimalOptions,
  TambolaOptions,
  SnakeOptions,
  CarromOptions,
  ChessOptions,
  BlockBlastOptions,
  SpaceWarOptions,
} from "@shared/types.js";
import {
  COIN_COLORS,
  DOTSBOXES_COLORS,
  DEFAULT_HC_OPTIONS,
  DEFAULT_LUDO_OPTIONS,
  DEFAULT_RUMMY_OPTIONS,
  DEFAULT_SNL_OPTIONS,
  DEFAULT_WORDBUILDING_OPTIONS,
  DEFAULT_DOTSBOXES_OPTIONS,
  DEFAULT_STARGAME_OPTIONS,
  DEFAULT_UNO_OPTIONS,
  DEFAULT_BINGO_OPTIONS,
  DEFAULT_NAMESPLACEANIMAL_OPTIONS,
  DEFAULT_TAMBOLA_OPTIONS,
  DEFAULT_CARROM_OPTIONS,
  DEFAULT_CHESS_OPTIONS,
  DEFAULT_SNAKE_OPTIONS,
  DEFAULT_BLOCKBLAST_OPTIONS,
  DEFAULT_SPACEWAR_OPTIONS,
} from "@shared/types.js";
import { generateRoomCode } from "./codeGenerator.js";
import { mintSeatToken, verifySeatToken } from "../lib/seatToken.js";
import { createEngine, getGameLimits } from "../games/registry.js";
import type { RematchState, CoachableEngine, CoachHintResponse, AccountKind } from "@shared/types.js";
import { SEALED_ROOM_ERROR } from "@shared/permissions.js";
import { ALLOWED_REACTIONS } from "@shared/reactions.js";
import { sanitizeAvatar, pickAvatarForName } from "@shared/avatars.js";
import { ALLOWED_SOUND_CLIPS, SOUND_RATE_LIMIT } from "@shared/soundboard.js";
import type { RoomLifecycleState } from "@shared/lifecycle.js";
import { isValidLifecycleTransition } from "@shared/lifecycle.js";
import { serverTimelineRecorder } from "../events/ServerTimelineRecorder.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import { serverLifecycleRegistry } from "../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../reliability/ResourceTracker.js";
import { metricsCollector } from "../observability/MetricsCollector.js";
import { performanceMonitor } from "../observability/PerformanceMonitor.js";
import { profileService } from "../profile/ProfileService.js";
import { rankingService } from "../ranking/RankingService.js";
import { recentPlayersService } from "../ranking/RecentPlayersService.js";
import { logger } from "../lib/logger.js";
import type { GameEngine, RealtimeEngine } from "../games/GameEngine.js";
import { isRealtimeEngine } from "../games/GameEngine.js";
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
import { BingoEngine } from "../games/bingo/BingoEngine.js";
import { NamePlaceAnimalEngine } from "../games/namesplaceanimal/NamePlaceAnimalEngine.js";
import { TambolaEngine } from "../games/tambola/TambolaEngine.js";
import { CarromEngine } from "../games/carrom/CarromEngine.js";
import { ChessEngine } from "../games/chess/ChessEngine.js";
import { SnakeEngine } from "../games/snake/SnakeEngine.js";
import { BlockBlastEngine } from "../games/blockblast/BlockBlastEngine.js";
import { SpaceWarEngine } from "../games/spacewar/SpaceWarEngine.js";
import type { EconomyService } from "../economy/EconomyService.js";
import { EconomyServiceError } from "../economy/EconomyService.js";
import { EconomyRepositoryError, InsufficientFundsError, WalletFrozenError } from "../persistence/EconomyRepository.js";
import { resolveIdentity } from "./economyIdentity.js";
import { extractRankedParticipants } from "./economyPlacements.js";
import { EconomySettlementQueue } from "./economySettlementQueue.js";

const GRACE_PERIOD_MS = 90_000;

/**
 * How long a seat is held once a MATCH is under way.
 *
 * The 90s above is a fairness budget: other people are sitting at the table
 * waiting, so an absent seat cannot hold them up for long. When the leaver is
 * the last human in the room, nobody is waiting — the remaining seats are
 * bots — so the only thing that budget achieves is destroying a game the
 * player is actively trying to get back into.
 *
 * A solo-vs-bots Ludo game is exactly that case, and 90 seconds is shorter
 * than a phone spends switching from wifi to mobile data plus the walk back
 * to a usable signal. Ten minutes costs one idle Map entry and turns an
 * unrecoverable loss into a resumed game.
 */
const MATCH_GRACE_PERIOD_MS = 10 * 60_000;
/**
 * How long a dropped seat is left alone before the server starts playing it.
 *
 * A disconnect used to cost the whole table a full turn timer on every one of
 * that player's turns — 30s in Rummy, whatever `turnTimerSeconds` says in
 * Ludo — for the entire 90s grace window. With one flaky connection at a
 * four-player table, most of the match was spent waiting on someone who
 * wasn't there.
 *
 * This is deliberately longer than a page refresh or a tunnel (both of which
 * reconnect in a second or two) and much shorter than a turn timer, so the
 * common case costs the table nothing and nobody loses a turn to a blip.
 */
const TAKEOVER_GRACE_MS = 10_000;
/**
 * Consecutive turn timeouts before a CONNECTED player is treated as away.
 *
 * A dropped socket is the obvious failure, but it is not the common one — the
 * usual reason a table crawls is someone who is still connected and simply
 * not playing: another tab, a phone call, a dead battery on the sofa. Their
 * every turn costs the full timer, forever, and nothing about the disconnect
 * takeover helped because their socket is perfectly healthy.
 *
 * Two is deliberate. One timeout is a distraction and should still cost you a
 * turn; two in a row means nobody is there. The count resets on any move, so
 * simply playing clears it — there is nothing to dismiss.
 */
const IDLE_STRIKES_BEFORE_TAKEOVER = 2;
/** How long the host's rematch request stays open before auto-cancelling. */
const REMATCH_REQUEST_WINDOW_MS = 30_000;
/** Countdown shown to everyone after all responses are in before the new game auto-starts. */
const REMATCH_COUNTDOWN_MS = 3_000;
/** Last N finished rounds kept per room (docs/rummy/roadmap.md B.1). */
const MAX_RUMMY_HISTORY = 20;
/** Last N finished rounds kept per room, UNO's own history. */
const MAX_UNO_HISTORY = 20;
/** Last N finished rounds kept per room, Bingo's own history. */
const MAX_BINGO_HISTORY = 20;
const MAX_LUDO_HISTORY = 20;

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
  // Chess seats two, so one opponent name is enough; the rest are spares.
  chess: ["Vishy", "Gukesh", "Praggnanandhaa", "Humpy"],
  ludo: ["Pintu", "Chintu", "Bunty", "Babli", "Raju", "Munna", "Golu", "Tinku"],
  snl: ["Sneha", "Lalita", "Babu", "Chiklu", "Anu", "Gopi", "Ravi", "Suma", "Kiran", "Mounika"],
  rummy: ["Anand", "Babji", "Chinna", "Damodar", "Eswari", "Lakshmi"],
  rps: ["Rocky", "Bhola", "Chotu", "Dolly"],
  uno: [
    "Jugadu",
    "Baazi",
    "Chikki",
    "Gabbar",
    "Khatarnak",
    "Raftaar",
    "Bijli",
    "Sikandar",
    "Toofan",
    "Sultan",
    "Sheru",
    "Ustaad",
  ],
  wordbuilding: ["Teacher Padma", "Master Ravi", "Miss Lakshmi", "Sir Krishna"],
  dotsboxes: ["Pencil", "Eraser", "Sharpener", "Ruler"],
  stargame: ["Pinky", "Chinnu", "Guddu", "Sweety", "Bujji", "Chitti", "Lucky", "Appu"],
  bingo: ["Kanakam", "Padma", "Rajyam", "Saroja", "Venkat", "Nagesh", "Prasad", "Vani"],
  namesplaceanimal: ["Abhi", "Balu", "Chandu", "Divya", "Esha", "Farhan", "Gita", "Hari"],
  tambola: ["Annapurna", "Bhaskar", "Chintamani", "Devi", "Eluru", "Ganga", "Hema", "Indra"],
  snake: ["Python", "Viper", "Cobra", "Mamba"],
  blockblast: ["Tetra", "Chotu", "Gattu", "Rubik", "Pixel", "Mosaic", "Bittu", "Domino"],
  // "Striker" was dropped: it is the name of a piece on the board, so the
  // player list read "Striker · 9 left" next to a striker the player aims.
  carrom: ["Breaker", "Rebound", "Cutshot", "Thumbi"],
  roadrash: ["Rider", "Speedy", "Biker", "Racer"],
  spacewar: ["Ace", "Blaster", "Cosmo", "Defender"],
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

export interface Room {
  code: string;
  game: GameKind;
  phase: "lobby" | "playing" | "finished";
  lifecycleState: RoomLifecycleState;
  createdAt: number;
  hostId: string;
  /** Host-chosen table name ("Friday Rummy Nights") — null until set via room:setName. */
  name: string | null;
  /** Finished rounds this room has played, oldest first (Rummy only). docs/rummy/roadmap.md B.1. */
  history: RummyRoundRecap[];
  /** UNO's own finished-round history, oldest first — separate array,
   *  same "copy the pattern per game" rationale as its shared-types
   *  doc comment (RoomPublicState.unoHistory). */
  unoHistory: UnoRoundRecap[];
  /** Bingo's own finished-round history, oldest first — same rationale
   *  as `unoHistory` above. */
  bingoHistory: BingoRoundRecap[];
  ludoHistory: LudoMatchRecap[];
  players: Map<string, Player>;
  socketToPlayer: Map<string, string>;
  engine: GameEngine | null;
  cleanupTimers: Map<string, NodeJS.Timeout>;
  /** Per-seat timers that promote a disconnect into a server takeover. */
  takeoverTimers: Map<string, NodeJS.Timeout>;
  /** Consecutive turn timeouts per seat — see IDLE_STRIKES_BEFORE_TAKEOVER. */
  idleStrikes: Map<string, number>;
  /** Sub-moves the server has played for each taken-over seat, so the player
   *  can be told what they missed when they come back. */
  autoPlayedFor: Map<string, number>;
  turnTimer: NodeJS.Timeout | null;
  /** Rummy/UNO only: safety-net timer while the very first turn's clock
   *  waits on every player's needsRotation to clear. See scheduleInitialTurnTimer. */
  dealGateWaitTimer: NodeJS.Timeout | null;
  /** Rummy/UNO only: fixed shuffle+deal animation pause counting down before
   *  the very first turn timer actually arms. See scheduleInitialTurnTimer. */
  dealGateAnimTimer: NodeJS.Timeout | null;
  /** Server-owned simulation loop for real-time engines. See startSimulation. */
  simTimer: NodeJS.Timeout | null;
  /** Socket ids watching without a seat (Smart TV / Party Mode). */
  spectators: Set<string>;
  /**
   * Nobody new may enter — no joins, no spectators. See RoomPublicState.sealed
   * for why it is stored rather than recomputed from the host's account kind.
   *
   * One-way on purpose: `sealRoom` sets it and nothing clears it. A table that
   * opened sealed stays sealed for its whole life, so a code someone screenshot
   * from a sealed room can never start working later.
   */
  sealed: boolean;
  ludoOptions: LudoGameOptions;
  snlOptions: SnlGameOptions;
  rummyOptions: RummyGameOptions;
  hcOptions: HcGameOptions;
  wordBuildingOptions: WordBuildingOptions;
  dotsBoxesOptions: DotsBoxesOptions;
  starGameOptions: StarGameOptions;
  unoOptions: UnoGameOptions;
  bingoOptions: BingoGameOptions;
  namesplaceanimalOptions: NamePlaceAnimalOptions;
  tambolaOptions: TambolaOptions;
  carromOptions: CarromOptions;
  chessOptions: ChessOptions;
  snakeOptions: SnakeOptions;
  blockBlastOptions: BlockBlastOptions;
  spaceWarOptions: SpaceWarOptions;
  /** Active rematch negotiation (or idle). Refer to the RematchState type. */
  rematch: RematchState;
  /** Timer that auto-cancels a pending rematch when the window expires. */
  rematchTimer: NodeJS.Timeout | null;
  /** Timer that auto-starts the new game once everyone accepts. */
  rematchStartTimer: NodeJS.Timeout | null;
  /** Idempotency action registry: actionKey -> timestamp */
  processedActionIds: Map<string, number>;
  /**
   * The Economy V1 match id currently funded for this room, or `null`
   * between matches. Set only after `commitMatchEntry` succeeds; cleared
   * once settlement/refund has been queued for it. `null` for the whole
   * life of a room whose `economyService` is not configured (see the
   * constructor) — economy-gating is entirely inert in that case.
   */
  currentMatchId: string | null;
  /**
   * In-memory guard against firing `commitMatchEntry` twice for the same
   * start attempt — e.g. a double-click or a duplicate socket emit racing
   * `requestGameStart`'s own `await`. Distinct from the RPC's own
   * idempotency key: this stops the SECOND call from ever being attempted,
   * rather than relying on the database to make it harmless once it lands.
   */
  economyCommitPending: boolean;
}

/**
 * Mint a player id. Server-side only, and the only place ids are made.
 *
 * The id is public — it is broadcast to the whole room and used to address
 * reactions and targeted sounds — so it needs to be unique, not unguessable.
 * Ownership of a seat is proved with the seat token instead (lib/seatToken).
 */
function newPlayerId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  /** Recent reaction timestamps per player id — sliding window for the
   *  anti-spam check in `sendReaction`. Targeted reactions render on other
   *  people's screens, so this is abuse-facing, not just cosmetic. */
  private reactionRate = new Map<string, number[]>();
  /** Same idea as `reactionRate`, on its own tighter budget — a soundboard
   *  clip plays over everyone's game whether they are looking at it or not,
   *  so it is the more abusable of the two channels. */
  private soundRate = new Map<string, number[]>();
  /** "House Champion" per room table name — outlives any single room/code. docs/rummy/roadmap.md B.3. */
  private champions = new Map<string, RummyChampion>();
  /** UNO's own "House Champion" per room table name — separate map, same rationale as `unoHistory`. */
  private unoChampions = new Map<string, UnoChampion>();
  /** Last round number recorded into room.history per engine instance, so a fresh rematch's round 1 isn't mistaken for an already-seen round 1. */
  private lastRecordedRound = new WeakMap<RummyEngine, number>();
  /** Same idempotency guard as `lastRecordedRound`, scoped to UNO's own engine instances. */
  private lastRecordedUnoRound = new WeakMap<UnoEngine, number>();
  /** Same idempotency guard as `lastRecordedUnoRound`, scoped to Bingo's own engine instances. */
  private lastRecordedBingoRound = new WeakMap<BingoEngine, number>();
  /** Ludo matches already written to history, keyed by engine instance — a
   *  match ends once, but its finished state re-broadcasts on every tick. */
  private recordedLudoMatches = new WeakSet<LudoEngine>();

  /**
   * Screens watching a room, socket id -> room code.
   *
   * Deliberately NOT folded into `socketToRoom`. Every seat-related path in
   * this file (disconnect takeover, turn timers, rematch, host migration)
   * keys off that map, and a TV appearing there would be treated as a player
   * who never moves — taking a seat, stalling turns, and inheriting the host
   * role when the host leaves.
   */
  private spectatorToRoom = new Map<string, string>();

  /**
   * `null` when this RoomManager was constructed without an `EconomyService`
   * — every one of the ~100 pre-existing RoomManager test files, plus any
   * local dev run with no Economy V1 store configured. In that state, every
   * economy hook below is a complete no-op and `startGame`/`finalizeMatch`/
   * `abandonRoom` behave EXACTLY as they did before this integration —
   * matching how `persistence/index.ts`'s progression store degrades when
   * unconfigured. In production, `server/src/index.ts` always constructs a
   * real one (see `economy/index.ts`'s own boot-time refusal-to-start
   * guard) — this is a test/dev degradation path, not a production one.
   */
  private readonly settlementQueue: EconomySettlementQueue | null;

  constructor(private io: IO, private readonly economyService?: EconomyService) {
    this.settlementQueue = economyService ? new EconomySettlementQueue(economyService) : null;
  }

  /** For /health and graceful shutdown — see server/src/index.ts. */
  economySettlementQueueStatus(): ReturnType<EconomySettlementQueue["status"]> | null {
    return this.settlementQueue?.status() ?? null;
  }

  /** Waits for every queued settlement/refund — called on graceful shutdown. */
  async drainEconomySettlementQueue(): Promise<void> {
    await this.settlementQueue?.drain();
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getOperationalStats(): {
    totalRooms: number;
    recoveringRooms: number;
    pausedRooms: number;
    inProgressRooms: number;
    lobbyRooms: number;
    completedRooms: number;
  } {
    let recovering = 0;
    let paused = 0;
    let inProgress = 0;
    let lobby = 0;
    let completed = 0;

    for (const room of this.rooms.values()) {
      switch (room.lifecycleState) {
        case "RECOVERING":
          recovering++;
          break;
        case "PAUSED":
          paused++;
          break;
        case "IN_PROGRESS":
          inProgress++;
          break;
        case "WAITING_FOR_PLAYERS":
        case "READY_CHECK":
        case "STARTING":
        case "CREATED":
          lobby++;
          break;
        case "COMPLETED":
          completed++;
          break;
      }
    }

    return {
      totalRooms: this.rooms.size,
      recoveringRooms: recovering,
      pausedRooms: paused,
      inProgressRooms: inProgress,
      lobbyRooms: lobby,
      completedRooms: completed,
    };
  }

  getOperationalRoomSummaries(): Array<{
    code: string;
    game: GameKind;
    lifecycleState: RoomLifecycleState;
    playerCount: number;
    humanCount: number;
    hasTakeover: boolean;
  }> {
    return Array.from(this.rooms.values()).map((room) => ({
      code: room.code,
      game: room.game,
      lifecycleState: room.lifecycleState,
      playerCount: room.players.size,
      humanCount: Array.from(room.players.values()).filter((p) => !p.isBot).length,
      hasTakeover: room.takeoverTimers.size > 0,
    }));
  }

  private toPublicState(room: Room): RoomPublicState {
    const limits = getGameLimits(room.game) ?? { min: 2, max: 4 };
    const { max } = limits;
    return {
      code: room.code,
      game: room.game,
      phase: room.phase,
      lifecycleState: room.lifecycleState,
      // `identityId` is server-only (Economy V1's durable account identifier
      // — see its doc comment in shared/types.ts) and must never reach a
      // broadcast; every OTHER field is intentionally passed through as-is.
      players: Array.from(room.players.values()).map(({ identityId: _identityId, ...rest }) => rest),
      // Players are told when they are on a screen. Being displayed in a
      // room without knowing it is not something to discover later.
      spectatorCount: room.spectators.size,
      hostId: room.hostId,
      maxPlayers: max,
      name: room.name,
      history: room.history,
      champion: room.name ? this.champions.get(room.name) ?? null : null,
      unoHistory: room.unoHistory,
      unoChampion: room.name ? this.unoChampions.get(room.name) ?? null : null,
      bingoHistory: room.bingoHistory,
      ludoHistory: room.ludoHistory,
      sealed: room.sealed,
    };
  }

  private transitionLifecycle(room: Room, target: RoomLifecycleState, reason?: string): void {
    if (room.lifecycleState === target) return;
    const previous = room.lifecycleState;
    if (isValidLifecycleTransition(previous, target)) {
      room.lifecycleState = target;
      logger.info({
        message: `Lifecycle transition in room ${room.code}: ${previous} -> ${target}${reason ? ` (${reason})` : ""}`,
        module: "LIFECYCLE",
        roomCode: room.code,
      });
    }
  }

  /**
   * Close a room to anyone not already in it.
   *
   * Idempotent and one-way — there is no `unsealRoom`, because the guarantee
   * worth having is that a code which was ever refused stays refused. Kicking
   * the state out immediately matters: the client hides the share card off
   * this flag, and a host who can still see a code they can no longer give
   * away will hand it to somebody.
   */
  private sealRoom(room: Room): void {
    if (room.sealed) return;
    room.sealed = true;
    // Screens attached before the seal are not players and were never
    // invited by anyone still here; drop them with the door.
    for (const socketId of [...room.spectators]) this.stopSpectating(socketId);
    logger.info({
      message: "Room sealed — no further joins",
      module: "ROOM",
      roomCode: room.code,
    });
  }

  /**
   * Open a new room and seat the creator as host.
   *
   * The caller does NOT get to choose their player id. It used to: whatever
   * `playerId` arrived in the payload became the host's id verbatim, so a
   * client could seat itself as `"system"` — the reserved id this file stamps
   * on table announcements (see `announce`) — and speak as the table. Minting
   * server-side removes the class of bug rather than blacklisting one value.
   */
  createRoom(
    socketId: string,
    name: string,
    game: GameKind,
    ludoOptions?: Partial<LudoGameOptions>,
    snlOptions?: Partial<SnlGameOptions>,
    rummyOptions?: Partial<RummyGameOptions>,
    hcOptions?: Partial<HcGameOptions>,
    wordBuildingOptions?: Partial<WordBuildingOptions>,
    dotsBoxesOptions?: Partial<DotsBoxesOptions>,
    starGameOptions?: Partial<StarGameOptions>,
    unoOptions?: Partial<UnoGameOptions>,
    bingoOptions?: Partial<BingoGameOptions>,
    namesplaceanimalOptions?: Partial<NamePlaceAnimalOptions>,
    tambolaOptions?: Partial<TambolaOptions>,
    snakeOptions?: Partial<SnakeOptions>,
    carromOptions?: Partial<CarromOptions>,
    chessOptions?: Partial<ChessOptions>,
    blockBlastOptions?: Partial<BlockBlastOptions>,
    spaceWarOptions?: Partial<SpaceWarOptions>,
    /**
     * Appended here, rather than sitting next to `name` where it belongs,
     * on purpose. Every option parameter above is a `Partial<…>`, and two
     * all-optional types are mutually assignable — so inserting an argument
     * in the middle would shift nineteen of them by one and still compile
     * clean, silently handing each game the next game's options. Adding at
     * the end shifts nothing.
     */
    avatar?: string,
    /** Appended for the same reason as `avatar` above. */
    hostKind?: AccountKind,
    /**
     * Appended for the same reason as `avatar`/`hostKind` above. The
     * server-verified durable id behind `hostKind === "member"` — see
     * `rooms/economyIdentity.ts`. `null`/absent for a guest (by product
     * decision, guests never resolve one) or when Economy V1 isn't in play
     * at all; either way, `Player.identityId` simply stays unset and this
     * room behaves exactly as it did before this integration.
     */
    identityId?: string | null
  ): { code: string; playerId: string; seatToken: string; state: RoomPublicState } {
    const createStart = performance.now();
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    /**
     * Only an explicit "guest" seals a room; absent means open.
     *
     * The instinct is to default the other way — a missing field should not
     * be the way to get a shareable table — and that instinct is right when
     * a flag is a security boundary. This one is not (shared/permissions.ts
     * is explicit about why), so the question becomes purely which failure is
     * worse for a real person. Defaulting closed means any caller that has
     * not been taught the field yet silently loses the ability to play with
     * anyone; defaulting open means such a caller keeps today's behaviour.
     * The first breaks the product, the second preserves it, and neither
     * protects anything — so the compatible reading wins.
     *
     * The live client always sends the field, in both create paths.
     */
    const hostIsGuest = hostKind === "guest";

    const playerId = newPlayerId();
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || "Player",
      isHost: true,
      isReady: false,
      isConnected: true,
      // Dropped unless it names a file we actually ship — see shared/avatars.ts.
      avatar: sanitizeAvatar(avatar),
      ...(hostIsGuest ? { isGuest: true } : {}),
      identityId: identityId ?? null,
    };

    const room: Room = {
      code,
      game,
      phase: "lobby",
      lifecycleState: (getGameLimits(game)?.min ?? 2) <= 1 ? "READY_CHECK" : "WAITING_FOR_PLAYERS",
      createdAt: Date.now(),
      hostId: playerId,
      name: null,
      history: [],
      unoHistory: [],
      bingoHistory: [],
      ludoHistory: [],
      players: new Map([[playerId, player]]),
      socketToPlayer: new Map([[socketId, playerId]]),
      engine: null,
      cleanupTimers: new Map(),
      takeoverTimers: new Map(),
      idleStrikes: new Map(),
      autoPlayedFor: new Map(),
      turnTimer: null,
      dealGateWaitTimer: null,
      dealGateAnimTimer: null,
      simTimer: null,
      spectators: new Set<string>(),
      // All multiplayer tables are open for joining via room code
      sealed: false,
      ludoOptions: { ...DEFAULT_LUDO_OPTIONS, ...(ludoOptions ?? {}) },
      snlOptions: { ...DEFAULT_SNL_OPTIONS, ...(snlOptions ?? {}) },
      rummyOptions: { ...DEFAULT_RUMMY_OPTIONS, ...(rummyOptions ?? {}) },
      hcOptions: { ...DEFAULT_HC_OPTIONS, ...(hcOptions ?? {}) },
      wordBuildingOptions: { ...DEFAULT_WORDBUILDING_OPTIONS, ...(wordBuildingOptions ?? {}) },
      dotsBoxesOptions: { ...DEFAULT_DOTSBOXES_OPTIONS, ...(dotsBoxesOptions ?? {}) },
      starGameOptions: { ...DEFAULT_STARGAME_OPTIONS, ...(starGameOptions ?? {}) },
      unoOptions: { ...DEFAULT_UNO_OPTIONS, ...(unoOptions ?? {}) },
      bingoOptions: { ...DEFAULT_BINGO_OPTIONS, ...(bingoOptions ?? {}) },
      namesplaceanimalOptions: { ...DEFAULT_NAMESPLACEANIMAL_OPTIONS, ...(namesplaceanimalOptions ?? {}) },
      tambolaOptions: { ...DEFAULT_TAMBOLA_OPTIONS, ...(tambolaOptions ?? {}) },
      carromOptions: { ...DEFAULT_CARROM_OPTIONS, ...(carromOptions ?? {}) },
      chessOptions: { ...DEFAULT_CHESS_OPTIONS, ...(chessOptions ?? {}) },
      snakeOptions: { ...DEFAULT_SNAKE_OPTIONS, ...(snakeOptions ?? {}) },
      blockBlastOptions: { ...DEFAULT_BLOCKBLAST_OPTIONS, ...(blockBlastOptions ?? {}) },
      spaceWarOptions: { ...DEFAULT_SPACEWAR_OPTIONS, ...(spaceWarOptions ?? {}) },
      rematch: emptyRematchState(),
      rematchTimer: null,
      rematchStartTimer: null,
      processedActionIds: new Map(),
      currentMatchId: null,
      economyCommitPending: false,
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);
    serverLifecycleRegistry.registerRoom(code);

    serverTimelineRecorder.recordRoomCreated(code, game, playerId, false);
    serverTimelineRecorder.recordPlayerJoined(code, playerId, player.name, false);

    const socket = this.io.sockets.sockets.get(socketId);
    socket?.join(code);

    this.broadcastRoomState(room);
    metricsCollector.onRoomCreated(game);
    performanceMonitor.recordDuration("room_create", performance.now() - createStart);
    return { code, playerId, seatToken: mintSeatToken(code, playerId), state: this.toPublicState(room) };
  }

  /**
   * Take a seat, or reclaim the one you already had.
   *
   * Reclaiming requires the seat token issued when the seat was taken — see
   * lib/seatToken. Presenting an id alone used to be enough, which meant any
   * id you could read off the broadcast room state was a seat you could take,
   * hand and all.
   *
   * A failed claim is NOT an error: it falls through to the ordinary new-seat
   * path below. That keeps the honest cases working — a player whose storage
   * was cleared, or who followed a link into a room they have never been in —
   * and gives an attacker no signal that the id they tried was real, since a
   * bogus id and a stolen one now behave identically.
   */
  joinRoom(
    socketId: string,
    name: string,
    code: string,
    existingPlayerId?: string,
    seatToken?: string,
    avatar?: string,
    accountKind?: AccountKind,
    /** Same rules as `createRoom`'s `identityId` — see there. Only applied to a genuinely NEW seat; a reclaimed seat keeps whatever identity it was joined with originally. */
    identityId?: string | null
  ): { ok: true; playerId: string; seatToken: string; state: RoomPublicState } | { ok: false; error: string } {
    const joinStart = performance.now();
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };

    if (
      existingPlayerId &&
      room.players.has(existingPlayerId) &&
      verifySeatToken(room.code, existingPlayerId, seatToken)
    ) {
      const player = room.players.get(existingPlayerId)!;
      const awayForMs = player.awaySince ? Date.now() - player.awaySince : 0;
      metricsCollector.onSeatReclaim(true);
      metricsCollector.onRecoverySuccess(room.code, awayForMs);
      if (!player.isConnected) {
        logger.info({
          message: `Seat reclaimed by ${player.name} after ${Math.round(awayForMs / 1000)}s away`,
          module: "RECONNECT",
          roomCode: room.code,
          playerId: existingPlayerId,
        });
      }
      player.isConnected = true;
      // A reclaim can carry a new avatar — they may have changed it on the
      // profile page between leaving and coming back. Only overwrite when the
      // incoming value survives validation, so a client that simply omits the
      // field does not blank the face the table has been looking at.
      const reclaimedAvatar = sanitizeAvatar(avatar);
      if (reclaimedAvatar) player.avatar = reclaimedAvatar;
      delete player.awayUntil;
      delete player.awaySince;
      const timer = room.cleanupTimers.get(existingPlayerId);
      if (timer) {
        clearTimeout(timer);
        room.cleanupTimers.delete(existingPlayerId);
      }
      // Read the tally BEFORE releasing, which resets it.
      const playedForThem = room.autoPlayedFor.get(existingPlayerId) ?? 0;
      // Hand the seat back before anything is broadcast, so the state this
      // client receives below already shows them in control.
      this.releaseTakeover(room, existingPlayerId);
      this.greetReturningPlayer(socketId, playedForThem);
      room.socketToPlayer.set(socketId, existingPlayerId);
      this.socketToRoom.set(socketId, room.code);
      // Now that this seat counts as connected again, restart anything that
      // stalled while the room was empty.
      this.resumeTable(room);
      this.transitionLifecycle(room, room.phase === "playing" ? "IN_PROGRESS" : "WAITING_FOR_PLAYERS", "Seat reclaimed");
      serverTimelineRecorder.recordRecoverySucceeded(room.code, existingPlayerId);
      this.io.sockets.sockets.get(socketId)?.join(room.code);
      this.broadcastRoomState(room);
      if (room.engine) {
        const state = room.engine.getStateFor(existingPlayerId);
        this.io.sockets.sockets.get(socketId)?.emit("game:state", state);
      }
      // Catch the rejoiner up on any rematch vote in progress so they don't
      // see a stale "Game Over" with no prompt.
      this.io.sockets.sockets.get(socketId)?.emit("rematch:state", room.rematch);
      performanceMonitor.recordDuration("room_join", performance.now() - joinStart);
      return {
        ok: true,
        playerId: existingPlayerId,
        seatToken: mintSeatToken(room.code, existingPlayerId),
        state: this.toPublicState(room),
      };
    }

    if (existingPlayerId) {
      metricsCollector.onSeatReclaim(false);
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
      // Re-issuing here is safe and necessary: this socket already holds the
      // seat, and a duplicate join must not leave the client without the
      // credential its first join was still waiting on.
      return {
        ok: true,
        playerId: seatedId,
        seatToken: mintSeatToken(room.code, seatedId),
        state: this.toPublicState(room),
      };
    }

    // Only NEW seats are refused. Both paths above have already returned, so a
    // sealed room still lets its own host back in after a refresh and still
    // honours a seat token — sealing closes the door to strangers, it does not
    // lock the people already inside out of their own game.
    if (room.sealed) return { ok: false, error: SEALED_ROOM_ERROR };

    const { max } = getGameLimits(room.game);
    if (room.players.size >= max) return { ok: false, error: "Room is full" };
    if (room.phase !== "lobby") return { ok: false, error: "Game already in progress" };

    const playerId = newPlayerId();
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || "Player",
      isHost: false,
      isReady: false,
      isConnected: true,
      // Dropped unless it names a file we actually ship — see shared/avatars.ts.
      avatar: sanitizeAvatar(avatar),
      // Explicit "guest" only, matching `hostKind` in createRoom above.
      ...(accountKind === "guest" ? { isGuest: true } : {}),
      identityId: identityId ?? null,
    };
    room.players.set(playerId, player);
    room.socketToPlayer.set(socketId, playerId);
    this.socketToRoom.set(socketId, room.code);
    this.io.sockets.sockets.get(socketId)?.join(room.code);

    const allReady = Array.from(room.players.values()).every((p) => p.isReady || p.isHost || p.isBot);
    this.transitionLifecycle(room, allReady ? "READY_CHECK" : "WAITING_FOR_PLAYERS", "Player joined");
    serverTimelineRecorder.recordPlayerJoined(room.code, playerId, player.name, false);

    this.broadcastRoomState(room);
    performanceMonitor.recordDuration("room_join", performance.now() - joinStart);
    return {
      ok: true,
      playerId,
      seatToken: mintSeatToken(room.code, playerId),
      state: this.toPublicState(room),
    };
  }

  leaveRoom(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return;

    // Captured before deletion, for the economy settlement path ONLY (see
    // the finalizeMatch(room, departedParticipant) call below): a forfeit
    // completes the match via this exact departure, but `hasHumanPlayer`/
    // `reassignHost`/`room.engine.removePlayer` below all correctly need
    // this player ALREADY gone from `room.players` — so the deletion order
    // itself is untouched, and this snapshot is how the settlement roster
    // still adds up to the committed seat count without them.
    const departingPlayer = room.players.get(playerId);
    room.players.delete(playerId);
    room.socketToPlayer.delete(socketId);
    this.socketToRoom.delete(socketId);
    this.io.sockets.sockets.get(socketId)?.leave(code);
    // The seat is gone, so anything still tracking it goes too. Left behind,
    // `idleStrikes` would accumulate an entry per departed player for the
    // lifetime of a long-running room.
    this.forgetSeatTimers(room, playerId);

    // No humans left (empty, or only bots remain) → abandon the room rather
    // than have the engine crown a leftover bot the winner. A remaining HUMAN
    // is still a legit forfeit win, so that path is untouched below.
    if (!this.hasHumanPlayer(room)) {
      this.abandonRoom(room);
      return;
    }

    if (room.hostId === playerId) {
      this.reassignHost(room, playerId);
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
    if (room.engine?.isOver()) {
      // The departure itself just ended the match — a 1v1 forfeit-to-
      // opponent (Chess/Carrom/RPS/Hand Cricket's removePlayer) or a
      // multiplayer walkover down to the last seat (Ludo/UNO/SNL/...).
      // Without this, room.phase stayed "playing" forever: the engine
      // knew it was over but nothing ever told the room, so no match
      // history/XP/achievements were recorded and rematch stayed
      // unreachable (it's gated on phase === "finished"). Finalize it the
      // same way every other completion path does (see
      // MULTIPLAYER-RELIABILITY-BASELINE.md gap G14).
      this.finalizeMatch(room, departingPlayer);
    } else {
      this.broadcastRoomState(room);
      // The engine has moved the turn off the departed seat — push that, and
      // give the clock and the auto-players a fresh start on it.
      this.resumeTable(room);
    }
  }

  addBot(socketId: string, customName?: string, difficulty?: BotDifficulty): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    // Games with no bot AI — bots would be dead/frozen seats.
    const NO_BOT_GAMES: ReadonlySet<GameKind> = new Set<GameKind>([
      "snake", "roadrash", "spacewar",
    ]);
    if (NO_BOT_GAMES.has(room.game)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Bots are not available for this game");
      return;
    }
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
      bingoDifficulty: difficulty ?? "medium",
      // Deterministic, not random: the same bot name always gets the same
      // face (see pickAvatarForName's doc comment for why "matching the
      // name" can only mean stable, not thematically on-theme).
      avatar: pickAvatarForName(botName),
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

  renameBot(socketId: string, botId: string, newName: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    if (room.phase !== "lobby") return;
    const target = room.players.get(botId);
    if (!target?.isBot) return;
    const cleaned = newName?.trim().slice(0, 20);
    if (!cleaned || cleaned.length === 0) return;
    target.name = cleaned;
    // Re-derive rather than leave the old face behind — the avatar is
    // supposed to track the name, not the seat.
    target.avatar = pickAvatarForName(cleaned);
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
    if (room.phase === "lobby") {
      const allReady = Array.from(room.players.values()).every((p) => p.isReady || p.isHost || p.isBot);
      this.transitionLifecycle(room, allReady ? "READY_CHECK" : "WAITING_FOR_PLAYERS", "Ready state changed");
    }
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
    // If the very first turn's clock is holding on this room's rotation
    // gate (see scheduleInitialTurnTimer) and this report just cleared the
    // last blocker, arm it now instead of waiting out the safety net.
    if (room.dealGateWaitTimer && !needsRotation) {
      const stillBlocking = Array.from(room.players.values()).some(
        (p) => p.isConnected && !p.isBot && p.needsRotation,
      );
      if (!stillBlocking) this.armInitialTurnTimer(room);
    }
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

  choosePenColor(socketId: string, color: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.game !== "dotsboxes") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Pen color is only chooseable for Dots & Boxes");
      return;
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot change color during game");
      return;
    }
    if (!(DOTSBOXES_COLORS as readonly string[]).includes(color)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Invalid pen color");
      return;
    }
    for (const other of room.players.values()) {
      if (other.id !== player.id && other.penColor === color) {
        this.io.sockets.sockets.get(socketId)?.emit("room:error", `${other.name} already picked ${color}`);
        return;
      }
    }
    player.penColor = color as DotsBoxesColor;
    this.broadcastRoomState(room);
  }

  /** Safe, generic message for a caller — never a repository/service `.message`, which can be internal-detail-bearing even for a typed class. */
  private economyErrorMessage(err: unknown): string {
    if (err instanceof InsufficientFundsError) return "You don't have enough coins to start this match.";
    if (err instanceof WalletFrozenError) return "Your wallet is currently frozen.";
    return "Could not start the match right now. Try again.";
  }

  /**
   * The economy-gated entry point for starting a match — Option A of
   * `docs/economy/roommanager-async-boundary-proposal.md`, implemented as
   * approved: `startGame` below stays fully synchronous and unchanged;
   * this is a new, narrow, ASYNC pre-commit step that runs before it, and
   * is the ONLY path `sockets/index.ts`'s `room:startGame` handler calls
   * in production. `startRematch` (line ~3260) has its own analogous
   * gate for the same reason — a rematch is a new match under the
   * existing economy design (no "free replay" concept exists anywhere in
   * Economy V1's schema or rules).
   *
   * When `economyService` is not configured (see the constructor), this
   * is a pure pass-through: `startGame(socketId)` runs immediately,
   * exactly as before this integration — every pre-existing RoomManager
   * test that calls `startGame` directly is unaffected.
   *
   * When it IS configured:
   *   1. The SAME cheap checks `startGame` itself performs (host, seat
   *      limits, all-ready) run first — a request that would fail
   *      `startGame` anyway never reaches a paid commit attempt.
   *   2. The host must have a resolved member identity. A guest host is
   *      refused here, by product decision (2026-08-27) — see
   *      `economyIdentity.ts`'s doc comment for the full reasoning (no
   *      guest-token channel exists through the socket layer today).
   *   3. `lifecycleState` -> `STARTING` (an existing, valid transition),
   *      and `commitMatchEntry` is awaited.
   *   4. Success: `currentMatchId` is set, then the existing synchronous
   *      `startGame(socketId)` runs, completing the transition to
   *      `IN_PROGRESS` exactly as it always has.
   *   5. Failure: `lifecycleState` rolls back to `READY_CHECK` (the one
   *      rollback edge added to `shared/lifecycle.ts` for this),
   *      `startGame` never runs, no participant loses coins (the debit
   *      either fully applied or didn't — `commitMatchEntry` has no
   *      partial-effect state), and no settlement record exists.
   *
   * `room.economyCommitPending` guards the whole async window against a
   * second `requestGameStart` racing this one for the same room. A real,
   * separate interleaving risk remains and is deliberately NOT solved by
   * a bigger lock: another socket event for this SAME room (a player
   * leaving, an abandonment) can run during the `await` below, since
   * Node's event loop is free to process other callbacks while this one
   * is suspended. If that happens, `startGame`'s own re-validation may
   * then refuse to actually start the match even though the commit
   * already succeeded. This is financially safe, not merely tolerated:
   * `abandonRoom`'s refund guard checks `room.currentMatchId !== null`
   * directly (not `room.phase === "playing"`), so a committed-but-never-
   * started match still gets refunded when the room is torn down.
   */
  async requestGameStart(socketId: string): Promise<void> {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;

    if (!this.economyService) {
      this.startGame(socketId);
      return;
    }

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
    if (room.economyCommitPending) return;

    if (!player.identityId) {
      this.io.sockets.sockets.get(socketId)?.emit(
        "room:error",
        "Only a signed-in account can start a paid match. Sign in to host, or ask a member to host instead.",
      );
      return;
    }

    room.economyCommitPending = true;
    this.transitionLifecycle(room, "STARTING", "Committing match entry");
    const humanSeatCount = playersList.filter((p) => !p.isBot).length;
    const botSeatCount = playersList.length - humanSeatCount;
    const matchId = `m_${room.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const result = await this.economyService.commitMatchEntry({
        matchId,
        roomCode: room.code,
        hostIdentityId: player.identityId,
        seatCount: playersList.length,
        humanSeatCount,
        botSeatCount,
        isSolo: playersList.length === 1,
      });
      room.currentMatchId = result.settlement.matchId;
      this.startGame(socketId);
    } catch (err) {
      this.transitionLifecycle(room, "READY_CHECK", "Entry commitment failed");
      this.io.sockets.sockets.get(socketId)?.emit("room:error", this.economyErrorMessage(err));
      logger.warn({
        message: `commitMatchEntry failed for room ${room.code}: ${err instanceof Error ? err.name : String(err)}`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
    } finally {
      room.economyCommitPending = false;
    }
  }

  /**
   * The post-commit step (see `requestGameStart` above). Fully synchronous,
   * fully unchanged from before this integration — every existing caller
   * (production, now routed through `requestGameStart`; every pre-existing
   * test, calling this directly) sees identical behavior.
   */
  startGame(socketId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    // The one bypass check that must live HERE, not only in
    // `requestGameStart`: without it, a caller that skips the pre-commit
    // gate and invokes this method directly would start a real match with
    // no economy commitment at all whenever `economyService` IS configured
    // — exactly the "alternate emit" bypass Phase 2's "no bypasses" rule
    // exists to close. Inert (this branch never taken) for the ~100
    // pre-existing tests that construct RoomManager without an
    // EconomyService — see the constructor's own doc comment.
    if (this.economyService && !room.currentMatchId) {
      this.io.sockets.sockets.get(socketId)?.emit(
        "room:error",
        "This match has not been paid for yet. Use requestGameStart, not startGame, when Economy V1 is enabled.",
      );
      return;
    }
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
        const taken = new Set(
          [...room.players.values()].map((p) => p.penColor).filter(Boolean)
        );
        const freeColors = DOTSBOXES_COLORS.filter((c) => !taken.has(c));
        let freeIdx = 0;
        for (const p of playersList) {
          if (!p.penColor && freeIdx < freeColors.length) {
            p.penColor = freeColors[freeIdx++];
          }
        }
      }
      if (engine instanceof StarGameEngine) {
        engine.setOptions(room.starGameOptions);
      }
      if (engine instanceof UnoEngine) {
        engine.setOptions(room.unoOptions);
      }
      if (engine instanceof BingoEngine) {
        engine.setOptions(room.bingoOptions);
      }
      if (engine instanceof TambolaEngine) {
        engine.setOptions(room.tambolaOptions);
      }
      if (engine instanceof NamePlaceAnimalEngine) {
        engine.setOptions(room.namesplaceanimalOptions);
      }
      if (engine instanceof CarromEngine) {
        engine.setOptions(room.carromOptions);
      }
      if (engine instanceof ChessEngine) {
        engine.setOptions(room.chessOptions);
      }
      if (engine instanceof SnakeEngine) {
        engine.setOptions(room.snakeOptions);
      }
      if (engine instanceof BlockBlastEngine) {
        engine.setOptions(room.blockBlastOptions);
      }
      if (engine instanceof SpaceWarEngine) {
        engine.setOptions(room.spaceWarOptions);
      }
      engine.init(playersList);
      room.engine = engine;
      room.phase = "playing";
      this.transitionLifecycle(room, "IN_PROGRESS", "Game started");
      serverTimelineRecorder.recordGameStarted(room.code, room.game, playersList.length);
      metricsCollector.onMatchStarted(room.game, playersList.length);
      this.emitRummyBotTells(room);
      this.broadcastRoomState(room);
      this.broadcastGameState(room);
      this.armTakeoversForAbsentSeats(room);
      this.scheduleInitialTurnTimer(room);
      this.startSimulation(room);
      this.scheduleBotMoveIfNeeded(room);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      this.io.sockets.sockets.get(socketId)?.emit("room:error", msg);
    }
  }

  applyMove(socketId: string, type: string, data: unknown, onBehalfOf?: string, actionId?: string): void {
    const moveStart = performance.now();
    const { room, player } = this.lookup(socketId);
    if (!room || !player || !room.engine) return;

    // Backstop against a late-arriving or replayed move reaching a room
    // that is not currently mid-match (lobby, finished, or between a
    // rematch settling) — Core Principle #5 ("completed matches cannot be
    // reopened by stale events") / Edge Case 20. Before this, the only
    // thing standing between a stale move and a "finished" room's engine
    // state was each of the 17 engines individually remembering its own
    // phase check inside applyMove; one missing check would have let a
    // late move silently mutate a match that already ended (see
    // MULTIPLAYER-RELIABILITY-BASELINE.md gap G4). This is a coarse,
    // room-level gate — it does not replace per-engine turn/phase
    // validation (whose-turn-is-it, arranging vs. playing sub-phases).
    if (room.phase !== "playing") {
      console.log(
        `[move] rejected room=${room.code} game=${room.game} type=${type} player=${player.id} error=Room is not in an active match (phase=${room.phase})`
      );
      this.io.sockets.sockets.get(socketId)?.emit("game:error", "Match is not active");
      return;
    }

    // Platform-level idempotency protection against slow mobile connections & rapid taps
    if (actionId && typeof actionId === "string") {
      const actionKey = `${player.id}:${actionId}`;
      const now = Date.now();
      const previousTs = room.processedActionIds.get(actionKey);
      if (previousTs && now - previousTs < 15_000) {
        logger.info({
          message: `Idempotency filter: ignoring duplicate action ${actionId} for player ${player.id} in room ${room.code}`,
          module: "IDEMPOTENCY",
          roomCode: room.code,
          playerId: player.id,
        });
        // Immediately push authoritative state back to caller to confirm resolution
        this.broadcastGameState(room);
        return;
      }
      room.processedActionIds.set(actionKey, now);
      if (room.processedActionIds.size > 200) {
        for (const [k, ts] of room.processedActionIds.entries()) {
          if (now - ts > 30_000) room.processedActionIds.delete(k);
        }
      }
    }

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
    metricsCollector.onMoveProcessed(room.game, type, performance.now() - moveStart);
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
    // Accepted move → somebody is definitely at this seat.
    this.noteActivity(room, effectivePlayerId);
    serverTimelineRecorder.recordMoveMade(room.code, effectivePlayerId, room.game, type);
    this.broadcastGameState(room);
    if (room.engine.isOver()) {
      this.finalizeMatch(room);
    } else {
      this.scheduleTurnTimer(room);
      this.scheduleBotMoveIfNeeded(room);
    }
  }

  /**
   * Single source of truth for "a match just ended." MUST be the only
   * place that flips `room.phase` to `"finished"`, advances
   * `lifecycleState` to `COMPLETED`, and records the result into
   * profile/ranking/recent-players. `room.engine.isOver()` is checked
   * from four independent code paths (a direct move, a bot/takeover
   * sub-move, a real-time simulation tick, and a turn-timeout auto-move)
   * — before this method existed, three of those four set `room.phase`
   * directly and skipped recording + the lifecycle transition entirely,
   * so a match that ended by timeout, bot-takeover, or a real-time
   * engine (Snake/Carrom/SpaceWar) finishing left no match history, no
   * XP, no achievements, and a `lifecycleState` stuck at whatever it was
   * before (see MULTIPLAYER-RELIABILITY-BASELINE.md gaps G1/G2). Callers
   * that own an interval/timer of their own (e.g. `startSimulation`)
   * must stop it themselves before calling this — this method does not
   * know about timers it didn't set.
   */
  /**
   * `departedPlayer`: set only by `leaveRoom`'s forfeit-completion call
   * site, where the departing player has ALREADY been removed from
   * `room.players` by the time this runs (every other check in that
   * function needs them already gone — see the capture site's own
   * comment). Used for economy settlement only (`queueMatchSettlement`) —
   * `profileService`/`recentPlayersService` below are unchanged, matching
   * their existing, already-shipped, non-economy behavior of recording
   * whoever is still seated at the moment the match ends.
   */
  private finalizeMatch(room: Room, departedPlayer?: Player): void {
    room.phase = "finished";
    this.transitionLifecycle(room, "COMPLETED", "Match finished");
    serverTimelineRecorder.recordGameFinished(room.code, room.game, (room.engine as any).getWinner?.() ?? null);
    metricsCollector.onMatchFinished(room.game, 0);
    try {
      const winnerId = (room.engine as any).getWinner?.() ?? undefined;
      const participants = Array.from(room.players.values()).map((p) => ({
        playerId: p.id,
        name: p.name,
        avatar: p.avatar,
        isWinner: Boolean(winnerId && p.id === winnerId),
        isBot: p.isBot,
      }));
      profileService.recordMatchFinished({
        roomCode: room.code,
        game: room.game,
        startedAt: room.createdAt,
        finishedAt: Date.now(),
        durationMs: Math.max(1000, Date.now() - room.createdAt),
        winnerId: winnerId ?? undefined,
        participants,
      });
      recentPlayersService.recordMatch({
        roomCode: room.code,
        game: room.game,
        participants,
      });
      rankingService.invalidateCache();
    } catch (err) {
      logger.warn({ message: `Failed to record match in profile/ranking service: ${String(err)}`, module: "PROFILE" });
    }
    this.queueMatchSettlement(room, departedPlayer);
    for (const p of room.players.values()) p.isReady = false;
    this.clearTurnTimer(room);
    this.broadcastRoomState(room);
    // Cheapest possible version of UNO_GAME_PLAN.md §3's "measurable now"
    // match-completion metric — a queryable log line, not a real
    // analytics pipeline (still correctly deferred, needs accounts/
    // persistence). Generic across every game for the same reason as the
    // move-rejection log above.
    console.log(`[match] finished room=${room.code} game=${room.game} players=${room.players.size}`);
  }

  /**
   * The one and only settlement call site — every `finalizeMatch` caller
   * (all 6, see `roommanager-integration-map.md`) routes through here.
   * Calls `EconomyService.settleMatchEconomy` only, never
   * `EconomyRepository` — queued (see `EconomySettlementQueue`'s own doc
   * comment for why), so `finalizeMatch` itself stays fully synchronous.
   *
   * No-op when `economyService` isn't configured, or when this room never
   * had a committed match (`currentMatchId` is `null` — a room whose game
   * started before economy gating was configured, or one that finished
   * via a path that never reached `requestGameStart`, e.g. a test calling
   * `startGame` directly).
   */
  private queueMatchSettlement(room: Room, departedPlayer?: Player): void {
    if (!this.settlementQueue || !room.currentMatchId) return;
    const matchId = room.currentMatchId;
    room.currentMatchId = null; // the slot is free the moment this is queued — a rematch mints its own fresh matchId

    // A forfeit-by-leaving completes the match with the departing player
    // ALREADY removed from `room.players` (see `leaveRoom`) — added back
    // here, for settlement extraction only, so the roster still matches the
    // committed seat count instead of coming up one short.
    const rosterForSettlement = departedPlayer ? new Map(room.players).set(departedPlayer.id, departedPlayer) : room.players;

    const { isValidRanking, participants, reason } = extractRankedParticipants({
      game: room.game,
      players: rosterForSettlement,
      engine: room.engine,
    });

    this.settlementQueue.queueSettlement(
      isValidRanking
        ? { matchId, isValidRanking: true, participants }
        : { matchId, isValidRanking: false, participants: [], refundReason: reason ?? "Ranking unavailable or ambiguous" },
    );
  }

  /**
   * Failover / host election when a host departs or is reaped.
   * Prioritizes:
   * 1. Active, connected member player (not a bot, not a guest, not away)
   * 2. Active, connected guest player (seals the room as guests cannot gather)
   * 3. Any remaining human player
   * If no human players remain, transitions room towards abandonment.
   */
  private reassignHost(room: Room, departingPlayerId: string): void {
    if (room.hostId !== departingPlayerId) return;

    const remainingSeats = [...room.players.values()].filter(
      (p) => p.id !== departingPlayerId && !p.isLocal && !p.isBot
    );

    if (remainingSeats.length === 0) {
      if (!this.hasHumanPlayer(room)) {
        this.abandonRoom(room);
      }
      return;
    }

    const nextHost =
      remainingSeats.find((p) => !p.isGuest && !p.awayUntil) ??
      remainingSeats.find((p) => !p.awayUntil) ??
      remainingSeats.find((p) => !p.isGuest) ??
      remainingSeats[0];

    if (nextHost) {
      room.hostId = nextHost.id;
      for (const p of room.players.values()) {
        p.isHost = p.id === nextHost.id;
      }
      logger.info({
        message: `Host failover: reallocated room ${room.code} host from ${departingPlayerId} to ${nextHost.name} (${nextHost.id})`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
        playerId: nextHost.id,
      });
      const msg: ChatMessage = {
        id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        playerId: "system",
        playerName: "BHALYAM Lounge",
        text: `👑 ${nextHost.name} is now the room host.`,
        ts: Date.now(),
      };
      this.io.to(room.code).emit("chat:message", msg);
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

    /**
     * Nobody is at the table — do not play it out.
     *
     * Without this, a two-player room where both humans drop simultaneously
     * would run to completion at bot pace and they would each reconnect to a
     * finished match. Waiting is correct: the 90s cleanup still resolves the
     * room if they genuinely never return.
     */
    if (!this.hasConnectedHuman(room)) return;

    const pending = engine.pendingActors();
    /**
     * Bots AND seats the server has taken over. A dropped player is driven by
     * exactly the same machinery, which is why the takeover works in every
     * game without a single engine change: all ten implement `applyAutoMove`,
     * and each one's `getBotThinkDelayMs` keeps the pacing natural rather than
     * making the absent player look like they are slamming buttons.
     */
    const botActors = pending.filter(
      (id) => room.players.get(id)?.isBot || this.isAutoDriven(room, id),
    );
    if (botActors.length === 0) return;

    /**
     * Does a PRESENT human still have a clock of their own running?
     *
     * If so, keep it (RPS, where both players choose simultaneously, would
     * otherwise lose the human's deadline the moment the bot became ready).
     * If not, pause — the auto-driver owns this beat. A taken-over seat is
     * not a waiting human.
     *
     * Bingo answers "no" regardless, because its timer is the number CALLER,
     * not anybody's deadline. Its pending list means "holds a winning board",
     * and once humans started appearing in that list the caller stopped
     * pausing during a claim — so at a fast interval the deck could run dry
     * before the claim landed and the round ended with no winner at all.
     */
    const humansPending = pending.some(
      (id) => !room.players.get(id)?.isBot && !this.isAutoDriven(room, id)
    );
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

      // Re-checked at FIRE time, not just at schedule time: the whole point of
      // a takeover is that it ends the instant the player is back, and a
      // reconnect landing inside this delay must not have their move played
      // for them a beat later.
      if (!this.hasConnectedHuman(room)) return;
      const stillPending = actors.call(engine).filter(
        (id) => room.players.get(id)?.isBot || this.isAutoDriven(room, id),
      );
      const botId = stillPending[0];
      if (!botId) {
        // Pending list shifted between scheduling and firing (the human
        // discarded into a different bot, or the away player reconnected).
        // Fall through to a fresh pass to pick up whoever is next.
        this.scheduleBotMoveIfNeeded(room);
        return;
      }

      if (!engine.isOver()) {
        // Count only sub-moves played for a HUMAN's seat — a bot's own turns
        // are not something anybody needs reporting back to them.
        if (this.isAutoDriven(room, botId)) {
          room.autoPlayedFor.set(botId, (room.autoPlayedFor.get(botId) ?? 0) + 1);
        }
        apply.call(engine, botId);
      }
      this.broadcastGameState(room);

      if (engine.isOver()) {
        this.finalizeMatch(room);
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
      serverLifecycleRegistry.unbindTimer(room.code, "turn_timer");
      room.turnTimer = null;
    }
  }

  /** Fixed shuffle+deal animation Rummy/UNO always play once the rotation
   *  gate clears — settle(600) + shuffle(900) + deal(900) in rotation-sync.tsx,
   *  rounded up. Kept as one constant so both games' opener timings can
   *  drift without this needing to track each one exactly. */
  private static readonly DEAL_GATE_ANIM_MS = 2_500;
  /** Upper bound on how long the very first turn's clock will wait on a
   *  player's needsRotation before arming anyway — same worst case as
   *  before this fix (immediate arm), never worse, but gives a real
   *  chance for someone to actually rotate their phone first. */
  private static readonly DEAL_GATE_MAX_WAIT_MS = 20_000;

  /**
   * Rummy and UNO hold the board behind a synchronized "wait for everyone to
   * rotate, then replay shuffle + deal" opener for a match's very first turn
   * (see client/src/games/rummy/rotation-sync.tsx, mirrored by UNO's own
   * rotation-sync.tsx) — a full-screen, input-blocking sequence lasting
   * ~2.4s in the common case, or indefinitely if a player's device won't
   * rotate.
   *
   * scheduleTurnTimer used to arm that first deadline the instant
   * engine.init() ran, with zero awareness of the client sequence, so a
   * player could lose seconds — or their entire turn, if stuck on the
   * rotate prompt — before the board was ever reachable. This defers the
   * first arm until the same `needsRotation` signal the client gate already
   * waits on resolves (or the safety net above fires), then adds the fixed
   * animation pause, so the deadline lines up with when the board actually
   * becomes interactive instead of when the server happened to finish init.
   *
   * Only the initial lobby -> playing transition (startGame) needs this: a
   * rematch/next round never re-arms the client's `justStarted` flag
   * (Room.tsx only sets it when the previous phase was "lobby"), so it never
   * replays the gate and can keep calling scheduleTurnTimer directly.
   */
  private scheduleInitialTurnTimer(room: Room): void {
    if (room.game !== "rummy" && room.game !== "uno") {
      this.scheduleTurnTimer(room);
      return;
    }
    const stillBlocking = Array.from(room.players.values()).some(
      (p) => p.isConnected && !p.isBot && p.needsRotation,
    );
    if (!stillBlocking) {
      this.armInitialTurnTimer(room);
      return;
    }
    room.dealGateWaitTimer = setTimeout(() => {
      room.dealGateWaitTimer = null;
      this.armInitialTurnTimer(room);
    }, RoomManager.DEAL_GATE_MAX_WAIT_MS);
  }

  /** Clears the rotation-wait leg (if pending) and starts the fixed
   *  shuffle+deal animation pause, at the end of which the first turn timer
   *  actually arms — called either once nobody's blocking anymore, or once
   *  the safety-net wait expires. */
  private armInitialTurnTimer(room: Room): void {
    if (room.dealGateWaitTimer) {
      clearTimeout(room.dealGateWaitTimer);
      room.dealGateWaitTimer = null;
    }
    if (room.dealGateAnimTimer) return; // already counting down
    room.dealGateAnimTimer = setTimeout(() => {
      room.dealGateAnimTimer = null;
      if (room.phase === "playing") this.scheduleTurnTimer(room);
    }, RoomManager.DEAL_GATE_ANIM_MS);
  }

  private clearDealGateTimers(room: Room): void {
    if (room.dealGateWaitTimer) {
      clearTimeout(room.dealGateWaitTimer);
      room.dealGateWaitTimer = null;
    }
    if (room.dealGateAnimTimer) {
      clearTimeout(room.dealGateAnimTimer);
      room.dealGateAnimTimer = null;
    }
  }

  /**
   * Server-owned simulation loop for real-time games.
   *
   * Action games used to advance because the CLIENT emitted a `tick` move on
   * a setInterval — so the simulation rate was whatever the player's browser
   * said it was. A modified client could slow the world to a crawl and dodge
   * everything, or stop ticking to freeze a losing position. That is the
   * "no client trust" principle inverted.
   *
   * Engines opt in by declaring `tickRateHz` (see GameEngine). The room owns
   * the interval; the client only sends intent and renders what returns.
   */
  private startSimulation(room: Room): void {
    this.stopSimulation(room);
    const engine = room.engine;
    if (!engine || !isRealtimeEngine(engine)) return;

    const periodMs = this.periodFor(engine)!;
    /**
     * Wall-clock catch-up.
     *
     * `setInterval(33)` does not fire every 33ms. Windows has a ~15.6ms timer
     * granularity, so it fires at 46.7 — measured, with an empty callback, so
     * it is the clock and not our work. Space War therefore simulated at 21Hz
     * while declaring 30, which is not merely late: the ship advances a fixed
     * 7px per tick, so the whole game ran at 70% speed with a third fewer
     * positions to interpolate between. That coarser source is what was left
     * of the stutter once the render loop was smooth.
     *
     * Stepping until the simulation catches up with elapsed real time makes
     * pace independent of the platform's timer. This is the standard fixed-
     * timestep loop, and it is MORE correct for physics (Carrom) than a
     * variable one, not less.
     */
    let simulatedUntil = Date.now();
    /** Ceiling per wake-up. Without it, a stalled process wakes and tries to
     *  replay the whole gap at once — the spiral of death. */
    const MAX_CATCHUP_STEPS = 4;

    room.simTimer = setInterval(() => {
      // The room may have ended or been torn down between ticks.
      if (room.phase !== "playing" || !room.engine) {
        this.stopSimulation(room);
        return;
      }
      const now = Date.now();
      let steps = Math.floor((now - simulatedUntil) / periodMs);
      if (steps < 1) return; // woke early; nothing is owed yet
      if (steps > MAX_CATCHUP_STEPS) {
        // Long stall (GC, a suspended container). Skip the debt rather than
        // fast-forwarding the match through it.
        steps = 1;
        simulatedUntil = now;
      } else {
        simulatedUntil += steps * periodMs;
      }

      let result;
      try {
        for (let i = 0; i < steps; i++) {
          result = (room.engine as RealtimeEngine).simulateTick();
          if (result?.isOver || room.engine.isOver()) break;
        }
      } catch (err) {
        // A crashing simulation must not leave a runaway interval behind.
        logger.error({
          message: `Simulation tick failed for ${room.game}: ${String(err)}`,
          module: "SIMULATION",
        });
        this.stopSimulation(room);
        return;
      }
      this.broadcastGameState(room);
      if (result?.isOver || room.engine.isOver()) {
        // Same finish sequence every other completion path uses — see
        // finalizeMatch. stopSimulation is specific to this path (only the
        // real-time tick loop owns an interval to tear down).
        this.stopSimulation(room);
        this.finalizeMatch(room);
      } else if (result?.turnPhaseChanged) {
        // A real-time physics turn (e.g., Carrom strike) just completed and returned to aiming phase.
        // Re-arm turn timers and trigger bot scheduler so bot/taken-over seats take their turn!
        this.scheduleTurnTimer(room);
        this.scheduleBotMoveIfNeeded(room);
      } else if (this.periodFor(room.engine) !== periodMs) {
        /**
         * The engine changed its own pace mid-game.
         *
         * Snake speeds up as the snake grows, and that is the entire point
         * of the speed-progression option — but `setInterval` was armed once
         * with the opening rate and never revisited, so the game published a
         * `speedMs` that fell steadily while actually stepping at a fixed
         * rate forever. Clients interpolate their motion over the published
         * number, so the two drifted apart and the board stuttered.
         *
         * Re-arming is generic rather than Snake-specific: any engine whose
         * `tickRateHz` is a getter now gets an honest loop.
         */
        this.startSimulation(room);
      }
      // Aim below the period: an over-long OS tick is then corrected by the
      // next wake-up instead of compounding.
    }, Math.max(8, Math.floor(periodMs / 2)));
  }

  /** The interval an engine is currently asking for, in ms. */
  private periodFor(engine: GameEngine | null): number | null {
    if (!engine || !isRealtimeEngine(engine)) return null;
    return Math.max(20, Math.round(1000 / engine.tickRateHz));
  }

  private stopSimulation(room: Room): void {
    if (room.simTimer) {
      clearInterval(room.simTimer);
      serverLifecycleRegistry.unbindInterval(room.code, "simulation");
      room.simTimer = null;
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
    this.transitionLifecycle(room, "ABANDONED", "All humans departed");
    this.queueMatchRefund(room, "Room abandoned mid-match — all human players departed");
    serverTimelineRecorder.recordPlayerLeft(room.code, "system", "room_abandoned");
    metricsCollector.onRoomAbandoned(room.game);
    this.clearTurnTimer(room);
    this.clearDealGateTimers(room);
    this.stopSimulation(room);
    this.clearRematchTimers(room);
    for (const t of room.cleanupTimers.values()) clearTimeout(t);
    room.cleanupTimers.clear();
    for (const t of room.takeoverTimers.values()) clearTimeout(t);
    room.takeoverTimers.clear();
    this.transitionLifecycle(room, "CLOSED", "Room destroyed");
    serverLifecycleRegistry.cleanupRoom(room.code);
    metricsCollector.onRoomClosed(room.game);
    this.rooms.delete(room.code);
  }

  /**
   * The one and only refund call site for room-teardown cancellation
   * (`abandonRoom`'s 3 call sites — see `roommanager-integration-map.md`).
   * Calls `EconomyService.refundMatchEntry` only, queued for the same
   * "no player-visible action is waiting on this" reason settlement is
   * (`EconomySettlementQueue`'s doc comment).
   *
   * Guards on `currentMatchId !== null` rather than `room.phase ===
   * "playing"` deliberately — a match committed via `requestGameStart` but
   * never actually started (the interleaving edge case documented on that
   * method) still owes a refund even though `phase` never became
   * `"playing"`. `MatchAlreadySettledError` (a real race: the match
   * finished in the gap between whatever triggered abandonment and this
   * call executing) is not a bug — `EconomySettlementQueue` logs it as a
   * failed queue item like any other rejection; the settlement already has
   * a legitimate `SETTLED` outcome and nothing further is owed.
   */
  private queueMatchRefund(room: Room, reason: string): void {
    if (!this.settlementQueue || !room.currentMatchId) return;
    const matchId = room.currentMatchId;
    room.currentMatchId = null;
    this.settlementQueue.queueRefund(matchId, reason);
  }

  /** True while at least one seated player is a real human (not a bot). */
  private hasHumanPlayer(room: Room): boolean {
    return [...room.players.values()].some((p) => !p.isBot);
  }

  /** True when someone OTHER than `playerId` is a human in this room. */
  private hasOtherHuman(room: Room, playerId: string): boolean {
    return [...room.players.values()].some((p) => !p.isBot && p.id !== playerId);
  }

  /* ── Disconnect takeover ────────────────────────────────────────────────
     A seat with no live socket behind it still has to take its turns, or the
     table stops. These four helpers are the whole mechanism; the scheduler
     and the turn timer below just consult them. */

  /**
   * True while at least one human is actually AT the table right now.
   *
   * Gates every form of auto-play. Without it, a two-player game where both
   * humans briefly drop would play itself to completion in a few seconds of
   * bot moves, and they would both reconnect to a finished match they never
   * saw. When nobody is watching, the right thing is to wait — the 90s
   * cleanup still resolves the room if they truly never come back.
   */
  private hasConnectedHuman(room: Room): boolean {
    return [...room.players.values()].some((p) => !p.isBot && p.isConnected);
  }

  /**
   * Is this seat currently being driven by the server?
   *
   * Pass-and-play seats have no socket of their own — the host's socket emits
   * for them — so they follow the HOST's connection, not their own flag
   * (which is permanently true). Without that, a host dropping would freeze
   * every local seat at their table with no way to resolve them.
   */
  private isAutoDriven(room: Room, playerId: string): boolean {
    const p = room.players.get(playerId);
    if (!p || p.isBot) return false;
    if (p.isLocal) {
      const host = room.players.get(room.hostId);
      return !!host?.isAutoPlaying;
    }
    return p.isAutoPlaying === true;
  }

  /**
   * Promote a disconnect into a takeover once the blip window has passed.
   * Idempotent: re-arming for a seat that is already covered is a no-op.
   */
  private armTakeover(room: Room, playerId: string): void {
    if (room.takeoverTimers.has(playerId)) return;
    const timer = setTimeout(() => {
      const stillRoom = this.rooms.get(room.code);
      if (!stillRoom) return;
      stillRoom.takeoverTimers.delete(playerId);
      const p = stillRoom.players.get(playerId);
      // Reconnected inside the window — nothing to do, which is the case this
      // grace period exists for.
      if (!p || p.isConnected || p.isBot) return;
      p.isAutoPlaying = true;
      p.autoPlayReason = "disconnected";
      this.systemMessage(
        stillRoom,
        `${p.name} lost connection — playing their turns until they're back.`,
      );
      this.broadcastRoomState(stillRoom);
      // Their turn may already be sitting on the table.
      this.scheduleBotMoveIfNeeded(stillRoom);
    }, TAKEOVER_GRACE_MS);
    room.takeoverTimers.set(playerId, timer);
  }

  /**
   * Cover every seat that is ALREADY absent as play begins.
   *
   * `handleDisconnect` only arms a takeover mid-game, which misses the case
   * that actually happens most: someone drops in the lobby, the host starts
   * anyway, and that seat has never had a socket to lose. Without this the
   * table would wait out a full turn timer for them on the very first lap.
   */
  private armTakeoversForAbsentSeats(room: Room): void {
    for (const p of room.players.values()) {
      if (p.isBot || p.isConnected) continue;
      this.armTakeover(room, p.id);
    }
  }

  /**
   * Record that a turn deadline lapsed, and promote the seat if it keeps
   * happening.
   *
   * Called from `onTurnTimeout` BEFORE the engine resolves the turn, using
   * `pendingActors()` — the engine's own answer to "who was I waiting on".
   * Bots are skipped (they never time out) and so are seats already covered.
   */
  private recordTurnTimeout(room: Room): void {
    const engine = room.engine;
    if (!engine || typeof engine.pendingActors !== "function") return;
    /**
     * Bingo's "turn timer" is the number caller, not a turn deadline — it
     * fires every few seconds regardless of what anyone does. Counting those
     * would mark every present player idle within a lap.
     */
    if (engine instanceof BingoEngine) return;
    /**
     * Same reasoning for Block Blast: its timer is the race deadline, not
     * anybody's turn. Everyone still playing is in `pendingActors` when it
     * fires, so counting it would hand every active player an idle strike for
     * the crime of being alive at the final whistle.
     */
    if (engine instanceof BlockBlastEngine) return;

    let stalled: string[] = [];
    try {
      stalled = engine.pendingActors();
    } catch {
      return;
    }
    let promoted = false;
    for (const pid of stalled) {
      const p = room.players.get(pid);
      if (!p || p.isBot || p.isAutoPlaying) continue;
      const strikes = (room.idleStrikes.get(pid) ?? 0) + 1;
      room.idleStrikes.set(pid, strikes);
      if (strikes < IDLE_STRIKES_BEFORE_TAKEOVER) continue;
      p.isAutoPlaying = true;
      p.autoPlayReason = "idle";
      promoted = true;
      this.systemMessage(
        room,
        `${p.name} isn't responding — playing their turns until they're back.`,
      );
    }
    /**
     * The flag lives on the ROSTER, and the rest of this path only ever
     * broadcasts GAME state — so without this the takeover was real on the
     * server and invisible on every client. The table would see that player's
     * moves happening with no explanation at all, which is the one thing this
     * whole feature exists to prevent.
     */
    if (promoted) this.broadcastRoomState(room);
  }

  /**
   * Any move at all proves somebody is there. Clears the strike count and
   * ends an idle takeover on the spot — there is nothing to dismiss and no
   * "I'm back" button to find, you just play.
   *
   * Deliberately does NOT end a "disconnected" takeover: those belong to the
   * reconnect path, and a move arriving for a seat with no socket would mean
   * something has gone wrong rather than that they are back.
   */
  /**
   * ANY inbound event from a seated socket counts as "somebody is there".
   *
   * An accepted move is not enough, and relying on it created a trap with no
   * way out. Picture the reported case: you come back, it is somebody else's
   * turn, you click the dice — the client does not even emit, because the
   * roll button is gated on `canRoll`. Nothing reaches the server, so the
   * takeover stands. Then your own turn arrives and the auto-player resolves
   * it within a few hundred milliseconds, long before a human who is still
   * reading the board can act. There is no moment at which you can prove you
   * are back, so the seat stays on autopilot for the rest of the match.
   *
   * Fail-open is deliberate here. A false "present" costs one turn timer, and
   * self-corrects after two strikes; a false "away" locks a player out of
   * their own game indefinitely. Those are not close.
   */
  noteSocketActivity(socketId: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    this.noteActivity(room, player.id);
  }

  private noteActivity(room: Room, playerId: string): void {
    room.idleStrikes.delete(playerId);
    const p = room.players.get(playerId);
    if (!p?.isAutoPlaying || p.autoPlayReason !== "idle") return;
    p.isAutoPlaying = false;
    delete p.autoPlayReason;
    this.systemMessage(room, `${p.name} is back — they have the table again.`);
    this.broadcastRoomState(room);
  }

  /** Drop every per-seat timer and counter for a seat that is going away. */
  private forgetSeatTimers(room: Room, playerId: string): void {
    const takeover = room.takeoverTimers.get(playerId);
    if (takeover) {
      clearTimeout(takeover);
      room.takeoverTimers.delete(playerId);
    }
    const cleanup = room.cleanupTimers.get(playerId);
    if (cleanup) {
      clearTimeout(cleanup);
      room.cleanupTimers.delete(playerId);
    }
    room.idleStrikes.delete(playerId);
    room.autoPlayedFor.delete(playerId);
  }

  /** Hand the seat back. Called the instant a socket reclaims it. */
  private releaseTakeover(room: Room, playerId: string): void {
    const timer = room.takeoverTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.takeoverTimers.delete(playerId);
    }
    // A fresh socket also wipes the idle count: whatever made them slow before
    // they dropped, they are demonstrably here now.
    room.idleStrikes.delete(playerId);
    const p = room.players.get(playerId);
    if (!p?.isAutoPlaying) return;
    p.isAutoPlaying = false;
    delete p.autoPlayReason;
    this.systemMessage(room, `${p.name} is back — they have the table again.`);
  }

  /**
   * Tell the RETURNING player what happened while they were gone.
   *
   * Everyone else already knows: they watched the takeover announcement and
   * the Auto badge on that seat. The one person with no idea is the player it
   * happened to — chat is not replayed on rejoin, so they land on a board
   * that has moved without them and nothing on screen explains why. That is
   * backwards, and it is the same gap whether they were away ten seconds or a
   * minute.
   *
   * Sent only to the reconnecting socket, and only when their seat was
   * actually played: a clean reconnect inside the blip window has nothing to
   * report and should stay silent.
   */
  private greetReturningPlayer(socketId: string, movesPlayedForThem: number): void {
    if (movesPlayedForThem <= 0) return;
    const turns = movesPlayedForThem === 1 ? "1 turn was" : `${movesPlayedForThem} turns were`;
    this.io.sockets.sockets.get(socketId)?.emit("chat:message", {
      id: `sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      playerId: "system",
      playerName: "Table",
      text: `Welcome back — ${turns} played for you while you were away.`,
      ts: Date.now(),
    });
  }

  /**
   * Re-settle the table after WHO IS AT IT changes — a reconnect, a quit, or
   * a seat reaped at the end of its grace window.
   *
   * All three paths used to leave the room half-updated in the same way, and
   * for the same reason: they told everyone about the new roster and then
   * stopped, on the assumption that whatever timer was already running would
   * carry the game. It does not.
   *
   *   • RECONNECT — both auto-play paths refuse to run while no human is
   *     connected and neither re-arms itself, so a room that briefly emptied
   *     has a dead turn timer and no pending tick. Re-arming only for the
   *     returning seat is not enough either: the table is usually waiting on
   *     somebody else, who has no live socket to nudge it.
   *
   *   • QUIT / REAP — the engine advances the turn off the departed seat, but
   *     the clock still belongs to the turn they were taking. If the turn
   *     lands on a bot or a taken-over seat, nothing moves until that stale
   *     timer happens to fire — up to a full turn later, with no explanation.
   *     Clients were not even sent the new game state, so the board went on
   *     showing a player who had already gone.
   *
   * `scheduleTurnTimer` clears any existing timer first, so calling this when
   * nothing was actually stuck is harmless.
   */
  private resumeTable(room: Room): void {
    if (room.phase !== "playing" || !room.engine) return;
    this.broadcastGameState(room);
    this.scheduleTurnTimer(room);
    // Real-time engines have their loop stopped while the table is
    // unattended (see handleDisconnect), so resuming has to start it again.
    // Without this a returning solo player gets a board that never ticks.
    this.startSimulation(room);
    this.scheduleBotMoveIfNeeded(room);
  }

  /**
   * A line from the table itself. Carries a reserved `playerId` no real seat
   * can hold, so the existing chat views render it without special-casing and
   * nobody's "is this mine?" check ever matches it.
   */
  private systemMessage(room: Room, text: string): void {
    this.io.to(room.code).emit("chat:message", {
      id: `sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      playerId: "system",
      playerName: "Table",
      text,
      ts: Date.now(),
    });
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
    /**
     * Block Blast has no turns at all — everybody places at their own pace.
     * The only clock in the game is the race deadline, and it is ONE absolute
     * timestamp fixed at `init`.
     *
     * This branch is re-entered after every placement (and every bot move),
     * so it must re-derive the remaining time from that fixed deadline rather
     * than start a fresh window. Arming a new N-second timer here would mean
     * the race never ends as long as anyone keeps playing — which is exactly
     * the population that would still be playing.
     *
     * Solo returns null and gets no timer: an endless game has nothing to
     * count down, and a heartbeat firing at an idle player is pure battery.
     */
    if (room.engine instanceof BlockBlastEngine) {
      const deadline = room.engine.getRaceDeadline();
      if (deadline == null || room.engine.isOver()) return;
      room.turnTimer = setTimeout(
        () => this.onTurnTimeout(room),
        Math.max(0, deadline - Date.now()),
      );
      return;
    }
    if (room.engine instanceof BingoEngine) {
      const engine = room.engine;
      const seconds = engine.getTurnTimerSeconds();
      if (seconds <= 0) {
        engine.clearTurnDeadline();
        this.broadcastGameState(room);
        return;
      }
      // The public field is `callDeadline`, not `turnDeadline` — reading the
      // wrong name here silently reset the window on every lock.
      const pub = engine.getPublicState() as { phase?: string; callDeadline?: number | null };
      let ms = Math.max(5, seconds) * 1000;
      // Arranging is ONE shared window for the table, so a player locking
      // their board must not restart the clock for everyone else. Rearming
      // per lock made an eight-seat room take eight windows to start; keep
      // whatever time is left on the existing deadline instead.
      if (pub.phase === "arranging" && pub.callDeadline && pub.callDeadline > Date.now()) {
        ms = pub.callDeadline - Date.now();
      } else {
        engine.setTurnDeadline(Date.now() + ms);
      }
      this.broadcastGameState(room);
      room.turnTimer = setTimeout(() => this.onTurnTimeout(room), ms);
      return;
    }
    // ── Phase-timer engines (quiz / countdown style) ─────────────────────
    // Name-Place-Animal and Tambola use the same armDeadline /
    // resolveDeadline / getPhaseTimerSeconds / clearDeadline contract as
    // StarGameEngine. Without these branches, no timer fires during
    // roundSummary and the game freezes after question 1.
    if (
      room.engine instanceof NamePlaceAnimalEngine ||
      room.engine instanceof TambolaEngine
    ) {
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
  }

  private onTurnTimeout(room: Room): void {
    if (room.phase !== "playing") return;
    /**
     * Same rule as the auto-play scheduler: never resolve turns for a table
     * nobody is sitting at. Previously the timer kept firing while every human
     * was disconnected, so a shared outage could burn through several rounds
     * before anyone got back.
     */
    if (!this.hasConnectedHuman(room)) return;
    // Before the engine resolves this turn for them, note WHO let it lapse —
    // afterwards the engine has moved on and that information is gone.
    this.recordTurnTimeout(room);
    // Full time on the race. Nobody timed out — the match simply ended.
    if (room.engine instanceof BlockBlastEngine) {
      const engine = room.engine;
      engine.finishOnDeadline();
      this.afterAutoMove(room, engine.isOver());
      return;
    }
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
    if (room.engine instanceof BingoEngine) {
      const engine = room.engine;
      if (engine.isOver()) return;
      const phase = (engine.getPublicState() as { phase?: string }).phase;
      if (phase === "arranging") {
        // The lock-in window is SHARED, not per player: everyone was given
        // the same deadline, so everyone still unlocked when it expires gets
        // locked at once. Auto-locking one player per expiry would make an
        // eight-seat table take eight windows to start.
        for (const pid of engine.pendingActors()) engine.applyAutoMove(pid);
      } else {
        const actorId = engine.getTimeoutActor();
        if (actorId) engine.applyAutoMove(actorId);
      }
      this.afterAutoMove(room, engine.isOver());
      return;
    }
    // ── Phase-timer engines (quiz / countdown style) ─────────────────────
    if (
      room.engine instanceof NamePlaceAnimalEngine ||
      room.engine instanceof TambolaEngine
    ) {
      const engine = room.engine;
      if (engine.isOver()) return;
      engine.resolveDeadline();
      this.afterAutoMove(room, engine.isOver());
      return;
    }
  }

  private afterAutoMove(room: Room, isOver: boolean): void {
    this.broadcastGameState(room);
    if (isOver) {
      this.finalizeMatch(room);
      return;
    }
    this.scheduleTurnTimer(room);
    this.scheduleBotMoveIfNeeded(room);
  }

  sendReaction(socketId: string, emoji: string, targetPlayerId?: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (!ALLOWED_REACTIONS.has(emoji)) return;

    // Spam guard. A targeted reaction lands on someone else's screen, so an
    // unthrottled sender could grief the whole table; 6 per 4s is generous for
    // real play and useless for flooding.
    const now = Date.now();
    const bucket = (this.reactionRate.get(player.id) ?? []).filter((t) => now - t < 4000);
    if (bucket.length >= 6) return;
    bucket.push(now);
    this.reactionRate.set(player.id, bucket);
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
   * Soundboard clip → everyone in the room.
   *
   * Mirrors `sendReaction`, with two deliberate differences: a stricter rate
   * budget (see SOUND_RATE_LIMIT), and the sender is told when their clip was
   * throttled. A silently-dropped sound is indistinguishable from a missing
   * audio file, so the sender needs to know which one happened.
   */
  sendSound(socketId: string, clipId: string, targetPlayerId?: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (!ALLOWED_SOUND_CLIPS.has(clipId)) return;

    const now = Date.now();
    const bucket = (this.soundRate.get(player.id) ?? []).filter(
      (t) => now - t < SOUND_RATE_LIMIT.windowMs,
    );
    if (bucket.length >= SOUND_RATE_LIMIT.max) return;
    bucket.push(now);
    this.soundRate.set(player.id, bucket);

    const validTarget = targetPlayerId && room.players.has(targetPlayerId) ? targetPlayerId : undefined;
    this.io.to(room.code).emit("room:sound", {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: player.id,
      clipId,
      targetPlayerId: validTarget,
      ts: Date.now(),
    });
  }

  /**
   * AI Coach — a private hint for the asking player.
   *
   * Engines opt in by implementing `getHint` (see CoachableEngine). A game
   * without one answers "not supported" rather than throwing, so adding the
   * button to a new game is a one-method change with no plumbing.
   *
   * The answer goes back through the ack to the asker alone: broadcasting it
   * would both leak the asker's hand and make needing help a public act.
   */
  requestHint(socketId: string, ack: (res: CoachHintResponse) => void): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) {
      ack({ ok: false, error: "Not in a room" });
      return;
    }
    if (room.phase !== "playing" || !room.engine) {
      ack({ ok: false, error: "No game in progress" });
      return;
    }
    const engine = room.engine as unknown as Partial<CoachableEngine>;
    if (typeof engine.getHint !== "function") {
      ack({ ok: false, error: "No coach for this game yet" });
      return;
    }
    try {
      const hint = engine.getHint(player.id);
      if (!hint) {
        ack({ ok: false, error: "Nothing to suggest right now" });
        return;
      }
      ack({ ok: true, hint });
    } catch (err) {
      // A coach that throws must never take the round down with it — the
      // hint is an optional convenience layered over a live game.
      logger.warn({
        message: `Coach failed for ${room.game}: ${String(err)}`,
        module: "COACH",
      });
      ack({ ok: false, error: "Could not work out a hint" });
    }
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
    serverTimelineRecorder.recordChatSent(room.code, player.id, trimmed.length);
  }

  /**
   * Attach a screen to a room (Smart TV / Party Mode).
   *
   * A spectator takes no seat, is not a Player, and cannot move — `applyMove`
   * resolves the mover through `socketToPlayer`, which a screen is never in,
   * so input is rejected by construction rather than by a permission check
   * somebody could later forget to write.
   */
  spectateRoom(socketId: string, code: string): { ok: boolean; error?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };
    // A socket cannot be both a player and a screen.
    if (this.socketToRoom.has(socketId)) return { ok: false, error: "Already seated in a room" };
    // A screen is still a second device arriving with a code. Sealing that
    // leaves no way to turn a solo practice table into a shared one by
    // pointing a TV at it.
    if (room.sealed) return { ok: false, error: SEALED_ROOM_ERROR };

    this.stopSpectating(socketId);
    room.spectators.add(socketId);
    this.spectatorToRoom.set(socketId, room.code);
    const socket = this.io.sockets.sockets.get(socketId);
    socket?.join(room.code);

    socket?.emit("room:state", this.toPublicState(room));
    if (room.engine) socket?.emit("game:state", room.engine.getPublicState());
    // Seated players see the count change immediately.
    this.broadcastRoomState(room);
    return { ok: true };
  }

  stopSpectating(socketId: string): void {
    const code = this.spectatorToRoom.get(socketId);
    if (!code) return;
    this.spectatorToRoom.delete(socketId);
    const room = this.rooms.get(code);
    if (!room) return;
    room.spectators.delete(socketId);
    this.io.sockets.sockets.get(socketId)?.leave(code);
    this.broadcastRoomState(room);
  }

  handleDisconnect(socketId: string): void {
    // A screen going dark is not a player leaving — no takeover, no seat
    // cleanup, no host migration. Handle and return before any of that runs.
    if (this.spectatorToRoom.has(socketId)) {
      this.stopSpectating(socketId);
      return;
    }
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return;

    const player = room.players.get(playerId);
    if (player) {
      player.isConnected = false;
      player.awaySince = Date.now();
      player.awayUntil = Date.now() + GRACE_PERIOD_MS;
    }
    room.socketToPlayer.delete(socketId);
    this.socketToRoom.delete(socketId);

    const soloHuman = !this.hasOtherHuman(room, playerId);

    // Start the clock on taking this seat over. Only mid-game: a lobby needs
    // no one to act, and a finished room has nothing left to play.
    //
    // NOT when this was the only human. Auto-play exists so one absent player
    // cannot stall everyone else, and with only bots left there is nobody to
    // stall. Playing their seat for them would mean returning to a game the
    // bots had already finished, which is a worse outcome than the wait.
    // Freezing the table instead means they come back to the exact position
    // they left.
    if (room.phase === "playing" && player && !player.isBot && !soloHuman) {
      this.transitionLifecycle(room, "RECOVERING", "Player disconnected, awaiting reconnect");
      serverTimelineRecorder.recordRecoveryStarted(room.code, playerId);
      this.armTakeover(room, playerId);
    } else if (room.phase === "playing" && soloHuman) {
      // Nothing should advance while the table is unattended: no turn
      // deadline expiring, no bots moving, no real-time engine ticking on.
      this.transitionLifecycle(room, "PAUSED", "Solo human disconnected");
      serverTimelineRecorder.recordRecoveryStarted(room.code, playerId);
      this.clearTurnTimer(room);
      this.stopSimulation(room);
    }

    /**
     * Which window applies depends on what the empty seat is actually
     * BLOCKING, not on who else is human.
     *
     * In a LOBBY the seat occupies a slot somebody else could use, so the
     * short window is right: drop it and let the table fill.
     *
     * In a MATCH it blocks nobody. Either the server is auto-playing it, so
     * the game progresses without them, or this was the only human and the
     * table is frozen. Either way, deleting the seat achieves nothing except
     * locking out the person trying to get back to it.
     *
     * Ninety seconds was far too short for a real network. A wifi-to-mobile
     * handoff measured on this very app took over 100 seconds to recover, so
     * the seat was routinely deleted while the player was still reconnecting.
     * They then rejoined as a BRAND NEW player with no progress, which is
     * exactly what "reconnecting does not work" looks like to real players.
     */
    const inMatch = room.phase === "playing";
    const graceMs = inMatch || soloHuman ? MATCH_GRACE_PERIOD_MS : GRACE_PERIOD_MS;
    // The client counts down to this, so it must be the real deadline.
    if (player) player.awayUntil = Date.now() + graceMs;

    // Narrate the reconnect path. Debugging this from a phone is otherwise
    // blind: the handset shows a banner and nothing else, so the server log
    // is the only place the decision (which grace window, did the table
    // freeze, was the seat reclaimed) is observable.
    logger.info({
      message: `Seat away: ${player?.name ?? playerId} - holding ${Math.round(graceMs / 1000)}s (${
        !inMatch
          ? "lobby, slot freed"
          : soloHuman
          ? "only human, table frozen"
          : "others waiting, auto-play armed"
      })`,
      module: "RECONNECT",
      roomCode: room.code,
      playerId,
    });

    const timer = setTimeout(() => {
      const stillRoom = this.rooms.get(code);
      if (!stillRoom) return;
      const stillPlayer = stillRoom.players.get(playerId);
      if (stillPlayer && !stillPlayer.isConnected) {
        // Captured before deletion — same reasoning as leaveRoom's own
        // departingPlayer snapshot, for the same economy settlement reason.
        const droppedPlayer = stillRoom.players.get(playerId);
        // The seat is going away entirely, so everything tracking it goes too.
        this.forgetSeatTimers(stillRoom, playerId);
        stillRoom.players.delete(playerId);
        // If the departing human was the last human in the room, abandon it —
        // never let the grace-timeout resolve into a bot being crowned winner.
        // Only a REMAINING human counts as a forfeit win, so removePlayer runs
        // solely in that case.
        if (!this.hasHumanPlayer(stillRoom)) {
          logger.info({
            message: "Room abandoned - grace window expired with no humans left",
            module: "RECONNECT",
            roomCode: stillRoom.code,
            playerId,
          });
          this.abandonRoom(stillRoom);
          return;
        }
        logger.info({
          message: "Seat dropped - grace window expired",
          module: "RECONNECT",
          roomCode: stillRoom.code,
          playerId,
        });
        if (stillRoom.engine) stillRoom.engine.removePlayer(playerId);
        if (stillRoom.hostId === playerId) {
          this.reassignHost(stillRoom, playerId);
        }
        if (stillRoom.engine?.isOver()) {
          // Same reasoning as the explicit-leave path above (see G14): a
          // grace-expiry reap can also be what tips a 1v1 forfeit or a
          // multiplayer walkover, and room.phase must not stay "playing"
          // forever once the engine already knows the match is over.
          this.finalizeMatch(stillRoom, droppedPlayer);
        } else {
          this.broadcastRoomState(stillRoom);
          this.resumeTable(stillRoom);
        }
      }
      stillRoom.cleanupTimers.delete(playerId);
    }, graceMs);

    room.cleanupTimers.set(playerId, timer);
    this.broadcastRoomState(room);
  }

  getRoomState(socketId: string): RoomPublicState | null {
    const { room } = this.lookup(socketId);
    return room ? this.toPublicState(room) : null;
  }

  getRoomStateByCode(code: string): RoomPublicState | null {
    const room = this.rooms.get(code.toUpperCase());
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
    // Screens get getPublicState(), NEVER getStateFor(). That distinction is
    // the whole security model of this feature: getStateFor is where a
    // player's private hand lives, and a TV in a living room is the least
    // private surface in the app. Anyone glancing at it would see every
    // card in the room if this line used the wrong method.
    if (room.spectators.size > 0) {
      const publicState = room.engine.getPublicState();
      for (const socketId of room.spectators) {
        this.io.sockets.sockets.get(socketId)?.emit("game:state", publicState);
      }
    }
    this.recordRummyRoundIfFinished(room);
    this.recordUnoRoundIfFinished(room);
    this.recordBingoRoundIfFinished(room);
    this.recordLudoMatchIfFinished(room);
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

  /**
   * Append a finished Bingo round to room.bingoHistory (docs/bingo/roadmap.md)
   * — same idempotent-per-broadcast shape as recordRummyRoundIfFinished /
   * recordUnoRoundIfFinished above. No champion concept for Bingo (see the
   * RoomPublicState.bingoHistory doc comment) — just the recap log.
   */
  /**
   * Append a finished Ludo match to room.ludoHistory.
   *
   * Guarded by a WeakMap on the ENGINE instance, the same idempotency trick
   * the Rummy/UNO/Bingo recorders use: broadcastGameState runs on every move,
   * and a finished match keeps re-broadcasting, so without this the same
   * result would be appended over and over.
   */
  private recordLudoMatchIfFinished(room: Room): void {
    if (!(room.engine instanceof LudoEngine)) return;
    const engine = room.engine;
    const state = engine.getPublicState();
    if (state.phase !== "finished") return;
    if (this.recordedLudoMatches.has(engine)) return;
    this.recordedLudoMatches.add(engine);

    const names: Record<string, string> = {};
    for (const pid of state.playerOrder) {
      names[pid] = room.players.get(pid)?.name ?? "Player";
    }
    room.ludoHistory.push({
      finishOrder: [...state.finishOrder],
      playerOrder: [...state.playerOrder],
      playerNames: names,
      finishedCount: { ...state.finishedCount },
      rollCount: { ...state.stats.rollCount },
      captureCount: { ...state.stats.captureCount },
      sixCount: { ...state.stats.sixCount },
      biggestStreak: { ...state.stats.biggestStreak },
      durationMs: Math.max(0, (state.stats.endedAt ?? Date.now()) - state.stats.startedAt),
      ts: Date.now(),
    });
    if (room.ludoHistory.length > MAX_LUDO_HISTORY) room.ludoHistory.shift();
  }

  private recordBingoRoundIfFinished(room: Room): void {
    if (!(room.engine instanceof BingoEngine)) return;
    const engine = room.engine;
    const state = engine.getPublicState();
    if (state.phase !== "finished") return;
    if (this.lastRecordedBingoRound.get(engine) === state.roundNumber) return;
    this.lastRecordedBingoRound.set(engine, state.roundNumber);

    room.bingoHistory.push({
      roundNumber: state.roundNumber,
      winners: state.winners,
      calledCount: state.calledNumbers.length,
      ts: Date.now(),
    });
    if (room.bingoHistory.length > MAX_BINGO_HISTORY) room.bingoHistory.shift();
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
      // A `setTimeout` callback, not an awaited call site — nothing is
      // relying on this completing synchronously, so (unlike `startGame`)
      // making the gate async here required no caller-impact analysis at
      // all. See `requestRematchStart`'s own doc comment for why a rematch
      // needs its own commitment in the first place.
      void this.requestRematchStart(room);
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

  /**
   * The economy-gated entry point for a rematch — same reasoning and shape
   * as `requestGameStart`, for the same reason: a rematch plays a full new
   * round for the SAME prize schedule and stakes as the original match, and
   * nothing in Economy V1's schema or rules treats a rematch as exempt or
   * "already paid for." Skipping this gate would be exactly the kind of
   * alternate-emit bypass Phase 2's "no bypasses, no alternate emits" rules
   * out.
   *
   * `room.hostId` funds the rematch (same host who funded the original
   * entry, or whoever `reassignHost` elected since — see that method's own
   * doc comment on why the CURRENT host, not the original one, is
   * authoritative going forward).
   */
  private async requestRematchStart(room: Room): Promise<void> {
    if (room.rematch.status !== "accepted") return;

    if (!this.economyService) {
      this.startRematch(room);
      return;
    }

    const host = room.players.get(room.hostId);
    if (!host) {
      this.cancelRematch(room, null);
      return;
    }
    if (!host.identityId) {
      this.io.to(room.code).emit(
        "room:error",
        "Only a signed-in account can start a paid rematch. Sign in to host, or ask a member to host instead.",
      );
      this.cancelRematch(room, null);
      return;
    }
    if (room.economyCommitPending) return;

    room.economyCommitPending = true;
    const playersList = Array.from(room.players.values());
    const humanSeatCount = playersList.filter((p) => !p.isBot).length;
    const botSeatCount = playersList.length - humanSeatCount;
    const matchId = `m_${room.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const result = await this.economyService.commitMatchEntry({
        matchId,
        roomCode: room.code,
        hostIdentityId: host.identityId,
        seatCount: playersList.length,
        humanSeatCount,
        botSeatCount,
        isSolo: playersList.length === 1,
      });
      room.currentMatchId = result.settlement.matchId;
      this.startRematch(room);
    } catch (err) {
      this.io.to(room.code).emit("room:error", this.economyErrorMessage(err));
      logger.warn({
        message: `commitMatchEntry failed for rematch in room ${room.code}: ${err instanceof Error ? err.name : String(err)}`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
      this.cancelRematch(room, null);
    } finally {
      room.economyCommitPending = false;
    }
  }

  /** Actually start a new round — wraps the same flow as startGame() but skips
   *  the ready-check (everyone has already opted in via the rematch vote).
   *  Post-commit step (see `requestRematchStart` above) when economy is
   *  configured; the direct, unchanged entry point when it isn't. */
  private startRematch(room: Room): void {
    if (room.rematch.status !== "accepted") return;
    // Same bypass check as `startGame`'s own, for the same reason: a direct
    // call here (skipping `requestRematchStart`) must not be able to start
    // a paid rematch for free. Inert when `economyService` isn't configured.
    if (this.economyService && !room.currentMatchId) {
      this.io.to(room.code).emit(
        "room:error",
        "This rematch has not been paid for yet. Use requestRematchStart, not startRematch, when Economy V1 is enabled.",
      );
      this.cancelRematch(room, null);
      return;
    }
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
      if (engine instanceof BingoEngine) engine.setOptions(room.bingoOptions);
      if (engine instanceof TambolaEngine) engine.setOptions(room.tambolaOptions);
      if (engine instanceof NamePlaceAnimalEngine) engine.setOptions(room.namesplaceanimalOptions);
      if (engine instanceof CarromEngine) engine.setOptions(room.carromOptions);
      if (engine instanceof ChessEngine) engine.setOptions(room.chessOptions);
      if (engine instanceof SnakeEngine) engine.setOptions(room.snakeOptions);
      if (engine instanceof BlockBlastEngine) engine.setOptions(room.blockBlastOptions);
      if (engine instanceof SpaceWarEngine) engine.setOptions(room.spaceWarOptions);
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
      this.armTakeoversForAbsentSeats(room);
      this.scheduleTurnTimer(room);
      this.startSimulation(room);
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

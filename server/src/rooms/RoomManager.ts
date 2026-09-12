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
  RoomPhase,
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
  OperationalRoomSummary,
  DisconnectedSeatSummary,
  OperationalRecoverySummary,
  PlatformHealthCounters,
  OperationalPlayerSummary,
  OperationalMatchDiagnostics,
} from "@shared/types.js";
import { deriveSeatStatus } from "@shared/operational.js";
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
  StartBlockReason,
  StartPreflightPayload,
  StartAcknowledgementPayload,
  PlayerStartReadiness,
  RoomStartReadiness,
} from "@shared/types.js";
import {
  ENTRY_STAKE_MIN_COINS,
  ENTRY_STAKE_MAX_COINS,
  ENTRY_STAKE_STEP_COINS,
  GUEST_HOST_ENTRY_STAKE_COINS,
  isValidEntryStakeCoins,
} from "@shared/types.js";
import { generateRoomCode } from "./codeGenerator.js";
import { mintSeatToken, verifySeatToken } from "../lib/seatToken.js";
import { createEngine, getGameLimits, getGameOrientationRequirement } from "../games/registry.js";
import type { RematchState, CoachableEngine, CoachHintResponse, AccountKind } from "@shared/types.js";
import { SEALED_ROOM_ERROR } from "@shared/permissions.js";
import { ALLOWED_REACTIONS } from "@shared/reactions.js";
import { sanitizeAvatar, pickAvatarForName } from "@shared/avatars.js";
import {
  sanitizePublicPresentation,
  getDefaultCosmetic,
  type PublicPresentationLoadout,
  type CosmeticCategory,
  type CosmeticGameScope,
} from "@shared/cosmetics.js";
import { ALLOWED_SOUND_CLIPS, SOUND_RATE_LIMIT } from "@shared/soundboard.js";
import type { RoomLifecycleState } from "@shared/lifecycle.js";
import { isValidLifecycleTransition } from "@shared/lifecycle.js";
import { serverTimelineRecorder } from "../events/ServerTimelineRecorder.js";
import { serverEventStore } from "../events/ServerEventStore.js";
import { serverLifecycleRegistry } from "../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../reliability/ResourceTracker.js";
import { SERVER_LIMITS } from "../reliability/ServerLimits.js";
import { metricsCollector } from "../observability/MetricsCollector.js";
import { metricsRegistry } from "../observability/MetricsRegistry.js";
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
import type { EconomyService, IssuedVoucherAck, SettleMatchEconomyRequest } from "../economy/EconomyService.js";
import { EconomyServiceError } from "../economy/EconomyService.js";
import {
  EconomyRepositoryError,
  InsufficientFundsError,
  WalletFrozenError,
  UnsupportedSeatCountError,
  type ParticipantDebitSpec,
} from "../persistence/EconomyRepository.js";
import { resolveIdentity } from "./economyIdentity.js";
import { extractRankedParticipants, getWinnerId } from "./economyPlacements.js";
import { DurableSettlementWorker } from "../economy/DurableSettlementWorker.js";
import type { CosmeticsService } from "../cosmetics/CosmeticsService.js";
import { operationalAuthConfig, getUserRole } from "../security/operationalAuth.js";

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
/**
 * How many full TURNS the server will play on an IDLE seat's behalf before
 * that seat is force-quit from the match. Deliberately IDLE-only, not
 * disconnect — see `isIdleAutoDriven`'s own doc comment for the economic
 * reason a disconnected seat must keep using its existing, separate
 * MATCH_GRACE_PERIOD_MS (10-minute) path instead.
 *
 * An idle takeover (connected, just not acting) had NO bound at all before
 * this — a present-but-slow player could sit on autopilot for an entire
 * match. This is the first mechanism that ends one without the player
 * acting or a socket ever dropping.
 *
 * Counted in real TURNS via `lastAutoTurnActor`, not sub-moves — a naive
 * per-sub-move counter would force-quit a Ludo seat (roll + move = 2
 * sub-moves/turn) at 2.5 real turns, half of what this constant says.
 */
const AUTO_PLAY_TURN_CAP = 5;
/**
 * Sub-moves of bot-play a genuinely DISCONNECTED seat gets before being
 * forced out as a forfeit (2026-09-09) — gates `disconnectSubMovesPlayed`
 * (see its own doc comment on the `Room` interface for why this counts
 * SUB-moves, not strict turns like its `AUTO_PLAY_TURN_CAP` sibling: a
 * strict-turn count relies on `lastAutoTurnActor`, which never changes
 * across this seat's own consecutive rounds in a genuine 2-human match, so
 * it would never advance past 1 for the entire disconnect).
 *
 * This count is NEVER sufficient on its own: it is always paired with
 * `GRACE_PERIOD_MS` at the call site (see `scheduleBotMoveIfNeeded`),
 * because a genuine network drop's real reconnection time (a WiFi-to-mobile
 * handoff measured over 100s — see `MATCH_GRACE_PERIOD_MS`'s own doc
 * comment) can easily outlast 5 sub-moves of a fast game (Hand Cricket
 * resolves one in ~1.2-2s, so the cap alone would forfeit a real player in
 * under 20 seconds). An idle seat has no such concern — it is CONNECTED,
 * just not acting — which is why `AUTO_PLAY_TURN_CAP` above stays
 * turn-count-only with no time floor.
 */
const DISCONNECT_FORFEIT_TURN_CAP = 5;
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

/**
 * How long every required human has to acknowledge a `room:startPreflight`
 * challenge before the whole match start times out (2026-09-08 — raised
 * from 5000).
 *
 * 5s was too tight against ordinary, non-broken conditions this exact file
 * has already been hardened against elsewhere (see `setReady`'s and
 * `setOrientation`'s own doc comments on not punishing a transient blip):
 * a backgrounded browser window/tab throttles its own timers under normal
 * OS power management, which can delay the CLIENT's own ack — or its own
 * `expiresAt`-driven decline — well past a 5s budget even when nothing is
 * actually wrong. Two windows on one machine for local testing (the exact
 * scenario `usePlayerCapability`'s retry-until-deadline logic already
 * names) is the single most common way to hit this. 10s keeps the same
 * fail-closed guarantee while giving a throttled tab realistic room to
 * still respond honestly instead of timing out the whole table.
 */
export const PREFLIGHT_TIMEOUT_MS = 10_000;

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

export type StartAttemptStatus =
  | "COLLECTING_PREFLIGHT"
  | "READY_TO_COMMIT"
  | "COMMITTING_ECONOMY"
  | "READY_TO_START"
  | "CONSUMED"
  | "CANCELLED";

export interface PlayerStartAcknowledgement {
  playerId: string;
  socketId: string;
  connectionGeneration: number;
  roomRevision: number;
  startAttemptId: string;
  visible: true;
  orientationSatisfied: true;
  acknowledgedAt: number;
}

export interface StartAttempt {
  id: string;
  roomRevision: number;
  createdAt: number;
  expiresAt: number;
  game: GameKind;
  hostId: string;
  hostSocketId: string;
  requiredHumanPlayerIds: ReadonlySet<string>;
  acknowledgements: Map<string, PlayerStartAcknowledgement>;
  status: StartAttemptStatus;
  cancelReason?: string;
}

export interface Room {
  code: string;
  game: GameKind;
  phase: "lobby" | "playing" | "finished";
  lifecycleState: RoomLifecycleState;
  /** Monotonically increasing room revision counter */
  roomRevision: number;
  /** Active preflight start attempt, if one is currently collecting or committing */
  activeStartAttempt: StartAttempt | null;
  /** Timeout timer for current preflight start attempt */
  startAttemptTimer: NodeJS.Timeout | null;
  createdAt: number;
  matchStartedAt: number | null;
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
  /** Participants of the most recently concluded match (including bots). */
  lastMatchPlayers: Player[] | null;
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
  /**
   * TURNS the server has played for each taken-over seat since its current
   * takeover began — reset on reconnect (`releaseTakeover`) and on the
   * idle-clear path (`noteActivity`), so each fresh disconnect/idle episode
   * gets its own full `AUTO_PLAY_TURN_CAP` allowance rather than the count
   * accumulating across a player's whole time in the room. Deliberately
   * separate from `autoPlayedFor` (sub-moves, never reset, purely
   * informational for `greetReturningPlayer`) — this one gates real
   * consequences and must not inherit that field's known bug.
   */
  autoTurnsPlayed: Map<string, number>;
  /**
   * Sub-moves the server has played for a DISCONNECTED seat since its
   * current disconnect episode began (2026-09-09) — gates
   * `DISCONNECT_FORFEIT_TURN_CAP`, reset on reconnect exactly like
   * `autoTurnsPlayed`. Deliberately its OWN counter, reusing neither
   * sibling: not `autoPlayedFor` (documented above as "never reset,
   * purely informational" — reusing it would resurrect the exact
   * cross-episode-accumulation bug that field is already known for), and
   * not `autoTurnsPlayed` (its `lastAutoTurnActor`-based "turn changed"
   * heuristic only detects a new turn when a DIFFERENT auto-driven seat's
   * move interrupts this one's — true in the idle test's 3-seat rotation
   * with a bot, but never true in a genuine 2-human match: the OTHER
   * (real, connected) player's own moves never touch `lastAutoTurnActor`
   * at all, so the disconnected seat would stay "the last actor" forever
   * and the count would freeze at 1 for the entire disconnect — silently
   * disabling this whole feature for the exact 2-human scenario it exists
   * for). Counting sub-moves instead of strict turns is slightly
   * premature for a multi-sub-move engine (Ludo roll+move ≈ 2 sub-moves
   * per turn), but that direction is always safe: it only makes the cap
   * fire SOONER, never later, and `GRACE_PERIOD_MS` remains the real
   * fairness floor regardless of how this count is derived.
   */
  disconnectSubMovesPlayed: Map<string, number>;
  /**
   * The seat id `scheduleBotMoveIfNeeded` most recently applied an
   * auto-move for. A turn boundary for turn-counting purposes is "the next
   * auto-move fires for a DIFFERENT seat than this one" — consecutive
   * sub-moves for the same seat (Ludo roll→move, Rummy draw→discard) are
   * one turn, not two. Cleared by `noteActivity` on any real socket
   * activity so a genuine intervening human turn is never mistaken for a
   * continuation of the same auto-play seat's turn.
   */
  lastAutoTurnActor: string | null;
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
   * Every seat that has LEFT since the current match was committed, keyed by
   * player id — a snapshot of the Player as they were when they departed.
   *
   * The settlement roster has to add up to the seat count the match was
   * actually committed for: `commitMatchEntry` charged N seats, so the
   * ranked participant list handed to `settleMatchEconomy` must describe
   * those same N. `finalizeMatch` used to rebuild that roster from
   * `room.players` plus the ONE departing player it was handed, which is
   * exactly right for a single departure and silently wrong for a second
   * one — a 3-seat match that lost two players produced a 2-participant
   * ranking, which the economy layer rejects as INVALID_RANKING_SHAPE.
   * That failure is terminal ("operator review required"), so the pool was
   * left stranded in COMMITTED with nobody paid and nothing refunded.
   *
   * Keeping every departure here means the roster is always complete, so
   * the match either settles on a real ranking or cleanly refunds — it can
   * never strand the money. Cleared whenever a new match commits.
   */
  departedThisMatch: Map<string, Player>;
  /**
   * The most recently concluded match's id — see RoomPublicState.lastMatchId
   * for the full contract. Set (from `currentMatchId`) in the same
   * synchronous step that clears it, in `attemptSettlementPersistence`/
   * `attemptAbandonmentPersistence`; reset to `null` when a new match (or
   * rematch) commits.
   */
  lastMatchId: string | null;
  /**
   * Real per-seat cost and total pot for the CURRENTLY committed match —
   * see RoomPublicState.committedCostPerSeat/committedTotalPot. Mirrors
   * `currentMatchId`'s lifetime exactly.
   */
  committedCostPerSeat: string | null;
  committedTotalPot: string | null;
  /**
   * The host's chosen per-seat entry stake for this room, in coins. Set
   * once at `createRoom` and never changed afterward — there is no "change
   * stake" flow. Unlike `committedCostPerSeat` (which only exists while a
   * match is actively funded), this persists for the room's entire
   * lifetime and is what `buildParticipantDebits` reads as `costPerSeat`
   * for every match/rematch this room ever starts. A guest host is always
   * exactly `GUEST_HOST_ENTRY_STAKE_COINS` — enforced both at creation
   * (rejecting a guest's non-100 request outright) and, authoritatively,
   * in `checkHostEconomyEligibility` (a guest can inherit an existing
   * higher-stake room via host migration, which creation-time validation
   * alone cannot cover).
   */
  entryStakeCoins: number;
  /**
   * In-memory guard against firing `commitMatchEntry` twice for the same
   * start attempt — e.g. a double-click or a duplicate socket emit racing
   * `requestGameStart`'s own `await`. Distinct from the RPC's own
   * idempotency key: this stops the SECOND call from ever being attempted,
   * rather than relying on the database to make it harmless once it lands.
   */
  economyCommitPending: boolean;
  /**
   * Explicit operation token identifying the specific in-flight commit request
   * (initial match or rematch). Set immediately before `commitMatchEntry` and
   * cleared in `finally`. Used after `await commitMatchEntry` to deterministically
   * verify that the completed commit belongs to THIS exact start attempt and has
   * not been superseded by another operation on the room.
   */
  pendingCommitOperationId: string | null;
  /**
   * Phase 06.1B: Durability-gated terminal lifecycle state machine.
   * Eliminates the pre-persistence crash window by distinguishing:
   * - "IDLE": no terminal finalization in flight
   * - "PERSISTING": authoritative terminal intent is currently being persisted to PostgreSQL
   * - "PERSISTED": terminal intent has successfully committed to durable storage
   * - "COMPLETED": post-persistence teardown / completion has finished
   * - "FAILED": terminal persistence rejected; room and matchId retained for recovery
   */
  terminalStatus: RoomTerminalStatus;
  terminalOutcome: "SETTLEMENT" | "REFUND" | "FORFEITURE" | null;
  terminalPromise: Promise<void> | null;
  terminalError: Error | null;
  /**
   * Remediation of audit finding P1-2 ("no reachable retry path for
   * `terminalStatus === 'FAILED'`"). The EXACT, immutable inputs the first
   * persistence attempt computed — set once, at the same moment as
   * `terminalOutcome`, and never recomputed or overwritten by a retry.
   * `retryFailedTerminalPersistence` replays this stored value verbatim; it
   * never re-derives a ranking, reason, or outcome from (by then possibly
   * different) live room/engine state. `null` whenever `terminalStatus` is
   * `IDLE` (reset alongside the other terminal fields on every fresh
   * commit — see the three reset sites this field was added to).
   *
   * In-memory only, exactly like every other `terminal*` field on this
   * interface — a process restart loses it exactly as it loses
   * `terminalPromise`. This retry path narrows the window during which a
   * transient persistence failure requires manual intervention; it does
   * NOT and cannot survive process termination, and must never be
   * described as doing so (see the Blocker 06 audit's own "decisive
   * question" finding — closing that gap is explicitly out of scope here).
   */
  terminalPayload: TerminalRetryPayload | null;
}

export type RoomTerminalStatus = "IDLE" | "PERSISTING" | "PERSISTED" | "COMPLETED" | "FAILED";

/**
 * The complete, authoritative decision behind one terminal persistence
 * attempt — exactly what `enqueueSettlement`/`enqueueRefund`/
 * `enqueueForfeiture` need, nothing more, nothing derived. A discriminated
 * union (never a bare `matchId`) for the identical reason
 * `TerminalIntentPayload` (`EconomyRepository.ts`) is one: replay must
 * never require guessing which operation was intended.
 */
export type TerminalRetryPayload =
  | { kind: "SETTLEMENT"; matchId: string; request: SettleMatchEconomyRequest }
  | { kind: "REFUND"; matchId: string; reason: string }
  | { kind: "FORFEITURE"; matchId: string; reason: string };

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

interface HostEconomyEligibility {
  eligible: boolean;
  error?: string;
}

/**
 * Checks whether the host is eligible to commit a match entry in Economy V1.
 *
 * Product Rules:
 *  - An unresolved identityId (null/empty) is rejected: there is no wallet to debit.
 *  - A guest may play solo or against any number of bots (`soloVsBots: true`).
 *  - A guest CANNOT host multiplayer matches containing other real human players (`hasOtherHumanPlayers === true`).
 *  - A guest may host ONLY at exactly `GUEST_HOST_ENTRY_STAKE_COINS`, unconditionally —
 *    independent of `hasOtherHumanPlayers` (2026-09-08, custom entry stakes). This is the
 *    AUTHORITATIVE check for that rule: `RoomManager.createRoom` also rejects a guest's
 *    non-100 request at creation time, but that alone cannot cover a room that migrated
 *    to a guest host later (see `reassignHost`) — this check re-runs on every match/
 *    rematch start regardless of how the room got here.
 *  - A registered member may host bot-only, mixed, or all-human matches at any valid stake.
 */
function checkHostEconomyEligibility(
  host: Player,
  playersList: Player[],
  entryStakeCoins: number,
  isRematch = false,
): HostEconomyEligibility {
  if (!host.identityId || host.identityId.trim().length === 0) {
    return {
      eligible: false,
      error: isRematch
        ? "Host identity not resolved. Please sign in or refresh."
        : "Player identity not resolved. Please refresh or sign in.",
    };
  }

  if (host.isGuest && entryStakeCoins !== GUEST_HOST_ENTRY_STAKE_COINS) {
    return {
      eligible: false,
      error: isRematch
        ? "This room's entry stake requires a signed-in host. Sign in to start, or ask a member to host instead."
        : "Guests can only host matches at the 100-coin table. Sign in to host at a higher stake, or ask a member to host instead.",
    };
  }

  const hasOtherHumanPlayers = playersList.some(
    (candidate) => !candidate.isBot && candidate.id !== host.id,
  );

  if (host.isGuest && hasOtherHumanPlayers) {
    return {
      eligible: false,
      error: isRematch
        ? "Only a signed-in account can host rematches with other players. Sign in to host, or ask a member to host instead."
        : "Only a signed-in account can host matches with other players. Sign in to host, or ask a member to host instead.",
    };
  }

  return { eligible: true };
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
  /**
   * Blocker 06 — the durable replacement for `EconomySettlementQueue`
   * (`economySettlementQueue.ts`, no longer constructed here; see that
   * file's own header, now marked superseded). `finalizeMatch`/`abandonRoom`
   * persist a durable, replayable intent through this worker (via
   * `attemptSettlementPersistence`/`attemptAbandonmentPersistence`) BEFORE
   * any in-memory dispatch — closing F-1 (Economy V1 certification audit):
   * a settlement queued only in process memory no longer disappears on a
   * crash between "match finished" and "settlement RPC actually ran."
   */
  private readonly durableWorker: DurableSettlementWorker | null;
  /** Background timer for periodic in-process retries of rooms in FAILED terminal persistence status */
  private failedTerminalRetryTimer: NodeJS.Timeout | null = null;

  constructor(
    private io: IO,
    private readonly economyService?: EconomyService,
    private readonly cosmeticsService?: CosmeticsService,
  ) {
    this.durableWorker = economyService
      ? new DurableSettlementWorker(economyService, {
          onVouchersIssued: (matchId, vouchers) => this.handleVouchersIssued(matchId, vouchers),
        })
      : null;
  }

  /**
   * Best-effort delivery of a just-issued guest voucher's RAW code — the
   * ONLY moment it exists in plaintext (see `DurableSettlementWorkerOptions
   * .onVouchersIssued`'s own doc comment). This is the fix for the
   * 2026-09-07 finding: before this existed, `economySettlementQueue.ts`
   * and this worker both logged only a COUNT of issued vouchers and threw
   * the codes away, making every winning guest's prize permanently
   * unclaimable by construction — not a display bug, an unrecoverable loss.
   *
   * Delivery is genuinely best-effort, not guaranteed: it requires a live,
   * connected socket for that identity RIGHT NOW, which is the common case
   * (the periodic sweep runs every 5s, so this normally fires while the
   * winner is still looking at their own result screen) but not certain — a
   * guest who has fully left every room by the time this fires has no
   * reachable code, and that loss is now at least LOGGED loudly instead of
   * silently invisible.
   */
  private handleVouchersIssued(matchId: string, vouchers: IssuedVoucherAck[]): void {
    for (const voucher of vouchers) {
      const socketId = this.findConnectedSocketForIdentity(voucher.identityId);
      if (!socketId) {
        logger.error({
          message:
            `Could not deliver voucher for match ${matchId} to identity ${voucher.identityId} — no ` +
            "connected socket found for this guest. This win is now unclaimable; the raw code is never " +
            "stored anywhere, by design (only its hash is persisted).",
          module: "ECONOMY_ROOM",
          matchId,
        });
        continue;
      }
      this.io.sockets.sockets.get(socketId)?.emit("economy:voucherIssued", {
        matchId,
        coinAmount: voucher.coinAmount,
        rawCode: voucher.rawCode,
      });
    }
  }

  /** The current socket for a CONNECTED player whose resolved `identityId` matches, searching every live room. `null` if that identity has no connected seat anywhere right now. */
  private findConnectedSocketForIdentity(identityId: string): string | null {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.identityId !== identityId || !player.isConnected) continue;
        for (const [socketId, playerId] of room.socketToPlayer.entries()) {
          if (playerId === player.id) return socketId;
        }
      }
    }
    return null;
  }

  /**
   * Starts periodic recovery sweeps for pending/retryable/expired-claim
   * terminal intents, as well as periodic in-process retries for rooms with
   * terminalStatus === 'FAILED'. Call once from the server composition root
   * after construction (see `index.ts`) — safe to call when economy isn't
   * configured (no-op). Idempotent.
   */
  startEconomyRecovery(): void {
    this.durableWorker?.start();
    this.startFailedTerminalPersistenceRetryLoop();
  }

  /** Stops periodic recovery sweeps — call on graceful shutdown, before or alongside draining. Leaves all durable work intact. */
  stopEconomyRecovery(): void {
    this.durableWorker?.stop();
    this.stopFailedTerminalPersistenceRetryLoop();
  }

  /**
   * Starts periodic in-process retries for any active rooms in terminalStatus "FAILED".
   * Runs during normal process operation while the process is alive.
   * Replays the exact stored terminalPayload verbatim without recalculating rankings.
   */
  startFailedTerminalPersistenceRetryLoop(intervalMs?: number): void {
    if (this.failedTerminalRetryTimer) return;
    const interval = intervalMs ?? SERVER_LIMITS.FAILED_TERMINAL_PERSISTENCE_RETRY_INTERVAL_MS;
    this.failedTerminalRetryTimer = setInterval(() => {
      void this.retryAllFailedTerminalRooms().catch((err) => {
        logger.error({
          message: `Unexpected error in failed terminal persistence retry loop: ${String(err)}`,
          module: "ECONOMY_ROOM",
        });
      });
    }, interval);
    this.failedTerminalRetryTimer.unref?.();
  }

  /**
   * Stops periodic in-process retries for failed terminal persistence.
   */
  stopFailedTerminalPersistenceRetryLoop(): void {
    if (this.failedTerminalRetryTimer) {
      clearInterval(this.failedTerminalRetryTimer);
      this.failedTerminalRetryTimer = null;
    }
  }

  /**
   * Sweeps all in-memory rooms in FAILED terminal status and invokes retryFailedTerminalPersistence.
   * Only one retry may be active per room (enforced by retryFailedTerminalPersistence's PERSISTING guard).
   * Catches errors so no unhandled promise rejections occur.
   */
  async retryAllFailedTerminalRooms(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const room of this.rooms.values()) {
      if (room.terminalStatus === "FAILED") {
        promises.push(
          this.retryFailedTerminalPersistence(room).catch((err) => {
            logger.warn({
              message: `Periodic in-process retry for room ${room.code} (match ${room.terminalPayload?.matchId}) failed: ${err instanceof Error ? err.message : String(err)}. Retrying on subsequent sweep while process remains alive.`,
              module: "ECONOMY_ROOM",
              roomCode: room.code,
              matchId: room.terminalPayload?.matchId,
            });
          }),
        );
      }
    }
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /** For /health — a synchronous, in-process snapshot; see `DurableSettlementWorker.counters()`'s own doc comment for why this is not the database-backed `status()`. */
  economySettlementQueueStatus(): ReturnType<DurableSettlementWorker["counters"]> | null {
    return this.durableWorker?.counters() ?? null;
  }

  /** Processes every currently-durable pending/retryable/expired-claim intent to completion — called on graceful shutdown and directly by tests. */
  async drainEconomySettlementQueue(): Promise<void> {
    const inFlightRoomPromises: Promise<void>[] = [];
    for (const room of this.rooms.values()) {
      if (room.terminalStatus === "FAILED") {
        inFlightRoomPromises.push(this.retryFailedTerminalPersistence(room));
      } else if (room.terminalPromise) {
        inFlightRoomPromises.push(room.terminalPromise);
      }
    }
    if (inFlightRoomPromises.length > 0) {
      await Promise.allSettled(inFlightRoomPromises);
    }
    await this.durableWorker?.drain();
  }

  /** Phase 06.1B: Observable terminal state query for reliability testing and health diagnostics. */
  getRoomTerminalStatus(code: string): {
    status: RoomTerminalStatus;
    outcome: "SETTLEMENT" | "REFUND" | "FORFEITURE" | null;
    error: string | null;
  } | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return {
      status: room.terminalStatus,
      outcome: room.terminalOutcome,
      error: room.terminalError ? room.terminalError.message : null,
    };
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

  getOperationalDetailedStats(): PlatformHealthCounters {
    let recovering = 0;
    let paused = 0;
    let inProgress = 0;
    let lobby = 0;
    let onlineHumans = 0;
    let activeBots = 0;
    let disconnectedUsers = 0;
    let rejoinEligibleUsers = 0;

    const now = Date.now();

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
      }

      for (const player of room.players.values()) {
        if (player.isBot) {
          activeBots++;
        } else if (player.isConnected) {
          onlineHumans++;
        } else {
          disconnectedUsers++;
          // Authoritative: `player.awayUntil` is the exact deadline
          // `handleDisconnect` armed its `setTimeout` with. Never recompute
          // a grace duration from CURRENT room composition here — the real
          // timer was armed once, from conditions at disconnect time, and
          // those conditions (e.g. whether another human is still around)
          // can legitimately change before the timer fires without moving
          // the deadline it's actually going to fire on.
          if (player.awayUntil !== undefined && player.awayUntil > now) {
            rejoinEligibleUsers++;
          }
        }
      }
    }

    /**
     * Completed-outcome recovery rate. `recovery.sessions_started_total` is
     * NOT part of this formula on purpose — an active, unresolved grace
     * session is neither a success nor a failure yet, and the audited
     * requirement is explicit that unresolved sessions must not appear in
     * the denominator. `null` (not a numeric sentinel) is the "nothing has
     * resolved yet" case — the previous version defaulted to a fake 100%
     * whenever the (never-incremented) old denominator was zero, which is
     * exactly the fabricated-metric defect this replaces.
     *
     * Process-local, in-memory, resets to 0/0 (-> null) on every server
     * restart — same lifetime as every other counter in `metricsRegistry`.
     * In a multi-instance deployment each instance reports only its own
     * process's outcomes; there is no cross-instance aggregation.
     */
    const recoverySucceeded = metricsRegistry.getCounter("recovery.sessions_succeeded_total");
    const recoveryExpired = metricsRegistry.getCounter("recovery.sessions_expired_total");
    const recoveryResolved = recoverySucceeded + recoveryExpired;
    const recoverySuccessRate = recoveryResolved > 0 ? Math.round((recoverySucceeded / recoveryResolved) * 100) : null;

    const hostMigrationCount = metricsRegistry.getCounter("rooms.host_migrations_total");

    const createdTotal = metricsRegistry.getCounter("rooms.created_total");
    const abandonedTotal = metricsRegistry.getCounter("rooms.abandoned_total");
    const abandonmentRate = createdTotal > 0 ? Math.round((abandonedTotal / createdTotal) * 100) : 0;

    return {
      onlineHumans,
      activeBots,
      activeRooms: this.rooms.size,
      runningMatches: inProgress,
      disconnectedUsers,
      rejoinEligibleUsers,
      connectedSockets: this.socketToRoom.size + this.spectatorToRoom.size,
      lobbyRooms: lobby,
      recoveringRooms: recovering,
      pausedRooms: paused,
      recoverySuccessRate,
      hostMigrationCount,
      abandonmentRate,
    };
  }

  getOperationalRecoverySummary(): OperationalRecoverySummary {
    const seats: DisconnectedSeatSummary[] = [];
    const now = Date.now();

    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (
          !player.isBot &&
          !player.isConnected &&
          player.awaySince !== undefined &&
          player.awayUntil !== undefined
        ) {
          const awayDurationMs = now - player.awaySince;
          // Authoritative deadline, not a live recompute — see the matching
          // comment in `getOperationalDetailedStats`. `gracePeriodMs` here is
          // the duration derived from the same two timestamps `handleDisconnect`
          // set together at disconnect time, not from current room state.
          const remainingGraceMs = Math.max(0, player.awayUntil - now);
          const gracePeriodMs = Math.max(0, player.awayUntil - player.awaySince);
          const idleStrikes = room.idleStrikes.get(player.id) ?? 0;
          const autoTurnsPlayed = room.autoTurnsPlayed.get(player.id) ?? 0;

          seats.push({
            roomCode: room.code,
            game: room.game,
            playerId: player.id,
            playerName: player.name,
            isGuest: Boolean(player.isGuest),
            isHost: room.hostId === player.id,
            awaySince: player.awaySince,
            awayUntil: player.awayUntil,
            awayDurationMs,
            gracePeriodMs,
            remainingGraceMs,
            isEligibleForRejoin: remainingGraceMs > 0,
            isAutoPlaying: Boolean(player.isAutoPlaying),
            autoPlayReason: player.autoPlayReason ?? null,
            idleStrikes,
            autoTurnsPlayed,
            autoTurnCap: AUTO_PLAY_TURN_CAP,
          });
        }
      }
    }

    return {
      activeGraceCount: seats.length,
      seats,
    };
  }

  getOperationalRoomSummaries(): OperationalRoomSummary[] {
    const now = Date.now();
    return Array.from(this.rooms.values()).map((room) => {
      const hostPlayer = room.players.get(room.hostId);
      const humanCount = Array.from(room.players.values()).filter((p) => !p.isBot).length;
      const botCount = Array.from(room.players.values()).filter((p) => p.isBot).length;
      const disconnectedCount = Array.from(room.players.values()).filter((p) => !p.isConnected && !p.isBot).length;
      const isRunningMatch = room.phase === "playing" || room.lifecycleState === "IN_PROGRESS" || room.lifecycleState === "RECOVERING" || room.lifecycleState === "PAUSED";
      const matchDurationMs = room.matchStartedAt && isRunningMatch ? Math.max(0, now - room.matchStartedAt) : 0;

      const players: OperationalPlayerSummary[] = Array.from(room.players.values()).map((p) => {
        const remainingGraceMs = p.awayUntil ? Math.max(0, p.awayUntil - now) : null;
        const idleStrikes = room.idleStrikes.get(p.id) ?? 0;
        const autoTurnsPlayed = room.autoTurnsPlayed.get(p.id) ?? 0;
        const isEligibleForRejoin = remainingGraceMs !== null && remainingGraceMs > 0;

        return {
          id: p.id,
          name: p.name,
          playerType: p.isBot ? "bot" : "human",
          accountType: p.isBot ? "bot" : (p.isGuest ? "guest" : "member"),
          isHost: room.hostId === p.id,
          isConnected: Boolean(p.isConnected),
          isEligibleForRejoin,
          awaySince: p.awaySince ?? null,
          awayUntil: p.awayUntil ?? null,
          remainingGraceMs,
          isAutoPlaying: Boolean(p.isAutoPlaying),
          autoPlayReason: p.autoPlayReason ?? null,
          autoTurnsPlayed,
          autoTurnCap: AUTO_PLAY_TURN_CAP,
          idleStrikes,
          seatStatus: deriveSeatStatus({
            isConnected: Boolean(p.isConnected),
            isAutoPlaying: Boolean(p.isAutoPlaying),
            idleStrikes,
            hasQuit: Boolean(p.hasQuit),
          }),
        };
      });

      const pendingActorId = room.engine?.pendingActors ? room.engine.pendingActors()[0] ?? null : null;
      const currentTurnPlayer = pendingActorId ? room.players.get(pendingActorId) : null;

      const diagnostics: OperationalMatchDiagnostics = {
        currentTurnPlayerName: currentTurnPlayer?.name ?? null,
        isOver: Boolean(room.engine?.isOver()),
        matchDurationMs,
        matchStatus: room.phase === "playing" ? (room.engine?.isOver() ? "Finished" : "In Progress") : room.phase,
      };

      return {
        code: room.code,
        game: room.game,
        lifecycleState: room.lifecycleState,
        phase: room.phase,
        createdAt: room.createdAt,
        matchStartedAt: room.matchStartedAt ?? null,
        matchDurationMs,
        host: {
          id: room.hostId,
          name: hostPlayer?.name ?? "Host",
          isGuest: Boolean(hostPlayer?.isGuest),
          isConnected: Boolean(hostPlayer?.isConnected),
          isAway: Boolean(!hostPlayer?.isConnected && !hostPlayer?.isBot),
          inGrace: Boolean(hostPlayer?.awayUntil && hostPlayer.awayUntil > now),
        },
        playerCount: room.players.size,
        humanCount,
        botCount,
        spectatorCount: room.spectators.size,
        hasTakeover: room.takeoverTimers.size > 0,
        sealed: room.sealed,
        disconnectedCount,
        players,
        diagnostics,
      };
    });
  }

  private toPublicState(room: Room): RoomPublicState {
    const limits = getGameLimits(room.game) ?? { min: 2, max: 4 };
    const { max } = limits;
    return {
      code: room.code,
      game: room.game,
      phase: room.phase,
      lifecycleState: room.lifecycleState,
      roomRevision: room.roomRevision,
      startReadiness: this.getRoomStartReadiness(room),
      // `identityId` is server-only (Economy V1's durable account identifier
      // — see its doc comment in shared/types.ts) and must never reach a
      // broadcast; every OTHER field is intentionally passed through as-is.
      players: Array.from(room.players.values()).map(({ identityId: _identityId, ...rest }) => rest),
      lastMatchPlayers: room.lastMatchPlayers ?? undefined,
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
      currentMatchId: room.currentMatchId ?? null,
      lastMatchId: room.lastMatchId ?? null,
      committedCostPerSeat: room.committedCostPerSeat ?? null,
      committedTotalPot: room.committedTotalPot ?? null,
      entryStakeCoins: room.entryStakeCoins,
    };
  }

  getRoomStartReadiness(room: Room): RoomStartReadiness {
    const req = getGameOrientationRequirement(room.game);
    const attempt = room.activeStartAttempt;

    const participants: PlayerStartReadiness[] = Array.from(room.players.values()).map((p) => {
      const blockers: StartBlockReason[] = [];
      if (p.isBot || p.isLocal) {
        return {
          playerId: p.id,
          name: p.name,
          isHost: p.isHost,
          isReady: p.isReady,
          isConnected: true,
          blockers: [],
        };
      }
      if (!p.isConnected) {
        blockers.push("DISCONNECTED");
      }
      if (p.awaySince !== undefined || room.lifecycleState === "RECOVERING") {
        blockers.push("RECOVERING");
      }
      if (!p.isReady) {
        blockers.push("NOT_READY");
      }
      if (
        attempt &&
        (attempt.status === "COLLECTING_PREFLIGHT" ||
          attempt.status === "READY_TO_COMMIT" ||
          attempt.status === "COMMITTING_ECONOMY" ||
          attempt.status === "READY_TO_START")
      ) {
        const ack = attempt.acknowledgements.get(p.id);
        if (!ack) {
          blockers.push("ACKNOWLEDGEMENT_MISSING");
        }
      }
      return {
        playerId: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
        isConnected: p.isConnected,
        blockers,
      };
    });

    const limits = getGameLimits(room.game) ?? { min: 2, max: 4 };
    const countValid = participants.length >= limits.min && participants.length <= limits.max;
    const canStart = countValid && participants.every((p) => p.blockers.length === 0);

    return {
      startAttemptId: attempt?.id ?? null,
      canStart,
      requiredOrientation: req,
      participants,
    };
  }

  cancelActiveStartAttempt(room: Room, reason: string, emitCancelled = true): void {
    const attempt = room.activeStartAttempt;
    if (!attempt) return;
    if (room.startAttemptTimer) {
      clearTimeout(room.startAttemptTimer);
      room.startAttemptTimer = null;
    }
    attempt.status = "CANCELLED";
    attempt.cancelReason = reason;
    room.activeStartAttempt = null;

    if (emitCancelled) {
      this.io.to(room.code).emit("room:startCancelled", {
        startAttemptId: attempt.id,
        reason,
      });
      this.broadcastRoomState(room);
    }
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
    identityId?: string | null,
    /**
     * Appended for the same reason as `avatar`/`hostKind`/`identityId`
     * above. Absent or malformed clamps to `ENTRY_STAKE_MIN_COINS` (today's
     * fixed 100-coin behavior, unchanged) — creation itself never fails
     * over a bad number from a legitimate host. A GUEST requesting
     * anything other than `GUEST_HOST_ENTRY_STAKE_COINS` is the one case
     * that's rejected outright (thrown, caught by the socket handler's
     * existing try/catch — see sockets/index.ts's `room:create`), rather
     * than silently overridden, per this codebase's preference for loud
     * failures over quietly ignoring what was asked. See
     * `checkHostEconomyEligibility` for the authoritative, unconditional
     * re-check this creation-time validation cannot fully replace (a room
     * can migrate to a guest host later, at start time).
     */
    entryStakeCoins?: number
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

    // Resolve the room's entry stake — see this parameter's own doc comment
    // for the reject-vs-clamp reasoning.
    let resolvedEntryStake: number;
    if (hostIsGuest) {
      if (entryStakeCoins !== undefined && entryStakeCoins !== GUEST_HOST_ENTRY_STAKE_COINS) {
        throw new Error(
          "Guests can only host matches at the 100-coin table. Sign in to host at a higher stake, or ask a member to host instead.",
        );
      }
      resolvedEntryStake = GUEST_HOST_ENTRY_STAKE_COINS;
    } else {
      resolvedEntryStake =
        entryStakeCoins !== undefined && isValidEntryStakeCoins(entryStakeCoins) ? entryStakeCoins : ENTRY_STAKE_MIN_COINS;
    }

    const playerId = newPlayerId();
    const player: Player = {
      id: playerId,
      name: name.trim().slice(0, 20) || "Player",
      isHost: true,
      isReady: false,
      isConnected: true,
      connectionGeneration: 1,
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
      roomRevision: 1,
      activeStartAttempt: null,
      startAttemptTimer: null,
      createdAt: Date.now(),
      matchStartedAt: null,
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
      autoTurnsPlayed: new Map(),
      disconnectSubMovesPlayed: new Map(),
      lastAutoTurnActor: null,
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
      departedThisMatch: new Map(),
      lastMatchPlayers: null,
      lastMatchId: null,
      committedCostPerSeat: null,
      committedTotalPot: null,
      entryStakeCoins: resolvedEntryStake,
      economyCommitPending: false,
      pendingCommitOperationId: null,
      terminalStatus: "IDLE",
      terminalOutcome: null,
      terminalPromise: null,
      terminalError: null,
      terminalPayload: null,
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
      /**
       * One completed-recovery-session accounting, separate from the
       * pre-existing `metricsCollector.onSeatReclaim`/`onRecoverySuccess`
       * calls above (untouched — other readers depend on those). Those fire
       * on ANY successful reclaim, including a socket re-emitting `room:join`
       * while already connected, which is why `recovery.success_total` was
       * never a trustworthy numerator for a success RATE. This counts a
       * completed success exactly once per genuine disconnect episode: only
       * when the seat was actually away (`!player.isConnected`) AND still
       * within the exact deadline `handleDisconnect` armed
       * (`player.awayUntil`, never recomputed from current room state — see
       * `getOperationalDetailedStats`). Reading `player.isConnected` here,
       * before it flips to `true` two lines down, is what makes a second,
       * redundant reclaim call for an already-connected seat correctly not
       * count again — there is nothing left to read that would satisfy this
       * guard once the session has already resolved.
       */
      if (
        !player.isBot &&
        !player.isConnected &&
        player.awaySince !== undefined &&
        player.awayUntil !== undefined &&
        Date.now() <= player.awayUntil
      ) {
        metricsRegistry.increment("recovery.sessions_succeeded_total");
      }
      player.isConnected = true;
      player.connectionGeneration = (player.connectionGeneration ?? 0) + 1;
      room.roomRevision++;
      this.cancelActiveStartAttempt(room, "seat_reclaimed");
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
      for (const [sId, pId] of room.socketToPlayer.entries()) {
        if (pId === existingPlayerId && sId !== socketId) {
          room.socketToPlayer.delete(sId);
          this.socketToRoom.delete(sId);
          this.io.sockets.sockets.get(sId)?.leave(room.code);
        }
      }
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
      connectionGeneration: 1,
      // Dropped unless it names a file we actually ship — see shared/avatars.ts.
      avatar: sanitizeAvatar(avatar),
      // Explicit "guest" only, matching `hostKind` in createRoom above.
      ...(accountKind === "guest" ? { isGuest: true } : {}),
      identityId: identityId ?? null,
    };
    room.players.set(playerId, player);
    room.roomRevision++;
    this.cancelActiveStartAttempt(room, "roster_changed");
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

  async leaveRoom(socketId: string): Promise<void> {
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
    this.noteDepartureForSettlement(room, departingPlayer);
    // Captured before any mutation below — a departure from the LOBBY or
    // from a post-match rematch-negotiation window (`phase: "finished"`)
    // is ordinary roster churn and already visible from the participant
    // list disappearing; announcing it in chat too would just be noise.
    // Only a mid-MATCH departure gets the real-time notice below.
    const wasPlaying = room.phase === "playing";
    const wasHostDeparting = room.hostId === playerId;
    room.players.delete(playerId);
    room.roomRevision++;
    this.cancelActiveStartAttempt(room, "roster_changed");
    room.socketToPlayer.delete(socketId);
    this.socketToRoom.delete(socketId);
    this.io.sockets.sockets.get(socketId)?.leave(code);
    // The seat is gone, so anything still tracking it goes too. Left behind,
    // `idleStrikes` would accumulate an entry per departed player for the
    // lifetime of a long-running room.
    this.forgetSeatTimers(room, playerId);

    // Root-caused 2026-09-09 from a live report: a POST-match table (phase
    // "finished" — a live match's own forfeit/succession rules below are
    // untouched, this only fires once there's nothing left to settle) used
    // to auto-promote a new host and stay open no matter who left, or shrink
    // silently to a lone player with nobody to rematch against — either way
    // leaving someone stuck on the rematch screen with no path forward.
    // Close it outright instead, for two distinct reasons a departure can
    // make it unable to continue:
    if (room.phase === "finished") {
      const { min } = getGameLimits(room.game);
      if (wasHostDeparting) {
        if (this.closeRoomForEveryone(room, "The host left after the match ended.")) return;
      } else if (room.players.size < min) {
        if (this.closeRoomForEveryone(room, "Not enough players remained to continue.")) return;
      }
      // Enough non-host players remain and the host is unaffected — fall
      // through to the ordinary tail below, which already handles a
      // finished-phase roster shrink correctly (no engine turn to move,
      // `resumeTable` no-ops on a non-"playing" room).
    }

    // No humans left (empty, or only bots remain) → abandon the room rather
    // than have the engine crown a leftover bot the winner. A remaining HUMAN
    // is still a legit forfeit win, so that path is untouched below.
    if (!this.hasHumanPlayer(room)) {
      await this.abandonRoom(room);
      return;
    }

    if (room.hostId === playerId) {
      const p = this.reassignHost(room, playerId);
      if (p) await p;
    }
    if (!this.rooms.has(code)) return;
    if (room.engine) {
      room.engine.removePlayer(playerId);
      // `removePlayer` mutates the ENGINE's own state (whose turn it is, a
      // forfeit's `winnerId`/`phase: "finished"` for a 1v1 like Hand
      // Cricket/Chess/RPS) — a completely different object from
      // `RoomPublicState`, delivered over its own `game:state` event. Every
      // other place this file ends a match — a losing move, a bot
      // auto-move, a real-time simulation tick, a resolved deadline —
      // broadcasts `game:state` before checking `isOver()`. This path
      // (a player clicking Leave mid-match) was the one exception: it went
      // straight to `broadcastRoomState` below, which carries the ROOM's
      // phase/lifecycle but never the game board's own terminal state. The
      // opponent's screen kept rendering the live board — no winner banner,
      // no scorecard — until something else (a reconnect, a refresh) forced
      // a fresh `game:state` snapshot down the wire. Root-caused 2026-09-09
      // from a live Hand Cricket report: exactly this — "nothing happened"
      // on the remaining player's screen until they refreshed the page.
      this.broadcastGameState(room);
    }
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
    if (room.phase === "playing" && room.engine?.isOver()) {
      // The departure itself just ended the match — a 1v1 forfeit-to-
      // opponent (Chess/Carrom/RPS/Hand Cricket's removePlayer) or a
      // multiplayer walkover down to the last seat (Ludo/UNO/SNL/...).
      // Without this, room.phase stayed "playing" forever: the engine
      // knew it was over but nothing ever told the room, so no match
      // history/XP/achievements were recorded and rematch stayed
      // unreachable (it's gated on phase === "finished"). Finalize it the
      // same way every other completion path does (see
      // MULTIPLAYER-RELIABILITY-BASELINE.md gap G14).
      if (wasPlaying) {
        // Sent BEFORE finalizeMatch's own broadcasts, matching the ordering
        // `forceQuitAutoPlayedSeat` already uses for its own departure
        // notice — remaining players see "why" arrive first, then the
        // scorecard/settlement that follows makes sense in context instead
        // of a settled match just silently appearing.
        this.systemMessage(
          room,
          `${departingPlayer?.name ?? "A player"} left the match. Results have been finalized.`,
        );
      }
      await this.finalizeMatch(room, departingPlayer);
    } else {
      if (wasPlaying) {
        this.systemMessage(
          room,
          `${departingPlayer?.name ?? "A player"} left the match. The match will continue according to game rules.`,
        );
      }
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
    // Allowed in the lobby AND in the "finished, preparing a rematch" window
    // (matches `isLobbyLike` on the client) — bots are scoped to one match
    // (see `purgeMatchBots`), so re-adding them here is the ONLY way to get
    // bots back for the next one. Still refused mid-round.
    if (room.phase !== "lobby" && room.phase !== "finished") {
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
    // Same window as `addBot` — a bot re-added for a rematch can still be
    // removed before that next match actually starts.
    if (room.phase !== "lobby" && room.phase !== "finished") return;
    const target = room.players.get(botId);
    if (!target?.isBot) return;
    room.players.delete(botId);
    this.broadcastRoomState(room);
  }

  renameBot(socketId: string, botId: string, newName: string): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    if (room.phase !== "lobby" && room.phase !== "finished") return;
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
    // A no-op re-affirmation (already this value) must change nothing —
    // in particular it must NOT bump `roomRevision`. A harmless resend
    // (double-tap on the Ready button before the first click's broadcast
    // round-trips back, a reconnect resync, etc.) landing while a
    // `room:startPreflight` is in flight would otherwise silently orphan
    // the OTHER player's in-flight acknowledgement: `acknowledgeStart`
    // fences on `room.roomRevision === payload.roomRevision`, so a revision
    // bump here — with no corresponding cancel, since `ready === true`
    // skips the `cancelActiveStartAttempt` call just below — makes a
    // perfectly valid ack get silently dropped, and the whole match start
    // times out 5s later with no server log and no client-visible reason.
    // `setOrientation` right below already guards the same way for exactly
    // this reason.
    if (player.isReady === ready) return;
    player.isReady = ready;
    room.roomRevision++;
    if (!ready) {
      this.cancelActiveStartAttempt(room, "player_unready");
    }
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
    if (needsRotation && room.activeStartAttempt && room.activeStartAttempt.status === "COLLECTING_PREFLIGHT") {
      this.cancelActiveStartAttempt(room, "orientation_required");
    }
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

  /**
   * Host-only. Changes the room's per-seat entry stake in the lobby before any other human player has readied up.
   */
  setEntryStake(
    socketId: string,
    stakeCoins: number
  ): { ok: boolean; error?: string; entryStakeCoins?: number } {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) {
      return { ok: false, error: "Room or player not found" };
    }
    if (player.id !== room.hostId) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Only the host can change the entry stake");
      return { ok: false, error: "Only the host can change the entry stake" };
    }
    if (room.phase !== "lobby") {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "Cannot change entry stake while a game is in progress");
      return { ok: false, error: "Cannot change entry stake while a game is in progress" };
    }
    // Check if any other human player has readied up
    const otherHumanReady = Array.from(room.players.values()).some(
      (p) => !p.isBot && p.id !== room.hostId && p.isReady
    );
    if (otherHumanReady) {
      const msg = "Cannot change the bet after another player has readied up. Ask them to unready first.";
      this.io.sockets.sockets.get(socketId)?.emit("room:error", msg);
      return { ok: false, error: msg };
    }
    if (player.isGuest && stakeCoins !== GUEST_HOST_ENTRY_STAKE_COINS) {
      const msg = `Guest hosts can only host matches at the ${GUEST_HOST_ENTRY_STAKE_COINS}-coin table. Sign in to host higher stakes.`;
      this.io.sockets.sockets.get(socketId)?.emit("room:error", msg);
      return { ok: false, error: msg };
    }
    if (!isValidEntryStakeCoins(stakeCoins)) {
      const msg = `Invalid entry stake: must be between ${ENTRY_STAKE_MIN_COINS} and ${ENTRY_STAKE_MAX_COINS} coins (steps of 50 below 1000, 100 above 1000).`;
      this.io.sockets.sockets.get(socketId)?.emit("room:error", msg);
      return { ok: false, error: msg };
    }

    room.entryStakeCoins = stakeCoins;
    // Host is unreadied so they explicitly confirm readiness at the updated stake
    player.isReady = false;

    this.broadcastRoomState(room);
    this.systemMessage(room, `Host updated the table bet to 🪙 ${stakeCoins} coins per seat.`);

    return { ok: true, entryStakeCoins: stakeCoins };
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

  /**
   * Updates the seat's active public presentation cosmetics loadout (aura, title, token/dice skin).
   *
   * `sanitizePublicPresentation` only proves each id is a well-formed,
   * known catalog entry of the right category/scope — it CANNOT check
   * ownership, since it is a pure shared client/server utility with no
   * database access. Without the ownership check below, any connected
   * client could emit `room:setCosmetics` (or the `cosmetics` field on
   * `room:create`/`room:join`) directly — bypassing the UI entirely — and
   * instantly broadcast themselves wearing every legendary cosmetic in the
   * game to the whole room, with no purchase at all. For a cosmetics-only
   * economy, the VISIBLE presentation is the entire product; skipping this
   * check would have made the purchase flow this session just secured
   * pointless — the free version was one WebSocket message away.
   *
   * Per-field, not per-request: an unowned field is dropped silently rather
   * than failing the whole update, so one stale/unpurchased id (e.g. a
   * cosmetic sold back or revoked) doesn't also block the fields the player
   * legitimately owns.
   */
  async setCosmetics(socketId: string, cosmetics: unknown): Promise<void> {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    const sanitized = sanitizePublicPresentation(cosmetics);
    player.cosmetics = await this.filterToOwnedCosmetics(player.identityId ?? null, sanitized);
    this.broadcastRoomState(room);
  }

  /** See `setCosmetics`'s own doc comment for why this exists. */
  private async filterToOwnedCosmetics(
    identityId: string | null,
    loadout: PublicPresentationLoadout,
  ): Promise<PublicPresentationLoadout> {
    if (Object.keys(loadout).length === 0) return loadout;
    // No cosmetics backend wired at all, or no verifiable identity behind
    // this seat — fail closed (show nothing) rather than trust an
    // unverifiable claim, matching this codebase's "no wallet, no debit"
    // posture for unresolved identities elsewhere in this file.
    if (!this.cosmeticsService || !identityId) return {};

    if (this.isIdentityAdmin(identityId)) return loadout;

    const ownedIds = new Set((await this.cosmeticsService.getUserLoadout(identityId, false)).ownedIds);
    const isAllowed = (
      cosmeticId: string | undefined,
      category: CosmeticCategory,
      scope: CosmeticGameScope,
    ): cosmeticId is string =>
      !!cosmeticId && (getDefaultCosmetic(category, scope).id === cosmeticId || ownedIds.has(cosmeticId));

    const filtered: PublicPresentationLoadout = {};
    if (isAllowed(loadout.avatarAura, "AVATAR_AURA", "GLOBAL")) filtered.avatarAura = loadout.avatarAura;
    if (isAllowed(loadout.podiumTitle, "PODIUM_TITLE", "GLOBAL")) filtered.podiumTitle = loadout.podiumTitle;
    if (isAllowed(loadout.tokenSkin, "TOKEN_SKIN", "ludo")) filtered.tokenSkin = loadout.tokenSkin;
    if (isAllowed(loadout.diceSkin, "DICE_SKIN", "GLOBAL")) filtered.diceSkin = loadout.diceSkin;
    return filtered;
  }

  /**
   * Mirrors two of `CosmeticsController.isCallerAdmin`'s three signals — the
   * operational-key and dev-mode-header branches don't apply to an ambient
   * socket connection, only to a same-request HTTP header.
   */
  private isIdentityAdmin(identityId: string): boolean {
    const { adminUserIds } = operationalAuthConfig();
    if (adminUserIds.includes(identityId)) return true;
    const role = getUserRole(identityId);
    return role === "admin" || role === "super_admin";
  }

  /**
   * Safe, generic message for a caller — never a repository/service
   * `.message`, which can be internal-detail-bearing even for a typed
   * class. Every KNOWN configuration failure gets its own truthful,
   * actionable line here; only a genuinely unclassified error falls
   * through to the generic retry text. `UnsupportedSeatCountError` is the
   * fix for the 2026-08-28 P0 incident: a ready, fully-staffed table
   * (e.g. 6-seat Rummy — catalog-legal, economy-unsupported) used to fall
   * through to "Try again", which was actively false — retrying changes
   * nothing about an unsupported table size. See
   * `economy/economyCapacityContract.ts` for the full root cause.
   */
  private economyErrorMessage(err: unknown, room?: Room): string {
    if (err instanceof InsufficientFundsError) {
      if (room && err.message) {
        for (const player of room.players.values()) {
          if (player.identityId && err.message.includes(player.identityId)) {
            return `${player.name} does not have enough coins to start this match.`;
          }
        }
      }
      return err.message && err.message.length > 0
        ? err.message
        : "You don't have enough coins to start this match.";
    }
    if (err instanceof WalletFrozenError) return "Your wallet is currently frozen.";
    if (err instanceof UnsupportedSeatCountError) return "This table size is not yet supported by the game economy.";
    return "Could not start the match right now. Try again.";
  }

  /**
   * Constructs the authoritative per-participant debit specifications for
   * match entry commitment.
   *
   * Economic Invariant:
   * Each identified non-bot participant pays `costPerSeat` (1 seat).
   * The host pays for their own seat plus covers any bot seats and any
   * unassigned human seats (e.g. local pass-and-play).
   * Total sum of all debits strictly equals `seatCount * costPerSeat`, for
   * ANY room composition — including bots. (2026-09-08 fix: bot seats were
   * previously never actually debited to anyone here, despite this same
   * comment already claiming otherwise — invisible only because
   * `commit_match_entry`'s SQL used to independently recompute
   * `total_collected` from the global rate regardless of what was actually
   * debited. Fixing that SQL bug — required for custom entry stakes to
   * record the real total — would otherwise make a paid room mixing bots
   * with 2+ humans fail `total_collected_calc`'s own CHECK constraint.)
   */
  private buildParticipantDebits(host: Player, playersList: Player[], costPerSeat = "100"): ParticipantDebitSpec[] {
    const costBig = BigInt(costPerSeat);
    const otherIdentifiedParticipants = playersList.filter(
      (p) => !p.isBot && p.id !== host.id && !!p.identityId && p.identityId.trim().length > 0,
    );

    const otherDebits: ParticipantDebitSpec[] = otherIdentifiedParticipants.map((p) => ({
      identityId: p.identityId!,
      identityKind: p.isGuest ? "guest" : "member",
      amountCoins: costPerSeat,
    }));

    const humanPlayers = playersList.filter((p) => !p.isBot);
    const botSeatCount = playersList.length - humanPlayers.length;
    const hostSeats = Math.max(1, humanPlayers.length - otherDebits.length) + botSeatCount;
    const hostAmount = (BigInt(hostSeats) * costBig).toString();

    const hostDebit: ParticipantDebitSpec = {
      identityId: host.identityId!,
      identityKind: host.isGuest ? "guest" : "member",
      amountCoins: hostAmount,
    };

    return [hostDebit, ...otherDebits];
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
   * separate interleaving risk remains and is NOT solved by a bigger lock:
   * another socket event for this SAME room (a player leaving, an
   * abandonment) can run during the `await` below, since Node's event loop
   * is free to process other callbacks while this one is suspended. If
   * that happens and the room gets TORN DOWN (deleted from `this.rooms`)
   * during the await, `abandonRoom`'s own refund guard — which checks
   * `room.currentMatchId !== null`, not `room.phase === "playing"` — CANNOT
   * help: it already ran, on a room that had no commitment yet, and
   * nothing will ever call it again on this now-deleted room once the
   * commit lands. This was a real, confirmed gap (see
   * `queueCompensatingRefundForOrphanedCommit`), closed by the explicit
   * re-validation immediately after the `await` resolves, below — the
   * commit's continuation NEVER trusts the captured `room` reference
   * without first confirming it is still the live, current room for this
   * exact start attempt.
   */
  async requestGameStart(socketId: string): Promise<void> {
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
    if (!playersList.filter((p) => !p.isBot && !p.isLocal).every((p) => p.isConnected)) {
      this.io.sockets.sockets.get(socketId)?.emit("room:error", "All players must be connected");
      return;
    }
    if (room.phase !== "lobby") return;
    if (room.economyCommitPending) return;

    // Duplicate start request protection: if an attempt is currently collecting or committing, ignore
    if (
      room.activeStartAttempt &&
      room.activeStartAttempt.status !== "CANCELLED" &&
      room.activeStartAttempt.status !== "CONSUMED"
    ) {
      return;
    }

    const botSeats = playersList.filter((p) => p.isBot).length;
    const humanSeats = playersList.filter((p) => !p.isBot).length;
    const isBotPractice = botSeats > 0 && humanSeats <= 1;

    if (isBotPractice) {
      // Free practice match against AI bots: no coins charged, no host wallet commitment required
      room.currentMatchId = null;
      room.committedCostPerSeat = null;
      room.committedTotalPot = null;
      this.startGame(socketId);
      return;
    }

    if (this.economyService) {
      const eligibility = checkHostEconomyEligibility(player, playersList, room.entryStakeCoins, false);
      if (!eligibility.eligible) {
        this.io.sockets.sockets.get(socketId)?.emit("room:error", eligibility.error!);
        return;
      }
    }

    const otherHumans = playersList.filter((p) => !p.isBot && !p.isLocal && p.id !== player.id);
    if (otherHumans.length === 0) {
      // Solo vs bots or pass-and-play local seats: all required remote human conditions are trivially met
      if (!this.economyService) {
        this.startGame(socketId);
        return;
      }
      const dummyAttempt: StartAttempt = {
        id: `att_${room.code}_r${room.roomRevision}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        roomRevision: room.roomRevision,
        createdAt: Date.now(),
        expiresAt: Date.now() + PREFLIGHT_TIMEOUT_MS,
        game: room.game,
        hostId: room.hostId,
        hostSocketId: socketId,
        requiredHumanPlayerIds: new Set([player.id]),
        acknowledgements: new Map(),
        status: "READY_TO_COMMIT",
      };
      room.activeStartAttempt = dummyAttempt;
      await this.proceedFromReadyAttempt(room, dummyAttempt);
      return;
    }

    const requiredHumans = playersList.filter((p) => !p.isBot && !p.isLocal);

    // Normal multiplayer: challenge all required human participants
    const startAttemptId = `att_${room.code}_r${room.roomRevision}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = Date.now() + PREFLIGHT_TIMEOUT_MS;
    const requiredOrientation = getGameOrientationRequirement(room.game);

    const attempt: StartAttempt = {
      id: startAttemptId,
      roomRevision: room.roomRevision,
      createdAt: Date.now(),
      expiresAt,
      game: room.game,
      hostId: room.hostId,
      hostSocketId: socketId,
      requiredHumanPlayerIds: new Set(requiredHumans.map((p) => p.id)),
      acknowledgements: new Map(),
      status: "COLLECTING_PREFLIGHT",
    };
    room.activeStartAttempt = attempt;

    // Full context at the moment the challenge goes out — the single most
    // useful line for diagnosing a "still timing out" report after the
    // window was already widened once: it settles, from this log alone,
    // whether the set of players actually being challenged (host included —
    // `requiredHumans` filters only bots/local seats, NOT the host) matches
    // what was expected, before even looking at what came back.
    logger.info({
      message: `Preflight challenge sent for room ${room.code}: attempt=${startAttemptId} requiring ${requiredHumans.length} ack(s) from [${requiredHumans.map((p) => `${p.name}(${p.id}${p.id === room.hostId ? ",host" : ""})`).join(", ")}], expiresAt=+${PREFLIGHT_TIMEOUT_MS}ms`,
      module: "ROOM_MANAGER",
      roomCode: room.code,
    });

    room.startAttemptTimer = setTimeout(() => {
      this.resolveExpiredPreflight(room, startAttemptId, socketId);
    }, PREFLIGHT_TIMEOUT_MS);

    this.io.to(room.code).emit("room:startPreflight", {
      startAttemptId,
      roomRevision: room.roomRevision,
      requiredOrientation,
      expiresAt,
    });
    this.broadcastRoomState(room);
  }

  /**
   * Decides what a preflight window that ran out of time actually MEANS.
   *
   * ## Why this is no longer just "cancel"
   *
   * Root-caused 2026-09-09, after this exact symptom ("Start timed out
   * waiting for players to confirm readiness") had been chased and
   * partially fixed four separate times: a client-clock-skew early return
   * that emitted nothing, a missing rotate prompt during the lobby window,
   * a fire-and-forget ack with no delivery confirmation, and a stale
   * `roomRevision` bump from a redundant `setReady`. Every one of those was
   * a real bug and every one is fixed — and the symptom kept coming back,
   * because none of them was the actual root cause.
   *
   * The root cause is the shape of this protocol, not any single defect in
   * it: starting a match — the single most important action in the product,
   * and a PAID one — was made conditional on a best-effort, self-reported
   * client acknowledgement, with a hard fail as the only fallback. Silence
   * was treated as identical to refusal. So EVERY possible way for one ack
   * not to arrive (a phone that slept for a second, a WebSocket upgrade
   * racing the emit, a proxy buffering a frame, a React effect that had not
   * mounted yet, a future bug nobody has hit yet) destroys the whole match
   * start for everyone in the room. Fixing those one at a time cannot
   * converge, because the list is open-ended.
   *
   * So silence stops being fatal. A required seat that simply did not
   * answer, but that the SERVER can independently see is still connected
   * and still ready, is now assumed good and the match starts. What the ack
   * was actually protecting is preserved in full, because every real
   * blocker is signalled through a channel that does NOT depend on a
   * message arriving:
   *
   *   - `isConnected` is server-observed, never self-reported — a genuinely
   *     absent player is still caught here, and still cancels.
   *   - An explicit `declineStart` / `reportUnavailable` / `setOrientation`
   *     report cancels the attempt the moment it lands, long before this
   *     timer fires — those paths are untouched.
   *   - `isReady` going false cancels via `setReady`.
   *
   * What is genuinely given up is the "your tab was backgrounded at the
   * exact instant the host pressed Start" case. That was never worth
   * failing a match over: a backgrounded tab is still connected, still
   * receiving state, and every game already handles a player who is not
   * looking at the screen — turn timers, seat auto-play, and reconnect
   * grace all exist precisely for that. And for the only two games where
   * orientation genuinely matters (Rummy and UNO), the first turn's clock
   * is ALREADY held by `dealGateWaitTimer`/`armInitialTurnTimer` until
   * every connected player's `needsRotation` has cleared — a stronger
   * guarantee than this handshake ever gave, and one that survives the
   * player rotating their phone a second after the match starts.
   */
  private resolveExpiredPreflight(room: Room, startAttemptId: string, hostSocketId: string): void {
    const attempt = room.activeStartAttempt;
    if (attempt?.id !== startAttemptId || attempt.status !== "COLLECTING_PREFLIGHT") return;

    room.startAttemptTimer = null;

    const silent = [...attempt.requiredHumanPlayerIds].filter((id) => !attempt.acknowledgements.has(id));
    const requiredOrientation = getGameOrientationRequirement(room.game);

    /**
     * A silent seat only blocks the start when the server can see, on its
     * OWN evidence, that the player is not actually able to play — never
     * merely because a message did not arrive.
     */
    const blockedDescribed: string[] = [];
    for (const id of silent) {
      const p = room.players.get(id);
      if (!p) {
        blockedDescribed.push(`${id}(seat gone)`);
      } else if (!p.isConnected) {
        blockedDescribed.push(`${p.name}(${id}, disconnected)`);
      } else if (!p.isReady) {
        blockedDescribed.push(`${p.name}(${id}, not ready)`);
      } else if (requiredOrientation !== null && p.needsRotation) {
        // Only counts because the player's client explicitly REPORTED being
        // in the wrong orientation. Never having reported at all is silence,
        // and silence is handled by the deal gate, not by refusing to start.
        blockedDescribed.push(`${p.name}(${id}, needs rotation)`);
      }
    }

    if (blockedDescribed.length > 0) {
      logger.warn({
        message: `Preflight expired for room ${room.code}: attempt=${startAttemptId} — cancelling, ${blockedDescribed.length} required player(s) genuinely unable to start (${blockedDescribed.join(", ")})`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      this.cancelActiveStartAttempt(room, "preflight_timeout");
      this.io.sockets.sockets
        .get(hostSocketId)
        ?.emit("room:error", "Start timed out waiting for players to confirm readiness");
      return;
    }

    if (silent.length > 0) {
      const socketForPlayer = new Map<string, string>();
      for (const [sid, pid] of room.socketToPlayer) socketForPlayer.set(pid, sid);

      logger.warn({
        message: `Preflight expired for room ${room.code}: attempt=${startAttemptId} — ${silent.length} of ${attempt.requiredHumanPlayerIds.size} required player(s) never acknowledged, but all are still connected and ready. Proceeding with the start (see resolveExpiredPreflight). Silent: [${silent
          .map((id) => `${room.players.get(id)?.name ?? "?"}(${id})`)
          .join(", ")}]`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });

      for (const id of silent) {
        const p = room.players.get(id)!;
        attempt.acknowledgements.set(id, {
          playerId: id,
          socketId: socketForPlayer.get(id) ?? "",
          connectionGeneration: p.connectionGeneration ?? 1,
          roomRevision: attempt.roomRevision,
          startAttemptId: attempt.id,
          visible: true,
          orientationSatisfied: true,
          acknowledgedAt: Date.now(),
        });
      }
    }

    attempt.status = "READY_TO_COMMIT";
    this.broadcastRoomState(room);
    void this.proceedFromReadyAttempt(room, attempt).catch((err) => {
      logger.error({
        message: `proceedFromReadyAttempt failed after preflight expiry for room ${room.code}: ${err instanceof Error ? err.message : String(err)}`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
    });
  }

  /**
   * `ack`, when provided, is a real Socket.IO delivery-confirmation
   * callback — see this method's own event-type doc comment in
   * `shared/types.ts` for why fire-and-forget was not good enough here.
   * Optional so every existing direct test call (constructing this without
   * a third argument) keeps working unchanged.
   */
  async acknowledgeStart(
    socketId: string,
    payload: StartAcknowledgementPayload,
    ack?: (result: { accepted: boolean }) => void,
  ): Promise<void> {
    // Every guard below logs. The three at the top of this method used to be
    // the only silent ones, and that gap actively misled a diagnosis: a real
    // "Start timed out" report was read as "the ack never reached the server
    // at all, on any instrumented drop path" — and therefore as a
    // transport-level loss — when an ack landing in one of these three
    // returns would have produced exactly the same evidence. Never add a
    // silent drop here.
    const { room, player } = this.lookup(socketId);
    if (!room || !player) {
      logger.warn({
        message: `Dropped acknowledgeStart from socket ${socketId}: no room/player mapping for this socket (attempt=${payload.startAttemptId})`,
        module: "ROOM_MANAGER",
      });
      ack?.({ accepted: false });
      return;
    }
    const attempt = room.activeStartAttempt;
    if (!attempt || attempt.status !== "COLLECTING_PREFLIGHT") {
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: no attempt is collecting preflight (status=${attempt?.status ?? "no active attempt"}, payload attempt=${payload.startAttemptId})`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      ack?.({ accepted: false });
      return;
    }
    if (attempt.id !== payload.startAttemptId) {
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: acknowledged a different attempt (active=${attempt.id}, payload=${payload.startAttemptId})`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      ack?.({ accepted: false });
      return;
    }
    if (attempt.roomRevision !== payload.roomRevision || room.roomRevision !== payload.roomRevision) {
      // A genuine ack silently dropped for a stale roomRevision is exactly
      // what makes a match start time out with no explanation (see
      // `setReady`'s own doc comment on the bug this used to cause). Logged
      // so a recurrence from some OTHER revision-bumping path is diagnosable
      // immediately instead of just another unexplained "Start timed out".
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: stale roomRevision (attempt=${attempt.roomRevision}, room=${room.roomRevision}, payload=${payload.roomRevision})`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      ack?.({ accepted: false });
      return;
    }
    if (!attempt.requiredHumanPlayerIds.has(player.id)) {
      // A real ack arrived from a real seat in this room, but for a player
      // id the attempt never listed as required — a reclaim/reconnect that
      // minted a different id than the one the challenge was addressed to
      // would look exactly like this. Logged for the same "don't let this
      // be another unexplained timeout" reason as the guards below.
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: not in this attempt's required set [${[...attempt.requiredHumanPlayerIds].join(", ")}]`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      ack?.({ accepted: false });
      return;
    }
    if (!player.isConnected) {
      // Same failure shape as the roomRevision mismatch above: a real ack
      // arrived, but got silently dropped — here because the server still
      // has this seat marked disconnected (a brief reconnect blip racing
      // the preflight window). Logged for the same reason: without this,
      // the only visible symptom is another unexplained "Start timed out".
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: seat marked disconnected`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      ack?.({ accepted: false });
      return;
    }
    if (Date.now() > attempt.expiresAt) {
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: arrived ${Date.now() - attempt.expiresAt}ms after this attempt's own expiresAt`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      this.cancelActiveStartAttempt(room, "attempt_expired");
      ack?.({ accepted: false });
      return;
    }
    // Fail-closed verification
    if (payload.visible !== true || payload.orientationSatisfied !== true) {
      logger.warn({
        message: `Dropped acknowledgeStart for room ${room.code}, player ${player.id}: reported visible=${payload.visible}, orientationSatisfied=${payload.orientationSatisfied}`,
        module: "ROOM_MANAGER",
        roomCode: room.code,
      });
      this.cancelActiveStartAttempt(room, "capability_unsatisfied");
      ack?.({ accepted: false });
      return;
    }

    attempt.acknowledgements.set(player.id, {
      playerId: player.id,
      socketId,
      connectionGeneration: player.connectionGeneration ?? 1,
      roomRevision: payload.roomRevision,
      startAttemptId: payload.startAttemptId,
      visible: true,
      orientationSatisfied: true,
      acknowledgedAt: Date.now(),
    });

    // Confirm delivery BEFORE any further async work below (proceedFromReadyAttempt
    // can take a while) — the client is only waiting to know this specific
    // emit landed, not for the whole match-start sequence to resolve.
    ack?.({ accepted: true });

    logger.info({
      message: `Preflight ack accepted for room ${room.code}: player ${player.name}(${player.id}) — ${attempt.acknowledgements.size}/${attempt.requiredHumanPlayerIds.size} required`,
      module: "ROOM_MANAGER",
      roomCode: room.code,
    });

    this.broadcastRoomState(room);

    if (attempt.acknowledgements.size === attempt.requiredHumanPlayerIds.size) {
      if (room.startAttemptTimer) {
        clearTimeout(room.startAttemptTimer);
        room.startAttemptTimer = null;
      }
      attempt.status = "READY_TO_COMMIT";
      await this.proceedFromReadyAttempt(room, attempt);
    }
  }

  declineStart(socketId: string, payload: { startAttemptId: string; reason: StartBlockReason }): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.activeStartAttempt?.id === payload.startAttemptId) {
      this.cancelActiveStartAttempt(room, payload.reason);
    }
  }

  reportUnavailable(socketId: string, payload: { reason: "PAGE_NOT_VISIBLE" | "ORIENTATION_REQUIRED" }): void {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (room.activeStartAttempt) {
      this.cancelActiveStartAttempt(room, payload.reason);
    }
  }

  private async proceedFromReadyAttempt(room: Room, attempt: StartAttempt): Promise<void> {
    if (room.activeStartAttempt?.id !== attempt.id || attempt.status !== "READY_TO_COMMIT") return;

    if (!this.economyService) {
      attempt.status = "READY_TO_START";
      this.executeMatchStart(room, attempt);
      return;
    }

    const hostPlayer = room.players.get(attempt.hostId);
    if (!hostPlayer) {
      this.cancelActiveStartAttempt(room, "host_missing");
      return;
    }
    const playersList = Array.from(room.players.values());
    const matchId = `m_${room.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const operationId = `op_start_${matchId}`;
    room.pendingCommitOperationId = operationId;
    room.economyCommitPending = true;
    attempt.status = "COMMITTING_ECONOMY";
    this.transitionLifecycle(room, "STARTING", "Committing match entry");
    const humanSeatCount = playersList.filter((p) => !p.isBot).length;
    const botSeatCount = playersList.length - humanSeatCount;
    const participantDebits = this.buildParticipantDebits(hostPlayer, playersList, String(room.entryStakeCoins));

    try {
      const result = await this.economyService.commitMatchEntry({
        matchId,
        roomCode: room.code,
        hostIdentityId: hostPlayer.identityId!,
        seatCount: playersList.length,
        humanSeatCount,
        botSeatCount,
        isSolo: playersList.length === 1,
        participantDebits,
        gameKind: room.game,
      });

      const freshRoom = this.rooms.get(room.code);
      const isSameInstance = freshRoom === room;
      const isOperationCurrent = freshRoom?.pendingCommitOperationId === operationId;
      const isAttemptCurrent =
        freshRoom?.activeStartAttempt?.id === attempt.id &&
        freshRoom.activeStartAttempt.status === "COMMITTING_ECONOMY";
      const isRevisionValid = freshRoom?.roomRevision === attempt.roomRevision;
      const isHostValid = freshRoom?.hostId === attempt.hostId;
      const isLifecycleValid = freshRoom?.lifecycleState === "STARTING" && freshRoom?.phase === "lobby";
      const committedPlayerIds = new Set(playersList.map((p) => p.id));
      const isRosterValid =
        freshRoom !== undefined &&
        freshRoom.players.size === committedPlayerIds.size &&
        Array.from(freshRoom.players.keys()).every((id) => committedPlayerIds.has(id)) &&
        Array.from(freshRoom.players.values()).every((p) => p.isReady && (p.isBot || p.isLocal || p.isConnected));

      const stillValid =
        isSameInstance &&
        isOperationCurrent &&
        isAttemptCurrent &&
        isRevisionValid &&
        isHostValid &&
        isLifecycleValid &&
        isRosterValid;
      if (!stillValid) {
        let reason = "invalidated";
        if (!freshRoom) reason = "room_deleted";
        else if (!isSameInstance) reason = "room_replaced";
        else if (!isOperationCurrent) reason = "operation_superseded";
        else if (!isAttemptCurrent) reason = "attempt_invalidated";
        else if (!isRevisionValid) reason = "revision_changed";
        else if (!isHostValid) reason = "host_changed";
        else if (!isLifecycleValid) reason = `lifecycle_${freshRoom?.lifecycleState}_phase_${freshRoom?.phase}`;
        else if (!isRosterValid) reason = "roster_changed";

        await this.queueCompensatingRefundForOrphanedCommit(
          result.settlement.matchId,
          room.code,
          "requestGameStart",
          reason,
        );
        if (freshRoom && isSameInstance && freshRoom.lifecycleState === "STARTING") {
          this.transitionLifecycle(freshRoom, "READY_CHECK", `Match commit orphaned before game start (${reason})`);
        }
        if (freshRoom?.activeStartAttempt?.id === attempt.id) {
          freshRoom.activeStartAttempt = null;
        }
        return;
      }

      room.currentMatchId = result.settlement.matchId;
      // A new committed match starts with a clean departure ledger — the
      // previous match's leavers are not part of THIS match's roster.
      room.departedThisMatch.clear();
      room.lastMatchId = null;
      room.committedCostPerSeat = result.settlement.costPerSeat;
      room.committedTotalPot = result.settlement.totalCollected;
      room.terminalStatus = "IDLE";
      room.terminalOutcome = null;
      room.terminalPromise = null;
      room.terminalError = null;
      room.terminalPayload = null;

      attempt.status = "READY_TO_START";
      this.executeMatchStart(room, attempt);
    } catch (err) {
      this.transitionLifecycle(room, "READY_CHECK", "Entry commitment failed");
      this.io.sockets.sockets.get(attempt.hostSocketId)?.emit("room:error", this.economyErrorMessage(err, room));
      if (room.activeStartAttempt?.id === attempt.id) {
        room.activeStartAttempt = null;
      }
      logger.warn({
        message: `commitMatchEntry failed for room ${room.code}: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
    } finally {
      if (room.pendingCommitOperationId === operationId) {
        room.pendingCommitOperationId = null;
      }
      room.economyCommitPending = false;
    }
  }

  private executeMatchStart(room: Room, attempt: StartAttempt): void {
    if (room.phase !== "lobby") return;
    if (room.activeStartAttempt?.id !== attempt.id) return;
    if (attempt.status !== "READY_TO_START") return;

    attempt.status = "CONSUMED";
    room.activeStartAttempt = null;
    this.startGame(attempt.hostSocketId);
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
    const playersList = Array.from(room.players.values());
    const botSeats = playersList.filter((p) => p.isBot).length;
    const humanSeats = playersList.filter((p) => !p.isBot).length;
    const isBotPractice = botSeats > 0 && humanSeats <= 1;

    if (this.economyService && !room.currentMatchId && !isBotPractice) {
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
      room.lastMatchPlayers = null;
      room.matchStartedAt = Date.now();
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

      // `engine.init()` can throw AFTER a real economy commit already
      // landed — `requestGameStart`'s `proceedFromReadyAttempt` sets
      // `room.currentMatchId` before ever calling this method. Left
      // unhandled, that strands a real debit with no refund and leaves
      // `lifecycleState` stuck at "STARTING" (a lobby that can never start
      // or be told apart from one mid-commit). Mirrors the exact
      // compensating-refund pattern `proceedFromReadyAttempt`'s own
      // post-commit re-validation already uses for the same underlying
      // problem: a commit that landed but the match never actually started.
      // Fire-and-forget with its own error handling — `startGame` must stay
      // synchronous (see this method's own doc comment: every caller,
      // production and test, depends on that).
      const orphanedMatchId = room.currentMatchId;
      if (orphanedMatchId) {
        room.currentMatchId = null;
        room.committedCostPerSeat = null;
        room.committedTotalPot = null;
        if (room.lifecycleState === "STARTING") {
          this.transitionLifecycle(room, "READY_CHECK", "Engine init failed after commit");
        }
        void this.queueCompensatingRefundForOrphanedCommit(
          orphanedMatchId,
          room.code,
          "requestGameStart",
          "engine_init_failed",
        ).catch((refundErr) => {
          logger.error({
            message: `Compensating refund for match ${orphanedMatchId} (room ${room.code}) failed after engine.init() threw: ${refundErr instanceof Error ? refundErr.message : String(refundErr)}`,
            module: "ECONOMY_ROOM",
            roomCode: room.code,
            matchId: orphanedMatchId,
          });
        });
      }
    }
  }

  async applyMove(socketId: string, type: string, data: unknown, onBehalfOf?: string, actionId?: string): Promise<void> {
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
      await this.finalizeMatch(room);
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
   * comment). Used for economy settlement only (`attemptSettlementPersistence`) —
   * `profileService`/`recentPlayersService` below are unchanged, matching
   * their existing, already-shipped, non-economy behavior of recording
   * whoever is still seated at the moment the match ends.
   *
   * ── Terminal-resolution idempotency (Blocker 02) ─────────────────────
   * A stale timer or closure can reach this method a second time for a
   * match that already concluded — e.g. a player's disconnect-grace
   * REMOVAL timer (up to `MATCH_GRACE_PERIOD_MS`) is still pending when the
   * match instead finishes naturally seconds later via that same player's
   * auto-play; when the stale timer eventually fires, `engine.isOver()` is
   * still true and it calls this method again. The `terminalStatus ===
   * "COMPLETED"` guard at the top of this method already guards the WALLET
   * effect (a second call is a no-op once the first has completed),
   * but without this guard every non-economic side effect below —
   * `profileService.recordMatchFinished`, `recentPlayersService.recordMatch`,
   * `serverTimelineRecorder.recordGameFinished`,
   * `metricsCollector.onMatchFinished` — would still fire a second time for
   * the one match. `isMatchAlreadyConcluded` is the exact same check
   * `abandonRoom` already trusts for the identical purpose (see its own
   * doc comment) — reused here, not reinvented, so both of this class's
   * only two terminal-outcome entry points share one source of truth for
   * "has this room's match already resolved."
   */
  /**
   * Clears every bot seat once a match concludes — called AFTER
   * `recordPostMatchStats` (which still needs to see them for match
   * history/profile stats), never before.
   *
   * Root-caused 2026-09-09 from a live report + explicit product decision:
   * a bot is a "fill the table for THIS match" convenience, not a
   * standing opponent. Before this, a bot added for one match stayed
   * seated straight through into the post-match rematch-negotiation view
   * — the host would see it sitting there marked "Waiting" alongside real
   * humans, as if it were a real participant who still needed to ready up
   * for a NEXT round it was never actually committed to. If the host wants
   * bots again, they add them again — the same one extra tap it always
   * took the first time, via the ordinary Add Bot control (now also
   * enabled during this "finished, preparing rematch" window — see
   * `addBot`'s own updated phase check).
   */
  private purgeMatchBots(room: Room): void {
    for (const [id, p] of room.players) {
      if (p.isBot) room.players.delete(id);
    }
  }

  private recordPostMatchStats(room: Room): void {
    serverTimelineRecorder.recordGameFinished(room.code, room.game, (room.engine ? getWinnerId(room.engine) : null) ?? null);
    metricsCollector.onMatchFinished(room.game, 0);
    try {
      const winnerId = (room.engine ? getWinnerId(room.engine) : undefined) ?? undefined;
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
  }

  private async finalizeMatch(room: Room, departedPlayer?: Player): Promise<void> {
    if (this.isMatchAlreadyConcluded(room) || room.terminalStatus === "COMPLETED") return;
    if (room.terminalStatus === "PERSISTING") {
      if (room.terminalPromise) {
        await room.terminalPromise;
      }
      return;
    }
    if (room.terminalStatus === "FAILED") {
      await this.retryFailedTerminalPersistence(room);
      return;
    }

    // Freeze turn clock and real-time simulations immediately
    this.clearTurnTimer(room);
    this.stopSimulation(room);

    // Non-economy match: complete immediately and synchronously
    if (!this.durableWorker || !room.currentMatchId) {
      room.phase = "finished";
      this.transitionLifecycle(room, "COMPLETED", "Match finished");
      this.recordPostMatchStats(room);
      room.lastMatchPlayers = Array.from(room.players.values()).map(({ identityId: _identityId, ...rest }) => rest);
      this.purgeMatchBots(room);
      for (const p of room.players.values()) p.isReady = false;
      this.broadcastRoomState(room);
      room.terminalStatus = "COMPLETED";
      console.log(`[match] finished room=${room.code} game=${room.game} players=${room.players.size}`);
      return;
    }

    // Economically active match — durability-gated terminal settlement
    const matchId = room.currentMatchId;
    room.phase = "finished";
    room.lastMatchPlayers = Array.from(room.players.values()).map(({ identityId: _identityId, ...rest }) => rest);
    this.transitionLifecycle(room, "FINALIZING", "Match finished, finalizing settlement");
    // Broadcast immediately so clients exit gameplay into finalization / scorecard
    this.broadcastRoomState(room);

    // Every seat the committed match was charged for: whoever is still
    // here, plus EVERY departure since the commit (not just the one that
    // triggered this call — see `Room.departedThisMatch`). An incomplete
    // roster produces a ranking whose length no longer matches the
    // committed seat count, which the economy layer rejects outright and
    // permanently, stranding the pool.
    const rosterForSettlement = new Map(room.players);
    for (const [id, p] of room.departedThisMatch) {
      if (!rosterForSettlement.has(id)) rosterForSettlement.set(id, p);
    }
    if (departedPlayer && !rosterForSettlement.has(departedPlayer.id)) {
      rosterForSettlement.set(departedPlayer.id, departedPlayer);
    }
    const { isValidRanking, participants, reason } = extractRankedParticipants({
      game: room.game,
      players: rosterForSettlement,
      engine: room.engine,
    });

    const request: SettleMatchEconomyRequest = isValidRanking
      ? { matchId, isValidRanking: true as const, participants }
      : { matchId, isValidRanking: false as const, participants: [], refundReason: reason ?? "Ranking unavailable or ambiguous" };

    // Stored BEFORE the first attempt begins — see `terminalPayload`'s own
    // doc comment. `retryFailedTerminalPersistence` replays this exact
    // object; the ranking/reason above is never recomputed on retry.
    room.terminalOutcome = "SETTLEMENT";
    room.terminalPayload = { kind: "SETTLEMENT", matchId, request };

    await this.beginTerminalPersistence(room, () => this.attemptSettlementPersistence(room, matchId, request));
  }

  /**
   * Shared entry point for every FIRST terminal-persistence attempt
   * (settlement, refund, forfeiture) — sets `PERSISTING`, wires
   * `terminalPromise`, and awaits it. `retryFailedTerminalPersistence`
   * deliberately does NOT go through this method (it starts from `FAILED`,
   * not from the pre-`PERSISTING` state this assumes) — see that method's
   * own body for its own, narrower guard.
   */
  private async beginTerminalPersistence(room: Room, attempt: () => Promise<void>): Promise<void> {
    room.terminalStatus = "PERSISTING";
    const persistPromise = attempt();
    room.terminalPromise = persistPromise;
    await persistPromise;
  }

  /**
   * The exact settlement persistence attempt — extracted so that both the
   * original `finalizeMatch` call and `retryFailedTerminalPersistence` run
   * IDENTICAL logic against whatever `SettleMatchEconomyRequest` they were
   * given, never a freshly recomputed one. Requirement 4/5 of the P1-2
   * remediation: retry reuses the exact stored payload and never derives a
   * new outcome.
   */
  private async attemptSettlementPersistence(room: Room, matchId: string, request: SettleMatchEconomyRequest): Promise<void> {
    try {
      await this.durableWorker!.enqueueSettlement(request);
      room.terminalStatus = "PERSISTED";

      // ONLY AFTER durable persistence commits to database:
      room.lastMatchId = matchId;
      room.currentMatchId = null;
      room.committedCostPerSeat = null;
      room.committedTotalPot = null;
      this.transitionLifecycle(room, "COMPLETED", "Match finished");
      this.recordPostMatchStats(room);
      room.lastMatchPlayers = Array.from(room.players.values()).map(({ identityId: _identityId, ...rest }) => rest);
      this.purgeMatchBots(room);
      for (const p of room.players.values()) p.isReady = false;
      this.broadcastRoomState(room);
      room.terminalStatus = "COMPLETED";
      room.terminalPayload = null;
      console.log(`[match] finished room=${room.code} game=${room.game} players=${room.players.size}`);
    } catch (err) {
      room.terminalStatus = "FAILED";
      room.terminalError = err instanceof Error ? err : new Error(String(err));
      this.transitionLifecycle(room, "FINALIZATION_FAILED", "Terminal persistence failed");
      this.broadcastRoomState(room);
      logger.error({
        message: `Failed to durably persist a SETTLEMENT intent for match ${matchId} (room ${room.code}): ${err instanceof Error ? err.message : String(err)}. Match finalization incomplete; room preserved for recovery. Retry via retryFailedTerminalPersistence(room) — in-memory only, does not survive a process restart.`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
        matchId,
      });
      throw err;
    }
  }

  /**
   * True only for a seat that could legitimately become the OPERATIONAL
   * host of an economically active (committed) match: signed in, not a
   * bot, not a pass-and-play local seat, not a guest, with a server-
   * verified `identityId`. This mirrors `checkHostEconomyEligibility`'s
   * own standing product rule for who may START a paid match with other
   * humans present — enforced again here at succession time, so a guest
   * or bot can never inherit a match they could never have started.
   * Economic ownership (`host_identity_id` in `match_economy_settlements`)
   * is untouched either way; this only ever changes who operationally
   * runs the room.
   */
  private isEligibleSignedInSuccessor(p: Player): boolean {
    return !p.isBot && !p.isLocal && !p.isGuest && !!p.identityId && p.identityId.trim().length > 0;
  }

  /**
   * Failover / host election when a host departs or is reaped.
   *
   * Pre-commitment (no economically active match — `room.currentMatchId
   * === null`), the existing lobby behavior is unchanged: a guest may
   * still inherit an unpaid lobby exactly as before this fix. Prioritizes:
   * 1. Active, connected member player (not a bot, not a guest, not away)
   * 2. Active, connected guest player (seals the room as guests cannot gather)
   * 3. Any remaining human player
   *
   * For an ECONOMICALLY ACTIVE match, only an eligible signed-in human
   * (`isEligibleSignedInSuccessor`) may become host — a guest or bot must
   * never inherit a match funded by the departed host's wallet. That rule
   * is unchanged.
   *
   * What that rule does NOT decide is how an already-committed match
   * SETTLES. If no eligible successor remains but a human still does, this
   * no longer abandons (and forfeits) the pool — it returns and lets the
   * caller finish the match through `finalizeMatch` like any other forfeit,
   * so the remaining player is actually paid. See the long comment on that
   * branch for the live bug this fixes. Only a room with no humans left at
   * all still routes to `abandonRoom`.
   */
  private reassignHost(room: Room, departingPlayerId: string): Promise<void> | void {
    if (room.hostId !== departingPlayerId) return;

    const remainingSeats = [...room.players.values()].filter(
      (p) => p.id !== departingPlayerId && !p.isLocal && !p.isBot
    );

    const economicallyActive = room.currentMatchId !== null;

    const nextHost = economicallyActive
      ? remainingSeats.find((p) => this.isEligibleSignedInSuccessor(p) && !p.awayUntil) ??
        remainingSeats.find((p) => this.isEligibleSignedInSuccessor(p))
      : remainingSeats.find((p) => !p.isGuest && !p.awayUntil) ??
        remainingSeats.find((p) => !p.awayUntil) ??
        remainingSeats.find((p) => !p.isGuest) ??
        remainingSeats[0];

    if (!nextHost) {
      if (!economicallyActive) {
        // Pre-commitment behaviour is deliberately untouched: abandon only
        // when literally no human (bot-blind) seat remains at all.
        if (!this.hasHumanPlayer(room)) {
          return this.abandonRoom(room);
        }
        return;
      }

      // `remainingSeats`, not `hasHumanPlayer`: the seats that could
      // actually survive this departure are the REMOTE humans, which is
      // exactly what `remainingSeats` already filters for (`!isBot &&
      // !isLocal`). `hasHumanPlayer` is bot-blind but NOT local-blind, and
      // a pass-and-play seat was being played on the departing host's own
      // device — it cannot be a real surviving winner, so a room left with
      // nothing but local seats still forfeits rather than paying out to a
      // phantom.
      if (remainingSeats.length === 0) {
        return this.abandonRoom(room);
      }

      // A human IS still here; they just aren't allowed to HOST a funded
      // room (a guest, or a seat with no resolved identity). That stays
      // true — nobody is promoted below, so a guest still can never inherit
      // host, and `requestGameStart`'s own `checkHostEconomyEligibility`
      // still refuses to let one fund a NEW paid match.
      //
      // What changed (2026-09-09): this case used to `abandonRoom` too,
      // which FORFEITS the whole committed pool to the platform. Root-caused
      // from a live report — a member hosted a paid match, a guest joined
      // and was debited their own 100 coins from their own guest wallet
      // (see `buildParticipantDebits`: every participant with a resolved
      // identityId pays their own seat), the host then left mid-match, and
      // the guest — the innocent remaining player, and the de-facto winner
      // by forfeit — was given nothing while their OWN stake was
      // confiscated along with the departed host's.
      //
      // The tell that this was a bug and not a policy: had the remaining
      // player been a MEMBER, the identical departure would have promoted
      // them, ended the match on `removePlayer`'s forfeit, and paid them
      // normally through `finalizeMatch`. Same forfeit, same money, opposite
      // outcome, decided purely by the survivor's account type.
      //
      // Two separate questions were conflated here: "who may operationally
      // host a funded room going forward" (the real anti-exploit rule, kept)
      // and "how does an already-committed match settle" (not a hosting
      // question at all). Returning without abandoning hands the settlement
      // back to the caller's normal path — every one of the three callers
      // (`leaveRoom`, `forceQuitAutoPlayedSeat`, and the grace-expiry reap)
      // removes the departed seat from the engine and calls `finalizeMatch`
      // the moment `isOver()` goes true, so the pool settles through the
      // exact same ranked-payout path as any other forfeit, and the guest's
      // prize is escrowed as a redeemable voucher. If the match does NOT end
      // on this departure (a larger table plays on), the pool stays
      // committed and settles normally when the game actually finishes —
      // money is never left stranded either way.
      return;
    }

    room.hostId = nextHost.id;
    for (const p of room.players.values()) {
      p.isHost = p.id === nextHost.id;
    }
    room.roomRevision++;
    this.cancelActiveStartAttempt(room, "host_migrated");
    metricsRegistry.increment("rooms.host_migrations_total");
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

    // This runs synchronously from several call sites that are themselves
    // bare `setTimeout` callbacks with no catch of their own (`armTakeover`'s
    // timer in particular — mid-disconnect, not mid a normal `game:move` that
    // the socket layer already wraps). `pendingActors()` is per-game engine
    // code, ten independent implementations deep, called here for a board
    // state nobody chose to be in (an auto-play takeover, not a move a human
    // just made) — exactly the combination least likely to have been
    // exercised by that engine's own tests. One bad state in one game must
    // degrade that one room's auto-play, not crash every other room's.
    let pending: string[];
    try {
      pending = engine.pendingActors();
    } catch (err) {
      logger.error({
        message: `pendingActors() threw in room ${room.code} (game ${room.game}): ${err instanceof Error ? err.message : String(err)}`,
        module: "BOT",
        roomCode: room.code,
      });
      return;
    }
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
      void (async () => {
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

            // An idle takeover is turn-capped via `autoTurnsPlayed` (a real
            // TURN count — see `lastAutoTurnActor`'s own doc comment for why
            // that heuristic is reliable there: another idle/bot seat's
            // interleaved moves reliably marks each turn boundary).
            //
            // A genuine disconnect is capped differently, via the sibling
            // `disconnectSubMovesPlayed` — see ITS OWN doc comment on the
            // `Room` interface for exactly why `lastAutoTurnActor`'s
            // heuristic cannot be reused here (it would freeze at 1 for the
            // entire disconnect in a genuine 2-human match, since the other,
            // real, connected player's own moves never touch it). A
            // disconnect additionally needs `GRACE_PERIOD_MS` of real
            // elapsed time before its cap can act — an idle seat (connected,
            // just not acting) needs no such floor.
            if (this.isIdleAutoDriven(room, botId)) {
              // A new TURN for this seat starts exactly when the auto-move
              // actor changes from whatever it was last time — consecutive
              // sub-moves for the SAME seat (roll→move, draw→discard) are one
              // turn, not two.
              const isNewTurn = room.lastAutoTurnActor !== botId;
              room.lastAutoTurnActor = botId;
              if (isNewTurn) {
                const turns = (room.autoTurnsPlayed.get(botId) ?? 0) + 1;
                room.autoTurnsPlayed.set(botId, turns);
                if (turns > AUTO_PLAY_TURN_CAP) {
                  await this.forceQuitAutoPlayedSeat(room, botId);
                  return;
                }
              }
            } else if (this.isDisconnectedAutoDriven(room, botId)) {
              const subMoves = (room.disconnectSubMovesPlayed.get(botId) ?? 0) + 1;
              room.disconnectSubMovesPlayed.set(botId, subMoves);
              const awaySince = this.disconnectAwaySince(room, botId);
              const timeFloorMet = awaySince !== undefined && Date.now() - awaySince >= GRACE_PERIOD_MS;
              if (subMoves > DISCONNECT_FORFEIT_TURN_CAP && timeFloorMet) {
                await this.forceQuitAutoPlayedSeat(room, botId);
                return;
              }
            }
          }
          apply.call(engine, botId);
        }
        this.broadcastGameState(room);

        if (engine.isOver()) {
          await this.finalizeMatch(room);
          return;
        }
        this.scheduleTurnTimer(room);
        // Recurse — if the same bot is still mid-turn (draw → discard) this
        // schedules another paced sub-move; otherwise it picks up the next bot.
        this.scheduleBotMoveIfNeeded(room);
      })().catch((err) => {
        logger.error({
          message: `Bot move execution failed in room ${room.code}: ${err instanceof Error ? err.message : String(err)}`,
          module: "BOT",
          roomCode: room.code,
        });
      });
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
      void (async () => {
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
          await this.finalizeMatch(room);
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
      })().catch((err) => {
        logger.error({
          message: `Simulation execution failed in room ${room.code}: ${err instanceof Error ? err.message : String(err)}`,
          module: "SIMULATION",
          roomCode: room.code,
        });
      });
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
   *
   * ── Economic routing (refund vs. forfeiture) ────────────────────────────
   * `wasPlaying` is captured BEFORE `phase` is overwritten below, and is the
   * same `phase === "playing"` signal `handleDisconnect`'s own `inMatch`
   * check already uses everywhere else in this file.
   *  - `currentMatchId === null` (nothing was ever committed): no economic
   *    action is owed either way — the `hasEconomy` check below is false,
   *    so this function's own economic branch is skipped entirely,
   *    preserved unchanged from before this fix.
   *  - `currentMatchId !== null && wasPlaying`: an economically active
   *    match was actually underway and a human's departure (voluntary or
   *    disconnect-grace expiry) left no eligible signed-in successor —
   *    player-fault abandonment. Forfeits the FULL committed pool to World
   *    Bank; the economic owner is never refunded.
   *  - `currentMatchId !== null && !wasPlaying`: the narrow commit-but-
   *    never-started race described directly above (another event
   *    interleaved during `requestGameStart`'s `await`, so
   *    `startGame`'s own re-validation refused to transition `phase`).
   *    Nobody ever played anything — this is a stuck commitment, not a
   *    player forfeiting a live match, so it still refunds, exactly as
   *    documented there before this fix existed.
   *
   * ── Guard: a room whose match ALREADY concluded naturally ───────────────
   * `finalizeMatch` (natural completion, engine.isOver()) and this function
   * are the ONLY two places that ever set `room.phase = "finished"`, and
   * `finalizeMatch` sets it synchronously, before any `await` — so
   * `isMatchAlreadyConcluded(room)` is already true for a concluded room by
   * the time this function's own top-of-function guard runs, regardless of
   * whether `currentMatchId` has been cleared yet (that happens later,
   * inside `attemptSettlementPersistence`, only after its
   * `enqueueSettlement` call resolves). So `wasPlaying` alone is not the
   * fix here: without this guard, EVERY completed match
   * would still hit `transitionLifecycle(room, "ABANDONED", ...)` the moment
   * the last player leaves (a real transition — COMPLETED -> ABANDONED is
   * valid per `shared/lifecycle.ts`) and would inflate
   * `metricsCollector.onRoomAbandoned` for every ordinary match completion,
   * not just genuine abandonments. `isMatchAlreadyConcluded` checks BOTH
   * `phase` and `lifecycleState` together (the task's own guidance: neither
   * alone is trusted in isolation) and routes to `closeConcludedRoom`
   * instead — ordinary teardown, never a second economic outcome. See that
   * method's own doc comment for what it preserves.
   */
  private async abandonRoom(room: Room): Promise<void> {
    if (room.terminalStatus === "PERSISTING") {
      if (room.terminalPromise) {
        try {
          await room.terminalPromise;
        } catch {
          // In-flight persistence failed; room transitions to FAILED and MUST remain
          // retained in this.rooms for subsequent operator or periodic in-process retry.
          return;
        }
      }
      if ((room.terminalStatus as RoomTerminalStatus) === "COMPLETED") {
        this.closeConcludedRoom(room);
      }
      return;
    }

    if (room.terminalStatus === "FAILED") {
      try {
        await this.retryFailedTerminalPersistence(room);
      } catch {
        // Retry failed. The room MUST NOT be deleted, torn down, or overwritten with forfeiture/refund!
        // It remains preserved in this.rooms with status FAILED for subsequent periodic/manual retry.
        return;
      }
      if ((room.terminalStatus as RoomTerminalStatus) === "COMPLETED") {
        this.closeConcludedRoom(room);
      }
      return;
    }

    if (room.terminalStatus === "COMPLETED" || (this.isMatchAlreadyConcluded(room) && !room.currentMatchId)) {
      this.closeConcludedRoom(room);
      return;
    }

    // Freeze all timers immediately so no background activity continues
    this.clearTurnTimer(room);
    this.clearDealGateTimers(room);
    this.stopSimulation(room);
    this.clearRematchTimers(room);
    for (const t of room.cleanupTimers.values()) clearTimeout(t);
    room.cleanupTimers.clear();
    for (const t of room.takeoverTimers.values()) clearTimeout(t);
    room.takeoverTimers.clear();

    const wasPlaying = room.phase === "playing";
    const hasEconomy = Boolean(this.durableWorker && room.currentMatchId !== null);

    if (hasEconomy) {
      const matchId = room.currentMatchId!;
      const outcome = wasPlaying ? "FORFEITURE" : "REFUND";
      const reason = wasPlaying
        ? "Room abandoned mid-match after commitment — no eligible signed-in successor remained"
        : "Room abandoned mid-match — all human players departed";

      // Stored BEFORE the first attempt begins — see `terminalPayload`'s
      // own doc comment. `retryFailedTerminalPersistence` replays this
      // exact outcome/reason pair; `wasPlaying` is never re-evaluated.
      room.terminalOutcome = outcome;
      room.terminalPayload =
        outcome === "FORFEITURE" ? { kind: "FORFEITURE", matchId, reason } : { kind: "REFUND", matchId, reason };

      await this.beginTerminalPersistence(room, () => this.attemptAbandonmentPersistence(room, matchId, outcome, reason));
      return;
    }

    // Non-economy room abandonment:
    room.phase = "finished";
    this.transitionLifecycle(room, "ABANDONED", "All humans departed");
    serverTimelineRecorder.recordPlayerLeft(room.code, "system", "room_abandoned");
    metricsCollector.onRoomAbandoned(room.game);
    this.announceAbandonment(room);
    this.transitionLifecycle(room, "CLOSED", "Room destroyed");
    serverLifecycleRegistry.cleanupRoom(room.code);
    metricsCollector.onRoomClosed(room.game);
    this.rooms.delete(room.code);
    room.terminalStatus = "COMPLETED";
  }

  /**
   * Last word to anyone still attached to a room that is about to be
   * deleted — seated players, and screens/spectators watching.
   *
   * Root-caused 2026-09-09 from a live report: the host left a paid match,
   * and the remaining player's board just kept running as if the game were
   * live. They only found out anything had happened by refreshing, which
   * bounced them to the home page because the room was already gone.
   *
   * The cause was that `abandonRoom`'s SUCCESS path tore the room down in
   * complete silence — `room.phase = "finished"` then straight to
   * `this.rooms.delete(...)`, with no `room:state`, no `game:state`, and no
   * message. (Its failure path did broadcast, which is what makes the
   * omission on the success path so easy to miss.) The broadcasts have to
   * happen HERE, before the delete, because once the room is out of
   * `this.rooms` there is nothing left to broadcast from.
   */
  private announceAbandonment(room: Room): void {
    this.systemMessage(
      room,
      "This match was closed because no eligible player remained at the table.",
    );
    // Both, deliberately: `room:state` carries the room's own
    // finished/ABANDONED phase, while a game board reads its OWN terminal
    // state off `game:state` — the exact split that let a departed 1v1
    // forfeit leave the opponent's board running until a refresh.
    this.broadcastGameState(room);
    this.broadcastRoomState(room);
  }

  /**
   * The exact refund/forfeiture persistence attempt — extracted for the
   * same reason `attemptSettlementPersistence` is: both the original
   * `abandonRoom` call and `retryFailedTerminalPersistence` run IDENTICAL
   * logic against whatever `outcome`/`reason` they were given, never a
   * freshly recomputed one.
   */
  private async attemptAbandonmentPersistence(
    room: Room,
    matchId: string,
    outcome: "REFUND" | "FORFEITURE",
    reason: string,
  ): Promise<void> {
    try {
      if (outcome === "FORFEITURE") {
        await this.durableWorker!.enqueueForfeiture(matchId, reason);
      } else {
        await this.durableWorker!.enqueueRefund(matchId, reason);
      }
      room.terminalStatus = "PERSISTED";

      // ONLY AFTER durable persistence commits to database:
      room.lastMatchId = matchId;
      room.currentMatchId = null;
      room.committedCostPerSeat = null;
      room.committedTotalPot = null;
      room.phase = "finished";
      this.transitionLifecycle(room, "ABANDONED", "All humans departed");
      serverTimelineRecorder.recordPlayerLeft(room.code, "system", "room_abandoned");
      metricsCollector.onRoomAbandoned(room.game);

      // Tell anyone still attached BEFORE the room is deleted — see
      // `announceAbandonment`. Only the failure path below used to
      // broadcast; the success path tore the room down in silence.
      this.announceAbandonment(room);

      // Now proceed to destructive teardown:
      this.transitionLifecycle(room, "CLOSED", "Room destroyed");
      serverLifecycleRegistry.cleanupRoom(room.code);
      metricsCollector.onRoomClosed(room.game);
      this.rooms.delete(room.code);
      room.terminalStatus = "COMPLETED";
      room.terminalPayload = null;
    } catch (err) {
      room.terminalStatus = "FAILED";
      room.terminalError = err instanceof Error ? err : new Error(String(err));
      this.transitionLifecycle(room, "FINALIZATION_FAILED", "Abandonment persistence failed");
      this.broadcastRoomState(room);
      logger.error({
        message: `Failed to durably persist a ${outcome} intent for match ${matchId} (room ${room.code}): ${err instanceof Error ? err.message : String(err)}. Teardown halted; room retained. Retry via retryFailedTerminalPersistence(room) — in-memory only, does not survive a process restart.`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
        matchId,
      });
      throw err;
    }
  }

  /**
   * Remediation of audit finding P1-2 — the actual, reachable
   * `FAILED -> PERSISTING` transition that was previously missing.
   *
   * Guarded on `terminalStatus === "FAILED"` specifically (not the broader
   * `beginTerminalPersistence` entry every first attempt uses): this is
   * deliberately the ONLY way to re-enter `PERSISTING` from `FAILED`.
   * Setting `terminalStatus = "PERSISTING"` here happens synchronously,
   * before any `await` — exactly like every other terminal-status
   * transition in this class — so a second, concurrent call to this same
   * method for the same room sees `PERSISTING`, not `FAILED`, and safely
   * awaits the SAME `terminalPromise` instead of starting a second attempt
   * (requirement 8: only one retry can be active).
   *
   * Replays `room.terminalPayload` VERBATIM — never recomputes a ranking,
   * never re-derives a reason, never allows a caller to substitute a
   * different outcome (requirements 4/5/6). No financial RPC executes
   * before this method's own persistence call — `attemptSettlementPersistence`/
   * `attemptAbandonmentPersistence` call `enqueueX` first and only apply
   * downstream side effects after it resolves, identically to the first
   * attempt (requirement 11). No duplicate player-facing completion runs:
   * the success continuation is the SAME code the first attempt would have
   * run, called at most once per retry, gated the same way (requirement 12).
   *
   * In-memory only. `room.terminalPayload` does not survive a process
   * restart, exactly like `room.terminalPromise` never has — this narrows
   * the window in which a transient persistence failure requires manual
   * intervention; it does NOT close the pre-commit process-crash window
   * (see the Blocker 06 audit's own "decisive question" — out of scope
   * for this remediation).
   */
  async retryFailedTerminalPersistence(room: Room): Promise<void> {
    if (room.terminalStatus === "PERSISTING") {
      if (room.terminalPromise) await room.terminalPromise;
      return;
    }
    if (room.terminalStatus !== "FAILED") return;
    const payload = room.terminalPayload;
    if (!payload) {
      // Should not be reachable — every path that sets `terminalStatus =
      // "FAILED"` first sets `terminalPayload` on the very same room.
      // Guarded rather than assumed, per this file's own existing
      // convention of guarding invariants explicitly rather than trusting
      // them silently elsewhere in this class.
      logger.error({
        message: `retryFailedTerminalPersistence called for room ${room.code} with terminalStatus FAILED but no stored terminalPayload — cannot retry without a stored decision.`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
      return;
    }

    room.terminalError = null;
    room.terminalStatus = "PERSISTING";
    this.transitionLifecycle(room, "FINALIZING", "Retrying terminal persistence");
    this.broadcastRoomState(room);

    const persistPromise =
      payload.kind === "SETTLEMENT"
        ? this.attemptSettlementPersistence(room, payload.matchId, payload.request)
        : this.attemptAbandonmentPersistence(room, payload.matchId, payload.kind, payload.reason);

    room.terminalPromise = persistPromise;
    try {
      await persistPromise;
    } catch (err) {
      room.terminalStatus = "FAILED";
      room.terminalError = err instanceof Error ? err : new Error(String(err));
      this.transitionLifecycle(room, "FINALIZATION_FAILED", "Terminal persistence retry failed");
      this.broadcastRoomState(room);
      throw err;
    }
  }

  /**
   * Host entry point for retrying a failed terminal persistence intent.
   */
  async requestRetryTerminalPersistence(socketId: string): Promise<void> {
    const { room, player } = this.lookup(socketId);
    if (!room || !player) return;
    if (player.id !== room.hostId) return;
    await this.retryFailedTerminalPersistence(room);
  }

  /**
   * True once this room's match ALREADY reached a terminal, naturally-
   * completed outcome (`finalizeMatch` already ran and queued its one
   * settlement) — checked using `phase` and `lifecycleState` TOGETHER,
   * neither trusted alone: `phase` is the finer-grained, always-current
   * signal (only ever `"finished"` via `finalizeMatch`, since this class
   * deletes a room from `this.rooms` the moment it tears one down, so no
   * later caller can observe a phase this function itself set), while
   * `lifecycleState` is checked too in case `transitionLifecycle` ever
   * silently no-ops on an unexpected prior state (it does, by design — see
   * `shared/lifecycle.ts`) and leaves `lifecycleState` stale relative to
   * `phase`. Either signal alone being `"finished"`/`"COMPLETED"` is
   * sufficient: a still-forfeitable, actually-active match can never have
   * either value, because `finalizeMatch` clears `currentMatchId`
   * unconditionally in the same synchronous step that sets both.
   */
  private isMatchAlreadyConcluded(room: Room): boolean {
    if (room.terminalStatus === "FAILED" || room.terminalStatus === "PERSISTING") {
      return false;
    }
    return (
      (room.phase === "finished" || room.lifecycleState === "COMPLETED")
    );
  }

  /**
   * Ordinary teardown for a room whose match already concluded naturally
   * BEFORE the last player left — reached only via `abandonRoom`'s own
   * guard (see `isMatchAlreadyConcluded`). Deliberately does NOT:
   *  - transition lifecycle to `ABANDONED` (COMPLETED is not ABANDONED —
   *    it goes straight to CLOSED, a transition `shared/lifecycle.ts`
   *    already allows),
   *  - call refund or forfeiture (the match's one settlement already happened
   *    in `finalizeMatch`; `currentMatchId` is already `null`, so there is
   *    nothing left to reclassify),
   *  - count towards `metricsCollector.onRoomAbandoned` (this is routine
   *    post-match cleanup, not an abandonment event for ops dashboards to
   *    alert on).
   * Everything else `abandonRoom` does for genuine abandonment — timers,
   * `serverLifecycleRegistry` cleanup, room-map deletion, the CLOSED
   * metric — still runs identically here, so nothing leaks or lingers just
   * because the room happens to already be finished rather than freshly
   * abandoned.
   */
  /**
   * Closes an already-finished room (a post-match rematch-negotiation
   * table, never a live match) for every remaining client at once, and
   * tells them BEFORE it disappears — see `room:closed`'s own doc comment
   * in shared/types.ts for the silent-teardown bug this replaces.
   *
   * Called from `leaveRoom` under two conditions, both product decisions
   * from a live report (2026-09-09): the HOST leaving after a match ends
   * (no auto-promoted successor keeps a post-match table open — the room
   * belongs to whoever was hosting it), or a departure that leaves fewer
   * players than the game needs to ever field another match (the ordinary
   * 2-player case: the only opponent left, nobody to rematch against).
   */
  /**
   * Returns whether the room actually closed — false means the caller must
   * fall through to its own normal departure handling instead of treating
   * the room as gone.
   */
  private closeRoomForEveryone(room: Room, reason: string): boolean {
    // The SAME precondition `closeConcludedRoom` itself enforces, checked
    // BEFORE announcing anything — a room whose terminal persistence is
    // still in flight or awaiting retry (a settlement PostgreSQL call that
    // failed, say) must stay open and recoverable. Telling every client
    // "this room is closed, go home" and detaching their sockets would be
    // a lie the instant `closeConcludedRoom` then refuses to actually
    // delete it. Returning false leaves the caller's own existing
    // hasHumanPlayer/reassignHost path to run exactly as it did before
    // this feature existed — untouched for the one case where the money
    // isn't actually settled yet.
    if (room.terminalStatus === "PERSISTING" || room.terminalStatus === "FAILED") {
      return false;
    }
    if (room.terminalPromise && (room.terminalStatus as RoomTerminalStatus) !== "COMPLETED") {
      return false;
    }
    this.io.to(room.code).emit("room:closed", { reason });
    // Detach every remaining socket from server-side room bookkeeping so
    // none of them are left half-tracked once the room object is gone —
    // the departing player's OWN socket was already detached by the
    // caller before this runs.
    for (const socketId of room.socketToPlayer.keys()) {
      this.io.sockets.sockets.get(socketId)?.leave(room.code);
      this.socketToRoom.delete(socketId);
    }
    this.closeConcludedRoom(room);
    return true;
  }

  private closeConcludedRoom(room: Room): void {
    if (room.terminalStatus === "PERSISTING" || room.terminalStatus === "FAILED") {
      logger.warn({
        message: `Refusing to close concluded room ${room.code} while terminalStatus is ${room.terminalStatus}`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
      return;
    }
    if (room.terminalPromise && (room.terminalStatus as RoomTerminalStatus) !== "COMPLETED") {
      logger.warn({
        message: `Refusing to close concluded room ${room.code} while terminalPromise is unresolved`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
      return;
    }
    serverTimelineRecorder.recordPlayerLeft(room.code, "system", "room_closed_after_completion");
    this.clearTurnTimer(room);
    this.clearDealGateTimers(room);
    this.stopSimulation(room);
    this.clearRematchTimers(room);
    for (const t of room.cleanupTimers.values()) clearTimeout(t);
    room.cleanupTimers.clear();
    for (const t of room.takeoverTimers.values()) clearTimeout(t);
    room.takeoverTimers.clear();
    this.transitionLifecycle(room, "CLOSED", "Room destroyed after completion");
    serverLifecycleRegistry.cleanupRoom(room.code);
    metricsCollector.onRoomClosed(room.game);
    this.rooms.delete(room.code);
  }

  /**
   * The compensating close for a commit that succeeded AFTER the room that
   * requested it was already torn down, replaced, or otherwise moved past
   * the exact request the commit was for — the one gap neither
   * `finalizeMatch` nor `abandonRoom` can close on their own, because both
   * operate on a live `room` object and take their guard from IT.
   * A commit's own continuation (`requestGameStart`/`requestRematchStart`,
   * after their `await commitMatchEntry(...)`) is the ONLY code that still holds
   * the matchId a moment like this needs.
   */
  private async queueCompensatingRefundForOrphanedCommit(
    matchId: string,
    roomCode: string,
    operation: "requestGameStart" | "requestRematchStart",
    reason: string,
  ): Promise<void> {
    logger.warn({
      message: `${operation} committed match ${matchId} (room ${roomCode}) but the room was invalidated before the commit resolved (${reason}) — queuing a compensating refund so the debit does not stay permanently stuck`,
      module: "ECONOMY_ROOM",
      roomCode,
      matchId,
      operation,
      reason,
    });
    if (!this.durableWorker) {
      logger.error({
        message: `Cannot queue compensating refund for match ${matchId} (room ${roomCode}): durableWorker is not configured`,
        module: "ECONOMY_ROOM",
        roomCode,
        matchId,
        operation,
        reason,
      });
      return;
    }
    try {
      await this.durableWorker.enqueueRefund(
        matchId,
        `Commit succeeded after ${operation} was invalidated (${reason}) — the match never reached active play`,
      );
    } catch (err) {
      logger.error({
        message: `Failed to durably persist a compensating REFUND intent for match ${matchId} (room ${roomCode}): ${err instanceof Error ? err.message : String(err)}`,
        module: "ECONOMY_ROOM",
        roomCode,
        matchId,
        operation,
        reason,
      });
      throw err;
    }
  }

  /** True while at least one seated player is a real human (not a bot). */
  /**
   * Remember a seat that is leaving an economically-active match, so
   * `finalizeMatch` can still describe the full committed roster — see
   * `Room.departedThisMatch` for why an incomplete one strands the pool.
   * A no-op when no match is committed (an ordinary lobby departure has
   * nothing to settle).
   */
  private noteDepartureForSettlement(room: Room, player: Player | undefined): void {
    if (!player || !room.currentMatchId) return;
    // Snapshot, not the live object: the caller is about to delete this seat
    // and its fields keep being read long after (identity, name, bot/guest
    // flags) when the ranking is built.
    if (!room.departedThisMatch.has(player.id)) {
      room.departedThisMatch.set(player.id, { ...player });
    }
  }

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
   * True while at least one OTHER human participant in this active match
   * has an active disconnect-grace window (they dropped, are awaiting reconnect,
   * and their cleanup timer is running).
   *
   * While disconnect grace is active for another seat:
   * 1. Surviving connected participants must NOT accumulate idle strikes.
   * 2. Surviving connected participants must NOT be promoted to idle auto-play.
   * 3. Surviving connected participants must NOT receive timeout-generated automatic moves.
   */
  private hasOtherParticipantInActiveDisconnectGrace(
    room: Room,
    participantId: string,
  ): boolean {
    return [...room.players.values()].some(
      (p) =>
        p.id !== participantId &&
        !p.isBot &&
        !p.isConnected &&
        !p.hasQuit &&
        room.cleanupTimers.has(p.id),
    );
  }

  /**
   * True if a turn/round timeout may generate an automated move for `playerId`.
   *
   * - Bots always receive automated moves.
   * - Disconnected seats covered by disconnect takeover receive automated moves.
   * - Explicitly idle-promoted seats receive automated moves.
   * - Connected human survivors must NOT receive timeout-generated automatic moves
   *   while another participant has an active disconnect-grace window (prevents
   *   accidental automated game completion racing against disconnect grace).
   */
  private canApplyTimeoutMove(room: Room, playerId: string): boolean {
    const p = room.players.get(playerId);
    if (!p) return false;
    if (p.isBot) return true;
    if (this.isAutoDriven(room, playerId)) return true;
    if (this.hasOtherParticipantInActiveDisconnectGrace(room, playerId)) {
      return false;
    }
    return true;
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
   * Is this seat auto-driven for being IDLE, specifically — as opposed to a
   * genuine socket disconnect?
   *
   * `AUTO_PLAY_TURN_CAP` fires for this case alone, and turn-count ALONE is
   * always sufficient here — an idle seat is CONNECTED, just not acting, so
   * there is no reconnection-time fairness concern to protect against.
   *
   * A genuine disconnect is handled by the sibling `isDisconnectedAutoDriven`
   * below: also turn-capped (2026-09-09, `DISCONNECT_FORFEIT_TURN_CAP`), but
   * that cap is never sufficient BY ITSELF — see its own doc comment and
   * `DISCONNECT_FORFEIT_TURN_CAP`'s. Both paths ultimately still run through
   * `forceQuitAutoPlayedSeat`, which preserves the same "no eligible
   * signed-in successor" forfeiture check (via `reassignHost`) the original
   * `MATCH_GRACE_PERIOD_MS` reaper always ran — a guest or bot still can
   * never legitimately inherit the original host's economic commitment,
   * regardless of which of the two paths ends the seat.
   */
  private isIdleAutoDriven(room: Room, playerId: string): boolean {
    const p = room.players.get(playerId);
    if (!p || p.isBot) return false;
    if (p.isLocal) {
      const host = room.players.get(room.hostId);
      return !!host?.isAutoPlaying && host.autoPlayReason === "idle";
    }
    return p.isAutoPlaying === true && p.autoPlayReason === "idle";
  }

  /**
   * Is this seat auto-driven for being genuinely DISCONNECTED, as opposed to
   * merely idle? Mirrors `isIdleAutoDriven`'s own local-seat delegation
   * exactly — a pass-and-play seat has no socket of its own, so it inherits
   * whatever reason the HOST's connection carries.
   */
  private isDisconnectedAutoDriven(room: Room, playerId: string): boolean {
    const p = room.players.get(playerId);
    if (!p || p.isBot) return false;
    if (p.isLocal) {
      const host = room.players.get(room.hostId);
      return !!host?.isAutoPlaying && host.autoPlayReason === "disconnected";
    }
    return p.isAutoPlaying === true && p.autoPlayReason === "disconnected";
  }

  /**
   * `awaySince` for whoever is ACTUALLY disconnected behind this seat — the
   * seat itself normally, or (mirroring `isDisconnectedAutoDriven`'s own
   * local-seat delegation) the host's for a pass-and-play seat, which has no
   * `awaySince` of its own. `undefined` when there is no meaningful answer
   * (not disconnected, or the timestamp is somehow missing) — callers must
   * treat that as "the time floor is not met", never as "elapsed forever".
   */
  private disconnectAwaySince(room: Room, playerId: string): number | undefined {
    const p = room.players.get(playerId);
    if (!p) return undefined;
    if (p.isLocal) return room.players.get(room.hostId)?.awaySince;
    return p.awaySince;
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
      // grace period exists for. A quit seat is permanent — never re-armed.
      if (!p || p.isConnected || p.isBot || p.hasQuit) return;
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
      if (p.isBot || p.isConnected || p.hasQuit) continue;
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
      if (!p || p.isBot || p.isAutoPlaying || p.hasQuit) continue;
      // Blocker 05: Prevent idle-strike accumulation and auto-play promotion of
      // surviving participants while another participant has an active disconnect-grace window.
      if (this.hasOtherParticipantInActiveDisconnectGrace(room, pid)) continue;
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
    // A fresh episode next time this seat goes idle deserves its own full
    // AUTO_PLAY_TURN_CAP allowance, not whatever was left over from this one.
    room.autoTurnsPlayed.delete(playerId);
    if (room.lastAutoTurnActor === playerId) room.lastAutoTurnActor = null;
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
    room.autoTurnsPlayed.delete(playerId);
    room.disconnectSubMovesPlayed.delete(playerId);
    if (room.lastAutoTurnActor === playerId) room.lastAutoTurnActor = null;
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
    // A fresh episode next time this seat disconnects deserves its own full
    // AUTO_PLAY_TURN_CAP / DISCONNECT_FORFEIT_TURN_CAP allowance, not
    // whatever was left over from this one.
    room.autoTurnsPlayed.delete(playerId);
    room.disconnectSubMovesPlayed.delete(playerId);
    if (room.lastAutoTurnActor === playerId) room.lastAutoTurnActor = null;
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
   * The auto-play turn cap has been reached — either `AUTO_PLAY_TURN_CAP`
   * consecutive turns for an idle seat, or `DISCONNECT_FORFEIT_TURN_CAP`
   * turns AND `GRACE_PERIOD_MS` of elapsed time for a genuinely disconnected
   * one (see both constants' own doc comments) — force the seat out of
   * active play. Called from `scheduleBotMoveIfNeeded` in place of applying
   * what would have been the seat's next auto-move.
   *
   * Two very different outcomes depending on what the engine supports:
   *
   *   - Engines with `quitPlayer` (Rummy, Ludo) — a non-destructive quit.
   *     The seat's game state (hand, tokens, stats) stays exactly where it
   *     was; only turn rotation changes. The player stays in `room.players`
   *     with `hasQuit: true` so the roster, the board, and the eventual
   *     settlement/history all still name them — the "trace persists to
   *     match end" requirement this whole feature exists for.
   *
   *   - Everything else — the same full-purge `removePlayer` an expired
   *     10-minute disconnect grace period already uses (see `leaveRoom`),
   *     just triggered sooner. The player is deleted from `room.players`
   *     and a snapshot is handed to `finalizeMatch` for the economy
   *     settlement roster, exactly like `leaveRoom` does. For a 2-seat
   *     game this ends the match immediately as a forfeit to the opponent
   *     — `removePlayer`'s own existing behavior, nothing new here.
   */
  private async forceQuitAutoPlayedSeat(room: Room, playerId: string): Promise<void> {
    const engine = room.engine;
    const player = room.players.get(playerId);
    if (!engine || !player) return;

    player.isAutoPlaying = false;
    delete player.autoPlayReason;
    player.hasQuit = true;
    player.quitReason = "auto_play_limit";
    this.forgetSeatTimers(room, playerId);
    room.autoTurnsPlayed.delete(playerId);
    if (room.lastAutoTurnActor === playerId) room.lastAutoTurnActor = null;

    this.systemMessage(room, `${player.name} was away too long and has quit the match.`);

    const quittable = engine as unknown as { quitPlayer?: (id: string) => void };
    let departedSnapshot: Player | undefined;
    if (typeof quittable.quitPlayer === "function") {
      quittable.quitPlayer(playerId);
    } else {
      departedSnapshot = { ...player };
      this.noteDepartureForSettlement(room, departedSnapshot);
      room.players.delete(playerId);
      if (!this.hasHumanPlayer(room)) {
        await this.abandonRoom(room);
        return;
      }
      if (room.hostId === playerId) {
        const p = this.reassignHost(room, playerId);
        if (p) await p;
      }
      engine.removePlayer(playerId);
    }

    // Same gap, same fix as `leaveRoom` — `quitPlayer`/`removePlayer` both
    // mutate the engine's own state (a forfeit result, whose turn it now
    // is), which only reaches clients over `game:state`, not `room:state`.
    this.broadcastGameState(room);
    this.broadcastRoomState(room);

    if (engine.isOver()) {
      await this.finalizeMatch(room, departedSnapshot);
      return;
    }
    this.resumeTable(room);
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

  private armTurnTimer(room: Room, ms: number): void {
    room.turnTimer = setTimeout(() => {
      void this.onTurnTimeout(room).catch((err) => {
        logger.error({
          message: `onTurnTimeout failed for room ${room.code}: ${err instanceof Error ? err.message : String(err)}`,
          module: "TURN_TIMER",
          roomCode: room.code,
        });
      });
    }, ms);
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
      this.armTurnTimer(room, ms);
      return;
    }
    if (room.engine instanceof LudoEngine) {
      const opts = room.ludoOptions;
      const ms = Math.max(5, opts.turnTimerSeconds) * 1000;
      room.engine.setTurnDeadline(Date.now() + ms);
      this.broadcastGameState(room);
      this.armTurnTimer(room, ms);
      return;
    }
    if (room.engine instanceof RummyEngine) {
      const pub = room.engine.getPublicState();
      // Post-show rearrange window: no turn timer — instead a single timer that
      // fires when the 15 s window closes and scores the round.
      if (pub.phase === "arranging") {
        const deadline = room.engine.getArrangeDeadline() ?? Date.now() + 15_000;
        this.broadcastGameState(room);
        this.armTurnTimer(room, Math.max(0, deadline - Date.now()));
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, Math.max(0, deadline - Date.now()));
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
      this.armTurnTimer(room, ms);
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
      this.armTurnTimer(room, ms);
      return;
    }
  }

  private async onTurnTimeout(room: Room): Promise<void> {
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
      await this.afterAutoMove(room, engine.isOver());
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
        if (!this.canApplyTimeoutMove(room, pid)) continue;
        engine.applyAutoMove(pid);
      }
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof LudoEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      const pid = state.turnPlayerId;
      if (!this.canApplyTimeoutMove(room, pid)) {
        await this.afterAutoMove(room, false);
        return;
      }
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
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof RummyEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      // Rearrange window elapsed → score the round on players' actual hands.
      if (state.phase === "arranging") {
        engine.finalizeArrangingRound();
        await this.afterAutoMove(room, engine.isOver());
        return;
      }
      if (state.phase !== "playing") return;
      if (!this.canApplyTimeoutMove(room, state.turnPlayerId)) {
        await this.afterAutoMove(room, false);
        return;
      }
      engine.applyAutoMove(state.turnPlayerId);
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof WordBuildingEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      if (!this.canApplyTimeoutMove(room, state.turnPlayerId)) {
        await this.afterAutoMove(room, false);
        return;
      }
      engine.applyAutoMove(state.turnPlayerId);
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof DotsBoxesEngine) {
      const engine = room.engine;
      const state = engine.getPublicState();
      if (state.phase !== "playing") return;
      if (!this.canApplyTimeoutMove(room, state.turnPlayerId)) {
        await this.afterAutoMove(room, false);
        return;
      }
      engine.applyAutoMove(state.turnPlayerId);
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    if (room.engine instanceof StarGameEngine) {
      const engine = room.engine;
      if (engine.isOver()) return;
      engine.resolveDeadline((pid) => this.canApplyTimeoutMove(room, pid));
      await this.afterAutoMove(room, engine.isOver());
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
      if (actorId && this.canApplyTimeoutMove(room, actorId)) {
        engine.applyAutoMove(actorId);
      }
      await this.afterAutoMove(room, engine.isOver());
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
        for (const pid of engine.pendingActors()) {
          if (this.canApplyTimeoutMove(room, pid)) {
            engine.applyAutoMove(pid);
          }
        }
      } else {
        const actorId = engine.getTimeoutActor();
        if (actorId && this.canApplyTimeoutMove(room, actorId)) {
          engine.applyAutoMove(actorId);
        }
      }
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
    // ── Phase-timer engines (quiz / countdown style) ─────────────────────
    if (
      room.engine instanceof NamePlaceAnimalEngine ||
      room.engine instanceof TambolaEngine
    ) {
      const engine = room.engine;
      if (engine.isOver()) return;
      if (engine instanceof NamePlaceAnimalEngine) {
        engine.resolveDeadline((pid) => this.canApplyTimeoutMove(room, pid));
      } else {
        engine.resolveDeadline();
      }
      await this.afterAutoMove(room, engine.isOver());
      return;
    }
  }

  private async afterAutoMove(room: Room, isOver: boolean): Promise<void> {
    this.broadcastGameState(room);
    if (isOver) {
      await this.finalizeMatch(room);
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
      const wasConnected = player.isConnected;
      player.isConnected = false;
      player.connectionGeneration = (player.connectionGeneration ?? 0) + 1;
      player.awaySince = Date.now();
      player.awayUntil = Date.now() + GRACE_PERIOD_MS;
      this.cancelActiveStartAttempt(room, "player_disconnected");
      // One recovery session, started exactly once per genuine connect ->
      // disconnect transition. `wasConnected` excludes a socket that
      // disconnects while already marked away (this handler running twice
      // for the same seat), and `!isBot` excludes the seats that never carry
      // a live socket in the first place.
      if (wasConnected && !player.isBot) {
        metricsRegistry.increment("recovery.sessions_started_total");
      }
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
      void (async () => {
        const stillRoom = this.rooms.get(code);
        if (!stillRoom) return;
        const stillPlayer = stillRoom.players.get(playerId);
        if (stillPlayer && !stillPlayer.isConnected) {
          // One completed-recovery-session outcome, the "expired" sibling of
          // the success accounting in `joinRoom`'s reclaim branch — this path
          // and that one are mutually exclusive by construction: whichever
          // happens first (reclaim before this timer fires, or this timer
          // firing first) is what settles the session, and `forgetSeatTimers`
          // below is exactly what stops the other one from ever running for
          // this seat again.
          if (!stillPlayer.isBot) {
            metricsRegistry.increment("recovery.sessions_expired_total");
          }
          // Captured before deletion — same reasoning as leaveRoom's own
          // departingPlayer snapshot, for the same economy settlement reason.
          const droppedPlayer = stillRoom.players.get(playerId);
          const wasHostDropping = stillRoom.hostId === playerId;
          this.noteDepartureForSettlement(stillRoom, droppedPlayer);
          // The seat is going away entirely, so everything tracking it goes too.
          this.forgetSeatTimers(stillRoom, playerId);
          stillRoom.players.delete(playerId);

          // Same post-match closure rule as `leaveRoom` — a grace-window
          // expiry is just a departure that took the slow path (connection
          // never came back instead of an explicit Leave click), so it
          // needs the identical fix: a POST-match table (nothing left to
          // settle) must not auto-promote a new host or shrink to nobody
          // left to rematch against.
          if (stillRoom.phase === "finished") {
            const { min } = getGameLimits(stillRoom.game);
            if (wasHostDropping) {
              if (this.closeRoomForEveryone(stillRoom, "The host left after the match ended.")) return;
            } else if (stillRoom.players.size < min) {
              if (this.closeRoomForEveryone(stillRoom, "Not enough players remained to continue.")) return;
            }
          }

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
            await this.abandonRoom(stillRoom);
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
            const p = this.reassignHost(stillRoom, playerId);
            if (p) await p;
          }
          if (!this.rooms.has(code)) return;
          if (stillRoom.engine?.isOver()) {
            // Same reasoning as the explicit-leave path above (see G14): a
            // grace-expiry reap can also be what tips a 1v1 forfeit or a
            // multiplayer walkover, and room.phase must not stay "playing"
            // forever once the engine already knows the match is over.
            await this.finalizeMatch(stillRoom, droppedPlayer);
          } else {
            this.broadcastRoomState(stillRoom);
            this.resumeTable(stillRoom);
          }
        }
        stillRoom.cleanupTimers.delete(playerId);
      })().catch((err) => {
        logger.error({
          message: `Disconnect removal timer error in room ${code} for player ${playerId}: ${err instanceof Error ? err.message : String(err)}`,
          module: "RECONNECT",
          roomCode: code,
          playerId,
        });
      });
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

  /**
   * Fast room liveness check used by reconnect/rejoin affordances.
   * Returns alive: true only when the room exists in memory and is either in active play,
   * in lobby, or in finished state with human players present.
   * If a playerId is supplied, verifies that the player's seat is still held in the room.
   */
  isRoomAlive(
    code: string,
    playerId?: string,
  ): { alive: boolean; game?: GameKind; phase?: RoomPhase; reason?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      return { alive: false, reason: "NOT_FOUND" };
    }
    if (playerId && !room.players.has(playerId)) {
      return { alive: false, reason: "SEAT_EXPIRED", phase: room.phase };
    }
    if (room.phase === "finished" && !this.hasHumanPlayer(room)) {
      return { alive: false, reason: "CONCLUDED", phase: room.phase };
    }
    return {
      alive: true,
      game: room.game,
      phase: room.phase,
    };
  }

  protected lookup(socketId: string): { room: Room | null; player: Player | null } {
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
      quitPlayers: state.quitPlayers ?? [],
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
      quitPlayers: [...state.quitPlayers],
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
    // Root-caused 2026-09-09 from a live report: A hosts a 1v1, B wins and
    // leaves, and A — now alone in the room — could still click Play Again.
    // Nothing here ever checked the game's own minimum seat count for a
    // rematch the way `requestGameStart` already does for a fresh match.
    // Without this, `maybeSettleRematch` sees a 1-entry "everyone accepted"
    // response map (there's no one else to wait on) and proceeds straight
    // to `requestRematchStart`, which — for a real-money room — commits an
    // entry debit for a match no engine can actually play. See the matching
    // guard in `requestRematchStart` for the authoritative, unbypassable
    // half of this fix; this one exists to fail fast with a clear reason
    // instead of only after the rematch countdown runs out.
    const { min } = getGameLimits(room.game);
    if (room.players.size < min) {
      this.io.sockets.sockets.get(socketId)?.emit(
        "room:error",
        `Need at least ${min} player${min > 1 ? "s" : ""} for a rematch`,
      );
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
      // needs its own commitment in the first place. `.catch()` isolates
      // this room's rematch-commit failure from every other room's socket
      // handlers — a bare `void` here would not catch a rejection, only
      // silence the linter about the discarded value.
      void this.requestRematchStart(room).catch((err) => {
        logger.error({
          message: `requestRematchStart failed for room ${room.code}: ${err instanceof Error ? err.message : String(err)}`,
          module: "ECONOMY_ROOM",
          roomCode: room.code,
        });
      });
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

    // The authoritative half of the fix in `requestRematch` — this one
    // cannot be bypassed by anything, including the case that check can't
    // see: a non-host leaving DURING the accepted countdown. (A departing
    // HOST already cancels the rematch outright via `leaveRoom`, but a
    // non-host's departure while `status === "accepted"` was, by explicit
    // prior design, allowed to let the start proceed with "current
    // players" — which is exactly how a two-seat game could end up
    // starting, or committing a real debit for, a single remaining player.)
    // Placed before every branch below — free, bot-practice, and paid all
    // funnel through `startRematch`, and none of them get to attempt one
    // for an unplayable seat count.
    const { min } = getGameLimits(room.game);
    if (room.players.size < min) {
      this.io.to(room.code).emit(
        "room:error",
        `Need at least ${min} player${min > 1 ? "s" : ""} for a rematch`,
      );
      this.cancelRematch(room, null);
      return;
    }

    if (!this.economyService) {
      this.startRematch(room);
      return;
    }

    const host = room.players.get(room.hostId);
    if (!host) {
      this.cancelRematch(room, null);
      return;
    }

    const playersList = Array.from(room.players.values());
    const humanSeatCount = playersList.filter((p) => !p.isBot).length;
    const botSeatCount = playersList.length - humanSeatCount;
    const isBotPractice = botSeatCount > 0 && humanSeatCount <= 1;

    if (isBotPractice) {
      // Free practice rematch against AI bots: no coins charged
      room.currentMatchId = null;
      room.committedCostPerSeat = null;
      room.committedTotalPot = null;
      this.startRematch(room);
      return;
    }

    const eligibility = checkHostEconomyEligibility(host, playersList, room.entryStakeCoins, true);
    if (!eligibility.eligible) {
      this.io.to(room.code).emit("room:error", eligibility.error!);
      this.cancelRematch(room, null);
      return;
    }
    // Reentrancy gate — same reasoning as `requestGameStart`'s own check
    // just before it sets `pendingCommitOperationId`. Without this, two
    // overlapping calls (only reachable today via the `rematchStartTimer`
    // path being re-armed while a prior commit is still in flight) would
    // each generate their own operation id and both reach
    // `commitMatchEntry` — two real wallet debits for one rematch, with
    // the token check only catching the collision AFTER both debits have
    // already happened. Checked BEFORE the token is minted so the second
    // caller never touches `pendingCommitOperationId` or the economy
    // service at all.
    if (room.economyCommitPending) return;
    const matchId = `m_${room.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const operationId = `op_rematch_${matchId}`;
    room.pendingCommitOperationId = operationId;
    room.economyCommitPending = true;
    const participantDebits = this.buildParticipantDebits(host, playersList, String(room.entryStakeCoins));

    try {
      const result = await this.economyService.commitMatchEntry({
        matchId,
        roomCode: room.code,
        hostIdentityId: host.identityId!,
        seatCount: playersList.length,
        humanSeatCount,
        botSeatCount,
        isSolo: playersList.length === 1,
        participantDebits,
        gameKind: room.game,
      });
      // Same comprehensive re-validation as `requestGameStart`, adapted to the rematch
      // flow: verifies room instance, active operation token, host presence and role,
      // rematch state (`accepted`), phase (`finished`), and roster identity (not just count).
      const freshRoom = this.rooms.get(room.code);
      const isSameInstance = freshRoom === room;
      const isOperationCurrent = freshRoom?.pendingCommitOperationId === operationId;
      const isHostValid = freshRoom?.hostId === host.id && freshRoom?.players.has(host.id);
      const isRematchValid = freshRoom?.rematch.status === "accepted" && freshRoom?.phase === "finished";
      // Same "count plus one-way containment proves set equality" reasoning
      // as `requestGameStart` — a same-size swap during the await (a
      // committed participant leaves, someone else fills the seat) must
      // not read as an unchanged roster.
      const committedPlayerIds = new Set(playersList.map((p) => p.id));
      const isRosterValid =
        freshRoom !== undefined &&
        freshRoom.players.size === committedPlayerIds.size &&
        Array.from(freshRoom.players.keys()).every((id) => committedPlayerIds.has(id));

      const stillValid = isSameInstance && isOperationCurrent && isHostValid && isRematchValid && isRosterValid;
      if (!stillValid) {
        let reason = "invalidated";
        if (!freshRoom) reason = "room_deleted";
        else if (!isSameInstance) reason = "room_replaced";
        else if (!isOperationCurrent) reason = "operation_superseded";
        else if (!isHostValid) reason = "host_changed";
        else if (!isRematchValid) reason = `rematch_${freshRoom.rematch.status}_phase_${freshRoom.phase}`;
        else if (!isRosterValid) reason = "roster_changed";

        await this.queueCompensatingRefundForOrphanedCommit(result.settlement.matchId, room.code, "requestRematchStart", reason);
        return;
      }
      room.currentMatchId = result.settlement.matchId;
      // Same clean slate as the first-start commit path above.
      room.departedThisMatch.clear();
      // A fresh commit means any previous match's terminal id is now stale
      // — the results modal for THAT match should already be closed, and a
      // reconnect from here on should recover THIS match once it concludes,
      // not the old one. Real amounts for the commitment motion sequence,
      // straight from the authoritative commit result — never guessed.
      room.lastMatchId = null;
      room.committedCostPerSeat = result.settlement.costPerSeat;
      room.committedTotalPot = result.settlement.totalCollected;
      room.terminalStatus = "IDLE";
      room.terminalOutcome = null;
      room.terminalPromise = null;
      room.terminalError = null;
      room.terminalPayload = null;
      this.startRematch(room);
    } catch (err) {
      this.io.to(room.code).emit("room:error", this.economyErrorMessage(err, room));
      logger.warn({
        message: `commitMatchEntry failed for rematch in room ${room.code}: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
        module: "ECONOMY_ROOM",
        roomCode: room.code,
      });
      this.cancelRematch(room, null);
    } finally {
      if (room.pendingCommitOperationId === operationId) {
        room.pendingCommitOperationId = null;
      }
      room.economyCommitPending = false;
    }
  }

  /** Actually start a new round — wraps the same flow as startGame() but skips
   *  the ready-check (everyone has already opted in via the rematch vote).
   *  Post-commit step (see `requestRematchStart` above) when economy is
   *  configured; the direct, unchanged entry point when it isn't. */
  private startRematch(room: Room): void {
    if (room.rematch.status !== "accepted") return;
    const playersList = Array.from(room.players.values());
    const botSeats = playersList.filter((p) => p.isBot).length;
    const humanSeats = playersList.filter((p) => !p.isBot).length;
    const isBotPractice = botSeats > 0 && humanSeats <= 1;

    // Same bypass check as `startGame`'s own, for the same reason: a direct
    // call here (skipping `requestRematchStart`) must not be able to start
    // a paid rematch for free. Inert when `economyService` isn't configured.
    if (this.economyService && !room.currentMatchId && !isBotPractice) {
      this.io.to(room.code).emit(
        "room:error",
        "This rematch has not been paid for yet. Use requestRematchStart, not startRematch, when Economy V1 is enabled.",
      );
      this.cancelRematch(room, null);
      return;
    }
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
      room.lastMatchPlayers = null;
      room.matchStartedAt = Date.now();
      this.transitionLifecycle(room, "IN_PROGRESS", "Rematch started");
      this.emitRummyBotTells(room);
      // Mark everyone "ready" so any UI that checks readiness behaves
      // correctly post-restart.
      for (const p of room.players.values()) p.isReady = true;
      room.rematch = emptyRematchState();
      room.terminalStatus = "IDLE";
      room.terminalOutcome = null;
      room.terminalPromise = null;
      room.terminalError = null;
      room.terminalPayload = null;
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

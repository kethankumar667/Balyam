export type GameKind = "rps" | "rummy" | "ludo" | "snl" | "handcricket" | "uno";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  awayUntil?: number;
  /** True if this is a server-controlled AI player (no real socket). */
  isBot?: boolean;
  /**
   * True if this is a "pass and play" local player — a human who is sharing
   * the host's device. They have no socket of their own; the host's socket
   * emits moves on their behalf. The server skips bot auto-move scheduling
   * for these seats (they wait for human input just like a normal player).
   */
  isLocal?: boolean;
  /** For Ludo: player's selected color (first-come-first-served in the lobby). */
  chosenColor?: LudoColor;
  /** For Snakes & Ladders: player's selected coin color (10 distinct shades, first-come-first-served). */
  coinColor?: CoinColor;
  /** For Ludo: optional per-token nicknames keyed by tokenId. */
  tokenNicknames?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  ts: number;
}

export type RoomPhase = "lobby" | "playing" | "finished";

export interface RoomPublicState {
  code: string;
  game: GameKind;
  phase: RoomPhase;
  players: Player[];
  hostId: string;
  maxPlayers: number;
}

// ---- Rummy ----
export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  /**
   * True for printed joker cards (4 per double-deck). Printed jokers act as
   * wilds regardless of which rank the cut card designates. The suit/rank on
   * a printed joker are placeholders for serialization — game logic must check
   * isPrintedJoker before reading them.
   */
  isPrintedJoker?: boolean;
}

export type MeldKind = "pureSequence" | "impureSequence" | "set";

export interface Meld {
  kind: MeldKind;
  cards: Card[];
}

export type RummyTurnAction = "draw" | "discardOrDeclare";

export interface RummyPublicState {
  kind: "rummy";
  phase: "playing" | "finished";
  turnPlayerId: string;
  turnAction: RummyTurnAction;
  turnIndex: number;
  wildJoker: Card;
  closedDeckCount: number;
  topOfOpenPile: Card | null;
  /** Full discard pile in chronological order (oldest first). Public information. */
  openPile: Card[];
  handSizes: Record<string, number>;
  /** Wall-clock ms after which the active player's turn auto-resolves. null when not playing. */
  turnDeadline: number | null;
  /** Match-level state for pool modes. */
  matchMode: RummyMatchMode;
  /** Cumulative points across rounds (only used in pool modes). */
  cumulativeScores: Record<string, number>;
  /** Players who hit the pool target and are out of the match. */
  eliminatedInMatch: string[];
  /** 1-based round counter — increments each new deal in pool mode. */
  roundNumber: number;
  /** Match winner (last player standing in pool mode). null until decided. */
  matchWinnerId: string | null;
  /** True once the whole match is over (pool mode: 1 player left). */
  matchOver: boolean;
  /** Target points for elimination (101, 201, or null in single mode). */
  poolTarget: number | null;
  playerOrder: string[];
  /** Players who used DROP — still seen in UI but no longer take turns. */
  droppedPlayers: string[];
  winnerId?: string | null;
  scores?: Record<string, number>;
  finalHands?: Record<string, Card[]>;
  /**
   * End-of-round meld arrangement per player, in display order, as card IDs.
   *
   *   • Winner → the actual melds they declared (proof of how they made it).
   *   • Invalid-declare player → the (rejected) melds they attempted.
   *   • Other players → server's best-effort auto-arrangement of their hand
   *     so the scorecard shows what they could have played.
   *
   * A flat array of all IDs in one group means "no meld grouping known" and
   * the client renders it as a single ungrouped row.
   */
  finalMelds?: Record<string, string[][]>;
  invalidDeclareBy?: string | null;
}

export interface RummyPlayerState extends RummyPublicState {
  myHand: Card[];
}

export interface RummyDrawMove {
  type: "draw";
  data: { from: "closed" | "open" };
}

export interface RummyDiscardMove {
  type: "discard";
  data: { cardId: string };
}

export interface RummyDeclareMove {
  type: "declare";
  data: {
    discardCardId: string;
    melds: string[][]; // arrays of card IDs
  };
}

/** Drop out of the round — fixed point penalty, game continues without this player. */
export interface RummyDropMove {
  type: "drop";
}

/** Pool mode: deal the next round after the current one ended. */
export interface RummyNewRoundMove {
  type: "newRound";
}

/**
 * Pool Rummy modes — players accumulate points across rounds. When you reach
 * the target, you're eliminated. Last player standing wins.
 *
 *   • "single"  — one round, score it, done.
 *   • "pool101" — eliminated at 101 cumulative points.
 *   • "pool201" — eliminated at 201 cumulative points (longer match).
 */
export type RummyMatchMode = "single" | "pool101" | "pool201";

export interface RummyGameOptions {
  /** Seconds before the active player's turn auto-resolves. */
  turnTimerSeconds: number;
  mode: RummyMatchMode;
}

export const DEFAULT_RUMMY_OPTIONS: RummyGameOptions = {
  turnTimerSeconds: 30,
  mode: "single",
};

export type RummyMove =
  | RummyDrawMove
  | RummyDiscardMove
  | RummyDeclareMove
  | RummyDropMove
  | RummyNewRoundMove;

// ---- Ludo ----
export type LudoColor =
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "purple"
  | "cyan"
  | "orange"
  | "brown";

export type LudoTokenState = "yard" | "track" | "stretch" | "home";

export interface LudoToken {
  id: string;            // e.g. "red-0"
  color: LudoColor;
  state: LudoTokenState;
  trackPos?: number;     // 0-51 when state === "track"
  stretchPos?: number;   // 0-5 when state === "stretch"
}

export type LudoTurnPhase = "rolling" | "moving" | "done";

export type LudoEventKind =
  | "capture"
  | "home"
  | "win"
  | "forfeit"
  | "noMove"
  | "move"
  | "autoSkip";

export interface LudoEvent {
  kind: LudoEventKind;
  byPlayerId?: string;
  victimPlayerId?: string;
  tokenId?: string;
  ts: number;
  cellsMoved?: number;
  capturedCount?: number;
  destinationState?: "track" | "stretch" | "home" | "yard";
}

export interface LudoGameOptions {
  mandatoryCapture: boolean;
  noSafeSquares: boolean;
  turnTimerSeconds: number;
}

export const DEFAULT_LUDO_OPTIONS: LudoGameOptions = {
  mandatoryCapture: true,
  noSafeSquares: false,
  turnTimerSeconds: 20,
};

export interface LudoStats {
  rollCount: Record<string, number>;
  captureCount: Record<string, number>;
  sixCount: Record<string, number>;
  biggestStreak: Record<string, number>;
  startedAt: number;
  endedAt: number | null;
}

export interface LudoState {
  kind: "ludo";
  phase: "playing" | "finished";
  turnPlayerId: string;
  turnPhase: LudoTurnPhase;
  diceValue: number | null;
  consecutiveSixes: number;
  movableTokenIds: string[];
  tokens: Record<string, LudoToken[]>;   // by playerId
  playerColors: Record<string, LudoColor>;
  playerOrder: string[];
  winnerId: string | null;
  finishedCount: Record<string, number>;
  /** Mandatory Capture: per-player flag — must be true before tokens can enter home stretch. */
  hasCaptured: Record<string, boolean>;
  /** Most recent game event for animations / toasts. */
  lastEvent: LudoEvent | null;
  stats: LudoStats;
  /** Wall-clock ms when the current turn auto-skips. null when not playing. */
  turnDeadline: number | null;
  /** Active game rules. */
  options: LudoGameOptions;
}

export interface LudoRollMove {
  type: "roll";
}

export interface LudoMoveTokenMove {
  type: "move";
  data: { tokenId: string };
}

export type LudoMove = LudoRollMove | LudoMoveTokenMove;

// ---- Snakes & Ladders ----
export type SnlDifficulty = "easy" | "medium" | "hard" | "extreme";

/** 10 distinct coin colors for SnL — players pick one each in the lobby. */
export type CoinColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "cyan"
  | "orange"
  | "pink"
  | "lime"
  | "magenta";

export const COIN_COLORS: CoinColor[] = [
  "red", "blue", "green", "yellow", "purple",
  "cyan", "orange", "pink", "lime", "magenta",
];

export interface SnlGameOptions {
  difficulty: SnlDifficulty;
}

export const DEFAULT_SNL_OPTIONS: SnlGameOptions = {
  difficulty: "medium",
};

export interface SnlBoardConfig {
  size: 100;
  /** Square index (start) -> destination (end). All starts < ends. */
  ladders: Record<number, number>;
  /** Square index (head) -> destination (tail). All heads > tails. */
  snakes: Record<number, number>;
  difficulty: SnlDifficulty;
}

export interface SnlPlayerStats {
  rolls: number;
  laddersClimbed: number;
  snakesBitten: number;
  bounces: number;
  highestSquare: number;
}

export type SnlEventKind =
  | "roll"
  | "move"
  | "ladder"
  | "snake"
  | "bounce"
  | "win"
  | "stay";

export interface SnlEvent {
  kind: SnlEventKind;
  playerId: string;
  ts: number;
  roll?: number;
  from?: number;
  /** Square actually landed on after bounce (pre snake/ladder). */
  landing?: number;
  /** Final square after snake/ladder, if any. */
  to?: number;
}

export interface SnlState {
  kind: "snl";
  phase: "playing" | "finished";
  config: SnlBoardConfig;
  playerOrder: string[];
  turnPlayerId: string;
  turnPhase: "rolling" | "resolving";
  /** Square 0 = off-board start, 1..100 = on board. */
  positions: Record<string, number>;
  diceValue: number | null;
  winnerId: string | null;
  /** Order in which players reached 100 (winner first). */
  finishedOrder: string[];
  stats: Record<string, SnlPlayerStats>;
  /** Recent events (ring buffer, newest last). Used by client for animations. */
  recentEvents: SnlEvent[];
  startedAt: number;
}

export interface SnlRollMove {
  type: "roll";
}

export type SnlMove = SnlRollMove;

// ---- Hand Cricket ----
export type HcPhase =
  | "teamSelect"
  | "toss"
  | "tossChoice"
  | "innings1"
  | "innings2"
  | "finished";
export type HcInningsEndReason = "allOut" | "oversUp" | "chased";
export type HcResult = "win" | "tie";

/**
 * Match structure mode.
 *   • single: one match, formal rules per format
 *   • tournament: multi-match series (Phase 3)
 *   • galli: street-cricket free-play — host picks overs, no rules enforced
 */
export type HcMode = "single" | "tournament" | "galli";
/**
 * Format defines the cricket ruleset (overs, wickets, quota, powerplay).
 * Always one of T20/ODI/Test even in Galli mode — format-tied data like rosters
 * still need a key to look up against.
 */
export type HcFormat = "test" | "odi" | "t20";
export type HcCategory = "international" | "ipl";

/**
 * Default overs per innings by format. In Galli mode this is ignored — the
 * host's `galliOvers` option determines innings length instead.
 */
export const HC_OVERS_BY_FORMAT: Record<HcFormat, number> = {
  test: 30,
  odi: 15,
  t20: 10,
};

/**
 * Max overs a single bowler may bowl in one innings, by format.
 *   • Test: no limit (null).
 *   • ODI:  4 overs (scaled from real-cricket 10/50 = 1/5 of innings).
 *   • T20:  3 overs (scaled from real-cricket 4/20 = 1/5, rounded up so 4 bowlers
 *     can still cover all 10 overs of the innings under the minimum composition).
 */
export const HC_MAX_OVERS_PER_BOWLER: Record<HcFormat, number | null> = {
  test: null,
  odi: 4,
  t20: 3,
};

/**
 * Powerplay overs per format. During a powerplay over, 3 of the 6 balls
 * (randomly selected at the start of the over) restrict the bowler to picks 1-3,
 * so the batter can safely swing for 4-6 without wicket risk on those balls.
 * Galli mode bypasses powerplay regardless of format.
 */
export const HC_POWERPLAY_OVERS: Record<HcFormat, number> = {
  test: 0,
  odi: 3,
  t20: 3,
};

/** Min/max overs the host may pick when starting a Galli match. */
export const HC_GALLI_MIN_OVERS = 2;
export const HC_GALLI_MAX_OVERS = 20;

/** Wickets allowed per innings (standard cricket: 10 — losing the 11th = all out). */
export const HC_WICKETS_PER_INNINGS = 10;

/** Country IDs for international play. */
export type HcCountry =
  | "india"
  | "australia"
  | "england"
  | "newzealand"
  | "southafrica"
  | "pakistan"
  | "westindies"
  | "srilanka"
  | "bangladesh"
  | "afghanistan";

/** IPL franchise IDs for national play. */
export type HcFranchise =
  | "csk" | "mi" | "rcb" | "kkr" | "srh"
  | "dc"  | "pbks" | "rr" | "gt" | "lsg";

export type HcTeamId = HcCountry | HcFranchise;

export interface HcGameOptions {
  mode: HcMode;
  format: HcFormat;
  category: HcCategory;
  /** Required when format === "galli": how many overs the host has chosen for this match. */
  galliOvers?: number;
}

export const DEFAULT_HC_OPTIONS: HcGameOptions = {
  mode: "single",
  format: "t20",
  category: "international",
};

export interface HcBall {
  inningsNumber: 1 | 2;
  overNumber: number;   // 1-based, e.g. 3rd over
  ballInOver: number;   // 1..6
  batterPick: number;
  bowlerPick: number;
  runs: number;          // 0 if wicket, else batter pick
  wicket: boolean;
  isBoundary: boolean;   // 4s and 6s
  /** True if this ball was inside the powerplay window and bowler was restricted to 1-3. */
  isRestrictedBall: boolean;
  /** Profile id of the batter who faced this ball (from batting team's squadPlayerIds). */
  batterId: string;
  /** Profile id of the bowler who delivered this ball (from bowling team's squadPlayerIds). */
  bowlerId: string;
}

export interface HcBatterStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  /** Profile id of the bowler who dismissed this batter, or null if not out. */
  dismissedBy: string | null;
}

export interface HcBowlerStats {
  balls: number;        // legal balls bowled
  runs: number;         // runs conceded
  wickets: number;
}

export interface HcInnings {
  number: 1 | 2;
  battingPlayerId: string;
  bowlingPlayerId: string;
  runs: number;
  wickets: number;     // 0..10
  balls: number;       // total balls bowled in the innings
  overs: number;       // max overs allowed
  endedReason: HcInningsEndReason | null;
  history: HcBall[];
  /** Squad index of the on-strike batter (the one who picked this ball). */
  strikerIdx: number;
  /** Squad index of the non-strike batter (waiting at the other end). */
  nonStrikerIdx: number;
  /** Squad index of the next batter who will come in if a wicket falls. */
  nextBatterIdx: number;
  /** Profile id of the current bowler, or null when the bowling player needs to pick one. */
  currentBowlerId: string | null;
  /** Per-player batting stats, keyed by squad profile id. */
  batterStats: Record<string, HcBatterStats>;
  /** Per-player bowling stats, keyed by squad profile id. */
  bowlerStats: Record<string, HcBowlerStats>;
  /**
   * Powerplay restriction map: over number (1-based) → ball positions (1-6)
   * where the bowler is restricted to picks 1-3 during that over.
   * Generated when the bowler is chosen for a powerplay over.
   */
  restrictedBallsByOver: Record<number, number[]>;
  /** Total powerplay overs this innings (derived from format). */
  powerplayOvers: number;
}

export interface HcTeamSelection {
  /** Country or franchise ID. */
  teamId: HcTeamId;
  /** Player IDs selected for the playing XI. null until the player confirms their squad. */
  squadPlayerIds: string[] | null;
  /** Profile id of the user-designated captain. Must be in squadPlayerIds. */
  captainId: string | null;
  /** Profile id of the user-designated vice-captain. Must be in squadPlayerIds and != captainId. */
  viceCaptainId: string | null;
}

export interface HcState {
  kind: "handcricket";
  phase: HcPhase;
  playerOrder: string[];                  // [p0, p1]
  /** Game options chosen by host at create time. */
  options: HcGameOptions;
  /** Per-player team selection. null until they pick. */
  teamSelections: Record<string, HcTeamSelection | null>;
  /** Per-player pick for the toss phase. Hidden from opponent until both lock in. */
  tossPicks: Record<string, number | null>;
  tossSum: number | null;
  tossWinnerId: string | null;
  innings1: HcInnings | null;
  innings2: HcInnings | null;
  pendingPicks: Record<string, number | null>;
  winnerId: string | null;
  result: HcResult | null;
  /** Wickets per innings (10 by default). */
  maxWickets: number;
  /** Overs per innings, derived from format. */
  oversPerInnings: number;
  startedAt: number;
}

export interface HcTossPickMove {
  type: "tossPick";
  data: { pick: number };
}
export interface HcTossChoiceMove {
  type: "tossChoice";
  data: { choice: "bat" | "bowl" };
}
export interface HcPickMove {
  type: "pick";
  data: { pick: number };
}
/** Pre-game step 1: choose your country/franchise representation. */
export interface HcSelectTeamMove {
  type: "selectTeam";
  data: { teamId: HcTeamId };
}
/** Pre-game step 2: lock in your playing XI from the chosen team's roster, including captain + vice-captain. */
export interface HcConfirmSquadMove {
  type: "confirmSquad";
  data: {
    playerIds: string[];
    captainId: string;
    viceCaptainId: string;
  };
}
/** Pick the bowler for the upcoming over. Only the bowling player may issue this. */
export interface HcSelectBowlerMove {
  type: "selectBowler";
  data: { playerId: string };
}
export type HcMove =
  | HcTossPickMove
  | HcTossChoiceMove
  | HcPickMove
  | HcSelectTeamMove
  | HcConfirmSquadMove
  | HcSelectBowlerMove;

// ---- RPS ----
export type RpsChoice = "rock" | "paper" | "scissors";

export interface RpsRoundResult {
  round: number;
  choices: Record<string, RpsChoice>;
  winnerId: string | null;
}

/** Race-to-target match state. Multiple matches can be played in a room — each
 *  reset bumps `matchNumber` and clears scores/history. */
export interface RpsState {
  kind: "rps";
  round: number;
  /** First to this many round wins takes the match. */
  target: number;
  scores: Record<string, number>;
  pendingChoices: Record<string, boolean>;
  history: RpsRoundResult[];
  winnerId: string | null;
  isOver: boolean;
  /** 1-based counter; increments with each rematch in the same room. */
  matchNumber: number;
  /** Per-player current win streak (resets on loss/draw). */
  streak: Record<string, number>;
  /** Per-player longest streak this match. */
  bestStreak: Record<string, number>;
  /** Wall-clock ms when both players' choices were last revealed. Lets the UI
   *  show a fresh reveal animation per round. */
  lastRevealTs: number | null;
  /** Total ties this match — bragging rights only. */
  ties: number;
}

// ---- UNO (scaffold) ----
export interface UnoState {
  kind: "uno";
  phase: "playing" | "finished";
  playerOrder: string[];
  turnPlayerId: string;
  direction: 1 | -1;
  topCard: string;
  handSizes: Record<string, number>;
  drawPileCount: number;
  winnerId: string | null;
  lastAction: string | null;
}

export type UnoMoveType = "playDemo" | "draw";

// ---- Socket event payloads ----
export interface CreateRoomPayload {
  name: string;
  game: GameKind;
  playerId?: string;
  ludoOptions?: Partial<LudoGameOptions>;
  snlOptions?: Partial<SnlGameOptions>;
  rummyOptions?: Partial<RummyGameOptions>;
  hcOptions?: Partial<HcGameOptions>;
}

export interface SetTokenNicknamesPayload {
  nicknames: Record<string, string>;
}

export interface JoinRoomPayload {
  name: string;
  code: string;
  playerId?: string;
}

export interface ChatSendPayload {
  text: string;
}

export interface GameMovePayload {
  type: string;
  data?: unknown;
  /**
   * Optional override of the playerId the move is on behalf of. Only honored
   * when the calling socket is the host AND the target playerId is a local
   * (pass-and-play) seat in the same room. Used so a single device can drive
   * multiple seats in Pass & Play mode for Ludo / Snakes & Ladders.
   */
  playerId?: string;
}

// ---- Ephemeral overlay events (reactions, cursors) ----
export interface ReactionSendPayload {
  emoji: string;
}

export interface ReactionRecvPayload {
  id: string;
  fromPlayerId: string;
  emoji: string;
  ts: number;
}

export interface CursorSendPayload {
  /** Normalized 0..1 coords inside the board element. null = hide. */
  x: number | null;
  y: number | null;
}

export interface CursorRecvPayload {
  fromPlayerId: string;
  x: number | null;
  y: number | null;
}

// ---- WebRTC voice signaling ----
export type WebRTCSignalKind = "offer" | "answer" | "candidate" | "ready";

export interface WebRTCSignal {
  kind: WebRTCSignalKind;
  sdp?: string;
  candidate?: RTCIceCandidateInit | null;
}

export interface WebRTCSignalSendPayload {
  toPlayerId: string;
  signal: WebRTCSignal;
}

export interface WebRTCSignalRecvPayload {
  fromPlayerId: string;
  signal: WebRTCSignal;
}

/**
 * Rematch flow.
 *
 * When a game finishes, the host can request another round in the same room
 * with the same players. Every non-host (humans only — bots auto-accept) sees
 * an accept/decline prompt. The match starts the moment all responses are in,
 * or is cancelled if anyone declines / the timer expires.
 *
 * The status types:
 *   - "idle"        : no rematch in progress
 *   - "pending"     : host requested, waiting on responses
 *   - "accepted"    : everyone accepted; brief countdown before restart
 *   - "declined"    : someone said no (or timed out); rematch cancelled
 */
export type RematchStatus = "idle" | "pending" | "accepted" | "declined";

export interface RematchState {
  status: RematchStatus;
  requesterId: string | null;
  /** Map of playerId -> response. Bots are auto-accepted on request. */
  responses: Record<string, "pending" | "accept" | "decline">;
  /** Wall-clock ms when the pending request expires if not all responses are in. */
  expiresAt: number | null;
  /** When status === "accepted", wall-clock ms when the new game auto-starts. */
  startsAt: number | null;
  /** When status === "declined", the playerId who declined (or null if timed out). */
  declinedBy: string | null;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomPublicState) => void;
  "room:joined": (payload: { playerId: string; state: RoomPublicState }) => void;
  "room:error": (message: string) => void;
  "chat:message": (message: ChatMessage) => void;
  "game:state": (state: unknown) => void;
  "game:error": (message: string) => void;
  "webrtc:signal": (payload: WebRTCSignalRecvPayload) => void;
  "room:reaction": (payload: ReactionRecvPayload) => void;
  "room:cursor": (payload: CursorRecvPayload) => void;
  /** Broadcasted whenever rematch state changes for the room. */
  "rematch:state": (state: RematchState) => void;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    ack: (response: { ok: boolean; code?: string; playerId?: string; error?: string }) => void
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack: (response: { ok: boolean; playerId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:setReady": (ready: boolean) => void;
  "room:addBot": () => void;
  "room:removeBot": (botId: string) => void;
  /** Pass & Play: host adds a local human seat with the given name. */
  "room:addLocalPlayer": (name: string) => void;
  /** Pass & Play: host removes a local seat by id. */
  "room:removeLocalPlayer": (playerId: string) => void;
  "room:chooseColor": (color: LudoColor) => void;
  "room:chooseCoinColor": (color: CoinColor) => void;
  "room:setTokenNicknames": (payload: SetTokenNicknamesPayload) => void;
  "room:startGame": () => void;
  "chat:send": (payload: ChatSendPayload) => void;
  "game:move": (payload: GameMovePayload) => void;
  "webrtc:signal": (payload: WebRTCSignalSendPayload) => void;
  "room:reaction": (payload: ReactionSendPayload) => void;
  "room:cursor": (payload: CursorSendPayload) => void;
  /** Host-only. Initiates a rematch request to all other players in the room. */
  "rematch:request": () => void;
  /** Any non-host response to a pending rematch request. */
  "rematch:respond": (response: "accept" | "decline") => void;
}

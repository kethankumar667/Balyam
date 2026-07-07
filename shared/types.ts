export type GameKind = "rps" | "rummy" | "ludo" | "snl" | "handcricket" | "uno" | "wordbuilding" | "dotsboxes" | "memorymatch" | "stargame";

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
  /**
   * True when this player's own client has detected a small portrait
   * viewport that needs rotating to landscape to play comfortably (Rummy).
   * Reported by the client via `room:setOrientation` and re-broadcast to
   * the whole room so a synchronized "wait for everyone to rotate" gate
   * can show who's still blocking the deal. Always false/undefined for
   * bots and pass-and-play local seats — they have no physical device.
   */
  needsRotation?: boolean;
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
  /** Host-chosen table name ("Friday Rummy Nights") — null until set. Persists for the room's lifetime; not game-specific. */
  name: string | null;
  /** Last finished rounds this room has played, oldest first (Rummy only — empty elsewhere). docs/rummy/roadmap.md B.1. */
  history: RummyRoundRecap[];
  /** "House Champion" of this room's table name, if a pool match has been won under it (Rummy only). Keyed by name, not room code, so it survives room collapse and resurfaces if the same gang reconvenes under the same name. docs/rummy/roadmap.md B.3. */
  champion: RummyChampion | null;
}

/** One row of the room's "photo album" — a finished round's recap. Rummy only. */
export interface RummyRoundRecap {
  roundNumber: number;
  winnerId: string | null;
  invalidDeclareBy: string | null;
  scores: Record<string, number>;
  /** Names as they were when the round ended, so history still reads right after a player leaves or renames. */
  playerNames: Record<string, string>;
  ts: number;
  /** Round's wild joker — needed to classify the winner's melds for narration ("a pure 7-8-9 of hearts"). */
  wildJoker: Card | null;
  /** End-of-round hands, same shape as RummyPublicState.finalHands. Empty when the round ended by drop (no melds were ever played). */
  finalHands: Record<string, Card[]>;
  /** End-of-round meld groupings (card IDs), same shape as RummyPublicState.finalMelds. */
  finalMelds: Record<string, string[][]>;
  /** Set when the round ended because a player was removed (disconnect grace expired), not by play. */
  endedByDisconnect: string | null;
}

/** Pool-match winner crowned for a room's table name. Rummy only. */
export interface RummyChampion {
  playerId: string;
  playerName: string;
  /** YYYY-MM-DD the pool match was won. */
  date: string;
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
  /**
   * "playing"   — normal turns.
   * "arranging" — a valid show has been made; the winner is a spectator and
   *               everyone else has a fixed window (see `arrangeDeadline`) to
   *               rearrange their hand and minimise their score. No draws.
   * "finished"  — round scored; scorecard is shown.
   */
  phase: "playing" | "arranging" | "finished";
  turnPlayerId: string;
  turnAction: RummyTurnAction;
  turnIndex: number;
  wildJoker: Card;
  closedDeckCount: number;
  topOfOpenPile: Card | null;
  /**
   * True only while the round's first draw is still available AND the
   * open-pile top is a printed ("special") joker — the one moment that
   * seeded special joker may be lifted from the discard pile. False
   * otherwise (the standard house rule blocks printed jokers there).
   */
  openJokerDrawable: boolean;
  /** Full discard pile in chronological order (oldest first). Public information. */
  openPile: Card[];
  handSizes: Record<string, number>;
  /** Wall-clock ms after which the active player's turn auto-resolves. null when not playing. */
  turnDeadline: number | null;
  /**
   * During the "arranging" phase, the wall-clock ms at which the 15-second
   * rearrange window closes and the round is scored. null in every other phase.
   */
  arrangeDeadline?: number | null;
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
  /**
   * When the round ended because a player was removed from the room
   * (grace-period timeout after disconnect), this is set to their id.
   * The client renders a distinct "Opponent disconnected" message so
   * each remaining player doesn't see an empty-card scorecard claiming
   * they were crowned by playing.
   */
  endedByDisconnect?: string | null;
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
  /** Legacy combined timer — kept for back-compat / fallback. */
  turnTimerSeconds: number;
  /** Seconds to choose a pile (closed / open) and draw. */
  drawTimerSeconds?: number;
  /** Seconds to commit a discard or declare after drawing. */
  discardTimerSeconds?: number;
  mode: RummyMatchMode;
}

export const DEFAULT_RUMMY_OPTIONS: RummyGameOptions = {
  turnTimerSeconds: 30,
  drawTimerSeconds: 30,
  discardTimerSeconds: 15,
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
  /** Wall-clock ms when the current round's pick window closes (30 s per
   *  round). Null between matches / when finished. Drives the shared
   *  TurnTimeWarning countdown for whoever still has to throw. */
  roundDeadline: number | null;
}

// ---- Word Building (English Workbook Edition) ----
//
// 1990s English-classroom inspired vocab game. Players take turns placing a
// single A–Z letter into any empty cell on a shared grid. After each move
// the engine scans the row and column the letter landed in and credits any
// newly-completed 3+ letter dictionary words to the placer. Each word can
// only score once per match. Game ends when every cell is filled.
//
// Multiplayer model mirrors Ludo/SnL: turn-based on a shared board,
// everyone sees the same grid in real time.

export type WordBuildingBoardSize = 8 | 10 | 15;

/**
 * Which wordlist the engine validates placements against.
 *
 *   common     — top ~20k frequency-ranked English words intersected with
 *                a Scrabble dictionary (filters out tournament weirdness
 *                like CAA/KBAR/DIEB and acronym noise like OBS/RSA).
 *                The right default for "feels like English class".
 *
 *   tournament — full ~275k Scrabble dictionary, like the original
 *                an-array-of-english-words ship. Accepts every obscure
 *                Scrabble-legal entry. Right for word-game enthusiasts
 *                who already know the meta.
 */
export type WordBuildingDictionaryMode = "common" | "tournament";

export interface WordBuildingOptions {
  /** Square grid edge length. */
  boardSize: WordBuildingBoardSize;
  /** Seconds per turn. 0 disables the timer. */
  turnTimerSeconds: number;
  /** Minimum word length that scores (spec: 3). */
  minWordLength: number;
  /** See WordBuildingDictionaryMode. Defaults to "common". */
  dictionaryMode: WordBuildingDictionaryMode;
}

export const DEFAULT_WORDBUILDING_OPTIONS: WordBuildingOptions = {
  boardSize: 10,
  turnTimerSeconds: 30,
  minWordLength: 3,
  dictionaryMode: "common",
};

/** A scored word with the cells it occupies and who placed it. */
export interface WordBuildingScoredWord {
  /** Stable id for animations + dedupe. */
  id: string;
  word: string;
  /** Cells covered by this word, in reading order. */
  cells: Array<{ r: number; c: number }>;
  /** Player who completed (closed) the word. */
  scorerId: string;
  /** Points awarded (= word length). */
  points: number;
  /** Wall-clock ms when scored — drives reveal animations. */
  ts: number;
  /**
   * The axis the word runs along — drives the client's pulse + underline
   * layering. Words score in any of 8 directions (left↔right, top↔bottom,
   * both diagonals + reverses), folded into 4 axes here.
   *
   *   row        — horizontal (left↔right)
   *   col        — vertical   (top↔bottom)
   *   diag-down  — top-left ↘ bottom-right
   *   diag-up    — bottom-left ↗ top-right
   */
  orientation: "row" | "col" | "diag-down" | "diag-up";
}

/** A single placement move recorded for history + move log. */
export interface WordBuildingMoveRecord {
  /** Player who placed the letter. */
  playerId: string;
  r: number;
  c: number;
  letter: string;
  /** Words scored by this move (zero or more). */
  scored: WordBuildingScoredWord[];
  ts: number;
}

export interface WordBuildingPublicState {
  kind: "wordbuilding";
  phase: "playing" | "finished";
  options: WordBuildingOptions;
  /** Row-major grid: each cell is the placed letter or "" if empty. */
  board: string[][];
  /** Player ids in turn order. */
  playerOrder: string[];
  /** Current turn player id. */
  turnPlayerId: string;
  /** Per-player total points. */
  scores: Record<string, number>;
  /** All words scored this match, oldest first. Capped on render side. */
  scoredWords: WordBuildingScoredWord[];
  /** Last N moves for the move-history panel. */
  recentMoves: WordBuildingMoveRecord[];
  /** Wall-clock ms after which the turn auto-passes. null = timer disabled. */
  turnDeadline: number | null;
  /** Final winner — null until phase flips to finished. */
  winnerId: string | null;
  /** Cells filled count, for endgame check + UI progress. */
  filledCells: number;
  totalCells: number;
}

export type WordBuildingMoveType = "place";

export interface WordBuildingPlaceMove {
  type: "place";
  data: { r: number; c: number; letter: string };
}

// ---- Dots & Boxes (Rough Notebook Edition) ----
//
// Classic 2–4 player paper game. The board is an RxC grid of DOTS, which
// implies an (R-1)x(C-1) grid of BOXES. Players take turns connecting
// two orthogonally-adjacent dots with a line. Whenever a player closes
// a box (4 edges drawn) they claim it AND keep the turn (bonus move).
// Game ends when every box is owned. Highest box count wins.

export type DotsBoxesBoardSize = 5 | 7 | 9;

export interface DotsBoxesOptions {
  /** Dot-grid edge length. Box count = (size-1)^2. 5=tiny/quick, 9=marathon. */
  boardSize: DotsBoxesBoardSize;
  /** Seconds per turn. 0 disables the timer. */
  turnTimerSeconds: number;
}

export const DEFAULT_DOTSBOXES_OPTIONS: DotsBoxesOptions = {
  boardSize: 7,
  turnTimerSeconds: 30,
};

/** A drawn edge between two adjacent dots. */
export interface DotsBoxesLine {
  /**
   * "h" = horizontal (between (r,c) and (r,c+1)),
   * "v" = vertical   (between (r,c) and (r+1,c)).
   */
  kind: "h" | "v";
  r: number;
  c: number;
  /** Player who drew this line. */
  playerId: string;
}

/** A claimed box, indexed by its top-left dot. */
export interface DotsBoxesClaim {
  r: number;
  c: number;
  /** Player who closed the 4th edge. */
  ownerId: string;
  /** Move index at which this box was closed — drives fade-in order. */
  closedAt: number;
}

export interface DotsBoxesPublicState {
  kind: "dotsboxes";
  phase: "playing" | "finished";
  options: DotsBoxesOptions;
  playerOrder: string[];
  turnPlayerId: string;
  /** All drawn horizontal lines, flat list. */
  hLines: DotsBoxesLine[];
  /** All drawn vertical lines, flat list. */
  vLines: DotsBoxesLine[];
  /** Boxes claimed by their closer. */
  claims: DotsBoxesClaim[];
  /** Per-player closed-box count. */
  scores: Record<string, number>;
  /** Wall-clock ms after which the turn auto-passes. null = timer off. */
  turnDeadline: number | null;
  /** Final winner id (or null on a tie). null until phase flips. */
  winnerId: string | null;
  /** Move counter — used for claim animations + telemetry. */
  moveCount: number;
  /** True when the just-completed move closed at least one box and the
   *  same player keeps the turn. The board uses this to flash a brief
   *  "Bonus move!" hint. */
  lastMoveScored: boolean;
}

export type DotsBoxesMoveType = "draw";

export interface DotsBoxesDrawMove {
  type: "draw";
  data: { kind: "h" | "v"; r: number; c: number };
}

// ---- Memory Match (Old Photo Album Edition) ----
//
// Classic 2–4 player concentration game. NxN grid of face-down "photos".
// Each photo's symbol has exactly one twin on the board. On your turn:
//   1. Flip a card → its symbol is revealed.
//   2. Flip a second card.
//      - Match  → you claim both, score a point, KEEP THE TURN (bonus).
//      - No match → both cards stay face-up for the REVEAL phase (~1.5s
//                   so everyone gets to memorise them), then flip back
//                   and the next player goes.
// Game ends when every pair is claimed. Most pairs wins; ties are
// surfaced as winnerId=null.

export type MemoryMatchBoardSize = 4 | 6 | 8;

export interface MemoryMatchOptions {
  /** Square grid edge length. boardSize^2 must be even (4, 6, 8 all are). */
  boardSize: MemoryMatchBoardSize;
  /** Seconds per turn. 0 disables. */
  turnTimerSeconds: number;
  /** Milliseconds the non-match reveal pair stays face-up before flipping back. */
  revealMs: number;
}

export const DEFAULT_MEMORYMATCH_OPTIONS: MemoryMatchOptions = {
  boardSize: 6,
  turnTimerSeconds: 20,
  revealMs: 1500,
};

export type MemoryMatchPhase = "playing" | "reveal" | "finished";

export interface MemoryMatchCard {
  /** Stable id assigned at shuffle. Same across the run. */
  id: number;
  /** Hidden symbol — clients only see this when face-up or matched. */
  symbol: string;
  /** Whose claim the card belongs to, null while in play. */
  ownerId: string | null;
}

export interface MemoryMatchPublicState {
  kind: "memorymatch";
  phase: MemoryMatchPhase;
  options: MemoryMatchOptions;
  playerOrder: string[];
  turnPlayerId: string;
  /** Row-major layout — index = r * size + c. Each entry is { id, ownerId,
   *  and either the symbol (when face-up or matched) or null (face-down). */
  board: Array<{ id: number; symbol: string | null; ownerId: string | null }>;
  /** Card ids currently face-up. 0, 1, or 2 entries. */
  flipped: number[];
  /** Per-player matched-pair count. */
  scores: Record<string, number>;
  /** Wall-clock ms after which the turn auto-passes (or reveal flips back). */
  turnDeadline: number | null;
  /** When phase === "reveal", the timestamp at which the flip-back fires. */
  revealUntil: number | null;
  /** True when the just-completed move closed a match → bonus turn. */
  lastMoveScored: boolean;
  winnerId: string | null;
  totalPairs: number;
  matchedPairs: number;
}

export type MemoryMatchMoveType = "flip";

export interface MemoryMatchFlipMove {
  type: "flip";
  data: { cardId: number };
}

// ---- UNO ----

export type UnoColor = "R" | "G" | "B" | "Y"; // Red, Green, Blue, Yellow
export type UnoRank =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "Skip" | "Reverse" | "+2"
  | "Wild" | "Wild+4";

export interface UnoCard {
  id: string; // Unique per shuffle
  color: UnoColor | null; // null for Wild/Wild+4
  rank: UnoRank;
}

/**
 * Public game state — sent to all players. Hides hand contents.
 * Each player receives this plus their own hand via UnoPlayerState.
 */
export interface UnoPublicState {
  kind: "uno";
  phase: "playing" | "finished";
  playerOrder: string[];
  turnPlayerId: string;
  direction: 1 | -1; // 1=clockwise, -1=counter-clockwise
  topCard: UnoCard;
  currentColor: UnoColor | null; // Chosen color for Wild cards
  handSizes: Record<string, number>; // Hidden: only size, not contents
  deckCount: number;
  scores: Record<string, number>;
  turnDeadline: number | null;
  winnerId: string | null;
  lastAction: string | null; // "drew", "passed", "played", etc.
}

/**
 * Per-player game state — sent only to that player.
 * Adds the player's own hand and list of valid moves.
 */
export interface UnoPlayerState extends UnoPublicState {
  myHand: UnoCard[];
  validMoves: UnoCard[]; // Pre-computed for UI
}

// Move types sent from client → server
export interface UnoPlayMove {
  type: "play";
  data: { cardId: string; color?: UnoColor }; // color required for Wild/Wild+4
}

export interface UnoDrawMove {
  type: "draw";
}

export interface UnoPassMove {
  type: "pass";
}

export type UnoMoveType = "play" | "draw" | "pass";

// ---- Star Game (90's Paper-Slip Edition) ----
//
// The folded paper-chit reflex game from Indian childhoods. Every player
// SECRETLY picks one value from a shared THEME (Colors, Fruits, Gods, ...).
// The deck is exactly 4 copies of each picked value (N players -> 4N cards,
// dealt 4 each). Each pass-cycle everyone simultaneously slides one card
// CLOCKWISE; the first player to hold 4-of-a-kind slaps the STAR, then
// everyone races to "stack hands" for the remaining places. The server is the
// sole authority for card ownership, pass validity, 4-of-a-kind detection, and
// the STAR / hand-stack ORDER (always server receive-time, never client clocks).

export type StarPassSpeed = "normal" | "fast";

export interface StarGameOptions {
  /** Theme id from STAR_THEMES (shared/star-themes.ts). */
  themeId: string;
  /** Rounds to play before the podium (1-20). */
  totalRounds: number;
  /** Pass-window pacing. "fast" shortens the per-cycle clock. */
  passSpeed: StarPassSpeed;
  /** Optional alt end condition - first to this score ends the game early. */
  winningPoints?: number;
}

export const DEFAULT_STARGAME_OPTIONS: StarGameOptions = {
  themeId: "colors",
  totalRounds: 5,
  passSpeed: "normal",
};

export type StarPhase =
  | "themeSelect"
  | "shuffle"
  | "deal"
  | "pass"
  | "star"
  | "handstack"
  | "roundSummary"
  | "finished";

/** One folded paper slip carrying a single theme value. */
export interface StarCard {
  id: string;
  value: string;
}

/** Public, non-secret per-player projection (no card values, no secret pick). */
export interface StarPlayerPublic {
  id: string;
  /** themeSelect: locked a secret value. */
  hasSelected: boolean;
  /** shuffle: completed their shuffle turn. */
  hasShuffled: boolean;
  /** pass: committed a card to slide this cycle. */
  hasPassed: boolean;
  /** handstack: placed their hand this cycle. */
  hasStacked: boolean;
  /** cumulative score across rounds. */
  score: number;
  /** rounds won (STAR presses) - primary tiebreaker. */
  roundWins: number;
  /** cards held (4 mid-round). */
  cardCount: number;
  /** server-verified 4-of-a-kind right now (drives the STAR button). */
  starEligible: boolean;
  /** live hand-stack placement this cycle (0 = first), or null. */
  stackRank: number | null;
}

/** A finished round's result, shown on the summary interstitial. */
export interface StarRoundResult {
  round: number;
  winnerId: string | null;
  winningValue: string | null;
  /** final placement order (playerIds), index 0 = winner. */
  order: string[];
  /** points credited this round, by playerId. */
  points: Record<string, number>;
}

/** Activity-feed entry - fractional-indexed so historical inserts / replay /
 *  future spectator catch-up keep a stable total order. */
export interface StarActivityEntry {
  /** lexicographically-sortable fractional key. */
  idx: string;
  ts: number;
  kind: "info" | "shuffle" | "deal" | "pass" | "match" | "star" | "stack" | "round";
  text: string;
  playerId?: string;
}

/** Final standing with medal + tiebreaker metrics. */
export interface StarStanding {
  playerId: string;
  rank: number;
  score: number;
  roundWins: number;
  avgStarMs: number | null;
  avgStackMs: number | null;
  medal: "gold" | "silver" | "bronze" | null;
}

/** Public game state - broadcast to everyone (hides hands + secret picks). */
export interface StarPublicState {
  kind: "stargame";
  phase: StarPhase;
  themeId: string;
  round: number;
  totalRounds: number;
  passSpeed: StarPassSpeed;
  winningPoints: number | null;
  /** clockwise seating (playerIds). Pass direction is seatOrder[i] -> [i+1]. */
  seatOrder: string[];
  players: StarPlayerPublic[];
  /** whose shuffle turn (shuffle phase), else null. */
  shuffleTurnId: string | null;
  /** wall-clock ms when the current phase's action window closes, or null. */
  deadline: number | null;
  /** distinct theme values in play this game (revealed once dealt). */
  valuesInPlay: string[];
  /** STAR winner of the in-flight cycle (rank 0), or null. */
  starWinnerId: string | null;
  /** live hand-stack order so far (playerIds, tap order). */
  stackOrder: string[];
  /** last completed round (summary screen). */
  lastResult: StarRoundResult | null;
  /** optional nostalgic interstitial line. */
  nostalgiaMessage: string | null;
  /** capped activity feed (fractional-indexed). */
  activity: StarActivityEntry[];
  /** final podium once finished, else null. */
  standings: StarStanding[] | null;
  isOver: boolean;
  winnerId: string | null;
}

/** Per-player private view - adds the owner's hand + secret pick. */
export interface StarPlayerView extends StarPublicState {
  myHand: StarCard[];
  mySelectedValue: string | null;
  /** card armed (not yet committed) to pass this cycle, or null. */
  myArmedCardId: string | null;
  /** all selectable theme values (themeSelect picker). */
  themeValues: string[];
  /** values already locked by others - grayed out, identities hidden. */
  takenValues: string[];
}

/** Move types (all flow through game:move with { type, data }). */
export interface StarSelectValueMove { type: "selectValue"; data: { value: string }; }
export interface StarShuffleMove { type: "shuffle"; }
export interface StarSelectCardMove { type: "selectCard"; data: { cardId: string }; }
export interface StarPassMove { type: "pass"; }
export interface StarPressStarMove { type: "pressStar"; }
export interface StarPlaceHandMove { type: "placeHand"; }
export interface StarNextRoundMove { type: "nextRound"; }

export type StarMove =
  | StarSelectValueMove
  | StarShuffleMove
  | StarSelectCardMove
  | StarPassMove
  | StarPressStarMove
  | StarPlaceHandMove
  | StarNextRoundMove;

// ---- Socket event payloads ----
export interface CreateRoomPayload {
  name: string;
  game: GameKind;
  playerId?: string;
  ludoOptions?: Partial<LudoGameOptions>;
  snlOptions?: Partial<SnlGameOptions>;
  rummyOptions?: Partial<RummyGameOptions>;
  hcOptions?: Partial<HcGameOptions>;
  wordBuildingOptions?: Partial<WordBuildingOptions>;
  dotsBoxesOptions?: Partial<DotsBoxesOptions>;
  memoryMatchOptions?: Partial<MemoryMatchOptions>;
  starGameOptions?: Partial<StarGameOptions>;
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
  targetPlayerId?: string;
}

export interface ReactionRecvPayload {
  id: string;
  fromPlayerId: string;
  emoji: string;
  targetPlayerId?: string;
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
  /**
   * Reports whether THIS client currently needs to rotate to landscape to
   * play comfortably (small portrait viewport). Generic on the wire, but
   * only Rummy boards emit/consume it today — re-broadcast to the room via
   * `room:state` so every player can see who's still rotating their device
   * at game start. Valid in any phase (not gated to lobby).
   */
  "room:setOrientation": (needsRotation: boolean) => void;
  /** Host-only. Names (or renames) the room — "Friday Rummy Nights" etc. Trimmed/capped server-side. */
  "room:setName": (name: string) => void;
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
  /**
   * Rummy-specific. The client streams the player's drag-and-drop hand
   * arrangement so the server can score the player's actual groups on
   * round end — keeping live in-game points and scorecard points in
   * lockstep. Each group is an ordered list of card ids; anything not
   * listed is treated as ungrouped.
   */
  "rummy:arrangement": (payload: { groups: string[][] }) => void;
}

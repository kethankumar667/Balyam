export type GameKind = "rps" | "rummy" | "ludo" | "snl" | "handcricket" | "uno" | "wordbuilding" | "dotsboxes" | "stargame" | "bingo" | "namesplaceanimal" | "tambola" | "samethalu" | "telugucinemalu" | "snake" | "carrom" | "roadrash" | "chess" | "blockblast" | "spacewar";

/**
 * What a player is: somebody with an account, or somebody who just started
 * playing. Lives here with the other wire types because it travels on
 * `room:create` and `room:join`; what it PERMITS lives in shared/permissions.
 */
export type AccountKind = "guest" | "member";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  awayUntil?: number;
  /** Wall-clock ms at which this seat lost its socket. Absent while connected. */
  awaySince?: number;
  /**
   * True while the SERVER is playing this seat's turns for them.
   *
   * A dropped player used to stall the whole table: every one of their turns
   * burned the full turn timer before auto-resolving, so a four-player game
   * with one bad connection spent most of its time waiting on someone who
   * wasn't there. After a short blip-tolerance the server takes the seat over
   * and plays it at bot pace, and hands it straight back the moment they
   * reconnect.
   *
   * Distinct from `isBot`: this seat belongs to a human who is coming back,
   * so it must never be treated as an AI opponent for scoring, roster or
   * end-of-game purposes — only for "who acts now".
   */
  isAutoPlaying?: boolean;
  /**
   * WHY the server is playing this seat — the two cases need different words
   * on screen, and different things end them.
   *
   *   "disconnected" — their socket is gone. Ends when they reconnect.
   *   "idle"         — connected, but they have let consecutive turns time
   *                    out. Ends the moment they make any move.
   */
  autoPlayReason?: "disconnected" | "idle";
  /**
   * The avatar this player picked, as a filename from `shared/avatars.ts`.
   *
   * Chosen on their own device but broadcast to the whole table, because an
   * avatar nobody else can see is just a private setting — the point of
   * picking a face is that the people you are playing with see it.
   *
   * Absent for anyone who has not chosen one, and for any value the server
   * did not recognise: it is rendered as an `<img src>` on every other
   * player's machine, so it is validated against the shared list on the way
   * in rather than trusted. Seats fall back to their initial.
   */
  avatar?: string;
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
  /** For Bingo: bot difficulty tier, chosen when the host adds the bot in
   *  the lobby. Only meaningful for isBot=true seats; humans never set it. */
  bingoDifficulty?: BotDifficulty;
  /**
   * True when this seat is played by someone without an account.
   *
   * Broadcast rather than kept server-side because two things at the table
   * need it. The host needs it to read the room — a guest cannot be handed a
   * shareable table, so "who could take over if I leave" is a real question
   * with a visible answer. And the seat itself is labelled, which is what
   * makes the sign-up offer land at the table instead of only on the home
   * screen.
   *
   * Client-asserted, like everything in shared/permissions.ts. It says what
   * the browser claims, and nothing here is load-bearing for privacy.
   */
  isGuest?: boolean;
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
  /** Screens attached to this room (Smart TV / Party Mode). */
  spectatorCount?: number;
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
  /** UNO's own round history — same "photo album" idea as Rummy's `history` above, kept as a SEPARATE array (not merged) since the two games' recap shapes don't overlap (no melds/wild joker in UNO) and this follows the codebase's own "copy the pattern per game, don't force a shared abstraction" convention. Oldest first, UNO only — empty elsewhere. */
  unoHistory: UnoRoundRecap[];
  /** UNO's own "House Champion" — crowned only for a race-to-target-score multi-round match (a single UNO round never crowns one, matching Rummy's single-mode-never-crowns precedent). Keyed by table name, same survives-room-collapse rationale as `champion`. UNO only. */
  unoChampion: UnoChampion | null;
  /** Bingo's own round history — same "photo album" convention as UNO/Rummy
   *  above, kept separate since Bingo's recap shape (winners + pattern +
   *  called-count, no melds/cards) doesn't overlap either. No champion
   *  concept — Bingo rounds are standalone rematches, not a race-to-target
   *  multi-round match, so there's nothing to crown. Oldest first, Bingo
   *  only — empty elsewhere. */
  bingoHistory: BingoRoundRecap[];
  /** Ludo's own match history — same "photo album" convention as the three
   *  above, kept as its own array because a Ludo recap (standings + real
   *  per-player counters) shares no shape with melds, card scores or called
   *  numbers. Oldest first, Ludo only — empty elsewhere. */
  ludoHistory: LudoMatchRecap[];
  /**
   * True when nobody new may enter this room — no joins, no spectators.
   *
   * Set when a guest opens a table (they may play, but not gather — see
   * shared/permissions.ts), and set again if host migration ever lands the
   * room on a guest. It is on the ROOM rather than derived from the host's
   * `isGuest` at read time so it cannot flicker: a room that spent its life
   * sealed does not quietly open because the seat order changed mid-match.
   *
   * The client reads this to hide the code, the share card and the QR — a
   * code you cannot use is worse than no code, because it looks like an
   * invitation that silently fails for whoever you send it to.
   */
  sealed: boolean;
}

/**
 * One finished Ludo match.
 *
 * Every field is a number the engine ALREADY counts during play — rolls,
 * captures, sixes, best six-streak, wall-clock duration and the finishing
 * order. Nothing here is invented: there is no XP, no coins, no level and no
 * battle pass, because none of those exist in this game. The point is to give
 * a table a real record of what it did, which is a genuine reason to come
 * back without pretending at progression the code cannot honour.
 */
export interface LudoMatchRecap {
  /** Finishing order: [0] came 1st. May be shorter than the table — the last
   *  player never gets home, and the match ends without them. */
  finishOrder: string[];
  /** Everyone who sat at the table, in seat order. */
  playerOrder: string[];
  /** Names as they were when the match ended, so history still reads right
   *  after somebody leaves or renames. */
  playerNames: Record<string, string>;
  /** Tokens home per player at the final whistle (0-4). */
  finishedCount: Record<string, number>;
  rollCount: Record<string, number>;
  captureCount: Record<string, number>;
  sixCount: Record<string, number>;
  /** Longest run of consecutive sixes each player managed. */
  biggestStreak: Record<string, number>;
  /** Wall-clock length of the match, ms. */
  durationMs: number;
  ts: number;
}

/** One row of the room's UNO "photo album" — a finished round's recap. UNO only. */
export interface UnoRoundRecap {
  roundNumber: number;
  winnerId: string;
  winnerName: string;
  /** Cumulative scores at the moment this round ended. */
  scores: Record<string, number>;
  /** Names as they were when the round ended, so history still reads right after a player leaves or renames. */
  playerNames: Record<string, string>;
  ts: number;
}

/** Race-to-target-score match winner crowned for a room's table name. UNO only. */
export interface UnoChampion {
  playerId: string;
  playerName: string;
  /** YYYY-MM-DD the match was won. */
  date: string;
  /** The winner's final cumulative score when the match ended. */
  finalScore: number;
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
  /**
   * The color a player is PAINTED in — tokens, yard, home lane, seat card.
   * Any of the 8 palette colors, at any player count: this is the color the
   * player picked in the lobby.
   *
   * Deliberately decoupled from `playerArms` below. It used to be one field
   * doing both jobs, which is why picking purple in a 3-player room silently
   * became blue — the cross board has no "purple" arm, so the pick could not
   * survive. Now the arm is a seat on the board and the color is just paint.
   */
  playerColors: Record<string, LudoColor>;
  /**
   * The board ARM a player occupies — pure geometry. Always one of the first
   * `max(4, playerCount)` canonical colors, because that is what the board
   * has track/stretch/yard coordinates for. Everything positional (track
   * start, home stretch, yard slots, token ids, board rotation) keys off
   * this; nothing visual does.
   */
  playerArms: Record<string, LudoColor>;
  playerOrder: string[];
  /**
   * Players who have sent all four tokens home, in the order they did it —
   * so `finishOrder[0]` is 1st place, `[1]` is 2nd, and so on.
   *
   * Ludo does not end when the first player finishes; the rest keep playing
   * for the remaining places, and the last player left is the loser. The game
   * ends once `playerOrder.length - 1` players are in here.
   */
  finishOrder: string[];
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

/**
 * The innings break.
 *
 * The first innings used to end and the second BEGIN in the same tick — the
 * scoreboard swapped mid-glance and the next ball was immediately bowlable,
 * so players reported the second innings "starting continuously" and losing
 * track of whose turn it was. A real match stops here: you are told the
 * innings is over and what the target is, and only then does play resume.
 */
export const HC_INNINGS_BREAK_MS = 10_000;

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
  | "afghanistan"
  | "ireland"
  | "zimbabwe";

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
  /**
   * Set true after a wicket falls (when the innings is not yet over) to
   * block the next ball until the batting player manually selects who comes
   * in. Cleared by a `selectNextBatter` move.
   */
  needsNextBatterPick: boolean;
  /**
   * Squad index where the next chosen batter will be placed. Equals
   * `nextBatterIdx` at the moment the wicket fell; null when no pick is
   * pending.
   */
  pendingBatterSlot: number | null;
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
  /**
   * While set and in the future, the innings break is running: innings 2
   * exists and the target is known, but no ball may be bowled yet. Null at
   * every other point in a match.
   */
  inningsBreakUntil: number | null;
  /**
   * Who has pressed Continue on the innings-1 scorecard.
   *
   * The break ends on whichever comes first: everyone continuing, or the
   * deadline. Same shape as the Bingo mark gate — one player still reading
   * must be able to hold the restart, but must never be able to hold it
   * forever.
   */
  inningsBreakReady: string[];
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
/** Reorder upcoming batters in the live batting squad.
 *  Only the batting player may issue this during a live innings.
 *  Positions already at the crease (strikerIdx, nonStrikerIdx) are locked;
 *  only positions ≥ nextBatterIdx may be shuffled. */
export interface HcReorderBattingMove {
  type: "reorderBatting";
  /** Full squad array; positions before nextBatterIdx must be unchanged. */
  data: { newOrder: string[] };
}
/**
 * After a wicket falls the batting player picks which remaining squad member
 * walks in next. Only the batting player may issue this; only valid when
 * `innings.needsNextBatterPick` is true.
 */
export interface HcSelectNextBatterMove {
  type: "selectNextBatter";
  data: { profileId: string };
}
export type HcMove =
  | HcTossPickMove
  | HcTossChoiceMove
  | HcPickMove
  | HcSelectTeamMove
  | HcConfirmSquadMove
  | HcSelectBowlerMove
  | HcReorderBattingMove
  | HcSelectNextBatterMove;

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
  /** Player ids currently sitting at exactly 1 card who have correctly
   *  declared UNO for that hand. Cleared automatically the moment a
   *  player's hand size changes away from 1 (see UnoEngine.syncUnoDeclaration). */
  unoDeclaredBy: string[];
  /**
   * Set the instant a Wild Draw Four is played; the game pauses (no other
   * turn-gated move is accepted) until `challengerId` sends "challenge" or
   * "acceptDraw". Deliberately omits whether the play was actually legal —
   * that must stay hidden until resolved, or the challenge has no purpose.
   */
  pendingChallenge: { challengerId: string; playedById: string } | null;
  /** Total cards the current player must draw if they decline (or can't)
   *  continue a Stack Draw Cards chain (Volume 4 §29). 0 when no stack is
   *  pending — the common case when the house rule is off. Only "+2" cards
   *  currently participate in stacking; Wild Draw Four stacking is a
   *  deliberately deferred scope decision (see UnoEngine.handleActionCard). */
  pendingDrawCount: number;
  /** Which house rules are active this match (Volume 4 §28-34), so the UI
   *  can show rule-specific affordances (jump-in hint, stack indicator)
   *  only when they actually do something. Mirrors UnoGameOptions minus
   *  turnTimerSeconds, which isn't a "house rule" in the rules-fidelity
   *  sense. */
  activeHouseRules: {
    stackDrawCards: boolean;
    jumpIn: boolean;
    sevenSwap: boolean;
    zeroRotate: boolean;
    keepDrawing: boolean;
    forcePlay: boolean;
  };
  /** Current round number within the match (starts at 1). Only
   *  meaningful when `targetScore` is set — a single-round match never
   *  advances past round 1. */
  round: number;
  /** Cumulative score a player must reach to end the match (Volume 2/6);
   *  `null` for a single-round match — the pre-existing, still-default
   *  behavior. See UnoGameOptions.targetScore. */
  targetScore: number | null;
  /** The player(s) an action card just hit — purely for client-side
   *  celebratory/comedic flourishes anchored at a specific seat (e.g. a
   *  "SKIPPED!" badge over the skipped player's chip). `lastAction`
   *  remains the source of truth for the toast text; this exists ONLY
   *  because reliably anchoring a per-seat animation from free text would
   *  mean reverse-matching player NAMES out of a sentence, which is
   *  fragile (name collisions, substrings). Reset to `null` at the top of
   *  every `applyMove` call and re-set only by the specific branch that
   *  produces a hit, so a move that isn't itself a hit doesn't leave a
   *  stale one for the client to (mis)react to. */
  lastHit: {
    targetIds: string[];
    kind: "skip" | "draw2" | "draw4" | "stack" | "swap" | "rotate" | "catch";
    /** Cards drawn, where relevant (draw2/draw4/stack/catch) — omitted for swap/rotate/skip. */
    count?: number;
  } | null;
  /** Set exactly once per finished round (both a mid-match round transition
   *  under a race-to-target-score match, AND the final round) — the signal
   *  `RoomManager.recordUnoRoundIfFinished` reads to append into
   *  `RoomPublicState.unoHistory`/crown `unoChampion`, mirroring how the
   *  Rummy engine's round-end fields (`finalHands`, `wildJoker`, …) get
   *  copied out by `RoomManager.recordRummyRoundIfFinished`. Left in place
   *  (not reset to `null`) after a round ends — RoomManager dedupes by
   *  `roundNumber` via its own per-engine-instance tracking, the same
   *  `lastRecordedRound` WeakMap pattern Rummy already uses, so a stale
   *  value being re-broadcast on later moves is harmless. */
  lastRoundRecap: {
    roundNumber: number;
    winnerId: string;
    /** Cumulative scores at the moment this round ended. */
    scores: Record<string, number>;
    ts: number;
  } | null;
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

/** Declares UNO for the sender's own hand (must currently hold exactly 1 card). */
export interface UnoDeclareUnoMove {
  type: "declareUno";
}

/** Catches another player who has 1 card and hasn't declared — that player draws 2. */
export interface UnoCatchUnoMove {
  type: "catchUno";
  data: { targetId: string };
}

/** Sent by the player targeted by a Wild Draw Four: disputes its legality. */
export interface UnoChallengeMove {
  type: "challenge";
}

/** Sent by the player targeted by a Wild Draw Four: accepts the draw without disputing it. */
export interface UnoAcceptDrawMove {
  type: "acceptDraw";
}

export type UnoMoveType =
  | "play"
  | "draw"
  | "pass"
  | "declareUno"
  | "catchUno"
  | "challenge"
  | "acceptDraw";

/**
 * Room-configurable options — mirrors the RummyGameOptions/LudoGameOptions
 * pattern. `turnTimerSeconds` and the 6 house-rule flags are fully
 * consumed by `UnoEngine` (Phase C — see PLAN_REVIEW_REPORT.md §9's
 * 2026-07-20 entry). Every house-rule flag defaults to `false` so the
 * default options object is always the official single-round ruleset —
 * the same "off = official, ranked-locked" shape Volume 4's rule matrix
 * requires once ranked play exists.
 */
export interface UnoGameOptions {
  /** Seconds per turn before auto-draw. Volume 4 §3's official default is 20. */
  turnTimerSeconds: number;
  /** House rule: Draw Two / Wild Draw Four penalties may be stacked onto the next player. */
  stackDrawCards: boolean;
  /** House rule: a player holding an exact match to the top card may play out of turn. */
  jumpIn: boolean;
  /** House rule: playing a 7 lets the player swap hands with another player. */
  sevenSwap: boolean;
  /** House rule: playing a 0 rotates every player's hand around the table. */
  zeroRotate: boolean;
  /** House rule: a player with no valid card keeps drawing until one is playable. */
  keepDrawing: boolean;
  /** House rule: a drawn card that is playable is played automatically. */
  forcePlay: boolean;
  /** Volume 2/6 multi-round match structure: when set, a round that ends
   *  without any player reaching this cumulative score deals a fresh
   *  round automatically (keeping scores) instead of ending the match —
   *  Mattel's own official default and unoonline.io's headline "first to
   *  500" feature. `null` (default) is a single round, matching every
   *  prior release of this engine — existing rooms see no behavior change. */
  targetScore: number | null;
}

export const DEFAULT_UNO_OPTIONS: UnoGameOptions = {
  turnTimerSeconds: 20,
  stackDrawCards: false,
  jumpIn: false,
  sevenSwap: false,
  zeroRotate: false,
  keepDrawing: false,
  forcePlay: false,
  targetScore: null,
};

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
  /** This round's designated relay starter (rotates every round — round N's
   *  starter is seatOrder[(N-1) % seatOrder.length] at the moment the round's
   *  shuffle begins). Fixed for every pass-cycle within the round. Null before
   *  the first round's shuffle has run. */
  starterId: string | null;
  /** seatOrder rotated to begin at starterId — the fixed relay route for this
   *  round (e.g. starter=B, seats=[A,B,C,D] -> passOrder=[B,C,D,A]). Cards
   *  travel passOrder[i] -> passOrder[i+1], wrapping back to the starter. */
  passOrder: string[];
  /** Whose turn to select-and-send during the "pass" phase's sequential
   *  relay, or null outside that phase. Exactly one player may act at a
   *  time — this replaces the old simultaneous-commit model. */
  currentPasserId: string | null;
  /** The most recent relay step's card handoff, for the client's travel
   *  animation. Reset to null at the top of every applyMove and re-set only
   *  by the handlePass branch that produces one — same one-shot-signal
   *  pattern as UnoPublicState.lastHit (shared/types.ts). */
  lastPass: { fromId: string; toId: string; cardId: string } | null;
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
/** Replaces the sender's own hand order (client-driven reorder, e.g. drag
 *  reordering) — must be a permutation of the exact cards already held.
 *  Purely a preference/ordering action, no phase restriction beyond having
 *  a non-empty hand. Auto-pass (bot or deadline fallback) always sends the
 *  LAST card in this order, so reordering is how a player steers what
 *  gets auto-passed if they run out of time. */
export interface StarReorderHandMove { type: "reorderHand"; data: { cardIds: string[] }; }

export type StarMove =
  | StarSelectValueMove
  | StarShuffleMove
  | StarSelectCardMove
  | StarPassMove
  | StarPressStarMove
  | StarPlaceHandMove
  | StarNextRoundMove
  | StarReorderHandMove;

// ---- Bingo ----
//
// 25-ball Bingo. Each player's 5x5 board holds 1-25 shuffled, so EVERY
// called number is on EVERY board — only its position differs. There is no
// FREE centre and no B-I-N-G-O column ranges.
//
// (This comment previously described 75-ball American Bingo with 1-15/16-30/
// … columns and a free centre. That game was never implemented; board.ts has
// always dealt 1-25. Corrected because the types are what people read to
// learn the rules.)
//
// Server owns board generation, the call pool, mark validation and win
// validation — the client renders state and sends intents (mark / claim).
//
// ── Marking ───────────────────────────────────────────────────────────
// A called number is NOT marked for everyone on arrival. Each player either
// taps it on their own board within BINGO_MARK_WINDOW_MS, or has auto-mark
// switched on and gets it instantly. When the window closes, anyone who
// missed it is marked automatically — boards never diverge permanently, so
// a dropped connection cannot cost a player the round.
//
// The stake is attention, not punishment: a player who lets everything
// auto-mark never watches their own board, and loses the race to `claim`.

export type BingoLetter = "B" | "I" | "N" | "G" | "O";

export interface BingoCell {
  /** 0-24, row-major (index = row*5 + col). */
  index: number;
  /** 1-25. */
  value: number;
  /** True if this number has been called. */
  marked: boolean;
}

export type BingoBoard = BingoCell[];

export type BingoPhase = "arranging" | "playing" | "finished";

export interface CalledNumber {
  /** 1-25. */
  value: number;
  /** 1-based call sequence within this round. */
  order: number;
  calledAt: number;
}

export type BingoPattern =
  | "lines1" | "lines2" | "lines3" | "lines4" | "bingo5" | "fullHouse";

export interface BingoWinner {
  playerId: string;
  playerName: string;
  pattern: BingoPattern;
  claimedAt: number;
  calledCountAtWin: number;
}

export type BotDifficulty = "easy" | "medium" | "hard";

export interface BingoGameOptions {
  callIntervalMs: number;
  stopOnFirstWin: boolean;
}

export const BINGO_CALL_INTERVAL_TIERS = [2500, 4000, 6000] as const;

/**
 * How long players get to find and tap a called number.
 *
 * Longer than every call-interval tier on purpose: the window GATES the next
 * call rather than racing it. The caller cannot move on while a number is
 * still open, which is what keeps every board on the same number.
 */
export const BINGO_MARK_WINDOW_MS = 8000;

export const DEFAULT_BINGO_OPTIONS: BingoGameOptions = {
  callIntervalMs: 4000,
  stopOnFirstWin: true,
};

export interface BingoPlayerPublic {
  id: string;
  name: string;
  isReady: boolean;
  markedCount: number;
  completedLinesCount: number;
  completedLetters: BingoLetter[];
  hasWon: boolean;
  isBot: boolean;
  isConnected: boolean;
  /** Board sent for all players so opponents can view each other's 5x5 boards */
  board: BingoBoard;
  /**
   * Per-PLAYER preference, not a room setting — it is an accessibility
   * choice (motor control, low vision, a child playing along), so one
   * player's need must not decide it for the table.
   */
  autoMark: boolean;
  /**
   * Whether this player has dealt with the number currently on the clock.
   * Drives the "waiting for…" read on other players' cards.
   */
  hasMarkedCurrent: boolean;
}

export interface BingoRoundRecap {
  roundNumber: number;
  winners: BingoWinner[];
  calledCount: number;
  ts: number;
}

export interface BingoPublicState {
  kind: "bingo";
  phase: BingoPhase;
  currentTurnPlayerId: string | null;
  players: BingoPlayerPublic[];
  calledNumbers: CalledNumber[];
  lastCalledNumber: CalledNumber | null;
  callDeadline: number | null;
  /**
   * When the open number stops accepting taps and is auto-marked for anyone
   * who missed it. Null when no number is awaiting marks — which is also the
   * signal that the caller may call the next one.
   */
  markDeadline: number | null;
  winners: BingoWinner[];
  roundNumber: number;
  stopOnFirstWin: boolean;
  isOver: boolean;
  endReason: "poolExhausted" | null;
  winnerId: string | null;
}

export interface BingoPlayerState extends BingoPublicState {
  myBoard: BingoBoard;
  myMarkedCount: number;
  myCompletedLinesCount: number;
  myCompletedLetters: BingoLetter[];
  canClaimBingo: boolean;
  isMyTurn: boolean;
}

/** Moves flow through the existing game:move envelope — no new socket
 *  events are introduced for Bingo (see docs/bingo/roadmap.md). */
export interface BingoMarkCellMove { type: "markCell"; data: { cellIndex: number }; }
export interface BingoClaimMove { type: "claim"; }
export interface NamePlaceAnimalOptions {
  totalRounds: number;
  roundSeconds: number;
  difficulty?: "easy" | "medium" | "hard";
  themePack?: "classic" | "popculture" | "foodie" | "school" | "random";
}

export const DEFAULT_NAMESPLACEANIMAL_OPTIONS: NamePlaceAnimalOptions = {
  totalRounds: 5,
  roundSeconds: 30,
  difficulty: "medium",
  themePack: "classic",
};

export type NamePlaceAnimalCategory = "name" | "place" | "animal" | "thing";

export type NamePlaceAnimalPhase =
  | "letterSelect"
  | "playing"
  | "review"
  | "roundSummary"
  | "finished";

export interface NamePlaceAnimalAnswers {
  name: string;
  place: string;
  animal: string;
  thing: string;
  usedClues?: NamePlaceAnimalCategory[];
}

export interface NamePlaceAnimalPlayerPublic {
  id: string;
  hasSubmitted: boolean;
  score: number;
  roundWins: number;
}

export interface NamePlaceAnimalStanding {
  playerId: string;
  rank: number;
  score: number;
  roundWins: number;
  medal: "gold" | "silver" | "bronze" | null;
}

export interface NamePlaceAnimalPublicState {
  kind: "namesplaceanimal";
  phase: NamePlaceAnimalPhase;
  letter: string | null;
  round: number;
  totalRounds: number;
  roundSeconds: number;
  deadline: number | null;
  seatOrder: string[];
  players: NamePlaceAnimalPlayerPublic[];
  allAnswers: Record<string, NamePlaceAnimalAnswers> | null;
  categoryScores: Record<string, Record<NamePlaceAnimalCategory, number>> | null;
  roundScores: Record<string, number> | null;
  standings: NamePlaceAnimalStanding[] | null;
  isOver: boolean;
  winnerId: string | null;
  stoppedByPlayerId: string | null;
  categories?: string[];
  themePack?: string;
}

export interface NamePlaceAnimalPlayerState extends NamePlaceAnimalPublicState {
  myAnswers: NamePlaceAnimalAnswers;
}

export interface TambolaOptions {
  callIntervalMs: number;
}

export const DEFAULT_TAMBOLA_OPTIONS: TambolaOptions = {
  callIntervalMs: 5000,
};

export type TambolaClaimType = "early5" | "topLine" | "middleLine" | "bottomLine" | "fullHouse";

export interface TambolaClaimWin {
  type: TambolaClaimType;
  winnerId: string;
  winnerName: string;
  ts: number;
}

export interface TambolaPlayerPublic {
  id: string;
  markedCount: number;
  claimsWon: TambolaClaimType[];
}

export interface TambolaPublicState {
  kind: "tambola";
  phase: "playing" | "finished";
  calledNumbers: number[];
  currentCall: number | null;
  callDeadline: number | null;
  seatOrder: string[];
  players: TambolaPlayerPublic[];
  winners: TambolaClaimWin[];
  isOver: boolean;
}

export interface TambolaPlayerState extends TambolaPublicState {
  myTicket: number[][];
  myMarkedCells: boolean[][];
}

export interface SamethaluOptions {
  totalRounds: number;
  questionSeconds: number;
}

export const DEFAULT_SAMETHALU_OPTIONS: SamethaluOptions = {
  totalRounds: 5,
  questionSeconds: 20,
};

export type SamethaluPhase = "playing" | "roundSummary" | "finished";

export interface SamethaluQuestion {
  id: string;
  proverb: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  meaning: string;
}

export interface SamethaluPlayerPublic {
  id: string;
  hasAnswered: boolean;
  score: number;
  roundWins: number;
}

export interface SamethaluStanding {
  playerId: string;
  rank: number;
  score: number;
  roundWins: number;
  medal: "gold" | "silver" | "bronze" | null;
}

export interface SamethaluPublicState {
  kind: "samethalu";
  phase: SamethaluPhase;
  round: number;
  totalRounds: number;
  questionSeconds: number;
  deadline: number | null;
  currentQuestion: Omit<SamethaluQuestion, "correctIndex"> | null;
  seatOrder: string[];
  players: SamethaluPlayerPublic[];
  selectedIndices: Record<string, number> | null;
  correctIndex: number | null;
  roundScores: Record<string, number> | null;
  standings: SamethaluStanding[] | null;
  isOver: boolean;
  winnerId: string | null;
}

export interface SamethaluPlayerState extends SamethaluPublicState {
  mySelectedIndex: number | null;
}

export interface TeluguCinemaluOptions {
  /** Fixed at 4 by TC_ROUND_PLAN; kept so the lobby options shape is stable. */
  totalRounds: number;
  questionSeconds: number;
  /** How many name cards to offer in `personSelection` (the brief said 6-10). */
  personChoiceCount: number;
}

export const DEFAULT_TELUGUCINEMALU_OPTIONS: TeluguCinemaluOptions = {
  totalRounds: 4,
  questionSeconds: 20,
  personChoiceCount: 8,
};

/* ── Telugu Cinema Quiz: four-round format ──────────────────────────────
 * R1 Personality — pick a role, pick a person, answer about them
 * R2 Narration   — a plot summary, name the film
 * R3 Dialogue    — name the film/actor, or complete the line
 * R4 Combination — cast/crew triples, name the missing piece
 */
export type TcRole = "hero" | "heroine" | "director" | "musicDirector";
export type TcDifficulty = "easy" | "moderate" | "hard" | "extreme";
export type TcRoundKind = "personality" | "narration" | "dialogue" | "combination";

/** Harder questions pay more. The brief said "50 points" for round one, which
 *  is kept as the easy-tier value; flat scoring is a one-line change here. */
export const TC_DIFFICULTY_POINTS: Record<TcDifficulty, number> = {
  easy: 50,
  moderate: 75,
  hard: 100,
  extreme: 150,
};

export const TC_ROLE_LABELS: Record<TcRole, string> = {
  hero: "Hero",
  heroine: "Heroine",
  director: "Director",
  musicDirector: "Music Director",
};

/** The exact difficulty ladder each round is built from; the array length is
 *  the round's question count. Round 4 was specified as "8 questions
 *  (2 easy, 1 moderate, 1 hard, 1 extreme)" — five slots for eight questions.
 *  The three unassigned ones are placed as 1 easy, 1 moderate, 1 hard, which
 *  keeps the round's centre of gravity where the other three sit. */
export const TC_ROUND_PLAN: readonly { kind: TcRoundKind; mix: readonly TcDifficulty[] }[] = [
  { kind: "personality", mix: ["easy", "easy", "moderate", "hard", "extreme"] },
  { kind: "narration", mix: ["easy", "easy", "moderate", "hard", "extreme"] },
  { kind: "dialogue", mix: ["easy", "easy", "moderate", "hard", "extreme"] },
  {
    kind: "combination",
    mix: ["easy", "easy", "easy", "moderate", "moderate", "hard", "hard", "extreme"],
  },
] as const;

export const TC_TOTAL_QUESTIONS = TC_ROUND_PLAN.reduce((n, r) => n + r.mix.length, 0); // 23

export interface TeluguCinemaluQuestion {
  id: string;
  difficulty: TcDifficulty;
  /** Question text, e.g. "Which film features this dialogue?" */
  prompt: string;
  /** Optional block shown above the prompt — the dialogue or plot summary. */
  body?: string;
  options: string[];
  correctIndex: number;
  trivia?: string;
}

/** A Round-1 subject with its own question pool. */
export interface TeluguCinemaluPersonality {
  id: string;
  role: TcRole;
  name: string;
  /** Subtitle on the selection card. */
  knownFor: string;
  questions: TeluguCinemaluQuestion[];
}

/** One playable set of rounds 2-4. */
export interface TeluguCinemaluSet {
  id: string;
  narration: TeluguCinemaluQuestion[];
  dialogue: TeluguCinemaluQuestion[];
  combination: TeluguCinemaluQuestion[];
}

/** A person card offered during `personSelection`. */
export interface TeluguCinemaluPersonCard {
  id: string;
  name: string;
  knownFor: string;
}

export type TeluguCinemaluPhase =
  | "roleSelection"
  | "personSelection"
  | "playing"
  | "questionSummary"
  | "roundSummary"
  | "finished";

export interface TeluguCinemaluPlayerPublic {
  id: string;
  hasAnswered: boolean;
  score: number;
  correctCount: number;
  /** Consecutive correct answers, reset by a miss. */
  streak: number;
}

export interface TeluguCinemaluStanding {
  playerId: string;
  rank: number;
  score: number;
  correctCount: number;
  medal: "gold" | "silver" | "bronze" | null;
}

/** Per-round tally shown on the round card and the final scorecard. */
export interface TeluguCinemaluRoundResult {
  kind: TcRoundKind;
  correct: number;
  asked: number;
  points: number;
}

export interface TeluguCinemaluPublicState {
  kind: "telugucinemalu";
  phase: TeluguCinemaluPhase;
  /** 1-based index into TC_ROUND_PLAN. */
  round: number;
  roundKind: TcRoundKind;
  totalRounds: number;
  /** 1-based position within the current round. */
  questionInRound: number;
  questionsInRound: number;
  questionsAnswered: number;
  totalQuestions: number;
  questionSeconds: number;
  deadline: number | null;
  selectedRole: TcRole | null;
  selectedPersonName: string | null;
  /** Only populated during `personSelection`. */
  personChoices: TeluguCinemaluPersonCard[] | null;
  /** The answer is stripped until the reveal — see `correctIndex` below. */
  currentQuestion: Omit<TeluguCinemaluQuestion, "correctIndex"> | null;
  seatOrder: string[];
  players: TeluguCinemaluPlayerPublic[];
  selectedIndices: Record<string, number> | null;
  /** Non-null only from `questionSummary` onward. */
  correctIndex: number | null;
  /** Points awarded for the question just revealed. */
  lastAwarded: Record<string, number> | null;
  roundResults: TeluguCinemaluRoundResult[];
  standings: TeluguCinemaluStanding[] | null;
  isOver: boolean;
  winnerId: string | null;
}

export interface TeluguCinemaluPlayerState extends TeluguCinemaluPublicState {
  mySelectedIndex: number | null;
}

// ---- Snake ----
export type SnakeWallMode = "solid" | "wrap";
export type SnakeTheme = "nokia-monochrome" | "nokia-color" | "neon-modern";

export interface SnakeOptions {
  speedMs: number;
  gridSize: number;
  wallMode: SnakeWallMode;
  theme: SnakeTheme;
  speedProgression: boolean;
}
export const DEFAULT_SNAKE_OPTIONS: SnakeOptions = {
  speedMs: 120,
  gridSize: 20,
  wallMode: "wrap",
  theme: "nokia-monochrome",
  speedProgression: true,
};

export interface SnakePlayerPublic {
  id: string;
  /**
   * Display name. Without this the boards fell back to `id.slice(0, 4)` and
   * rendered opaque fragments like "p_17" — in a multiplayer game you could
   * not tell who you were playing against.
   */
  name: string;
  score: number;
  isAlive: boolean;
  color: string;
}

export interface SnakePublicState {
  kind: "snake";
  gridSize: number;
  speedMs: number;
  wallMode: SnakeWallMode;
  theme: SnakeTheme;
  level: number;
  obstacles: { x: number; y: number }[];
  snakes: Record<string, { body: { x: number; y: number }[]; dir: string; isAlive: boolean }>;
  food: { x: number; y: number };
  players: SnakePlayerPublic[];
  countdown?: string | null;
  isPaused?: boolean;
  isOver: boolean;
  winnerId: string | null;
}

// ---- Carrom ----
/**
 * Board is a square in abstract units; the client scales it. Physics are
 * therefore identical on a phone and a projector, and nothing is in pixels.
 */
export const CARROM_BOARD = {
  size: 100,
  /** Playfield inset from the frame — coins rebound off this square. */
  cushion: 6,
  pocketRadius: 4.2,
  coinRadius: 1.9,
  strikerRadius: 2.6,
  /** Distance of the baseline from the board edge. */
  baseline: 18,
} as const;

export type CarromColor = "white" | "black";
export type CarromPieceKind = CarromColor | "queen" | "striker";

export interface CarromPiece {
  id: string;
  kind: CarromPieceKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Potted pieces stop being simulated but stay in state for the animation. */
  pocketed: boolean;
}

export type CarromMode = "classic" | "discpool" | "freestyle";
export type StrikerSkin = "pearl" | "gold" | "cyber" | "ruby" | "emerald";
export type BoardFeltSkin = "birch" | "velvet" | "emerald" | "ebony";

export interface CarromOptions {
  /** Points needed to win the match. */
  targetScore: number;
  /** Seconds a player has to take their shot. */
  shotTimerSeconds: number;
  mode: CarromMode;
  strikerSkin: StrikerSkin;
  boardSkin: BoardFeltSkin;
  botDifficulty: "easy" | "medium" | "pro";
}

export const DEFAULT_CARROM_OPTIONS: CarromOptions = {
  targetScore: 21,
  shotTimerSeconds: 30,
  mode: "classic",
  strikerSkin: "pearl",
  boardSkin: "birch",
  botDifficulty: "medium",
};

/**
 * "aiming"   — waiting for the current player's shot.
 * "resolving"— the strike is playing out; nobody may act.
 * "finished" — match over.
 */
export type CarromPhase = "aiming" | "resolving" | "finished";

export interface CarromSeat {
  playerId: string;
  color: CarromColor;
  score: number;
  /** Coins of their colour still on the board. */
  remaining: number;
}

export interface CarromPublicState {
  kind: "carrom";
  phase: CarromPhase;
  turnPlayerId: string | null;
  seats: CarromSeat[];
  pieces: CarromPiece[];
  /** Where the striker may be placed along the current baseline, as 0..1. */
  strikerPos: number;
  /** Whoever pocketed the queen and still owes a covering coin. */
  queenPendingFor: string | null;
  /** Human-readable outcome of the last completed shot. */
  lastShot: string | null;
  lastCombo?: string | null;
  mode: CarromMode;
  strikerSkin: StrikerSkin;
  boardSkin: BoardFeltSkin;
  turnDeadline: number | null;
  isOver: boolean;
  winnerId: string | null;
}


// ---- Space War ----
export type SpaceWarSpecialType = "missile" | "laser" | "wall";
export type SpaceWarThemeId = "cyberpunk" | "retro_nokia" | "neon_synthwave" | "solar_flare";

export interface SpaceWarOptions {
  startingLives: number;
  theme?: SpaceWarThemeId;
}
export const DEFAULT_SPACEWAR_OPTIONS: SpaceWarOptions = { startingLives: 4, theme: "cyberpunk" };

export interface SpaceWarProjectile {
  id: string;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface SpaceWarSpecialAttack {
  id: string;
  type: SpaceWarSpecialType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  targetId?: string;
}

export interface SpaceWarPowerUp {
  id: string;
  type: "life" | "ammo" | "shield";
  x: number;
  y: number;
  speedX: number;
}

export interface SpaceWarEnemy {
  id: string;
  type: "scouter" | "zigzag" | "kamikaze" | "heavy" | "boss";
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speedX: number;
  speedY: number;
}

/**
 * Simulation rate, shared so the board interpolates against the real one.
 *
 * Third game to need this. Snake shipped a published period that disagreed
 * with the rate it actually stepped at and stuttered for weeks; a renderer
 * smoothing between server frames needs the authoritative interval, and the
 * only way it cannot drift is if there is exactly one copy of the number.
 */
export const SPACEWAR_TICK_HZ = 30;

/**
 * The flight envelope, shared for the same reason the tick rate is.
 *
 * The board predicts the local ship so the pilot sees their own thumb take
 * effect on the next frame instead of after a round trip. A prediction that
 * uses different numbers from the simulation is not a prediction, it is a
 * second game that disagrees with the first — so the engine and the board read
 * these, and only these.
 */
export const SPACEWAR_WORLD = {
  width: 840,
  height: 480,
  shipWidth: 90,
  shipHeight: 60,
  /** Pixels per tick, applied per axis. */
  shipSpeed: 7,
  /** Vertical margin the ship may not fly past, top and bottom. */
  shipMarginY: 10,
} as const;

export interface SpaceWarPublicState {
  kind: "spacewar";
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    lives: number;
    maxLives: number;
    shieldOn: boolean;
    shieldTimeLeft: number;
    specialAttack: SpaceWarSpecialType;
    specialCount: number;
  };
  score: number;
  highScore: number;
  level: number;
  maxLevels: number;
  projectiles: SpaceWarProjectile[];
  specials: SpaceWarSpecialAttack[];
  enemies: SpaceWarEnemy[];
  powerUps: SpaceWarPowerUp[];
  bossHp: number | null;
  bossMaxHp: number | null;
  isPaused: boolean;
  isOver: boolean;
  winnerId: string | null;
  theme: SpaceWarThemeId;
}


// ---- Chess ----
export type ChessPieceColor = "w" | "b";
export type ChessPieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type ChessBoardTheme = "emerald" | "wood" | "glass" | "cyberpunk" | "classic";
export type ChessPieceSet = "neo" | "staunton" | "3d_glass";
export type ChessTimeControl = "bullet_1_0" | "blitz_3_2" | "rapid_10_0" | "custom";

export interface ChessOptions {
  timeControl: ChessTimeControl;
  initialSeconds: number;
  incrementSeconds: number;
  boardTheme: ChessBoardTheme;
  pieceSet: ChessPieceSet;
  botDifficulty: "easy" | "medium" | "master";
}

export const DEFAULT_CHESS_OPTIONS: ChessOptions = {
  timeControl: "blitz_3_2",
  initialSeconds: 180,
  incrementSeconds: 2,
  boardTheme: "emerald",
  pieceSet: "neo",
  botDifficulty: "medium",
};

export interface ChessMoveRecord {
  from: string;
  to: string;
  san: string;
  piece: string;
  captured?: string;
  promotion?: string;
  fen: string;
  timeTakenMs?: number;
}

export interface ChessPublicState {
  kind: "chess";
  phase: "aiming" | "finished";
  fen: string;
  turn: ChessPieceColor;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteTimeRemainingMs: number;
  blackTimeRemainingMs: number;
  turnDeadline: number | null;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason: string | null;
  history: ChessMoveRecord[];
  lastMove: { from: string; to: string } | null;
  capturedPieces: { white: string[]; black: string[] };
  boardTheme: ChessBoardTheme;
  pieceSet: ChessPieceSet;
  isOver: boolean;
  winnerId: string | null;
}

// ---- Block Blast (grid placement) ----

/** Board is 8x8. Every index in a grid array is `row * BLOCK_GRID + col`. */
export const BLOCK_GRID = 8;
export const BLOCK_CELLS = BLOCK_GRID * BLOCK_GRID;
/** Pieces offered at once. The tray only refills when all three are gone. */
export const BLOCK_TRAY_SIZE = 3;

/**
 * Solo is endless and personal; race is the reason this game is in a hub at
 * all — every player draws the SAME piece sequence from one seed, so the only
 * variable is where you put them.
 *
 * Derived from seat count at `init`, not chosen in a menu. A mode picker that
 * disagrees with how many people are in the room is a bug generator, and the
 * answer is never ambiguous.
 */
export type BlockBlastMode = "solo" | "race";

export interface BlockBlastOptions {
  /** Race length. Ignored in a one-seat room, which is always endless. */
  raceSeconds: number;
}

export const DEFAULT_BLOCKBLAST_OPTIONS: BlockBlastOptions = {
  /**
   * Two minutes, and this number is measured rather than chosen.
   *
   * Simulating the shipped bot over 400 games: at a realistic 2.5s per
   * placement, 51% are still alive at 120s, 25% at 180s and 7% at 300s. The
   * original 180 meant three players in four spent the back half of a race
   * watching, and dead time is the worst thing this game can produce.
   *
   * Longer races are still offered — they are a real choice, not a mistake —
   * but the default should be the length most people finish.
   */
  raceSeconds: 120,
};

/**
 * How many times the streak multiplier can step up before it stops.
 *
 * Was 6 (a 4x ceiling). Across 400 simulated games exactly ONE run ever
 * reached a 7-placement clearing streak, so two thirds of the curve was
 * content nobody would ever see. Three steps puts the top of the ramp
 * inside what an ordinary good run actually reaches.
 */
export const BLOCK_MAX_STREAK_STEPS = 3;

/**
 * Consecutive clearing placements multiply: 1x, 1.5x, 2x, 2.5x, then flat.
 *
 * Lives in shared and not in the engine because the board draws this number
 * next to the score. It was briefly duplicated on the client, which is the
 * kind of copy that silently disagrees with the server the first time
 * anybody tunes it — and then the multiplier a player is shown is not the
 * multiplier they are paid.
 *
 * `streak` counts the placement being scored, so the first clear is 1x.
 */
export function blockStreakMultiplier(streak: number): number {
  const steps = Math.min(Math.max(streak - 1, 0), BLOCK_MAX_STREAK_STEPS);
  return 1 + steps * 0.5;
}

/**
 * A tray piece, as the client renders it.
 *
 * `cells` is sent explicitly rather than looked up from a shared piece table.
 * A duplicated table is a desync waiting to happen: the server would validate
 * one shape while the client drew another, and the bug would present as
 * "placement rejected for no reason". The wire carries the truth.
 */
export interface BlockBlastPieceView {
  /** Stable id from the server table. For analytics and keys, never geometry. */
  id: string;
  /** Offsets from the piece's own top-left corner. */
  cells: { r: number; c: number }[];
  /** Bounding box, so the client can size a slot without scanning cells. */
  w: number;
  h: number;
  /** Palette index 1..8; 0 is reserved for "empty". */
  color: number;
}

export interface BlockBlastPlayerPublic {
  id: string;
  name: string;
  score: number;
  /** Consecutive clearing placements. Drives the multiplier. */
  streak: number;
  /** Most lines taken down in a single placement this match. */
  bestClear: number;
  linesCleared: number;
  isBot: boolean;
  isConnected: boolean;
  /**
   * No piece in their tray fits anywhere. Their score is frozen; in a race
   * everyone else plays on.
   */
  isOut: boolean;
  /**
   * Full 64-cell grid, row-major, palette indices. Sent for every player so
   * rival boards can be shown live — watching someone else's grid choke is
   * the tension a single-player block game cannot manufacture.
   */
  grid: number[];
}

export interface BlockBlastResultRow {
  playerId: string;
  name: string;
  score: number;
  linesCleared: number;
  bestClear: number;
  rank: number;
}

export interface BlockBlastPublicState {
  kind: "blockblast";
  mode: BlockBlastMode;
  /**
   * Match seed. Shown in the recap on purpose: two players who disagree about
   * a result can replay the exact sequence.
   */
  seed: number;
  /** Epoch ms the race ends. null in solo, which never ends on a clock. */
  deadline: number | null;
  /**
   * Server clock at the moment this state was built. The countdown is drawn
   * from `deadline - serverNow`, not from the client's own `Date.now()`, so a
   * phone with a skewed clock still sees the real time remaining.
   */
  serverNow: number;
  players: BlockBlastPlayerPublic[];
  isOver: boolean;
  winnerId: string | null;
  result: BlockBlastResultRow[] | null;
}

export interface BlockBlastSelfState extends BlockBlastPublicState {
  you: {
    id: string;
    /** Three slots. A slot is null once its piece has been placed. */
    tray: (BlockBlastPieceView | null)[];
    /**
     * Per-slot: does this piece fit anywhere on your grid right now?
     *
     * Computed server-side because the client must not be the authority on
     * what is playable — and because greying out a dead piece is the single
     * clearest way to tell a player why the game is about to end.
     */
    playable: boolean[];
    score: number;
    isOut: boolean;
  };
}

// ---- Socket event payloads ----
export interface CreateRoomPayload {
  name: string;
  game: GameKind;
  /**
   * No `playerId` here on purpose. The creator used to be able to name
   * themselves anything, including `"system"` — the id reserved for table
   * announcements. The server mints it now and returns it in the ack.
   */
  /** Chosen avatar filename. Ignored unless it is on the shared list. */
  avatar?: string;
  ludoOptions?: Partial<LudoGameOptions>;
  snlOptions?: Partial<SnlGameOptions>;
  rummyOptions?: Partial<RummyGameOptions>;
  hcOptions?: Partial<HcGameOptions>;
  wordBuildingOptions?: Partial<WordBuildingOptions>;
  dotsBoxesOptions?: Partial<DotsBoxesOptions>;
  starGameOptions?: Partial<StarGameOptions>;
  unoOptions?: Partial<UnoGameOptions>;
  bingoOptions?: Partial<BingoGameOptions>;
  namesplaceanimalOptions?: Partial<NamePlaceAnimalOptions>;
  tambolaOptions?: Partial<TambolaOptions>;
  samethaluOptions?: Partial<SamethaluOptions>;
  teluguCinemaluOptions?: Partial<TeluguCinemaluOptions>;
  snakeOptions?: Partial<SnakeOptions>;
  carromOptions?: Partial<CarromOptions>;
  chessOptions?: Partial<ChessOptions>;
  blockBlastOptions?: Partial<BlockBlastOptions>;
  spaceWarOptions?: Partial<SpaceWarOptions>;
  /**
   * What the creator claims to be. Only an explicit `"guest"` seals the room;
   * absent leaves it open, so a caller that has not been taught this field
   * keeps working. See `createRoom` in RoomManager for why the compatible
   * default beats the closed one here specifically.
   */
  hostKind?: AccountKind;
}

export interface SetTokenNicknamesPayload {
  nicknames: Record<string, string>;
}

export interface JoinRoomPayload {
  name: string;
  code: string;
  /** The seat being reclaimed. Public, and worthless without `seatToken`. */
  playerId?: string;
  /**
   * Proof that this seat is yours, from the ack that first seated you.
   * Without a matching one the server seats you as a new player instead.
   */
  seatToken?: string;
  /** Chosen avatar filename. Ignored unless it is on the shared list. */
  avatar?: string;
  /**
   * What the joiner claims to be, so the table can label the seat and so host
   * migration knows whether this seat could inherit a shareable room. Only an
   * explicit `"guest"` marks the seat as one, matching
   * `CreateRoomPayload.hostKind`.
   */
  accountKind?: AccountKind;
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

/**
 * Soundboard. Same shape as reactions on purpose — a clip is "a reaction you
 * can hear" — but a separate event so it carries its own (stricter) rate
 * budget and so a client that mutes sounds can ignore the whole channel
 * without losing emoji.
 */
export interface SoundboardSendPayload {
  /** A `SoundClip["id"]` from shared/soundboard.ts. */
  clipId: string;
  targetPlayerId?: string;
}

export interface SoundboardRecvPayload {
  id: string;
  fromPlayerId: string;
  clipId: string;
  targetPlayerId?: string;
  ts: number;
}

// ---- AI Coach (hint button) ----

/**
 * A coaching hint for the requesting player.
 *
 * Computed on the SERVER and delivered only to the asker. A client-side hint
 * engine would need the full deck / every rack in the browser, which hands a
 * cheater exactly the information the server exists to withhold — so this
 * travels the same trust boundary as `getStateFor`.
 */
export interface CoachHint {
  /**
   * What the player should do next. Game-specific, but the client only
   * needs it to pick an icon — `headline` carries the meaning.
   */
  kind: "draw" | "discard" | "declare" | "build" | "place" | "wait";
  /** One short imperative line. Shown as the hint's title. */
  headline: string;
  /** Why. One sentence — the teaching half of the feature. */
  detail: string;
  /**
   * Ids to highlight in the player's own UI. Card ids for Rummy; `"r,c"`
   * cell coordinates for Word Building. Empty when nothing to point at.
   */
  highlight: string[];
  /** Suggested grouping (Rummy melds), as arrays of card ids. */
  groups?: string[][];
}

export interface CoachHintResponse {
  ok: boolean;
  hint?: CoachHint;
  /** Populated when ok is false: "not supported", "coach disabled", etc. */
  error?: string;
}

/**
 * Engines opt in by implementing this. Optional on purpose — the roadmap's
 * rule is that the GameEngine contract grows new OPTIONAL members rather
 * than breaking, so a game without a coach simply does not have the method
 * and the server answers "not supported".
 */
export interface CoachableEngine {
  getHint(playerId: string): CoachHint | null;
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

/**
 * One ICE server entry. Mirrors the browser's RTCIceServer, redeclared here
 * because the server cannot reference DOM types.
 */
export interface IceServerSpec {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceConfigResponse {
  iceServers: IceServerSpec[];
  /**
   * Whether a usable TURN relay is configured. Drives the client's
   * "couldn't reach some players" hint; a TURN url with no credentials
   * reports false, because it cannot actually relay.
   */
  hasRelay: boolean;
  /** Seconds the issued credentials remain valid. */
  ttlSeconds: number;
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
  /**
   * Sent once per connection. `bootId` changes only when the server PROCESS
   * restarts, which is the difference between "my socket dropped" and "the
   * machine holding my game was replaced". On a host that sleeps when idle
   * the second is the common case, and it is otherwise invisible.
   */
  "server:hello": (info: { bootId: string; uptimeSec: number }) => void;
  "room:reaction": (payload: ReactionRecvPayload) => void;
  "room:sound": (payload: SoundboardRecvPayload) => void;
  "room:cursor": (payload: CursorRecvPayload) => void;
  /** Broadcasted whenever rematch state changes for the room. */
  "rematch:state": (state: RematchState) => void;
}

export interface ClientToServerEvents {
  /**
   * `seatToken` in these acks is a credential: it is sent to the one socket
   * that took the seat and to nobody else. It must never be echoed into
   * `RoomPublicState`, chat, or any other broadcast.
   */
  "room:create": (
    payload: CreateRoomPayload,
    ack: (response: {
      ok: boolean;
      code?: string;
      playerId?: string;
      seatToken?: string;
      error?: string;
    }) => void
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack: (response: {
      ok: boolean;
      playerId?: string;
      seatToken?: string;
      error?: string;
    }) => void
  ) => void;
  "room:leave": () => void;
  "room:setReady": (ready: boolean) => void;
  /** `difficulty` is only meaningful for game === "bingo"; every other game ignores it. */
  "room:addBot": (botName?: string, difficulty?: BotDifficulty) => void;
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
  /**
   * "I'm here" — sent when a player interacts while the server is auto-playing
   * their seat, to hand control straight back.
   *
   * Needed because the obvious signals do not exist on every device. Desktop
   * leaks presence through `room:cursor`, but touch devices have no cursor at
   * all, and tapping a control that is gated off (the dice on someone else's
   * turn) emits nothing. Without this a phone player had no way to say they
   * were back.
   */
  "room:awake": () => void;
  "room:startGame": () => void;
  "chat:send": (payload: ChatSendPayload) => void;
  "game:move": (payload: GameMovePayload) => void;
  "webrtc:signal": (payload: WebRTCSignalSendPayload) => void;
  "room:reaction": (payload: ReactionSendPayload) => void;
  "room:sound": (payload: SoundboardSendPayload) => void;
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
  /**
   * Ask for a coaching hint. Request/response via ack rather than a
   * broadcast: a hint is private to the asker, and telling the table that
   * someone needed help would make the button socially expensive to press.
   */
  "coach:hint": (ack: (res: CoachHintResponse) => void) => void;
  /**
   * Fetch ICE servers. Server-issued so TURN credentials never ship in the
   * client bundle — see server/src/lib/iceServers.ts.
   */
  "webrtc:iceConfig": (ack: (config: IceConfigResponse) => void) => void;
  /**
   * Liveness probe. Answered immediately with no payload.
   *
   * Exists because `socket.connected` lies after a network change: the old
   * transport is dead but nothing has noticed yet, so the client needs a way
   * to ask "are you really there?" and force a reconnect if not.
   */
  "net:ping": (ack: () => void) => void;
  /**
   * Smart TV / Party Mode: watch a room without taking a seat. A spectator
   * receives public state only and cannot send moves.
   */
  "room:spectate": (code: string, ack: (res: { ok: boolean; error?: string }) => void) => void;
  "room:stopSpectate": () => void;
}

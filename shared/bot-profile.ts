/**
 * What a bot "is": a name, a hometown, a line about how it plays, a play style, a
 * record, and a loadout of cosmetics — so a bot seat reads like a person at the
 * table instead of a bare label.
 *
 * ── Everything is derived, nothing is stored or typed in ───────────────
 * A bot's profile is a pure function of its game, its name and its level, so the
 * same bot is the same character in every room (the same idea as
 * `pickAvatarForName`, one level up) and the server never has to remember one.
 * Every string comes from a FIXED list below. A bot can be renamed by the host to
 * any text, but that text only ever picks from the lists; it is never echoed into
 * a profile, so nothing a player types reaches another player's screen through
 * here.
 *
 * ── What is real and what is flavour ───────────────────────────────────
 * - `playStyle` is the bot's actual difficulty only where a bot seat carries one
 *   (bingo). Anywhere else the bots have no difficulty setting and play one way,
 *   so the style is a persona label, and `styleIsReal` says so. The app shows the
 *   difference rather than claiming a skill level that does not exist.
 * - `stats` is a simulated record. It is never read by matchmaking, ranking,
 *   rewards or any engine, and the profile card labels it as simulated.
 * - Cosmetics are real catalogue ids, run through the same closed-set check a
 *   human's loadout goes through, and are purely visual.
 */

import { BHALYAM_COSMETIC_REGISTRY, sanitizePublicPresentation } from "./cosmetics.js";
import type { PublicPresentationLoadout } from "./cosmetics.js";
import type { GameKind } from "./types.js";

export type BotPlayStyle = "Casual" | "Balanced" | "Sharp" | "Cautious" | "Daring";

export interface BotSimulatedStats {
  matches: number;
  wins: number;
  bestStreak: number;
}

export interface BotProfile {
  tagline: string;
  hometown: string;
  playStyle: BotPlayStyle;
  /** True only when `playStyle` is the bot's real difficulty; otherwise it is a persona label. */
  styleIsReal: boolean;
  /** A simulated record, for flavour. Never used for ranking, rewards or matchmaking. */
  stats: BotSimulatedStats;
}

export interface BotProfileOptions {
  /** The bot's level badge; a higher level has a longer simulated record. */
  level?: number;
  /** A seat's real difficulty, honoured only for the games whose bot seats carry one. */
  difficulty?: "easy" | "medium" | "hard";
}

/** Games whose bot SEAT carries a real difficulty. The others' bots play one way. */
const GAMES_WITH_SEAT_DIFFICULTY: ReadonlySet<GameKind> = new Set<GameKind>(["bingo"]);

const REAL_STYLE_BY_DIFFICULTY: Record<NonNullable<BotProfileOptions["difficulty"]>, BotPlayStyle> = {
  easy: "Casual",
  medium: "Balanced",
  hard: "Sharp",
};

const PERSONA_STYLES: readonly BotPlayStyle[] = ["Cautious", "Balanced", "Daring"];

const DEFAULT_LEVEL = 4;

/** A line per game, short enough for a phone seat. Themed like the bot names. */
export const BOT_TAGLINES_BY_GAME: Record<GameKind, readonly string[]> = {
  handcricket: [
    "Opens the batting, never defends",
    "Famous for last-over heroics",
    "Gully cricket champion since '98",
    "Hits sixes, apologises to windows",
    "Plays every ball like a final",
    "Never met a yorker he liked",
  ],
  chess: [
    "Sets traps before the third move",
    "Lives for the endgame",
    "Never resigns, only waits",
    "Blitz first, thinks later",
    "Plays the long game, quietly",
    "Sacrifices a piece for fun",
  ],
  ludo: [
    "Ludo champ of Gali No. 4",
    "Always needs just one more six",
    "Rolls a six when it matters",
    "Guards home like a goalkeeper",
    "Never forgives a capture",
    "Summer-holiday board-game legend",
  ],
  snl: [
    "Climbs ladders, shrugs off snakes",
    "Born lucky on the 99th square",
    "Blames the dice, wins anyway",
    "Takes every ladder personally",
    "Slides down snakes with a smile",
    "Rolled a one, rolled it back",
  ],
  rummy: [
    "Sorts a hand before you blink",
    "Holds the joker, shows nothing",
    "Pure sequence or nothing",
    "Declares calmly, wins loudly",
    "Family-reunion rummy regular",
    "Counts cards, pretends not to",
  ],
  rps: [
    "Always opens with rock",
    "Reads your hand before you do",
    "Paper is a lifestyle",
    "Scissors, but make it stylish",
    "Plays best of three, wins two",
    "Never throws the same twice",
  ],
  uno: [
    "Reverse card, reverse luck",
    "Shouts UNO a little too early",
    "Saves the +4 for the finale",
    "Skips you with a smile",
    "Colour-change specialist",
    "Holds a grudge and a Draw Two",
  ],
  wordbuilding: [
    "Dictionary by the bedside",
    "Never loses a word chain",
    "Spells it right, loudly",
    "Turns any letter into a word",
    "Crossword champion, school edition",
    "Always has one more word",
  ],
  dotsboxes: [
    "Closes the box at the last second",
    "Plays on the back page of notebooks",
    "Chain-reaction specialist",
    "Draws lines, steals squares",
    "Notebook-margin champion",
    "Patient until the last dot",
  ],
  stargame: [
    "Shares the star, keeps the secret",
    "Quiet at the table, sharp on paper",
    "Plays it close to the chest",
    "Guesses right more than luck allows",
    "Slips a note, hides a smile",
    "Star-game veteran of every picnic",
  ],
  bingo: [
    "Dabs faster than the caller calls",
    "House-night regular",
    "Eyes down, full house ahead",
    "Lucky numbers, lucky socks",
    "Never misses a call",
    "Waits for the last number",
  ],
  namesplaceanimal: [
    "Fastest pen in the class",
    "Always finds an animal for Z",
    "Writes first, argues later",
    "Knows a city for every letter",
    "Ten answers before the timer blinks",
    "Plays this on every family trip",
  ],
  tambola: [
    "Shouts 'house!' with confidence",
    "Marks the line before the caller",
    "Lucky ticket, unlucky neighbour",
    "Family-night tambola regular",
    "Waits for the full house",
    "Never trades a lucky number",
  ],
  snake: [
    "Eats everything, fears the wall",
    "Slithers where others hesitate",
    "Longest tail on the leaderboard",
    "Turns corners at the last moment",
    "Hungry since the first pixel",
    "Never met a wall it respected",
  ],
  blockblast: [
    "Clears three lines in one go",
    "Fits every shape somewhere",
    "Saves the long piece for later",
    "Stacks neat, clears bigger",
    "Tetris brain, Block Blast hands",
    "Never panics on a full board",
  ],
  carrom: [
    "Pockets the queen with a flick",
    "Powder on the board, ice in the veins",
    "Breaks the board like a pro",
    "Rebounds off every wall",
    "Neighbourhood carrom champion",
    "Covers the queen every time",
  ],
  roadrash: [
    "Overtakes on the blind turn",
    "Nitro at the first straight",
    "Leaves a trail of dust",
    "Never brakes before a bend",
    "Highway legend, helmet optional",
    "Drifts like it's a hobby",
  ],
  spacewar: [
    "Dodges everything but compliments",
    "Last pilot standing, usually",
    "Fires first, thinks later",
    "Flies close, shoots closer",
    "Hyperspace is a lifestyle",
    "Cosmic ace of the back row",
  ],
  tictactoe: [
    "Takes the centre, every time",
    "Never loses, rarely wins",
    "Corners first, questions later",
    "Counts all nine squares",
    "Draws like a pro",
    "Plays the first move perfectly",
  ],
  connect4: [
    "Always building a diagonal",
    "Blocks you one move early",
    "Drops discs with purpose",
    "Sets up the double threat",
    "Patient columns, sudden wins",
    "Plays the middle column first",
  ],
};

/** Cities the bots call home, mixed so a table does not feel like one street. */
export const BOT_HOMETOWNS: readonly string[] = [
  "Hyderabad", "Vijayawada", "Guntur", "Warangal", "Visakhapatnam", "Tirupati",
  "Rajahmundry", "Nellore", "Kakinada", "Karimnagar", "Chennai", "Bengaluru",
  "Mumbai", "Pune", "Kolkata", "Jaipur", "Lucknow", "Kochi", "Mysuru", "Nagpur",
  "Indore", "Ahmedabad", "Coimbatore", "Bhopal",
];

/** Titles players earn by playing (a login-streak milestone). A bot is never handed an earned title. */
const EARNED_TITLE_IDS: ReadonlySet<string> = new Set(["title_early_bird"]);

/** The same polynomial hash `pickAvatarForName` uses, with a salt so each field varies independently. */
function hashOf(text: string, salt: string): number {
  const input = `${salt}:${text}`;
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickFrom<T>(list: readonly T[], text: string, salt: string): T {
  return list[hashOf(text, salt) % list.length];
}

function buildStats(name: string, level: number): BotSimulatedStats {
  const matches = 20 + level * 16 + (hashOf(name, "matches") % 20);
  const winRate = 0.38 + (hashOf(name, "winrate") % 25) / 100;
  const wins = Math.round(matches * winRate);
  const bestStreak = Math.min(wins, 2 + (hashOf(name, "streak") % 6) + Math.floor(level / 3));
  return { matches, wins, bestStreak };
}

/** The profile of the bot called `name` in `game`. Pure: the same inputs always give the same bot. */
export function buildBotProfile(game: GameKind, name: string, options: BotProfileOptions = {}): BotProfile {
  const level = Math.max(1, Math.round(options.level ?? DEFAULT_LEVEL));
  const key = `${game}:${name}`;
  const realDifficulty = GAMES_WITH_SEAT_DIFFICULTY.has(game) ? options.difficulty : undefined;

  return {
    tagline: pickFrom(BOT_TAGLINES_BY_GAME[game], key, "tagline"),
    hometown: pickFrom(BOT_HOMETOWNS, name, "hometown"),
    playStyle: realDifficulty ? REAL_STYLE_BY_DIFFICULTY[realDifficulty] : pickFrom(PERSONA_STYLES, key, "style"),
    styleIsReal: realDifficulty !== undefined,
    stats: buildStats(key, level),
  };
}

/** Catalogue ids of one category that a bot may wear in `scope`: not a default, not an earned reward. */
function wearable(category: string, scope: "ludo" | "snl" | "GLOBAL"): string[] {
  return BHALYAM_COSMETIC_REGISTRY.filter(
    (item) =>
      item.category === category &&
      !item.isDefault &&
      !EARNED_TITLE_IDS.has(item.id) &&
      (scope === "GLOBAL" || item.supportedScopes.includes(scope)),
  ).map((item) => item.id);
}

/**
 * The cosmetics a bot wears: always an aura and a podium title; a token skin in Ludo,
 * the only game with tokens; a dice skin in the two dice games. Real catalogue ids only.
 */
export function pickBotCosmetics(game: GameKind, name: string): PublicPresentationLoadout {
  const key = `${game}:${name}`;
  const picked: PublicPresentationLoadout = {};

  const auras = wearable("AVATAR_AURA", "GLOBAL");
  const titles = wearable("PODIUM_TITLE", "GLOBAL");
  if (auras.length > 0) picked.avatarAura = pickFrom(auras, key, "aura");
  if (titles.length > 0) picked.podiumTitle = pickFrom(titles, key, "title");

  if (game === "ludo") {
    const tokens = wearable("TOKEN_SKIN", "ludo");
    if (tokens.length > 0) picked.tokenSkin = pickFrom(tokens, key, "token");
  }
  if (game === "ludo" || game === "snl") {
    const dice = wearable("DICE_SKIN", game);
    if (dice.length > 0) picked.diceSkin = pickFrom(dice, key, "dice");
  }

  // The same closed-set check a human's loadout passes through, so nothing unknown can slip in.
  return sanitizePublicPresentation(picked);
}

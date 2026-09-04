import type { GameKind } from "./types.js";

export type BhalyamGameSlug =
  | GameKind
  | "nokiacricket"
  | "brickblocks"
  | "tetris"
  | "breakout";

export interface GameLimitSpec {
  min: number;
  max: number;
}

export const GAME_LIMITS: Record<GameKind, GameLimitSpec> = {
  rps: { min: 2, max: 2 },
  rummy: { min: 2, max: 6 },
  ludo: { min: 2, max: 8 },
  snl: { min: 2, max: 6 },
  handcricket: { min: 2, max: 2 },
  uno: { min: 2, max: 10 },
  wordbuilding: { min: 2, max: 8 },
  dotsboxes: { min: 2, max: 6 },
  stargame: { min: 2, max: 8 },
  bingo: { min: 1, max: 8 },
  namesplaceanimal: { min: 2, max: 8 },
  tambola: { min: 1, max: 12 },
  snake: { min: 1, max: 4 },
  carrom: { min: 2, max: 2 },
  chess: { min: 2, max: 2 },
  blockblast: { min: 1, max: 8 },
  spacewar: { min: 1, max: 1 },
  roadrash: { min: 1, max: 4 },
};

export const NO_BOT_GAMES: ReadonlySet<GameKind> = new Set<GameKind>([
  "snake",
  "roadrash",
  "spacewar",
]);

export const ECONOMY_APPROVED_SEAT_COUNTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const ECONOMY_MAX_APPROVED_SEAT_COUNT = 12;

export function isEconomySupportedSeatCount(seatCount: number, game?: GameKind): boolean {
  const max = game ? getGameLimits(game).max : ECONOMY_MAX_APPROVED_SEAT_COUNT;
  return seatCount >= 1 && seatCount <= max;
}

export function getGameLimits(kind: GameKind): GameLimitSpec {
  return GAME_LIMITS[kind] ?? { min: 2, max: 4 };
}

export interface GameStartRequirements {
  requiresOrientation: "landscape" | "portrait" | null;
  orientationPromptTiers: readonly ("mobile" | "tablet" | "desktop")[];
}

export const GAME_START_REQUIREMENTS: Record<GameKind, GameStartRequirements> = {
  rummy: { requiresOrientation: "landscape", orientationPromptTiers: ["mobile"] },
  uno: { requiresOrientation: "landscape", orientationPromptTiers: ["mobile"] },
  rps: { requiresOrientation: null, orientationPromptTiers: [] },
  ludo: { requiresOrientation: null, orientationPromptTiers: [] },
  snl: { requiresOrientation: null, orientationPromptTiers: [] },
  handcricket: { requiresOrientation: null, orientationPromptTiers: [] },
  wordbuilding: { requiresOrientation: null, orientationPromptTiers: [] },
  dotsboxes: { requiresOrientation: null, orientationPromptTiers: [] },
  stargame: { requiresOrientation: null, orientationPromptTiers: [] },
  bingo: { requiresOrientation: null, orientationPromptTiers: [] },
  namesplaceanimal: { requiresOrientation: null, orientationPromptTiers: [] },
  tambola: { requiresOrientation: null, orientationPromptTiers: [] },
  snake: { requiresOrientation: null, orientationPromptTiers: [] },
  carrom: { requiresOrientation: null, orientationPromptTiers: [] },
  chess: { requiresOrientation: null, orientationPromptTiers: [] },
  blockblast: { requiresOrientation: null, orientationPromptTiers: [] },
  spacewar: { requiresOrientation: null, orientationPromptTiers: [] },
  roadrash: { requiresOrientation: null, orientationPromptTiers: [] },
};

export function getGameOrientationRequirement(game: GameKind): "landscape" | "portrait" | null {
  return GAME_START_REQUIREMENTS[game]?.requiresOrientation ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Game Taxonomy & Catalogue Types
 * ───────────────────────────────────────────────────────────────────────── */

export type NostalgiaWorldId =
  | "school_break"
  | "rainy_evening"
  | "sunday_afternoon"
  | "friends_adda";

export type PlayTimeCategory = "quick" | "medium" | "long";

export type GameGenre =
  | "board"
  | "card"
  | "casual"
  | "word"
  | "dice"
  | "arcade"
  | "sports";

export type GameDifficulty = "easy" | "medium" | "hard";

export type GamePlayMode =
  | "online_multiplayer"
  | "pass_and_play"
  | "vs_bots"
  | "solo_arcade";

export interface GameHowToPlayStep {
  stepNumber: number;
  title: string;
  instruction: string;
}

export interface GameCatalogueItem {
  id: BhalyamGameSlug;
  name: string;
  teluguName?: string;
  hindiName?: string;
  tagline: string;
  shortDescription: string;
  description: string;
  nostalgiaQuote: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: string;
  playTimeCategory: PlayTimeCategory;
  difficulty: GameDifficulty;
  genre: GameGenre;
  tags: readonly string[];
  nostalgiaWorlds: readonly NostalgiaWorldId[];
  supportedModes: readonly GamePlayMode[];
  supportsBots: boolean;
  isPopular: boolean;
  isClassic: boolean;
  availability: "playable" | "maintenance" | "coming_soon";
  accent: {
    from: string;
    to: string;
  };
  thumbnail: string;
  heroAsset: string;
  howToPlay: readonly GameHowToPlayStep[];
}

export interface NostalgiaWorldMeta {
  id: NostalgiaWorldId;
  title: string;
  subtitle: string;
  emoji: string;
  bgAccent: string;
  borderAccent: string;
  description: string;
}

export const NOSTALGIA_WORLDS: readonly NostalgiaWorldMeta[] = [
  {
    id: "school_break",
    title: "School Break",
    subtitle: "Between bells & notebook back pages",
    emoji: "🏫",
    bgAccent: "from-amber-500/15 via-orange-500/10 to-transparent",
    borderAccent: "border-amber-500/30",
    description: "Fast-paced games played on the last page of a rough notebook while the teacher turned around.",
  },
  {
    id: "rainy_evening",
    title: "Rainy Evening",
    subtitle: "Chai, terrace rain & cozy boards",
    emoji: "🌧",
    bgAccent: "from-sky-500/15 via-blue-500/10 to-transparent",
    borderAccent: "border-sky-500/30",
    description: "Unrushed, strategic games when rain trapped everyone indoors with hot pakoras and cousins.",
  },
  {
    id: "sunday_afternoon",
    title: "Sunday Afternoon",
    subtitle: "Post-lunch family showdowns",
    emoji: "☀️",
    bgAccent: "from-yellow-500/15 via-amber-500/10 to-transparent",
    borderAccent: "border-yellow-500/30",
    description: "Grand living-room tournaments when everyone sat around the floor carpet after a heavy lunch.",
  },
  {
    id: "friends_adda",
    title: "Friends' Adda",
    subtitle: "Veranda laughter, shouts & banter",
    emoji: "👬",
    bgAccent: "from-purple-500/15 via-pink-500/10 to-transparent",
    borderAccent: "border-purple-500/30",
    description: "Noisy, energetic multiplayer parties where friendship was tested and legends were made.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
 * Master Game Catalogue
 * ───────────────────────────────────────────────────────────────────────── */

export const BHALYAM_GAME_CATALOGUE: readonly GameCatalogueItem[] = [
  {
    id: "ludo",
    name: "Ludo",
    teluguName: "లూడో",
    tagline: "Roll, capture & race home",
    shortDescription: "The timeless 4-color board race. Roll sixes, knock opponents back home, and sprint for the center.",
    description: "Ludo is the undisputed king of Indian living-room board games. Roll the dice, release your tokens into the circuit, execute tactical captures, and navigate the safe star zones to guide all four tokens to the home triangle before your rivals.",
    nostalgiaQuote: "\"Roll a six or sit on the porch!\" — Every Sunday afternoon with family.",
    minPlayers: 2,
    maxPlayers: 8,
    playTime: "15–45 min",
    playTimeCategory: "medium",
    difficulty: "easy",
    genre: "board",
    tags: ["classic", "dice", "family", "tokens", "captures"],
    nostalgiaWorlds: ["sunday_afternoon", "rainy_evening"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#DC2626", to: "#991B1B" },
    thumbnail: "/games/thumbnails/ludo.svg",
    heroAsset: "/games/heroes/ludo-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Roll a Six", instruction: "Roll a 6 on the dice to move a token out from your home base into the start square." },
      { stepNumber: 2, title: "Race the Circuit", instruction: "Move your tokens clockwise around the outer track according to your dice rolls." },
      { stepNumber: 3, title: "Capture Opponents", instruction: "Landing on an opponent token sends it back to their base, earning you a bonus roll." },
      { stepNumber: 4, title: "Reach Home", instruction: "Lead all 4 tokens into your color's center triangle to win the game." },
    ],
  },
  {
    id: "rummy",
    name: "Indian Rummy",
    teluguName: "రమ్మీ",
    tagline: "13 cards, pure strategy & sequences",
    shortDescription: "The authentic 13-card Indian classic. Form pure sequences, sets, and declare your victory.",
    description: "Indian Rummy tests your memory, meld calculation, and risk assessment. Draw from the open discard or closed pile, arrange your hand into at least two sequences (including one pure sequence without jokers), and make a valid declaration to win.",
    nostalgiaQuote: "\"Keep your cards close to your chest.\" — Late night festival card sessions.",
    minPlayers: 2,
    maxPlayers: 6,
    playTime: "10–25 min",
    playTimeCategory: "medium",
    difficulty: "medium",
    genre: "card",
    tags: ["cards", "strategy", "melds", "sequences", "joker"],
    nostalgiaWorlds: ["rainy_evening", "sunday_afternoon"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#059669", to: "#064E3B" },
    thumbnail: "/games/thumbnails/rummy.svg",
    heroAsset: "/games/heroes/rummy-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Receive 13 Cards", instruction: "Each player is dealt 13 cards with a designated wild joker card." },
      { stepNumber: 2, title: "Draw & Discard", instruction: "On your turn, draw one card from closed or open deck, then discard one card." },
      { stepNumber: 3, title: "Build Pure Sequence", instruction: "Form at least one pure sequence (3+ consecutive cards of same suit with no joker)." },
      { stepNumber: 4, title: "Valid Declare", instruction: "Arrange all remaining cards into valid sets/sequences and discard into declare slot." },
    ],
  },
  {
    id: "handcricket",
    name: "Hand Cricket",
    teluguName: "హ్యాండ్ క్రికెట్",
    tagline: "Fingers clash: Bat, bowl & hit sixes",
    shortDescription: "The ultimate schoolyard finger game. Flash numbers 1 to 6. If they match, you're OUT!",
    description: "The beloved school game played under wooden desks between class periods. The batsman and bowler reveal a number from 1 to 6 at the same instant. If the numbers match, the batsman is declared out. If they differ, the batsman scores that many runs.",
    nostalgiaQuote: "\"Same pinch, you are clean bowled!\" — High school lunch break tournament.",
    minPlayers: 2,
    maxPlayers: 2,
    playTime: "5–10 min",
    playTimeCategory: "quick",
    difficulty: "easy",
    genre: "sports",
    tags: ["cricket", "school", "quick", "bluff", "fingers"],
    nostalgiaWorlds: ["school_break", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#0284C7", to: "#0C4A6E" },
    thumbnail: "/games/thumbnails/handcricket.svg",
    heroAsset: "/games/heroes/handcricket-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "The Toss", instruction: "Odd-or-Even finger showdown decides who bats or bowls first." },
      { stepNumber: 2, title: "Flash Numbers", instruction: "Both players simultaneously flash a number between 1 and 6." },
      { stepNumber: 3, title: "Score or Wicket", instruction: "Different numbers add runs to batsman's total; matching numbers trigger OUT!" },
      { stepNumber: 4, title: "Chase the Target", instruction: "In the 2nd innings, the bowler bats to chase down the target runs." },
    ],
  },
  {
    id: "snl",
    name: "Snakes & Ladders",
    teluguName: "వైకుంఠపాళి",
    tagline: "Climb the ladders, dodge the bites",
    shortDescription: "The ancient game of karma and fate. Ride glorious ladders to 100 or tumble down giant serpent tails.",
    description: "Originating as Moksha Patam, Snakes and Ladders is the quintessential race to 100. Every turn brings high tension: will you land at the foot of a tall ladder, or slide down from the dreaded 99th snake?",
    nostalgiaQuote: "\"Bitten at 99! The heartbreak was real.\" — Rainy evening battles.",
    minPlayers: 2,
    maxPlayers: 6,
    playTime: "10–20 min",
    playTimeCategory: "quick",
    difficulty: "easy",
    genre: "board",
    tags: ["classic", "dice", "ladders", "snakes", "family"],
    nostalgiaWorlds: ["rainy_evening", "sunday_afternoon"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#EA580C", to: "#7C2D12" },
    thumbnail: "/games/thumbnails/snl.svg",
    heroAsset: "/games/heroes/snl-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Roll the Die", instruction: "Roll the 6-sided die to advance along the numbered grid from square 1." },
      { stepNumber: 2, title: "Climb Ladders", instruction: "Land on a ladder's bottom step to climb straight to its top square." },
      { stepNumber: 3, title: "Avoid Snakes", instruction: "Land on a snake's mouth to slide all the way down to its tail." },
      { stepNumber: 4, title: "Exact 100", instruction: "Be the first player to reach square 100 with an exact roll to win." },
    ],
  },
  {
    id: "uno",
    name: "UNO",
    teluguName: "యూనో",
    tagline: "Color match, Draw Fours & wild turns",
    shortDescription: "The fast-paced card shedding frenzy. Match colors or numbers, drop Draw 4 cards, and yell UNO!",
    description: "The global party card sensation. Match cards by color or number, play devastating Action cards like Skip, Reverse, and Wild Draw 4, and remember to shout UNO when you have just one card left in your hand.",
    nostalgiaQuote: "\"Playing a +4 on your best friend was pure joy.\" — Veranda adda matches.",
    minPlayers: 2,
    maxPlayers: 10,
    playTime: "10–25 min",
    playTimeCategory: "medium",
    difficulty: "easy",
    genre: "card",
    tags: ["party", "cards", "colors", "action", "quick"],
    nostalgiaWorlds: ["friends_adda", "rainy_evening"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#F59E0B", to: "#B45309" },
    thumbnail: "/games/thumbnails/uno.svg",
    heroAsset: "/games/heroes/uno-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Match the Card", instruction: "Play a card from your hand matching the top card's color, number, or symbol." },
      { stepNumber: 2, title: "Use Action Cards", instruction: "Turn the tide with Skips, Reverses, +2s, and Wild Draw 4 cards." },
      { stepNumber: 3, title: "Call UNO", instruction: "Press the UNO button before your turn ends when you have 1 card remaining." },
      { stepNumber: 4, title: "Empty Hand", instruction: "First player to shed all their cards wins the round." },
    ],
  },
  {
    id: "dotsboxes",
    name: "Dots & Boxes",
    teluguName: "డాట్స్ & బాక్సెస్",
    tagline: "Connect lines, close boxes & claim territory",
    shortDescription: "The pencil-and-paper grid duel. Connect pairs of dots, complete squares, and grab bonus turns.",
    description: "The classic paper-and-pen math-period favorite. Take turns drawing lines between adjacent dots on the grid. Complete the fourth side of a 1x1 box to stamp your initial and receive an immediate bonus line.",
    nostalgiaQuote: "\"One careless line, and your friend took 10 boxes in a row!\" — Classroom notebooks.",
    minPlayers: 2,
    maxPlayers: 6,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "casual",
    tags: ["grid", "strategy", "paper", "boxes", "territory"],
    nostalgiaWorlds: ["school_break", "rainy_evening"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#6366F1", to: "#312E81" },
    thumbnail: "/games/thumbnails/dotsboxes.svg",
    heroAsset: "/games/heroes/dotsboxes-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Draw a Line", instruction: "Click between two adjacent dots to draw a horizontal or vertical line." },
      { stepNumber: 2, title: "Close a Box", instruction: "Completing the 4th side of any box claims it with your color." },
      { stepNumber: 3, title: "Bonus Turns", instruction: "Every completed box awards an immediate extra turn to keep chaining." },
      { stepNumber: 4, title: "Most Boxes Wins", instruction: "When the grid is full, the player with the most claimed boxes wins." },
    ],
  },
  {
    id: "carrom",
    name: "Carrom",
    teluguName: "క్యారమ్",
    tagline: "Flick the striker, pocket coins & the red Queen",
    shortDescription: "The beloved Indian tabletop striker duel. Pocket carrom men, sink the red Queen, and cover it.",
    description: "Carrom brings the iconic wooden board right to your fingertips. Aim and flick your striker to pocket white and black coins into the corner pockets, sink the elusive red Queen, and secure the cover.",
    nostalgiaQuote: "\"White powder on the board, thumb ready on the striker.\" — Veranda evenings.",
    minPlayers: 2,
    maxPlayers: 2,
    playTime: "10–25 min",
    playTimeCategory: "medium",
    difficulty: "medium",
    genre: "board",
    tags: ["carrom", "physics", "striker", "queen", "tabletop"],
    nostalgiaWorlds: ["sunday_afternoon", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#D97706", to: "#78350F" },
    thumbnail: "/games/thumbnails/carrom.svg",
    heroAsset: "/games/heroes/carrom-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Position Striker", instruction: "Place and adjust your striker within the baseline." },
      { stepNumber: 2, title: "Aim & Power", instruction: "Drag back to set aim angle and strike power, then release." },
      { stepNumber: 3, title: "Cover the Queen", instruction: "Pocket the red Queen and immediately pocket another coin to cover it." },
      { stepNumber: 4, title: "Clear the Board", instruction: "First player to reach the winning points threshold takes the match." },
    ],
  },
  {
    id: "chess",
    name: "Chess",
    teluguName: "చదరంగం",
    tagline: "The royal game of 64 squares & checkmate",
    shortDescription: "The ultimate 1v1 mind duel. Command your knights, bishops, and queen to trap the enemy king.",
    description: "The timeless battle of tactical depth and strategic foresight. Plan maneuvers, execute openings, sacrifice pieces, and deliver decisive checkmates.",
    nostalgiaQuote: "\"Think three moves ahead.\" — Sunday quiet afternoons.",
    minPlayers: 2,
    maxPlayers: 2,
    playTime: "15–45 min",
    playTimeCategory: "long",
    difficulty: "hard",
    genre: "board",
    tags: ["chess", "strategy", "mind", "tactics", "checkmate"],
    nostalgiaWorlds: ["sunday_afternoon", "rainy_evening"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#475569", to: "#0F172A" },
    thumbnail: "/games/thumbnails/chess.svg",
    heroAsset: "/games/heroes/chess-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Open the Board", instruction: "Develop your knights, bishops, and control the center squares." },
      { stepNumber: 2, title: "Tactical Combos", instruction: "Look for forks, pins, and skewers to win material advantage." },
      { stepNumber: 3, title: "King Safety", instruction: "Castle early to safeguard your king behind pawns." },
      { stepNumber: 4, title: "Checkmate", instruction: "Trap the opposing king with no legal escape squares to win." },
    ],
  },
  {
    id: "wordbuilding",
    name: "Word Building",
    teluguName: "వర్డ్ బిల్డింగ్",
    tagline: "Chain words by their last letter",
    shortDescription: "The vocabulary sprint. Say a word starting with the last letter of the previous player's word.",
    description: "The classic family car journey and bus stop word game. Each player must name a valid English word starting with the last letter of the preceding word, without repeating any word already used in the session.",
    nostalgiaQuote: "\"Elephant ends in T... Tiger!\" — School bus banter.",
    minPlayers: 2,
    maxPlayers: 8,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "easy",
    genre: "word",
    tags: ["words", "vocabulary", "school", "quick", "party"],
    nostalgiaWorlds: ["school_break", "rainy_evening"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#0D9488", to: "#115E59" },
    thumbnail: "/games/thumbnails/wordbuilding.svg",
    heroAsset: "/games/heroes/wordbuilding-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Check Last Letter", instruction: "Look at the ending character of the previous player's word." },
      { stepNumber: 2, title: "Form Valid Word", instruction: "Type a recognized English word starting with that exact letter." },
      { stepNumber: 3, title: "Beat the Timer", instruction: "Submit within the 15-second countdown to avoid a strike." },
      { stepNumber: 4, title: "Last Standing", instruction: "Outlast other players without repeating previous words." },
    ],
  },
  {
    id: "namesplaceanimal",
    name: "Name Place Animal Thing",
    teluguName: "నేమ్ ప్లేస్ అనిమల్ థింగ్",
    tagline: "Quick, a letter is picked! Fill the categories",
    shortDescription: "The lightning pen-and-paper speed race. Write words across all 4 categories before time runs out.",
    description: "The classic paper game that sparked fierce debate over whether a 'Platypus' was a thing or an animal. A random letter is chosen, and all players race to fill in a Name, Place, Animal, and Thing starting with that letter.",
    nostalgiaQuote: "\"Stop! Time up! Pens down!\" — Backbench classroom showdown.",
    minPlayers: 2,
    maxPlayers: 8,
    playTime: "10–20 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "word",
    tags: ["classroom", "paper", "speed", "trivia", "party"],
    nostalgiaWorlds: ["school_break", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#8B5CF6", to: "#5B21B6" },
    thumbnail: "/games/thumbnails/namesplaceanimal.svg",
    heroAsset: "/games/heroes/namesplaceanimal-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Letter Picked", instruction: "A random alphabet letter is selected for the round." },
      { stepNumber: 2, title: "Fill Categories", instruction: "Quickly enter a valid Name, Place, Animal, and Thing." },
      { stepNumber: 3, title: "Call Stop", instruction: "First to complete all 4 categories calls STOP to lock timers." },
      { stepNumber: 4, title: "Score Points", instruction: "10 points for unique answers, 5 for shared, 0 for invalid." },
    ],
  },
  {
    id: "tambola",
    name: "Tambola",
    teluguName: "తంబోలా",
    tagline: "Early 5, Corners, Rows & Full House!",
    shortDescription: "The beloved Indian community bingo. Mark called numbers and claim exciting prizes.",
    description: "From club parties to railway waiting rooms, Tambola (Indian Housie) brings people together like nothing else. Listen as the caller draws numbers, dab them on your 3x9 ticket, and race to claim Early 5, Four Corners, Lines, and the grand Full House.",
    nostalgiaQuote: "\"Two little ducks, twenty-two!\" — Sunday club family night.",
    minPlayers: 1,
    maxPlayers: 12,
    playTime: "15–30 min",
    playTimeCategory: "medium",
    difficulty: "easy",
    genre: "casual",
    tags: ["housie", "numbers", "party", "family", "lucky"],
    nostalgiaWorlds: ["sunday_afternoon", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#EC4899", to: "#9D174D" },
    thumbnail: "/games/thumbnails/tambola.svg",
    heroAsset: "/games/heroes/tambola-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Get Your Ticket", instruction: "Each player holds a numbered Tambola ticket." },
      { stepNumber: 2, title: "Listen to Caller", instruction: "Numbers 1 to 90 are drawn and announced in sequence." },
      { stepNumber: 3, title: "Dab Numbers", instruction: "Tap called numbers on your card to strike them out." },
      { stepNumber: 4, title: "Claim Prizes", instruction: "Hit the Claim button for Early 5, Top/Middle/Bottom Line, or Full House." },
    ],
  },
  {
    id: "rps",
    name: "Rock Paper Scissors",
    teluguName: "రాక్ పేపర్ సిజర్స్",
    tagline: "Best of 3, lightning speed decision maker",
    shortDescription: "The universal tie-breaker. Rock crushes Scissors, Scissors cuts Paper, Paper covers Rock.",
    description: "The instant decision-maker of childhood. Best of 3 or 5 rounds with real-time countdown, psychological bluffing, and sudden death rematches.",
    nostalgiaQuote: "\"Stone, Paper, Scissor... Shoot!\" — Deciding who gets the first batting.",
    minPlayers: 2,
    maxPlayers: 2,
    playTime: "2–5 min",
    playTimeCategory: "quick",
    difficulty: "easy",
    genre: "casual",
    tags: ["quick", "duel", "mind", "instant", "decision"],
    nostalgiaWorlds: ["school_break", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#64748B", to: "#1E293B" },
    thumbnail: "/games/thumbnails/rps.svg",
    heroAsset: "/games/heroes/rps-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Select Move", instruction: "Choose Rock, Paper, or Scissors before countdown ends." },
      { stepNumber: 2, title: "Reveal", instruction: "Both players' choices are revealed simultaneously." },
      { stepNumber: 3, title: "Determine Winner", instruction: "Rock beats Scissors, Scissors beats Paper, Paper beats Rock." },
      { stepNumber: 4, title: "First to 3", instruction: "First player to win 3 rounds wins the match." },
    ],
  },
  {
    id: "stargame",
    name: "Star Game",
    teluguName: "స్టార్ గేమ్",
    tagline: "Connect 5 stars in a continuous stroke",
    shortDescription: "The geometric logic puzzle. Draw a star without lifting your hand or crossing identical lines.",
    description: "The classic geometric puzzle drawn on the backs of textbooks. Navigate nodes and connect paths strategically to form the complete star diagram.",
    nostalgiaQuote: "\"Can you draw it without lifting your pencil?\" — Recess challenges.",
    minPlayers: 2,
    maxPlayers: 8,
    playTime: "5–10 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "casual",
    tags: ["puzzle", "geometry", "school", "logic"],
    nostalgiaWorlds: ["school_break", "sunday_afternoon"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#EAB308", to: "#854D0E" },
    thumbnail: "/games/thumbnails/stargame.svg",
    heroAsset: "/games/heroes/stargame-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Pick Start Node", instruction: "Select your starting vertex on the star diagram." },
      { stepNumber: 2, title: "Trace Segments", instruction: "Connect adjacent points along valid geometric lines." },
      { stepNumber: 3, title: "Avoid Dead Ends", instruction: "Plan your path so you don't get trapped before completion." },
      { stepNumber: 4, title: "Complete the Star", instruction: "Form the full 5-point star figure to win." },
    ],
  },
  {
    id: "bingo",
    name: "Bingo (5x5 Grid)",
    teluguName: "బింగో",
    tagline: "Fill 1 to 25, strike 5 lines for B-I-N-G-O",
    shortDescription: "The classic 25-number notebook duel. Call numbers, strike lines, and shout B-I-N-G-O!",
    description: "The iconic 5x5 grid game where players write numbers 1 to 25 in any order. Players take turns calling numbers. Strike out full horizontal, vertical, or diagonal rows to light up the letters B-I-N-G-O.",
    nostalgiaQuote: "\"B-I-N-G-O! I got 5 lines!\" — Classroom desk tournaments.",
    minPlayers: 1,
    maxPlayers: 8,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "easy",
    genre: "casual",
    tags: ["numbers", "grid", "lines", "bingo", "school"],
    nostalgiaWorlds: ["school_break", "friends_adda"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#3B82F6", to: "#1D4ED8" },
    thumbnail: "/games/thumbnails/bingo.svg",
    heroAsset: "/games/heroes/bingo-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Fill the 5x5 Grid", instruction: "Arrange numbers 1 through 25 across the 25 cells." },
      { stepNumber: 2, title: "Call a Number", instruction: "Players take turns calling a number from their grid." },
      { stepNumber: 3, title: "Strike 5 Lines", instruction: "Mark called numbers. A completed row, col, or diag grants one letter." },
      { stepNumber: 4, title: "Claim BINGO", instruction: "First to complete 5 lines spells B-I-N-G-O and wins." },
    ],
  },
  {
    id: "snake",
    name: "Nokia Snake 97",
    teluguName: "నోకియా స్నేక్",
    tagline: "The monochrome 3310 legend",
    shortDescription: "The green dot-matrix retro arcade. Eat eggs, grow your tail, and never bite yourself.",
    description: "Relive the legendary Nokia 3310 experience with authentic green-tinted pixel screen, crisp buzzer audio, and 4-way arrow controls. Guide your hungry serpent to eat food, extend your tail, and avoid walls.",
    nostalgiaQuote: "\"Borrowing dad's phone just to beat the high score.\" — Childhood memories.",
    minPlayers: 1,
    maxPlayers: 4,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "arcade",
    tags: ["retro", "nokia", "monochrome", "arcade", "singleplayer"],
    nostalgiaWorlds: ["school_break", "sunday_afternoon"],
    supportedModes: ["solo_arcade", "online_multiplayer"],
    supportsBots: false,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#8BAC0F", to: "#306230" },
    thumbnail: "/games/thumbnails/snake.svg",
    heroAsset: "/games/heroes/snake-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Use D-Pad / Arrows", instruction: "Control snake movement using arrow keys or on-screen keypad." },
      { stepNumber: 2, title: "Eat the Food", instruction: "Navigate to the blinking food dot to gain points and grow longer." },
      { stepNumber: 3, title: "Dodge Walls & Body", instruction: "Hitting screen boundaries or your own tail ends the run." },
      { stepNumber: 4, title: "High Score", instruction: "Survive at higher speeds to set the lounge arcade record." },
    ],
  },
  {
    id: "spacewar",
    name: "Space War 1979",
    teluguName: "స్పేస్ వార్",
    tagline: "Vector thrust, asteroid field & photon torpedoes",
    shortDescription: "Retro vector space combat. Pilot your spacecraft, dodge asteroids, and blast alien cruisers.",
    description: "Inspired by classic arcade vector machines. Control thrust inertia, rotate your ship in frictionless space, and blast incoming asteroid clusters with photon lasers.",
    nostalgiaQuote: "\"Coin-op arcade machine in the local bazaar.\" — Retro gaming days.",
    minPlayers: 1,
    maxPlayers: 1,
    playTime: "3–10 min",
    playTimeCategory: "quick",
    difficulty: "hard",
    genre: "arcade",
    tags: ["retro", "arcade", "space", "vector", "singleplayer"],
    nostalgiaWorlds: ["school_break", "friends_adda"],
    supportedModes: ["solo_arcade"],
    supportsBots: false,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#38BDF8", to: "#0369A1" },
    thumbnail: "/games/thumbnails/spacewar.svg",
    heroAsset: "/games/heroes/spacewar-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Rotate & Thrust", instruction: "Use left/right arrows to rotate and up arrow for engine thrust." },
      { stepNumber: 2, title: "Fire Lasers", instruction: "Press Spacebar to fire twin laser cannons at oncoming asteroids." },
      { stepNumber: 3, title: "Hyperspace", instruction: "Use emergency hyperspace warp when cornered." },
      { stepNumber: 4, title: "Survive Waves", instruction: "Clear each asteroid sector to advance to boss stages." },
    ],
  },
  {
    id: "roadrash",
    name: "Road Rash Arcade",
    teluguName: "రోడ్ రాష్",
    tagline: "Motorcycle race, speed boost & dodge traffic",
    shortDescription: "High-octane retro bike racing. Weave between cars, hit nitro boosts, and cross the finish line.",
    description: "The quintessential 90s PC gaming motorcycle thrill. Lean into tight curves, dodge highway traffic, and draft behind racers to hit top speed.",
    nostalgiaQuote: "\"Full throttle down the coastal highway!\" — After-school gaming cafes.",
    minPlayers: 1,
    maxPlayers: 4,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "arcade",
    tags: ["racing", "motorcycle", "arcade", "speed", "retro"],
    nostalgiaWorlds: ["friends_adda", "sunday_afternoon"],
    supportedModes: ["solo_arcade", "online_multiplayer"],
    supportsBots: false,
    isPopular: false,
    isClassic: true,
    availability: "playable",
    accent: { from: "#EF4444", to: "#991B1B" },
    thumbnail: "/games/thumbnails/roadrash.svg",
    heroAsset: "/games/heroes/roadrash-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Accelerate", instruction: "Hold up arrow to open full throttle." },
      { stepNumber: 2, title: "Steer & Lean", instruction: "Weave left and right to dodge oncoming trucks and barriers." },
      { stepNumber: 3, title: "Nitro Boost", instruction: "Collect nitro canisters for super-speed sprints." },
      { stepNumber: 4, title: "Podium Finish", instruction: "Finish in top 3 to qualify for next track tier." },
    ],
  },
  {
    id: "blockblast",
    name: "Block Blast 9999",
    teluguName: "బ్లాక్ బ్లాస్ట్",
    tagline: "Fit polyomino shapes, clear lines & trigger cascades",
    shortDescription: "The satisfying brick puzzle. Drag shapes onto the 8x8 grid to clear full rows and columns.",
    description: "The addictive spatial puzzle game inspired by 9999-in-1 Brick Game handhelds. Fit shapes into the grid, trigger multiple line clears simultaneously for combo bonuses, and keep the board from jamming.",
    nostalgiaQuote: "\"Just one more game before bed.\" — The 9999-in-1 brick handheld.",
    minPlayers: 1,
    maxPlayers: 8,
    playTime: "5–15 min",
    playTimeCategory: "quick",
    difficulty: "medium",
    genre: "casual",
    tags: ["puzzle", "blocks", "grid", "relaxing", "combos"],
    nostalgiaWorlds: ["rainy_evening", "sunday_afternoon"],
    supportedModes: ["online_multiplayer", "pass_and_play", "vs_bots"],
    supportsBots: true,
    isPopular: true,
    isClassic: true,
    availability: "playable",
    accent: { from: "#10B981", to: "#065F46" },
    thumbnail: "/games/thumbnails/blockblast.svg",
    heroAsset: "/games/heroes/blockblast-hero.svg",
    howToPlay: [
      { stepNumber: 1, title: "Drag Shapes", instruction: "Place 3 available polyomino blocks onto the 8x8 grid." },
      { stepNumber: 2, title: "Clear Lines", instruction: "Complete full horizontal or vertical rows to dissolve blocks." },
      { stepNumber: 3, title: "Chain Combos", instruction: "Clear consecutive lines in back-to-back turns for multipliers." },
      { stepNumber: 4, title: "Maintain Space", instruction: "Keep board open for large 3x3 square blocks." },
    ],
  },
];

export const GAME_DISPLAY_NAMES: Record<GameKind, string> = {
  chess: "Chess ♟",
  rummy: "Indian Rummy 🃏",
  ludo: "Ludo 🎲",
  snl: "Snakes & Ladders 🐍",
  handcricket: "Hand Cricket 🏏",
  rps: "Rock Paper Scissors ✂️",
  uno: "UNO 🎴",
  wordbuilding: "Word Building 🔤",
  dotsboxes: "Dots & Boxes ⚄",
  stargame: "Star Game ⭐",
  bingo: "Bingo (5x5) 🎱",
  namesplaceanimal: "Name Place Animal 🐾",
  tambola: "Tambola 🎟️",
  snake: "Nokia Snake 🐍",
  roadrash: "Road Rash 🏍️",
  carrom: "Carrom 🎯",
  blockblast: "Block Blast 🧱",
  spacewar: "Space War 🚀",
};

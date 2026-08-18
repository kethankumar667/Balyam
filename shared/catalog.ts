import type { GameKind } from "./types.js";

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

export const GAME_DISPLAY_NAMES: Record<GameKind, string> = {
  chess: "CHESS ♟",
  rummy: "RUMMY 🃏",
  ludo: "LUDO 🎲",
  snl: "SNAKES & LADDERS 🐍",
  handcricket: "HAND CRICKET 🏏",
  rps: "ROCK PAPER SCISSORS ✂️",
  uno: "UNO 🎴",
  wordbuilding: "WORD BUILDING 🔤",
  dotsboxes: "DOTS & BOXES ⚄",
  stargame: "STAR GAME ⭐",
  bingo: "BINGO 🎱",
  namesplaceanimal: "NAME PLACE ANIMAL 🐾",
  tambola: "TAMBOLA 🎟️",
  snake: "SNAKE 🐍",
  roadrash: "ROAD RASH 🏍️",
  carrom: "CARROM 🎯",
  blockblast: "BLOCK BLAST 🧱",
  spacewar: "SPACE WAR 🚀",
};

export const NO_BOT_GAMES: ReadonlySet<GameKind> = new Set<GameKind>([
  "snake",
  "roadrash",
  "spacewar",
]);

export function getGameLimits(kind: GameKind): GameLimitSpec {
  return GAME_LIMITS[kind] ?? { min: 2, max: 4 };
}

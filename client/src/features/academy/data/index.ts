import type { GameAcademySpec } from "../types/academy";
import {
  LUDO_ACADEMY,
  SNL_ACADEMY,
  DOTSBOXES_ACADEMY,
  CHESS_ACADEMY,
  CARROM_ACADEMY,
} from "./boardGames";
import { CONNECT4_ACADEMY } from "./connect4";
import { RUMMY_ACADEMY, UNO_ACADEMY } from "./cardGames";
import {
  HANDCRICKET_ACADEMY,
  RPS_ACADEMY,
  WORDBUILDING_ACADEMY,
  STARGAME_ACADEMY,
  BINGO_ACADEMY,
  TAMBOLA_ACADEMY,
  NAMESPLACEANIMAL_ACADEMY,
} from "./duelClassroomGames";
import {
  TICTACTOE_ACADEMY,
  SUDOKU_ACADEMY,
  GAME2048_ACADEMY,
  SNAKE_ACADEMY,
  TETRIS_ACADEMY,
  BREAKOUT_ACADEMY,
  ROADRASH_ACADEMY,
  SPACEWAR_ACADEMY,
  NOKIACRICKET_ACADEMY,
  BRICKBLOCKS_ACADEMY,
} from "./retroArcadeGames";

export const GAME_ACADEMY_CATALOG: Record<string, GameAcademySpec> = {
  ludo: LUDO_ACADEMY,
  snl: SNL_ACADEMY,
  dotsboxes: DOTSBOXES_ACADEMY,
  connect4: CONNECT4_ACADEMY,
  chess: CHESS_ACADEMY,
  carrom: CARROM_ACADEMY,
  rummy: RUMMY_ACADEMY,
  uno: UNO_ACADEMY,
  handcricket: HANDCRICKET_ACADEMY,
  rps: RPS_ACADEMY,
  wordbuilding: WORDBUILDING_ACADEMY,
  stargame: STARGAME_ACADEMY,
  bingo: BINGO_ACADEMY,
  tambola: TAMBOLA_ACADEMY,
  namesplaceanimal: NAMESPLACEANIMAL_ACADEMY,
  tictactoe: TICTACTOE_ACADEMY,
  sudoku: SUDOKU_ACADEMY,
  "2048": GAME2048_ACADEMY,
  snake: SNAKE_ACADEMY,
  tetris: TETRIS_ACADEMY,
  breakout: BREAKOUT_ACADEMY,
  roadrash: ROADRASH_ACADEMY,
  spacewar: SPACEWAR_ACADEMY,
  nokiacricket: NOKIACRICKET_ACADEMY,
  brickblocks: BRICKBLOCKS_ACADEMY,
  blockblast: BRICKBLOCKS_ACADEMY, // alias
};

export function getGameAcademy(slug: string): GameAcademySpec | null {
  return GAME_ACADEMY_CATALOG[slug.toLowerCase()] ?? null;
}

export function hasGameAcademy(slug: string): boolean {
  return Boolean(GAME_ACADEMY_CATALOG[slug.toLowerCase()]);
}

/**
 * Every distinct spec once, in catalog order. `blockblast` is an alias of the
 * `brickblocks` spec, so listing `Object.values` would show that game twice
 * (a duplicate card and a duplicate React key on the How-To page). Lookups by
 * alias keep working through `getGameAcademy` / `hasGameAcademy`.
 */
export function getAllAcademySpecs(): GameAcademySpec[] {
  const seenSlugs = new Set<string>();
  const distinct: GameAcademySpec[] = [];
  for (const spec of Object.values(GAME_ACADEMY_CATALOG)) {
    if (seenSlugs.has(spec.slug)) continue;
    seenSlugs.add(spec.slug);
    distinct.push(spec);
  }
  return distinct;
}

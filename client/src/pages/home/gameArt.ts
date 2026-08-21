import { type BhalyamGameSlug } from "../../components/bhalyam/data";

/**
 * Module-scope tile art paths, shared by `GamesSection`'s `GameTile` and
 * `PlayerJourneyDashboard`'s "last played" card so there's one table of 21
 * paths instead of two copies drifting apart.
 */
export const TILE_ART_BY_GAME: Record<BhalyamGameSlug, string> = {
  handcricket: "/HandCricketTile.png",
  snl: "/S&LTile.png",
  ludo: "/LudoTile.png",
  rummy: "/RummyTile.png",
  rps: "/RPSTile.png",
  uno: "/UNOTile.png",
  wordbuilding: "/words_building.png",
  dotsboxes: "/Dots&boxes.png",
  namesplaceanimal: "/Name-place-thing-animal.png",
  tambola: "/Tambola.png",
  stargame: "/StarTile.png",
  bingo: "/Bingo Tile.png",
  snake: "/Snake Game Tile.png",
  roadrash: "/BrickRacer Game Tile.png",
  brickblocks: "/BlockBlast Game Tile.png",
  tetris: "/BlockBlast Game Tile.png",
  breakout: "/BrickBreakout Game Tile.png",
  carrom: "/Carrom Game Tile.png",
  chess: "/Chess Game Tile.png",
  spacewar: "/SpacewarTile.png",
  nokiacricket: "/RetroCricket Game Tile.png",
};

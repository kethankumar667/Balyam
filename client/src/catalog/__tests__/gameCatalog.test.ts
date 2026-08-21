import { describe, it, expect } from "vitest";
import {
  BHALYAM_GAME_CATALOGUE,
  NOSTALGIA_WORLDS,
  GAME_LIMITS,
  getGameById,
  getGamesByNostalgiaWorld,
  getPopularGames,
  getSoloPlayableGames,
  filterGames,
} from "../gameCatalog";
import type { GameKind } from "@shared/types";

describe("Milestone 02: Central Game Catalogue & Taxonomy Suite", () => {
  it("contains complete metadata for every game in the catalogue", () => {
    expect(BHALYAM_GAME_CATALOGUE.length).toBeGreaterThanOrEqual(18);

    for (const game of BHALYAM_GAME_CATALOGUE) {
      expect(game.id).toBeDefined();
      expect(game.name.trim().length).toBeGreaterThan(0);
      expect(game.tagline.trim().length).toBeGreaterThan(0);
      expect(game.shortDescription.trim().length).toBeGreaterThan(0);
      expect(game.description.trim().length).toBeGreaterThan(0);
      expect(game.nostalgiaQuote.trim().length).toBeGreaterThan(0);
      expect(game.minPlayers).toBeGreaterThanOrEqual(1);
      expect(game.maxPlayers).toBeGreaterThanOrEqual(game.minPlayers);
      expect(game.howToPlay.length).toBeGreaterThanOrEqual(3);
      expect(game.nostalgiaWorlds.length).toBeGreaterThanOrEqual(1);
      expect(game.accent.from).toBeDefined();
      expect(game.accent.to).toBeDefined();
    }
  });

  it("ensures player limits match GAME_LIMITS for multiplayer game engines", () => {
    for (const game of BHALYAM_GAME_CATALOGUE) {
      const serverLimit = GAME_LIMITS[game.id as GameKind];
      if (serverLimit) {
        expect(game.minPlayers).toBe(serverLimit.min);
        expect(game.maxPlayers).toBe(serverLimit.max);
      }
    }
  });

  it("retrieves games accurately by ID via getGameById", () => {
    const ludo = getGameById("ludo");
    expect(ludo).toBeDefined();
    expect(ludo?.name).toBe("Ludo");
    expect(ludo?.genre).toBe("board");

    const rummy = getGameById("rummy");
    expect(rummy).toBeDefined();
    expect(rummy?.genre).toBe("card");

    const nonExistent = getGameById("non_existent_game_xyz");
    expect(nonExistent).toBeUndefined();
  });

  it("contains all 4 Nostalgia Worlds with games in each", () => {
    expect(NOSTALGIA_WORLDS.length).toBe(4);

    for (const world of NOSTALGIA_WORLDS) {
      const games = getGamesByNostalgiaWorld(world.id);
      expect(games.length).toBeGreaterThan(0);
    }
  });

  it("filters games by search query across names, telugu titles, and tags", () => {
    const cricketResults = filterGames({ searchQuery: "cricket" });
    expect(cricketResults.some((g) => g.id === "handcricket")).toBe(true);

    const ludoTeluguResults = filterGames({ searchQuery: "లూడో" });
    expect(ludoTeluguResults.some((g) => g.id === "ludo")).toBe(true);

    const cardResults = filterGames({ searchQuery: "cards" });
    expect(cardResults.some((g) => g.id === "rummy" || g.id === "uno")).toBe(true);

    const zeroResults = filterGames({ searchQuery: "xyz_non_existent_query_999" });
    expect(zeroResults.length).toBe(0);
  });

  it("filters games by genre", () => {
    const boardGames = filterGames({ genre: "board" });
    expect(boardGames.every((g) => g.genre === "board")).toBe(true);
    expect(boardGames.some((g) => g.id === "ludo")).toBe(true);

    const cardGames = filterGames({ genre: "card" });
    expect(cardGames.every((g) => g.genre === "card")).toBe(true);
    expect(cardGames.some((g) => g.id === "rummy")).toBe(true);
  });

  it("filters games by player capacity categories", () => {
    const twoPlayerGames = filterGames({ playerCount: "2" });
    expect(twoPlayerGames.every((g) => g.minPlayers <= 2 && g.maxPlayers >= 2)).toBe(true);

    const largeGroupGames = filterGames({ playerCount: "5_plus" });
    expect(largeGroupGames.every((g) => g.maxPlayers >= 5)).toBe(true);
    expect(largeGroupGames.some((g) => g.id === "ludo")).toBe(true);
    expect(largeGroupGames.some((g) => g.id === "tambola")).toBe(true);
  });

  it("filters games by bot support", () => {
    const botGames = filterGames({ onlyBots: true });
    expect(botGames.every((g) => g.supportsBots)).toBe(true);
  });

  it("retrieves popular and solo playable games", () => {
    const popular = getPopularGames();
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.every((g) => g.isPopular)).toBe(true);

    const solo = getSoloPlayableGames();
    expect(solo.length).toBeGreaterThan(0);
  });
});

import {
  BHALYAM_GAME_CATALOGUE,
  NOSTALGIA_WORLDS,
  GAME_LIMITS,
  NO_BOT_GAMES,
  GAME_DISPLAY_NAMES,
  type GameCatalogueItem,
  type NostalgiaWorldId,
  type NostalgiaWorldMeta,
  type PlayTimeCategory,
  type GameGenre,
  type GameDifficulty,
  type GamePlayMode,
  type BhalyamGameSlug,
} from "@shared/catalog";

export {
  BHALYAM_GAME_CATALOGUE,
  NOSTALGIA_WORLDS,
  GAME_LIMITS,
  NO_BOT_GAMES,
  GAME_DISPLAY_NAMES,
  type GameCatalogueItem,
  type NostalgiaWorldId,
  type NostalgiaWorldMeta,
  type PlayTimeCategory,
  type GameGenre,
  type GameDifficulty,
  type GamePlayMode,
  type BhalyamGameSlug,
};

/**
 * Lookup a game by its unique slug identifier.
 */
export function getGameById(id: string): GameCatalogueItem | undefined {
  return BHALYAM_GAME_CATALOGUE.find((g) => g.id === id);
}

/**
 * Retrieve all games belonging to a specific childhood Nostalgia World.
 */
export function getGamesByNostalgiaWorld(worldId: NostalgiaWorldId): GameCatalogueItem[] {
  return BHALYAM_GAME_CATALOGUE.filter((g) => g.nostalgiaWorlds.includes(worldId));
}

/**
 * Retrieve popular / trending BHALYAM lounge titles.
 */
export function getPopularGames(): GameCatalogueItem[] {
  return BHALYAM_GAME_CATALOGUE.filter((g) => g.isPopular && g.availability === "playable");
}

/**
 * Retrieve games supporting solo bot / local solo play.
 */
export function getSoloPlayableGames(): GameCatalogueItem[] {
  return BHALYAM_GAME_CATALOGUE.filter(
    (g) => g.supportsBots || g.supportedModes.includes("solo_arcade") || g.minPlayers === 1
  );
}

export interface GameFilterCriteria {
  searchQuery?: string;
  genre?: GameGenre | "all";
  playerCount?: number | "2" | "3_4" | "5_plus" | "all";
  playTime?: PlayTimeCategory | "all";
  nostalgiaWorld?: NostalgiaWorldId | "all";
  difficulty?: GameDifficulty | "all";
  onlyBots?: boolean;
}

/**
 * Filter games deterministically across multiple search and discovery criteria.
 */
export function filterGames(criteria: GameFilterCriteria): GameCatalogueItem[] {
  return BHALYAM_GAME_CATALOGUE.filter((game) => {
    // 1. Search Query (matches title, telugu title, tagline, tags, description)
    if (criteria.searchQuery && criteria.searchQuery.trim() !== "") {
      const q = criteria.searchQuery.toLowerCase().trim();
      const matchName = game.name.toLowerCase().includes(q);
      const matchTelugu = game.teluguName?.toLowerCase().includes(q);
      const matchTagline = game.tagline.toLowerCase().includes(q);
      const matchTags = game.tags.some((t) => t.toLowerCase().includes(q));
      const matchDesc = game.shortDescription.toLowerCase().includes(q);

      if (!matchName && !matchTelugu && !matchTagline && !matchTags && !matchDesc) {
        return false;
      }
    }

    // 2. Genre Filter
    if (criteria.genre && criteria.genre !== "all" && game.genre !== criteria.genre) {
      return false;
    }

    // 3. Play Time Category Filter
    if (criteria.playTime && criteria.playTime !== "all" && game.playTimeCategory !== criteria.playTime) {
      return false;
    }

    // 4. Nostalgia World Filter
    if (
      criteria.nostalgiaWorld &&
      criteria.nostalgiaWorld !== "all" &&
      !game.nostalgiaWorlds.includes(criteria.nostalgiaWorld)
    ) {
      return false;
    }

    // 5. Difficulty Filter
    if (criteria.difficulty && criteria.difficulty !== "all" && game.difficulty !== criteria.difficulty) {
      return false;
    }

    // 6. Bot Capability Filter
    if (criteria.onlyBots && !game.supportsBots) {
      return false;
    }

    // 7. Player Count Filter
    if (criteria.playerCount && criteria.playerCount !== "all") {
      if (criteria.playerCount === "2" || criteria.playerCount === 2) {
        if (game.minPlayers > 2 || game.maxPlayers < 2) return false;
      } else if (criteria.playerCount === "3_4") {
        if (game.maxPlayers < 3 || game.minPlayers > 4) return false;
      } else if (criteria.playerCount === "5_plus") {
        if (game.maxPlayers < 5) return false;
      } else if (typeof criteria.playerCount === "number") {
        if (game.minPlayers > criteria.playerCount || game.maxPlayers < criteria.playerCount) {
          return false;
        }
      }
    }

    return true;
  });
}

import { BASE_URL, DEFAULT_OG_IMAGE } from "../metadata";

export interface GameSchemaConfig {
  name: string;
  slug: string;
  description: string;
  image?: string;
  genre?: string[];
  minPlayers?: number;
  maxPlayers?: number;
  playMode?: ("SinglePlayer" | "MultiPlayer")[];
  operatingSystem?: string;
  applicationCategory?: string;
  gameItemUrl?: string;
}

/**
 * Builds a Schema.org SoftwareApplication & VideoGame JSON-LD object.
 * Conforms to Google Search Central and Schema.org game specifications.
 */
export function buildGameApplicationSchema(config: GameSchemaConfig) {
  const {
    name,
    slug,
    description,
    image = DEFAULT_OG_IMAGE,
    genre = ["Casual Game", "Board Game", "Multiplayer Game", "Childhood Nostalgia"],
    minPlayers = 1,
    maxPlayers = 8,
    playMode = ["MultiPlayer", "SinglePlayer"],
    operatingSystem = "Any / Modern Web Browser (iOS, Android, Windows, macOS, Linux)",
    applicationCategory = "GameApplication",
    gameItemUrl = `${BASE_URL}/games?game=${slug}`,
  } = config;

  return {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "VideoGame"],
    name,
    description,
    url: gameItemUrl,
    image,
    applicationCategory,
    operatingSystem,
    genre,
    playMode,
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: minPlayers,
      maxValue: maxPlayers,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    author: {
      "@type": "Organization",
      name: "BHALYAM",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "BHALYAM",
      url: BASE_URL,
      logo: DEFAULT_OG_IMAGE,
    },
  };
}

/**
 * Builds an ItemList schema for the games catalog page (/games).
 */
export function buildGamesCatalogItemListSchema(
  games: Array<{ name: string; slug: string; description: string; image?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "BHALYAM 90s Indian Childhood Games Catalog",
    description: "Browse all nostalgic multiplayer and solo games available to play online instantly.",
    numberOfItems: games.length,
    itemListElement: games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: game.name,
      url: `${BASE_URL}/games?game=${game.slug}`,
      description: game.description,
      ...(game.image ? { image: game.image } : {}),
    })),
  };
}

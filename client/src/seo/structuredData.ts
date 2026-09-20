import { BASE_URL, DEFAULT_OG_IMAGE } from "./metadata";
import {
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildFaqSchema,
  buildHowToSchema,
  buildPlatformHowToPlaySchema,
  buildBreadcrumbSchema,
  buildGameApplicationSchema,
  buildGamesCatalogItemListSchema,
  SUPPORT_FAQS_LIST,
  HOW_TO_PLAY_FAQS_LIST,
} from "./schemas";

/**
 * Standard games catalog data for structured data generation.
 */
export const STRUCTURED_DATA_GAMES = [
  {
    slug: "handcricket",
    name: "Hand Cricket",
    description: "The timeless classroom finger-cricket duel. Odd or Even scoring, instant wickets, and intense 2-player runs chases.",
    image: `${BASE_URL}/HandcricketTile.png`,
    minPlayers: 2,
    maxPlayers: 2,
    genre: ["Classroom", "Multiplayer", "Cricket", "Sports"],
  },
  {
    slug: "rummy",
    name: "Classic Indian Rummy",
    description: "13-card Indian Rummy with pure sequences, sets, wild jokers, and touch drag-and-drop card sorting.",
    image: `${BASE_URL}/RummyTile.png`,
    minPlayers: 2,
    maxPlayers: 6,
    genre: ["Card Game", "Board Game", "Skill Game", "Multiplayer"],
  },
  {
    slug: "ludo",
    name: "Ludo Lounge",
    description: "Classic Indian board game of rolling sixes, cutting opponent tokens, and racing to the home triangle.",
    image: `${BASE_URL}/LudoTile.png`,
    minPlayers: 2,
    maxPlayers: 8,
    genre: ["Board Game", "Family Game", "Multiplayer"],
  },
  {
    slug: "uno",
    name: "UNO Blast",
    description: "Color-matching card game mayhem. Drop Draw-Fours, skip friends, and race to shout UNO.",
    image: `${BASE_URL}/UNOTile.png`,
    minPlayers: 2,
    maxPlayers: 8,
    genre: ["Card Game", "Party Game", "Multiplayer"],
  },
  {
    slug: "snl",
    name: "Snakes & Ladders",
    description: "Nostalgic board game of ascending ladders and dodging the notorious 99-tile snake.",
    image: `${BASE_URL}/S&LTile.png`,
    minPlayers: 2,
    maxPlayers: 6,
    genre: ["Board Game", "Dice Game", "Multiplayer"],
  },
  {
    slug: "dotsboxes",
    name: "Dots & Boxes",
    description: "Connect lines on a grid, complete boxes, and claim territory in classic notebook style.",
    image: `${BASE_URL}/Dots&boxes.png`,
    minPlayers: 2,
    maxPlayers: 6,
    genre: ["Classroom", "Strategy", "Puzzle"],
  },
  {
    slug: "wordbuilding",
    name: "Word Building",
    description: "Real-time vocabulary chain duels. Form English words from the trailing letter under pressure.",
    image: `${BASE_URL}/words_building.png`,
    minPlayers: 2,
    maxPlayers: 4,
    genre: ["Word Game", "Classroom", "Educational"],
  },
  {
    slug: "rps",
    name: "Rock Paper Scissors",
    description: "Best-of-three speed duels with nostalgic sound effects and instant rematch rounds.",
    image: `${BASE_URL}/RPSTile.png`,
    minPlayers: 2,
    maxPlayers: 2,
    genre: ["Classroom", "Quick Game", "Party Game"],
  },
  {
    slug: "bingo",
    name: "Bingo Lounge",
    description: "Strike 5 numbers across rows, columns, and diagonals to strike B-I-N-G-O with friends.",
    image: `${BASE_URL}/Bingo Tile.png`,
    minPlayers: 2,
    maxPlayers: 8,
    genre: ["Party Game", "Number Game", "Multiplayer"],
  },
  {
    slug: "stargame",
    name: "Star Game",
    description: "Four identical chits. Shuffle, trade, and slap the center star to score points.",
    image: `${BASE_URL}/StarTile.png`,
    minPlayers: 2,
    maxPlayers: 8,
    genre: ["Party Game", "Classroom", "Reaction Game"],
  },
  {
    slug: "connect4",
    name: "Connect 4",
    description: "Drop colored discs into the vertical 7x6 grid and connect four in a row horizontally, vertically, or diagonally.",
    image: `${BASE_URL}/Connect4Tile.png`,
    minPlayers: 2,
    maxPlayers: 2,
    genre: ["Board Game", "Strategy", "Multiplayer", "Classroom"],
  },
  {
    slug: "chess",
    name: "Chess Grandmaster",
    description: "Classic 2-player strategy board game of kings, queens, tactics, and checkmates.",
    image: `${BASE_URL}/og/chess.jpg`,
    minPlayers: 2,
    maxPlayers: 2,
    genre: ["Board Game", "Strategy", "Mind Game", "Multiplayer"],
  },
  {
    slug: "carrom",
    name: "Carrom Board Lounge",
    description: "Traditional Indian tabletop board game with smooth striker controls, pocketing carrom men, and queen covers.",
    image: `${BASE_URL}/og/carrom.jpg`,
    minPlayers: 2,
    maxPlayers: 4,
    genre: ["Board Game", "Family Game", "Multiplayer"],
  },
  {
    slug: "spacewar",
    name: "Space War 90s",
    description: "Retro 90s pixel space shooter. Battle alien squadrons, dodge bullets, and climb high scores.",
    image: `${BASE_URL}/og/spacewar.jpg`,
    minPlayers: 1,
    maxPlayers: 4,
    genre: ["Arcade", "Action", "Retro Game", "Multiplayer"],
  },
  {
    slug: "tambola",
    name: "Tambola (Housie)",
    description: "India's beloved family numbers game. Claim Early 5, Lines, and Full House with friends.",
    image: `${BASE_URL}/og/tambola.jpg`,
    minPlayers: 2,
    maxPlayers: 12,
    genre: ["Party Game", "Number Game", "Multiplayer"],
  },
  {
    slug: "namesplaceanimal",
    name: "Name Place Animal Thing",
    description: "Fast-paced nostalgia word game. Race against timer to write Name, Place, Animal, and Thing for the chosen letter.",
    image: `${BASE_URL}/og/handcricket.jpg`,
    minPlayers: 2,
    maxPlayers: 8,
    genre: ["Classroom", "Word Game", "Party Game", "Multiplayer"],
  },
  {
    slug: "tictactoe",
    name: "Tic Tac Toe Duel",
    description: "Quick 3x3 grid naughts and crosses battles with smart bot and pass & play modes.",
    image: `${BASE_URL}/RPSTile.png`,
    minPlayers: 1,
    maxPlayers: 2,
    genre: ["Classroom", "Quick Game", "Puzzle"],
  },
  {
    slug: "nokiacricket",
    name: "Nokia Cricket 2D",
    description: "Hit sixes and time your batting in authentic 90s monochrome LCD mobile cricket.",
    image: `${BASE_URL}/og/nokiacricket.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Retro Game", "Sports", "Arcade"],
  },
  {
    slug: "snake",
    name: "Classic Snake",
    description: "Classic Nokia 3310 green-screen Snake arcade. Eat dots, grow your tail, and avoid walls.",
    image: `${BASE_URL}/og/snake.jpg`,
    minPlayers: 1,
    maxPlayers: 4,
    genre: ["Retro Game", "Arcade", "Classic"],
  },
  {
    slug: "brickracer",
    name: "Brick Racer 9999-in-1",
    description: "Classic 9999-in-1 handheld racing. Weave between incoming cars across three frantic lanes.",
    image: `${BASE_URL}/og/brickracer.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Retro Game", "Racing", "Arcade"],
  },
  {
    slug: "brickblocks",
    name: "Brick Blocks 9999-in-1",
    description: "Handheld brick console falling blocks puzzle. Rotate shapes and clear horizontal lines.",
    image: `${BASE_URL}/og/brickblocks.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Retro Game", "Puzzle", "Arcade"],
  },
  {
    slug: "tetris",
    name: "Classic Tetris 90s",
    description: "Original falling block puzzle with authentic 90s LCD pixel grid and escalating speeds.",
    image: `${BASE_URL}/og/tetris.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Retro Game", "Puzzle", "Arcade"],
  },
  {
    slug: "breakout",
    name: "Brick Breakout",
    description: "Deflect balls, smash rows of bricks, and bounce back for high scores in retro handheld style.",
    image: `${BASE_URL}/og/breakout.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Retro Game", "Arcade", "Action"],
  },
  {
    slug: "2048",
    name: "2048 Puzzle",
    description: "Slide numbered tiles across the 4x4 grid, merge matching numbers, and reach the legendary 2048 tile.",
    image: `${BASE_URL}/og/breakout.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Puzzle", "Brain Game", "Solo"],
  },
  {
    slug: "sudoku",
    name: "Sudoku Cyber-Matrix",
    description: "Neural 9x9 Sudoku logic puzzle with Easy, Medium, Hard, and Expert difficulties plus smart hints.",
    image: `${BASE_URL}/og/breakout.jpg`,
    minPlayers: 1,
    maxPlayers: 1,
    genre: ["Puzzle", "Brain Game", "Logic", "Solo"],
  },
];

/**
 * Returns the array of Schema.org objects appropriate for a given route.
 */
export function getStructuredDataForRoute(pathname: string, customParams?: Record<string, unknown>): object[] {
  // Normalize path
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  switch (path) {
    case "/":
      return [
        buildWebSiteSchema(),
        buildOrganizationSchema(),
      ];

    case "/about":
      return [
        buildOrganizationSchema(),
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ];

    case "/support":
      return [
        buildFaqSchema(SUPPORT_FAQS_LIST),
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Support & FAQs", path: "/support" },
        ]),
      ];

    case "/how-to-play":
      return [
        buildPlatformHowToPlaySchema(),
        buildFaqSchema(HOW_TO_PLAY_FAQS_LIST),
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "How to Play", path: "/how-to-play" },
        ]),
      ];

    case "/games":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "All Games", path: "/games" },
        ]),
        buildGamesCatalogItemListSchema(STRUCTURED_DATA_GAMES),
      ];

    case "/privacy":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ]),
      ];

    case "/terms":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms" },
        ]),
      ];

    case "/community-rules":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Community Rules", path: "/community-rules" },
        ]),
      ];

    case "/safety":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Safety Center", path: "/safety" },
        ]),
      ];

    case "/contact":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Support", path: "/support" },
          { name: "Contact Us", path: "/contact" },
        ]),
      ];

    case "/leaderboard":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Leaderboard", path: "/leaderboard" },
        ]),
      ];

    case "/tournaments":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tournaments", path: "/tournaments" },
        ]),
      ];

    case "/social":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Social Hub", path: "/social" },
        ]),
      ];

    case "/testimonials":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Community", path: "/social" },
          { name: "Player Testimonials", path: "/testimonials" },
        ]),
      ];

    case "/reviews/write":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Support", path: "/support" },
          { name: "Write a Review", path: "/reviews/write" },
        ]),
      ];

    case "/feedback":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Support", path: "/support" },
          { name: "Player Feedback", path: "/feedback" },
        ]),
      ];

    case "/design-system":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Design System & UI Catalog", path: "/design-system" },
        ]),
      ];

    case "/favorites":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Games", path: "/games" },
          { name: "My Favorite Games", path: "/favorites" },
        ]),
      ];

    case "/recently-played":
      return [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Games", path: "/games" },
          { name: "Recently Played", path: "/recently-played" },
        ]),
      ];

    default: {
      // Check if it's a known standalone game path (e.g. /nokiacricket, /snake, /tetris)
      const cleanSlug = path.replace(/^\//, "");
      const matchedGame = STRUCTURED_DATA_GAMES.find((g) => g.slug === cleanSlug);
      if (matchedGame) {
        return [
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Games", path: "/games" },
            { name: matchedGame.name, path },
          ]),
          buildGameApplicationSchema(matchedGame),
        ];
      }

      // Default fallback: BreadcrumbList for the path
      const pathSegments = path.split("/").filter(Boolean);
      const breadcrumbs = [
        { name: "Home", path: "/" },
        ...pathSegments.map((segment, idx) => ({
          name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
          path: `/${pathSegments.slice(0, idx + 1).join("/")}`,
        })),
      ];

      return [buildBreadcrumbSchema(breadcrumbs)];
    }
  }
}

/**
 * Serializes Schema.org structured data into a safe JSON-LD string.
 * Escapes closing script tags to guard against Cross-Site Scripting (XSS).
 */
export function serializeJsonLd(data: object | object[] | null | undefined): string {
  if (!data) return "";

  let payload: object;

  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    if (data.length === 1) {
      payload = data[0];
    } else {
      // Google-supported @graph container for multiple entities on a single page
      payload = {
        "@context": "https://schema.org",
        "@graph": data.map((item) => {
          if ("@context" in item) {
            // Remove redundant @context inside graph elements
            const { "@context": _, ...rest } = item as Record<string, unknown>;
            return rest;
          }
          return item;
        }),
      };
    }
  } else {
    payload = data;
  }

  return JSON.stringify(payload)
    .replace(/<\/script/gi, "\\u003c/script")
    .replace(/<!--/g, "\\u003c!--");
}

/**
 * BHALYAM game catalog.
 *
 * The slug union is intentionally wider than the server's `GameKind`:
 * "coming soon" games live here in the lobby with `maintenance: true`
 * so players see them but can't open a room until the engine ships.
 * The maintenance tile is a soft-disabled click — see `BhalyamHome`'s
 * `underMaintenance` gate.
 *
 * Top-of-array order is also the order of the home page tile grid. The
 * home grid is sliced to 6; everything else surfaces only on the
 * dedicated `/games` route. Keep the playable games at the top.
 */

export type BhalyamGameSlug =
  // Playable — these slugs match the server's GameKind (see shared/types).
  | "handcricket"
  | "snl"
  | "ludo"
  | "rummy"
  | "rps"
  | "wordbuilding"
  | "uno"
  | "dotsboxes"
  | "stargame"
  | "bingo"
  | "chess"
  // Coming soon — NOT in GameKind. Maintenance tiles only.
  | "namesplaceanimal"
  | "tambola"
  | "samethalu"
  | "telugucinemalu"
  | "snake"
  | "vyomayudh"
  | "bounce"
  | "roadrash"
  | "carrom";

/**
 * Game filters.
 *
 * These are TAGS, not exclusive buckets, and a game carries as many as apply.
 * That is forced by the set itself: "Solo Play" and "Multiplayer" describe how
 * many people you need, while "Board & Cards", "Party & Quiz" and "Classroom"
 * describe what kind of game it is. Ludo is genuinely both Multiplayer AND
 * Board & Cards. Snake is Solo Play AND Multiplayer, because it seats 1 to 4.
 *
 * If each game were forced into one bucket, every one of those games would go
 * missing from a filter a player would reasonably expect to find it in. Tags
 * cost nothing and keep both questions answerable:
 *   "who is around?"  -> Solo Play / Multiplayer
 *   "what do I feel like?" -> Board & Cards / Party & Quiz / Classroom
 */
export type GameTag =
  | "solo"
  | "multiplayer"
  | "board"
  | "party"
  | "classroom";

export interface GameCategory {
  id: GameTag;
  label: string;
  /** One line for the category header. */
  blurb: string;
  accent: { from: string; to: string };
}

/**
 * No icon field here on purpose. Icons are React components, and this module
 * is plain data imported by tests and by non-rendering code. The tag to
 * pictogram map lives in categoryIcons.tsx.
 */

/** Display order everywhere in the app. Player-count first, then genre. */
export const GAME_CATEGORIES: readonly GameCategory[] = [
  {
    id: "solo",
    label: "Solo Play",
    blurb: "Nobody around? These play fine on your own.",
    accent: { from: "#65A30D", to: "#365314" },
  },
  {
    id: "multiplayer",
    label: "Multiplayer",
    blurb: "Get the gang in. Share a room code and go.",
    accent: { from: "#E95D21", to: "#7C2D12" },
  },
  {
    id: "board",
    label: "Board & Cards",
    blurb: "The ones that live in the cupboard.",
    accent: { from: "#E11D48", to: "#881337" },
  },
  {
    id: "party",
    label: "Party & Quiz",
    blurb: "Big group, one caller, everyone shouting.",
    accent: { from: "#C026D3", to: "#701A75" },
  },
  {
    id: "classroom",
    label: "Classroom",
    blurb: "Played on the last page of a notebook, usually during maths.",
    accent: { from: "#0284C7", to: "#0C4A6E" },
  },
];

export function categoryById(id: GameTag): GameCategory | undefined {
  return GAME_CATEGORIES.find((c) => c.id === id);
}

export interface BhalyamGameCard {
  slug: BhalyamGameSlug;
  /**
   * Every filter this game belongs to. At least one; usually two.
   *
   * "solo" means playing ALONE is a real experience, not merely that the
   * engine tolerates one seat. Bingo and Tambola accept a single player so a
   * host can open a table early, but nobody wants to call housie to
   * themselves, so they are multiplayer only.
   */
  tags: readonly GameTag[];
  title: string;
  teluguTitle?: string;
  /**
   * Nostalgic "edition" name from the BHALYAM theme catalog. Renders as
   * a small uppercase subtitle on the lobby tile + `/games` card so
   * each game's identity reads even before the artwork loads. Phase-2
   * board theming derives its palette + decoration vocabulary from
   * this label.
   */
  theme?: string;
  blurb: string;
  /** Hex pair used as the card art gradient (light → dark). */
  accent: { from: string; to: string };
  /**
   * When true the home tile renders in a "coming soon" state — the tile is
   * still visible (so players know it exists) but clicks are absorbed
   * locally rather than opening the lobby sheet. Use this to feature a
   * game that exists in code but is paused for content or balance work.
   */
  maintenance?: boolean;
  /**
   * When true the tile keeps its "Maintenance" badge but stays fully
   * playable — players can still open a room. Pairs with `maintenance` to
   * flag a game as flaky / under-work without locking players out.
   */
  accessible?: boolean;
}

/**
 * A tile is "locked" — click-disabled and shown in the coming-soon section —
 * only when it's under maintenance AND not explicitly kept accessible. Star
 * Game sets `accessible: true` so it shows the badge yet still plays.
 */
export function isLocked(g: BhalyamGameCard): boolean {
  return g.maintenance === true && g.accessible !== true;
}

/**
 * Dynamic fallback gradient generator using Golden Ratio Hue Distribution.
 * Guarantees that any new game added in the future without an explicit accent
 * automatically receives a 100% unique, vibrant, harmonized gradient palette.
 */
export function getGameAccent(game: BhalyamGameCard, index?: number): { from: string; to: string } {
  if (game.accent?.from && game.accent?.to) {
    return game.accent;
  }

  // Derive a deterministic unique hue using golden angle separation (137.508°)
  const seed = index ?? Math.abs(hashString(game.slug));
  const hue = (seed * 137.508) % 360;

  return {
    from: `hsl(${hue.toFixed(1)}, 80%, 48%)`,
    to: `hsl(${(hue + 25) % 360}, 85%, 22%)`,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export const BHALYAM_GAMES: ReadonlyArray<BhalyamGameCard> = [
  // ── Top Playable Games ────────────────────────────────────────────────
  {
    slug: "handcricket",
    tags: ["multiplayer", "classroom"],
    title: "Hand Cricket",
    blurb:
      "Odd or Even? The back-bench class champion simulator. Zero infrastructure, infinite intensity.",
    accent: { from: "#EA580C", to: "#7C2D12" }, // Leather Rust Orange & Mahogany
  },
  {
    slug: "rummy",
    tags: ["multiplayer", "board"],
    title: "Rummy",
    blurb:
      "The family festival classic. Perfected during Sankranti gatherings, reimagined for your native gang.",
    accent: { from: "#2563EB", to: "#1E3A8A" }, // Royal Sapphire Blue
  },
  {
    slug: "ludo",
    tags: ["multiplayer", "board"],
    title: "Ludo",
    blurb:
      "The ultimate hot summer afternoon time-killer while waiting for the current (power) to come back.",
    accent: { from: "#E11D48", to: "#881337" }, // Ludo Crimson Red
  },
  {
    slug: "uno",
    tags: ["multiplayer", "board"],
    title: "UNO",
    blurb:
      "Color chaos with your gang. Match cards, drop action cards, and race to shout UNO first.",
    accent: { from: "#9333EA", to: "#581C87" }, // Wildcard Violet Purple
  },
  {
    slug: "dotsboxes",
    tags: ["multiplayer", "classroom"],
    title: "Dots & Boxes",
    blurb:
      "Connect the dots, close the box, claim the square. Maths-period nostalgia at its purest.",
    accent: { from: "#06B6D4", to: "#164E63" }, // Neon Turquoise Cyan
  },
  {
    slug: "rps",
    tags: ["multiplayer", "classroom"],
    title: "Rock Paper Scissors",
    blurb:
      "Stone-Paper-Scissor! The ultimate playground arbiter for deciding who bats first.",
    accent: { from: "#D97706", to: "#78350F" }, // Golden Amber
  },
  {
    slug: "bingo",
    tags: ["multiplayer", "party"],
    title: "Bingo",
    blurb:
      "Eyes down! Mark your ticket as the caller reads out the numbers — first full house wins.",
    accent: { from: "#0D9488", to: "#115E59" }, // Deep Ocean Teal
  },
  {
    slug: "snl",
    tags: ["multiplayer", "board"],
    title: "Snakes & Ladders",
    blurb:
      "Watch out for the big snake at 99 that ruined neighborhood friendships.",
    accent: { from: "#16A34A", to: "#14532D" }, // Forest Jungle Green
  },
  {
    slug: "wordbuilding",
    tags: ["multiplayer", "classroom"],
    title: "Word Building",
    blurb:
      "The English workbook revisited. Take turns writing letters and watch dictionary words light up like a teacher's tick.",
    accent: { from: "#0284C7", to: "#0C4A6E" }, // Midnight Oxford Blue
  },
  {
    slug: "stargame",
    tags: ["multiplayer", "classroom"],
    title: "Star Game",
    theme: "Folded Paper Slips Edition",
    blurb:
      "Pick a secret, slide the chits clockwise, and slap the STAR the instant you hold all four. Pure 90's terrace nostalgia.",
    accent: { from: "#CA8A04", to: "#713F12" }, // Luxe Golden Honey Bronze
  },
  {
    slug: "chess",
    tags: ["multiplayer", "board"],
    title: "Chess",
    theme: "Grandmaster 2026 Edition",
    blurb:
      "The ultimate 64-square battlefield. Real-time Bullet/Blitz/Rapid timers, 3D piece skins, move evaluation, and AI Bot tiers.",
    accent: { from: "#059669", to: "#064E3B" }, // Emerald Grandmaster
  },
  {
    slug: "namesplaceanimal",
    tags: ["multiplayer", "classroom"],
    title: "Name Place Animal Thing",
    blurb: "Pick a letter, beat the clock. Whose Bombay was the most legit?",
    accent: { from: "#F97316", to: "#9A3412" }, // Bright Sunburst Coral
  },
  {
    slug: "tambola",
    tags: ["multiplayer", "party"],
    title: "Tambola",
    teluguTitle: "Housie",
    blurb:
      "Eyes down, ticket out. Full house calling at the next wedding sangeet.",
    accent: { from: "#C026D3", to: "#701A75" }, // Vivid Fuchsia Magenta
  },
  {
    slug: "samethalu",
    tags: ["solo", "party"],
    title: "Samethalu Quiz",
    blurb:
      "Telugu proverbs from Ammamma's verandah. Complete the saying, learn the lesson, win the round.",
    accent: { from: "#B45309", to: "#451A03" }, // Antique Parchment Ochre
  },
  {
    slug: "telugucinemalu",
    tags: ["solo", "party"],
    title: "Telugu Cinema Quiz",
    blurb:
      "Guess the film. Hint by hint, dialogue by dialogue. Friday-release adda energy.",
    accent: { from: "#9F1239", to: "#4C0519" }, // Cinema Ruby Velvet
  },
  {
    slug: "snake",
    tags: ["solo", "multiplayer"],
    theme: "90s Nostalgia 🐍",
    title: "Snake",
    blurb:
      "Classic green LCD matrix. Eat food pellets, grow longer, avoid walls and self-collision.",
    accent: { from: "#65A30D", to: "#365314" }, //  3310 Lime Matrix
  },
  {
    slug: "vyomayudh",
    tags: ["solo"],
    theme: "90s Shooter 🚀",
    title: "Vyoma Yudh",
    blurb:
      "Sky battle in the old handheld style. Fly the gunship, hold the line against enemy waves, and break the guardian at the end of every level.",
    accent: { from: "#4F46E5", to: "#1E1B4B" }, // Cosmic Deep Space Indigo
  },
  {
    slug: "bounce",
    tags: ["solo", "multiplayer"],
    theme: "Red Ball 🔴",
    title: "Bounce",
    blurb:
      "Classic red ball platformer. Pass through gold rings, avoid spikes, and finish the level.",
    accent: { from: "#F43F5E", to: "#9F1239" }, // Red Ball Electric Crimson
  },
  {
    slug: "roadrash",
    tags: ["solo", "multiplayer"],
    theme: "90s Racer 🏍️",
    title: "Road Rash",
    blurb:
      "Retro 90s highway motorcycle racer. Steer, accelerate, punch rival bikers to win!",
    accent: { from: "#475569", to: "#0F172A" }, // Dark Racing Slate Charcoal
  },
  {
    slug: "carrom",
    tags: ["multiplayer", "board"],
    theme: "Board Classic 🎯",
    title: "Carrom",
    blurb:
      "Powder on the board, thumb cocked, queen in the middle. Strike, rebound and cover her before your cousin does.",
    accent: { from: "#D97706", to: "#451A03" }, // Carrom Teak Wood & Gold
  },
];

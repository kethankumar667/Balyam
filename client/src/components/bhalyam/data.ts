/**
 * BHALYAM game catalog.
 *
 * The slug union is wider than the server's `GameKind` because several
 * titles are client-only (the retro handheld games run entirely in the
 * browser and never open a server room).
 *
 * A tile can still be soft-disabled with `maintenance: true` — see
 * `BhalyamHome`'s `underMaintenance` gate — but nothing in the catalogue
 * uses it right now: the "coming soon" quizzes and Bounce were deleted
 * rather than left on screen as tiles that go nowhere.
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
  | "spacewar"
  | "nokiacricket"
  | "namesplaceanimal"
  | "tambola"
  | "snake"
  | "roadrash"
  | "brickblocks"
  | "tetris"
  | "breakout"
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
  | "retro"
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
    id: "retro",
    label: "Retro Games",
    blurb: "Nokia monochrome & 9999-in-1 Brick Game handheld arcade legends.",
    accent: { from: "#8BAC0F", to: "#306230" },
  },
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
  tags: readonly GameTag[];
  title: string;
  teluguTitle?: string;
  theme?: string;
  blurb: string;
  badge?: string;
  nostalgiaQuote?: string;
  playerRange?: string;
  duration?: string;
  paperBg?: string;
  paperBorder?: string;
  btnGradient?: { from: string; to: string; shadow: string };
  accent: { from: string; to: string };
  maintenance?: boolean;
  accessible?: boolean;
  tileImage?: string;
}

/**
 * A tile is "locked" — click-disabled — only when it's under maintenance AND
 * not explicitly kept accessible. Super admins and users with bypassMaintenance
 * capability have all games unlocked.
 */
export function isLocked(
  g: BhalyamGameCard,
  capabilities?: { bypassMaintenance?: boolean; unlockAllFeatures?: boolean } | null,
): boolean {
  if (capabilities?.bypassMaintenance || capabilities?.unlockAllFeatures) {
    return false;
  }
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

export const BHALYAM_GAMES: readonly BhalyamGameCard[] = [
  {
    slug: "handcricket",
    tags: ["multiplayer", "classroom"],
    title: "Hand Cricket",
    badge: "🔥 School Favourite",
    nostalgiaQuote: "Every school break had one.",
    playerRange: "2 Players",
    duration: "5–10 min",
    paperBg: "linear-gradient(155deg, #3A1804 0%, #200C02 45%, #0F0501 100%)",
    paperBorder: "rgba(245, 158, 11, 0.55)",
    btnGradient: { from: "#F59E0B", to: "#D97706", shadow: "#92400E" },
    blurb:
      "Odd or Even? The back-bench class champion simulator. Zero infrastructure, infinite intensity.",
    accent: { from: "#F59E0B", to: "#D97706" },
  },
  {
    slug: "rummy",
    tags: ["multiplayer", "board"],
    title: "Rummy",
    badge: "♠ Classic",
    nostalgiaQuote: "Cards on the classroom bench.",
    playerRange: "2–6 Players",
    duration: "10–20 min",
    paperBg: "linear-gradient(155deg, #0A1E4A 0%, #05102A 45%, #020713 100%)",
    paperBorder: "rgba(59, 130, 246, 0.55)",
    btnGradient: { from: "#3B82F6", to: "#1D4ED8", shadow: "#1E3A8A" },
    blurb:
      "The family festival classic. Perfected during Sankranti gatherings, reimagined for your native gang.",
    accent: { from: "#3B82F6", to: "#1D4ED8" },
  },
  {
    slug: "ludo",
    tags: ["multiplayer", "board"],
    title: "Ludo",
    badge: "👥 Most Played",
    nostalgiaQuote: "One more game?",
    playerRange: "2–8 Players",
    duration: "10–30 min",
    paperBg: "linear-gradient(155deg, #380711 0%, #1E0308 45%, #0D0104 100%)",
    paperBorder: "rgba(239, 68, 68, 0.55)",
    btnGradient: { from: "#EF4444", to: "#DC2626", shadow: "#991B1B" },
    blurb:
      "The ultimate hot summer afternoon time-killer while waiting for the current (power) to come back.",
    accent: { from: "#EF4444", to: "#DC2626" },
  },
  {
    slug: "uno",
    tags: ["multiplayer", "board"],
    title: "UNO",
    badge: "⚡ Party Favourite",
    nostalgiaQuote: "Friendship ends at +4.",
    playerRange: "2–8 Players",
    duration: "10–20 min",
    paperBg: "linear-gradient(155deg, #2A0944 0%, #160424 45%, #0B0212 100%)",
    paperBorder: "rgba(168, 85, 247, 0.55)",
    btnGradient: { from: "#A855F7", to: "#7E22CE", shadow: "#581C87" },
    blurb:
      "Color chaos with your gang. Match cards, drop action cards, and race to shout UNO first.",
    accent: { from: "#A855F7", to: "#7E22CE" },
  },
  {
    slug: "dotsboxes",
    tags: ["multiplayer", "classroom"],
    title: "Dots & Boxes",
    badge: "✏️ Classroom Classic",
    nostalgiaQuote: "Draw the line. Claim the box.",
    playerRange: "2–6 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #053331 0%, #021C1B 45%, #010E0E 100%)",
    paperBorder: "rgba(20, 184, 166, 0.55)",
    btnGradient: { from: "#14B8A6", to: "#0D9488", shadow: "#115E59" },
    blurb:
      "Connect the dots, close the box, claim the square. Maths-period nostalgia at its purest.",
    accent: { from: "#14B8A6", to: "#0D9488" },
  },
  {
    slug: "rps",
    tags: ["multiplayer", "classroom"],
    title: "Rock Paper Scissors",
    badge: "🏆 Quick Battle",
    nostalgiaQuote: "Best of three. No cheating!",
    playerRange: "2 Players",
    duration: "2–5 min",
    paperBg: "linear-gradient(155deg, #3C0D1C 0%, #22060F 45%, #100206 100%)",
    paperBorder: "rgba(251, 113, 133, 0.55)",
    btnGradient: { from: "#FB7185", to: "#E11D48", shadow: "#9F1239" },
    blurb:
      "Stone-Paper-Scissor! The ultimate playground arbiter for deciding who bats first.",
    accent: { from: "#FB7185", to: "#E11D48" },
  },
  {
    slug: "bingo",
    tags: ["multiplayer", "party"],
    title: "Bingo",
    badge: "🎟️ Lucky House",
    nostalgiaQuote: "Strike 5 lines to shout BINGO!",
    playerRange: "2–8 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #342202 0%, #1C1201 45%, #0E0900 100%)",
    paperBorder: "rgba(234, 179, 8, 0.55)",
    btnGradient: { from: "#EAB308", to: "#CA8A04", shadow: "#854D0E" },
    blurb:
      "Eyes down! Mark your ticket as the caller reads out the numbers — first full house wins.",
    accent: { from: "#EAB308", to: "#CA8A04" },
  },
  {
    slug: "snl",
    tags: ["multiplayer", "board"],
    title: "Snakes & Ladders",
    badge: "🐍 Classic Race",
    nostalgiaQuote: "Climb high, avoid the 99 snake!",
    playerRange: "2–6 Players",
    duration: "10–20 min",
    paperBg: "linear-gradient(155deg, #072F12 0%, #031B0A 45%, #010E05 100%)",
    paperBorder: "rgba(34, 197, 94, 0.55)",
    btnGradient: { from: "#22C55E", to: "#16A34A", shadow: "#14532D" },
    blurb:
      "Watch out for the big snake at 99 that ruined neighborhood friendships.",
    accent: { from: "#22C55E", to: "#16A34A" },
  },
  {
    slug: "wordbuilding",
    tags: ["multiplayer", "classroom"],
    title: "Word Building",
    badge: "📚 English Period",
    nostalgiaQuote: "Spell words, build the chain.",
    playerRange: "2–4 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #06233B 0%, #031321 45%, #010A12 100%)",
    paperBorder: "rgba(14, 165, 233, 0.55)",
    btnGradient: { from: "#0EA5E9", to: "#0284C7", shadow: "#0369A1" },
    blurb:
      "The English workbook revisited. Take turns writing letters and watch dictionary words light up like a teacher's tick.",
    accent: { from: "#0EA5E9", to: "#0284C7" },
  },
  {
    slug: "stargame",
    tags: ["multiplayer", "classroom"],
    title: "Star Game",
    theme: "Folded Paper Slips Edition",
    badge: "⭐ Slap the Chit",
    nostalgiaQuote: "Four identical chits. Slap the star!",
    playerRange: "2–8 Players",
    duration: "5–10 min",
    paperBg: "linear-gradient(155deg, #3A2A04 0%, #201702 45%, #100B01 100%)",
    paperBorder: "rgba(250, 204, 21, 0.55)",
    btnGradient: { from: "#FACC15", to: "#CA8A04", shadow: "#713F12" },
    blurb:
      "Pick a secret, slide the chits clockwise, and slap the STAR the instant you hold all four. Pure 90's terrace nostalgia.",
    accent: { from: "#FACC15", to: "#CA8A04" },
  },
  {
    slug: "chess",
    tags: ["multiplayer", "board"],
    title: "Chess",
    theme: "Grandmaster 2026 Edition",
    badge: "♟️ Strategy",
    nostalgiaQuote: "Checkmate the master.",
    playerRange: "2 Players",
    duration: "10–30 min",
    paperBg: "linear-gradient(155deg, #1E293B 0%, #0F172A 45%, #020617 100%)",
    paperBorder: "rgba(148, 163, 184, 0.55)",
    btnGradient: { from: "#94A3B8", to: "#64748B", shadow: "#334155" },
    blurb:
      "The ultimate 64-square battlefield. Real-time Bullet/Blitz/Rapid timers, 3D piece skins, move evaluation, and AI Bot tiers.",
    accent: { from: "#94A3B8", to: "#64748B" },
  },
  {
    slug: "namesplaceanimal",
    tags: ["multiplayer", "classroom"],
    title: "NPTA",
    theme: "Name Place Animal Thing 📝",
    badge: "📝 90s Notebook",
    nostalgiaQuote: "Stop! Time is up!",
    playerRange: "2–6 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #361404 0%, #1E0A02 45%, #0E0501 100%)",
    paperBorder: "rgba(249, 115, 22, 0.55)",
    btnGradient: { from: "#F97316", to: "#EA580C", shadow: "#9A3412" },
    blurb: "Pick a letter, beat the clock. Whose Bombay was the most legit?",
    accent: { from: "#F97316", to: "#EA580C" },
  },
  {
    slug: "tambola",
    tags: ["multiplayer", "party"],
    title: "Tambola",
    teluguTitle: "Housie",
    badge: "🎉 Wedding Sangeet",
    nostalgiaQuote: "Early five, corners, full house!",
    playerRange: "2–10 Players",
    duration: "10–25 min",
    paperBg: "linear-gradient(155deg, #380633 0%, #20031D 45%, #10010E 100%)",
    paperBorder: "rgba(217, 70, 239, 0.55)",
    btnGradient: { from: "#D946EF", to: "#C026D3", shadow: "#701A75" },
    blurb:
      "Eyes down, ticket out. Full house calling at the next wedding sangeet.",
    accent: { from: "#D946EF", to: "#C026D3" },
  },
  {
    slug: "snake",
    tags: ["retro", "solo", "multiplayer"],
    theme: "Retro Snake 🐍",
    badge: "🐍 Retro Snake",
    nostalgiaQuote: "2 for up, 8 for down, 4 for left, 6 for right!",
    title: "Retro Snake",
    playerRange: "1 Player",
    duration: "3–10 min",
    paperBg: "linear-gradient(155deg, #1C2B0E 0%, #0F1A07 45%, #070D03 100%)",
    paperBorder: "rgba(132, 204, 22, 0.55)",
    btnGradient: { from: "#84CC16", to: "#65A30D", shadow: "#365314" },
    blurb:
      "Authentic Nokia 1100 monochrome 2D snake. 1-bit LCD graphics, classic & wrap-around modes, timed bonus insects, and pure square-wave buzzer nostalgia.",
    accent: { from: "#84CC16", to: "#65A30D" },
  },
  {
    slug: "nokiacricket",
    tags: ["retro", "solo"],
    theme: "Retro Cricket 🏏",
    badge: "🏏 Retro Cricket",
    nostalgiaQuote: "4 for pull, 5 for drive, 6 for cut!",
    title: "Retro Cricket",
    playerRange: "1 Player",
    duration: "3–10 min",
    paperBg: "linear-gradient(155deg, #092B19 0%, #04180D 45%, #020C06 100%)",
    paperBorder: "rgba(16, 185, 129, 0.55)",
    btnGradient: { from: "#10B981", to: "#059669", shadow: "#064E3B" },
    blurb:
      "Authentic retro 90s monochrome 2D cricket. 1-bit LCD graphics, pitch bounce timing, and pure square-wave buzzer nostalgia.",
    accent: { from: "#10B981", to: "#059669" },
  },
  {
    slug: "roadrash",
    tags: ["retro", "solo"],
    theme: "9999-in-1 🏎️",
    badge: "🏎️ Brick Racer",
    nostalgiaQuote: "4 for left, 6 for right, 8 for boost!",
    title: "Brick Racer",
    playerRange: "1 Player",
    duration: "3–10 min",
    paperBg: "linear-gradient(155deg, #2E1B04 0%, #190F02 45%, #0C0701 100%)",
    paperBorder: "rgba(234, 179, 8, 0.55)",
    btnGradient: { from: "#EAB308", to: "#CA8A04", shadow: "#854D0E" },
    blurb:
      "Authentic 9999-in-1 Brick Game Formula 1 racing. 10x20 LCD block matrix, 3-lane car dodging, nitro speed boost, and retro buzzer nostalgia.",
    accent: { from: "#EAB308", to: "#CA8A04" },
  },
  {
    slug: "brickblocks",
    tags: ["retro", "solo"],
    theme: "Classic & Pentix 🧱",
    badge: "🧱 Brick Blocks",
    nostalgiaQuote: "4/6 to move, 2 to rotate, Space to hard drop!",
    title: "Brick Blocks",
    playerRange: "1 Player",
    duration: "3–15 min",
    paperBg: "linear-gradient(155deg, #05263B 0%, #021522 45%, #010B11 100%)",
    paperBorder: "rgba(6, 182, 212, 0.55)",
    btnGradient: { from: "#06B6D4", to: "#0891B2", shadow: "#0E7490" },
    blurb:
      "Authentic 9999-in-1 Brick Game falling blocks puzzle. 10x20 LCD matrix, Classic 7-tetrominoes & 12-pentomino Pentix modes, SRS wall kicks, ghost piece, and retro buzzer nostalgia.",
    accent: { from: "#06B6D4", to: "#0891B2" },
  },
  {
    slug: "breakout",
    tags: ["retro", "solo"],
    theme: "9999-in-1 🧱",
    badge: "🧱 Block Breakout",
    nostalgiaQuote: "Angle the paddle, smash the bricks, clear the wall!",
    title: "Brick Breakout",
    playerRange: "1 Player",
    duration: "3–15 min",
    paperBg: "linear-gradient(155deg, #351508 0%, #1E0B04 45%, #0F0502 100%)",
    paperBorder: "rgba(249, 115, 22, 0.55)",
    btnGradient: { from: "#FB923C", to: "#EA580C", shadow: "#9A3412" },
    blurb:
      "Authentic 9999-in-1 Brick Game Block Breaker. 10x20 LCD matrix, 3-cell paddle deflection, normal & reinforced steel blocks, combo multiplier scoring, and retro chiptune audio.",
    accent: { from: "#FB923C", to: "#EA580C" },
  },
  {
    slug: "carrom",
    tags: ["multiplayer", "board"],
    theme: "Board Classic 🎯",
    title: "Carrom",
    badge: "🎯 Queen Cover",
    nostalgiaQuote: "Powder on board, thumb the striker!",
    playerRange: "2–4 Players",
    duration: "10–25 min",
    paperBg: "linear-gradient(155deg, #2D1408 0%, #190A04 45%, #0C0502 100%)",
    paperBorder: "rgba(194, 65, 12, 0.55)",
    btnGradient: { from: "#C2410C", to: "#7C2D12", shadow: "#431407" },
    blurb:
      "Powder on the board, thumb cocked, queen in the middle. Strike, rebound and cover her before your cousin does.",
    accent: { from: "#C2410C", to: "#9A3412" },
  },
  {
    slug: "spacewar",
    tags: ["solo"],
    theme: "Nokia 3310 Retro 🚀",
    title: "Space War",
    badge: "🚀 Retro Space",
    nostalgiaQuote: "Blast invaders, save galaxy!",
    playerRange: "1 Player",
    duration: "3–10 min",
    paperBg: "linear-gradient(155deg, #04292B 0%, #021718 45%, #010C0C 100%)",
    paperBorder: "rgba(45, 212, 191, 0.55)",
    btnGradient: { from: "#2DD4BF", to: "#0D9488", shadow: "#115E59" },
    blurb:
      "The legendary Nokia 3310 retro space shooter! Pilot your starship, fire laser beams and homing missiles, collect power-ups, and defeat level bosses.",
    accent: { from: "#2DD4BF", to: "#0D9488" },
  },
];

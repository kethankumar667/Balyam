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
  | "carrom"
  | "2048"
  | "sudoku"
  | "tictactoe"
  | "connect4";

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
    paperBg: "linear-gradient(155deg, #350808 0%, #1D0404 45%, #0D0202 100%)",
    paperBorder: "rgba(185, 28, 28, 0.55)",
    btnGradient: { from: "#B91C1C", to: "#7F1D1D", shadow: "#450A0A" },
    blurb:
      "Odd or Even? The back-bench class champion simulator. Zero infrastructure, infinite intensity.",
    accent: { from: "#B91C1C", to: "#7F1D1D" },
  },
  {
    slug: "rummy",
    tags: ["multiplayer", "board"],
    title: "Rummy",
    badge: "♠ Classic",
    nostalgiaQuote: "Cards on the classroom bench.",
    playerRange: "2–6 Players",
    duration: "10–20 min",
    paperBg: "linear-gradient(155deg, #064E3B 0%, #022C22 45%, #01140F 100%)",
    paperBorder: "rgba(16, 185, 129, 0.55)",
    btnGradient: { from: "#059669", to: "#047857", shadow: "#064E3B" },
    blurb:
      "The family festival classic. Perfected during Sankranti gatherings, reimagined for your native gang.",
    accent: { from: "#10B981", to: "#047857" },
  },
  {
    slug: "ludo",
    tags: ["multiplayer", "board"],
    title: "Ludo",
    badge: "👥 Most Played",
    nostalgiaQuote: "One more game?",
    playerRange: "2–8 Players",
    duration: "10–30 min",
    paperBg: "linear-gradient(155deg, #3D0814 0%, #22030A 45%, #0F0104 100%)",
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
    paperBg: "linear-gradient(155deg, #2D0845 0%, #170425 45%, #0C0213 100%)",
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
    paperBg: "linear-gradient(155deg, #063835 0%, #031F1D 45%, #010F0E 100%)",
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
    paperBg: "linear-gradient(155deg, #3D0A1C 0%, #23050F 45%, #110207 100%)",
    paperBorder: "rgba(251, 113, 133, 0.55)",
    btnGradient: { from: "#FB7185", to: "#E11D48", shadow: "#9F1239" },
    blurb:
      "Stone-Paper-Scissor! The ultimate playground arbiter for deciding who bats first.",
    accent: { from: "#FB7185", to: "#E11D48" },
  },
  {
    slug: "tictactoe",
    tags: ["multiplayer", "board", "classroom"],
    title: "Tic Tac Toe",
    badge: "⚡ Classic",
    nostalgiaQuote: "3-piece limit. Zero draws. Pure tactical fun.",
    playerRange: "2 Players",
    duration: "2–5 min",
    paperBg: "linear-gradient(155deg, #032C3A 0%, #011822 45%, #000B10 100%)",
    paperBorder: "rgba(6, 182, 212, 0.65)",
    btnGradient: { from: "#06B6D4", to: "#0891B2", shadow: "#164E63" },
    blurb:
      "A classic evolution of the classic grid. Tic Tac Toe introduces the 3-piece limit rule where 4th moves evaporate your oldest mark. Fast, tactical, and the board can never lock into a draw.",
    accent: { from: "#06B6D4", to: "#0891B2" },
    tileImage: "/TicTacToeTile.png",
  },
  {
    slug: "connect4",
    tags: ["multiplayer", "board", "classroom"],
    title: "Connect 4",
    badge: "Classic",
    nostalgiaQuote: "Drop, block, connect four.",
    playerRange: "2 Players",
    duration: "5–10 min",
    paperBg: "linear-gradient(155deg, #0E2055 0%, #081338 45%, #03081C 100%)",
    paperBorder: "rgba(59, 130, 246, 0.65)",
    btnGradient: { from: "#3B82F6", to: "#1D4ED8", shadow: "#1E3A8A" },
    blurb:
      "Take turns dropping discs into a seven-column grid. Line up four across, up and down, or diagonally before the board fills. Quick to learn, tricky to win.",
    accent: { from: "#3B82F6", to: "#1D4ED8" },
    tileImage: "/Connect4Tile.png",
  },
  {
    slug: "bingo",
    tags: ["multiplayer", "party"],
    title: "Bingo",
    badge: "🎟️ Lucky House",
    nostalgiaQuote: "Strike 5 lines to shout BINGO!",
    playerRange: "2–8 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #380824 0%, #200414 45%, #10010A 100%)",
    paperBorder: "rgba(225, 29, 142, 0.55)",
    btnGradient: { from: "#BE185D", to: "#831843", shadow: "#500724" },
    blurb:
      "Eyes down! Mark your ticket as the caller reads out the numbers — first full house wins.",
    accent: { from: "#DB2777", to: "#9D174D" },
  },
  {
    slug: "snl",
    tags: ["multiplayer", "board"],
    title: "Snakes & Ladders",
    badge: "🐍 Classic Race",
    nostalgiaQuote: "Climb high, avoid the 99 snake!",
    playerRange: "2–6 Players",
    duration: "10–20 min",
    paperBg: "linear-gradient(155deg, #0B3815 0%, #05200B 45%, #021005 100%)",
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
    playerRange: "2–6 Players",
    duration: "5–15 min",
    paperBg: "linear-gradient(155deg, #052B4D 0%, #02172C 45%, #010B16 100%)",
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
    paperBg: "linear-gradient(155deg, #3D0A45 0%, #220527 45%, #110213 100%)",
    paperBorder: "rgba(232, 121, 249, 0.55)",
    btnGradient: { from: "#E879F9", to: "#86198F", shadow: "#4A044E" },
    blurb:
      "Pick a secret, slide the chits clockwise, and slap the STAR the instant you hold all four. Pure 90's terrace nostalgia.",
    accent: { from: "#E879F9", to: "#86198F" },
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
    paperBg: "linear-gradient(155deg, #242E3D 0%, #131B26 45%, #080D14 100%)",
    paperBorder: "rgba(148, 163, 184, 0.55)",
    btnGradient: { from: "#475569", to: "#1E293B", shadow: "#0F172A" },
    blurb:
      "The ultimate 64-square battlefield. Real-time Bullet/Blitz/Rapid timers, 3D piece skins, move evaluation, and AI Bot tiers.",
    accent: { from: "#475569", to: "#1E293B" },
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
    paperBg: "linear-gradient(155deg, #062E4D 0%, #03192C 45%, #010C16 100%)",
    paperBorder: "rgba(125, 211, 252, 0.55)",
    btnGradient: { from: "#7DD3FC", to: "#0369A1", shadow: "#0C4A6E" },
    blurb: "Pick a letter, beat the clock. Whose Bombay was the most legit?",
    accent: { from: "#7DD3FC", to: "#0369A1" },
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
    paperBg: "linear-gradient(155deg, #3D0538 0%, #23021F 45%, #110110 100%)",
    paperBorder: "rgba(217, 70, 239, 0.55)",
    btnGradient: { from: "#D946EF", to: "#A21CAF", shadow: "#701A75" },
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
    paperBg: "linear-gradient(155deg, #203108 0%, #111B04 45%, #080D02 100%)",
    paperBorder: "rgba(132, 204, 22, 0.55)",
    btnGradient: { from: "#84CC16", to: "#4D7C0F", shadow: "#365314" },
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
    paperBg: "linear-gradient(155deg, #073523 0%, #031F14 45%, #010F09 100%)",
    paperBorder: "rgba(5, 150, 105, 0.55)",
    btnGradient: { from: "#0D9488", to: "#065F46", shadow: "#022C22" },
    blurb:
      "Authentic retro 90s monochrome 2D cricket. 1-bit LCD graphics, pitch bounce timing, and pure square-wave buzzer nostalgia.",
    accent: { from: "#34D399", to: "#064E3B" },
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
    paperBg: "linear-gradient(155deg, #3D0707 0%, #220303 45%, #110101 100%)",
    paperBorder: "rgba(244, 63, 94, 0.55)",
    btnGradient: { from: "#E11D48", to: "#9F1239", shadow: "#4C0519" },
    blurb:
      "Authentic 9999-in-1 Brick Game Formula 1 racing. 10x20 LCD block matrix, 3-lane car dodging, nitro speed boost, and retro buzzer nostalgia.",
    accent: { from: "#F43F5E", to: "#9F1239" },
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
    paperBg: "linear-gradient(155deg, #091D4A 0%, #040E29 45%, #020614 100%)",
    paperBorder: "rgba(79, 70, 229, 0.55)",
    btnGradient: { from: "#4F46E5", to: "#3730A3", shadow: "#1E1B4B" },
    blurb:
      "Authentic 9999-in-1 Brick Game falling blocks puzzle. 10x20 LCD matrix, Classic 7-tetrominoes & 12-pentomino Pentix modes, SRS wall kicks, ghost piece, and retro buzzer nostalgia.",
    accent: { from: "#6366F1", to: "#312E81" },
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
    paperBg: "linear-gradient(155deg, #04322C 0%, #021C18 45%, #010E0C 100%)",
    paperBorder: "rgba(94, 234, 212, 0.55)",
    btnGradient: { from: "#5EEAD4", to: "#0F766E", shadow: "#134E4A" },
    blurb:
      "Authentic 9999-in-1 Brick Game Block Breaker. 10x20 LCD matrix, 3-cell paddle deflection, normal & reinforced steel blocks, combo multiplier scoring, and retro chiptune audio.",
    accent: { from: "#5EEAD4", to: "#0F766E" },
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
    paperBg: "linear-gradient(155deg, #2A1B0D 0%, #170F07 45%, #0B0704 100%)",
    paperBorder: "rgba(139, 94, 52, 0.55)",
    btnGradient: { from: "#8B5E34", to: "#4A3218", shadow: "#2B1B0D" },
    blurb:
      "Powder on the board, thumb cocked, queen in the middle. Strike, rebound and cover her before your cousin does.",
    accent: { from: "#8B5E34", to: "#4A3218" },
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
    paperBg: "linear-gradient(155deg, #1F0744 0%, #100325 45%, #070112 100%)",
    paperBorder: "rgba(147, 51, 234, 0.55)",
    btnGradient: { from: "#9333EA", to: "#581C87", shadow: "#2E1065" },
    blurb:
      "The legendary Nokia 3310 retro space shooter! Pilot your starship, fire laser beams and homing missiles, collect power-ups, and defeat level bosses.",
    accent: { from: "#A855F7", to: "#4C1D95" },
  },
  {
    slug: "2048",
    tags: ["retro", "solo"],
    theme: "Tile Merge 🔢",
    title: "2048",
    badge: "🔢 Battle · Race · Zen",
    nostalgiaQuote: "One more merge and I'll stop.",
    playerRange: "1 Player",
    duration: "3–10 min",
    paperBg: "linear-gradient(155deg, #0D2255 0%, #071338 45%, #03081C 100%)",
    paperBorder: "rgba(147, 197, 253, 0.65)",
    btnGradient: { from: "#93C5FD", to: "#1E40AF", shadow: "#1E3A8A" },
    blurb:
      "The classic tile-merging puzzle, solo — four ways to play it. Battle drops garbage tiles onto your own board as merges pile up, Race times your sprint against your own best, Time Attack is a 2-minute score dash, and Zen strips away the clock for a calm slide with a few free undos.",
    accent: { from: "#93C5FD", to: "#1E40AF" },
    tileImage: "/2048 Game Tile.png",
  },
  {
    slug: "sudoku",
    tags: ["retro", "solo"],
    theme: "Cyber Matrix 🧩",
    title: "Sudoku",
    badge: "🧩 Cyber Matrix",
    nostalgiaQuote: "Pen, paper, and the Sunday morning coffee.",
    playerRange: "1 Player",
    duration: "3–15 min",
    paperBg: "linear-gradient(155deg, #15163B 0%, #0B0B23 45%, #050512 100%)",
    paperBorder: "rgba(129, 140, 248, 0.55)",
    btnGradient: { from: "#6366F1", to: "#4338CA", shadow: "#312E81" },
    blurb:
      "Futuristic Cyber-Matrix Sudoku powered by sudoku-gen. 4 cyber themes, Quantum Pencil candidate notes with auto-clearing, Neural Laser Hint scanner, and personal best tracking across 4 difficulty tiers.",
    accent: { from: "#818CF8", to: "#4F46E5" },
    tileImage: "/Sudoku Game Tile.png",
  },
];

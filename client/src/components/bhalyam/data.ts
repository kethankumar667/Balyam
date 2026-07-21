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
  // Coming soon — NOT in GameKind. Maintenance tiles only.
  | "namesplaceanimal"
  | "tambola"
  | "samethalu"
  | "telugucinemalu";

export interface BhalyamGameCard {
  slug: BhalyamGameSlug;
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

export const BHALYAM_GAMES: ReadonlyArray<BhalyamGameCard> = [
  // ── Top 6 (playable) — these show on the home page ─────────────────
  {
    slug: "handcricket",
    title: "Hand Cricket",
    blurb:
      "Odd or Even? The back-bench class champion simulator. Zero infrastructure, infinite intensity.",
    accent: { from: "#FF8F00", to: "#7B1E2B" },
  },
  {
    slug: "rummy",
    title: "Rummy",
    blurb:
      "The family festival classic. Perfected during Sankranti gatherings, reimagined for your native gang.",
    accent: { from: "#1976D2", to: "#0D47A1" },
  },
  {
    slug: "ludo",
    title: "Ludo",
    blurb:
      "The ultimate hot summer afternoon time-killer while waiting for the current (power) to come back.",
    accent: { from: "#E53935", to: "#7B1E2B" },
  },
  {
    slug: "uno",
    title: "UNO",
    blurb:
      "Color chaos with your gang. Match cards, drop action cards, and race to shout UNO first.",
    accent: { from: "#EC1C24", to: "#7B1E2B" },
  },
  {
    slug: "dotsboxes",
    title: "Dots & Boxes",
    blurb:
      "Connect the dots, close the box, claim the square. Maths-period nostalgia at its purest.",
    accent: { from: "#8E24AA", to: "#4A148C" },
  },

  {
    slug: "rps",
    title: "Rock Paper Scissors",
    blurb:
      "Stone-Paper-Scissor! The ultimate playground arbiter for deciding who bats first.",
    accent: { from: "#F4C430", to: "#B38918" },
  },
  // ── Below the fold — only on /games ───────────────────────────────
  {
    slug: "snl",
    title: "Snakes & Ladders",
    blurb:
      "Watch out for the big snake at 99 that ruined neighborhood friendships.",
    accent: { from: "#43A047", to: "#1B5E20" },
  },
  {
    slug: "wordbuilding",
    title: "Word Building",
    blurb:
      "The English workbook revisited. Take turns writing letters and watch dictionary words light up like a teacher's tick.",
    accent: { from: "#1E40AF", to: "#0F2A5A" },
  },
  {
    slug: "stargame",
    title: "Star Game",
    theme: "Folded Paper Slips Edition",
    blurb:
      "Pick a secret, slide the chits clockwise, and slap the STAR the instant you hold all four. Pure 90's terrace nostalgia.",
    accent: { from: "#E4B128", to: "#6D4323" },
    // Flagged under maintenance but kept open — players can still jump in.
    maintenance: true,
    accessible: true,
  },
  {
    slug: "namesplaceanimal",
    title: "Name Place Animal Thing",
    blurb: "Pick a letter, beat the clock. Whose Bombay was the most legit?",
    accent: { from: "#F57C00", to: "#BF360C" },
    maintenance: true,
  },
  {
    slug: "tambola",
    title: "Tambola",
    teluguTitle: "Housie",
    blurb:
      "Eyes down, ticket out. Full house calling at the next wedding sangeet.",
    accent: { from: "#C2185B", to: "#7B1B45" },
    maintenance: true,
  },
  {
    slug: "samethalu",
    title: "Samethalu Quiz",
    blurb:
      "Telugu proverbs from Ammamma's verandah. Complete the saying, learn the lesson, win the round.",
    accent: { from: "#A57B23", to: "#5E3D0E" },
    maintenance: true,
  },
  {
    slug: "telugucinemalu",
    title: "Telugu Cinema Quiz",
    blurb:
      "Guess the film. Hint by hint, dialogue by dialogue. Friday-release adda energy.",
    accent: { from: "#D84315", to: "#7B1A0A" },
    maintenance: true,
  },
];

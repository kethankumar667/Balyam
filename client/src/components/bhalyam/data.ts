/**
 * BHALYAM game catalog.
 *
 * Slimmed during the cleanup pass. Previously held mock data for friends
 * online, recent matches, daily rewards, badges, a player profile, landing
 * CTAs, adda steps, ticker lines — none of which were wired to real
 * state. They were removed with the UI sections that consumed them.
 *
 * What stays: the canonical list of supported games and their visual
 * accents, used by the Home grid and the GameRoomSheet header.
 */

export type BhalyamGameSlug =
  | "handcricket"
  | "snl"
  | "ludo"
  | "rummy"
  | "rps"
  | "uno";

export interface BhalyamGameCard {
  slug: BhalyamGameSlug;
  title: string;
  teluguTitle?: string;
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
}

export const BHALYAM_GAMES: ReadonlyArray<BhalyamGameCard> = [
  {
    slug: "handcricket",
    title: "Hand Cricket",
    blurb:
      "Odd or Even? The back-bench class champion simulator. Zero infrastructure, infinite intensity.",
    accent: { from: "#FF8F00", to: "#7B1E2B" },
  },
  {
    slug: "snl",
    title: "Snakes & Ladders",
    // teluguTitle: "Paramapada Sopanam",
    blurb:
      "Watch out for the big snake at 99 that ruined neighborhood friendships.",
    accent: { from: "#43A047", to: "#1B5E20" },
  },
  {
    slug: "ludo",
    title: "Ludo",
    blurb:
      "The ultimate hot summer afternoon time-killer while waiting for the current (power) to come back.",
    accent: { from: "#E53935", to: "#7B1E2B" },
  },
  {
    slug: "rummy",
    title: "Rummy",
    blurb:
      "The family festival classic. Perfected during Sankranti gatherings, reimagined for your native gang.",
    accent: { from: "#1976D2", to: "#0D47A1" },
  },
  {
    slug: "rps",
    title: "R.P.S",
    blurb:
      "Stone-Paper-Scissor! The ultimate playground arbiter for deciding who bats first.",
    accent: { from: "#F4C430", to: "#B38918" },
  },
  {
    slug: "uno",
    title: "UNO",
    blurb:
      "Color chaos with your gang. Match cards, drop action cards, and race to shout UNO first.",
    accent: { from: "#EC1C24", to: "#7B1E2B" },
    maintenance: true,
  },
];

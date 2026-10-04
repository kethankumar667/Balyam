import type { GameKind, PublicPresentationLoadout } from "../types.js";

/**
 * What one player is willing to show everyone else, in a single value.
 *
 * ── Why this is its own type ───────────────────────────────────────────
 * The profile screen reads four private-and-public records for the person it
 * is about. A card shown to a stranger must never be assembled from those
 * records on the client: the client does not know which fields are safe, and
 * "hide it in the UI" is not a privacy boundary. The server builds this value
 * from the fields the leaderboard already treats as public, and nothing else.
 *
 * Deliberately absent: match history, achievements, wallet balance, winnings,
 * risk state, and the stable account id. If one of those is ever wanted on the
 * card it is a privacy-notice decision, not an additional optional field.
 *
 * ── Honest emptiness ───────────────────────────────────────────────────
 * Bots, guests and pass-and-play seats have no career, so `career` is null for
 * them rather than a block of zeros. A zero would read as "has played and lost
 * everything", which is a different statement from "has no record".
 */
export type PublicPlayerCardKind = "member" | "guest" | "bot";

/**
 * Career numbers for ONE scope. At a table the scope is the game being played,
 * so a Ludo opponent shows Ludo results and nothing about what they play
 * elsewhere. The streak and favourite-game fields exist only on the all-games
 * scope: the stored streaks are not tracked per game, so showing them next to a
 * game-scoped record would quietly leak cross-game history.
 */
export interface PublicPlayerCardCareer {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePercent: number;
  /** All-games scope only. */
  currentWinStreak?: number;
  /** All-games scope only. */
  bestWinStreak?: number;
  /** All-games scope only. */
  favoriteGame?: GameKind | null;
}

export interface PublicPlayerCardProgression {
  level: number;
  levelTitle: string;
  tierName: string;
  tierColor: string;
  currentXP: number;
  /** XP needed inside this level to reach the next one. */
  xpForNextLevel: number;
  levelProgressPercent: number;
}

export interface PublicPlayerCard {
  displayName: string;
  avatar?: string;
  kind: PublicPlayerCardKind;
  /** Member since, epoch ms. Absent when there is no profile row to read it from. */
  memberSince?: number;
  progression: PublicPlayerCardProgression;
  cosmetics: PublicPresentationLoadout;
  /** The game `career` is limited to, or null when it spans every game. Lets an empty card say "no Ludo matches yet" rather than a vague "no matches". */
  statsScope: GameKind | null;
  career: PublicPlayerCardCareer | null;
}

export type PlayerCardResult =
  | { ok: true; card: PublicPlayerCard }
  | { ok: false; error: string };

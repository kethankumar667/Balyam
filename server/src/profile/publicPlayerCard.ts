import { profileService } from "./ProfileService.js";
import { sanitizeAvatar } from "@shared/avatars.js";
import type { GameKind, PublicPresentationLoadout } from "@shared/types.js";
import type {
  PublicPlayerCard,
  PublicPlayerCardCareer,
  PublicPlayerCardKind,
} from "@shared/profile/PublicPlayerCard.js";

/**
 * The one place a stranger-facing player card is assembled.
 *
 * Both entry points (the in-room `player:card` socket event, which starts from
 * a seat, and `GET /api/profile/:playerId/card`, which starts from an account)
 * end here, so the answer to "what may a stranger see" lives in exactly one
 * function. Adding a field to the card means editing this file and nowhere
 * else on the server.
 *
 * What the seat contributes is only what it already broadcasts to the table
 * (name, avatar, cosmetics, kind). Everything about the account behind it is
 * read from `profileService` here, by the server's own resolved identity, and
 * that identity never leaves this function.
 */
export interface CardSubject {
  /** Resolved server-side account id. Null for guests, bots and local seats. */
  identityId: string | null;
  kind: PublicPlayerCardKind;
  /** What the seat already shows the table. Used when there is no profile row. */
  seatName: string;
  seatAvatar?: string;
  seatLevel?: number;
  seatCosmetics?: PublicPresentationLoadout;
  /**
   * Limit the career block to this game. Set by anything that starts from a
   * table (the room is playing exactly one game); left unset by surfaces with
   * no game in context, such as the Mandali, which show the all-games record.
   */
  gameScope?: GameKind;
}

export function buildPublicPlayerCard(subject: CardSubject): PublicPlayerCard {
  const profile = subject.identityId ? profileService.getProfile(subject.identityId) : undefined;
  const progression = subject.identityId
    ? profileService.getProgression(subject.identityId)
    : null;

  // A guest or bot has no XP row, but its seat still broadcasts a level, and the
  // card must agree with the badge the viewer just clicked on.
  const level = progression && profile ? progression.currentLevel : subject.seatLevel ?? 1;

  return {
    // The name this person chose at the table wins over the stored profile
    // name: a new profile defaults to "Player", and the card must say what the
    // viewer just tapped. The profile name is only the fallback.
    displayName: subject.seatName.trim() || profile?.displayName?.trim() || "Player",
    avatar: sanitizeAvatar(subject.seatAvatar) ?? sanitizeAvatar(profile?.avatar),
    kind: subject.kind,
    memberSince: profile?.joinedAt,
    progression: {
      level,
      levelTitle: progression && profile ? progression.levelTitle : "",
      tierName: progression && profile ? progression.tier.name : "",
      tierColor: progression && profile ? progression.tier.themeColor : "",
      currentXP: progression && profile ? progression.currentXP : 0,
      xpForNextLevel: progression && profile ? progression.nextLevelXP : 0,
      levelProgressPercent: progression && profile ? progression.levelProgressPercent : 0,
    },
    cosmetics: subject.seatCosmetics ?? {},
    statsScope: subject.gameScope ?? null,
    career: subject.identityId && profile ? careerFor(subject.identityId, subject.gameScope) : null,
  };
}

function careerFor(identityId: string, gameScope: GameKind | undefined): PublicPlayerCardCareer | null {
  const stats = profileService.getStats(identityId);
  if (gameScope) {
    const gameStats = stats.perGame[gameScope];
    // Only this game's own counters are read; nothing from the aggregate or any
    // other game can reach the card on this path.
    if (!gameStats || gameStats.matchesPlayed === 0) return null;
    return {
      totalMatches: gameStats.matchesPlayed,
      wins: gameStats.wins,
      losses: gameStats.losses,
      draws: gameStats.draws,
      winRatePercent: Math.round(gameStats.winRate),
    };
  }
  // No finished matches means no record, which is not the same as a record of
  // zero wins. Returning null lets the card say "no matches yet" truthfully.
  if (stats.totalMatches === 0) return null;
  const favoriteGame: GameKind | null = stats.favoriteGame === "none" ? null : stats.favoriteGame;
  return {
    totalMatches: stats.totalMatches,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    winRatePercent: Math.round(stats.winRate),
    currentWinStreak: stats.currentWinStreak,
    bestWinStreak: stats.bestWinStreak,
    favoriteGame,
  };
}

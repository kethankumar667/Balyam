import { logger } from "../lib/logger.js";
import { progressionRepository } from "./index.js";
import { profileService } from "../profile/ProfileService.js";
import { matchHistoryService } from "../profile/MatchHistoryService.js";
import { challengeEngine } from "../ranking/ChallengeEngine.js";
import { seasonService } from "../seasons/SeasonService.js";
import { friendsService } from "../social/FriendsService.js";
import { recentPlayersService } from "../ranking/RecentPlayersService.js";
import { friendRequestsService } from "../social/FriendRequestsService.js";
import { partyService } from "../party/PartyService.js";
import { SeasonEngine } from "../seasons/SeasonEngine.js";
import type { GameKind } from "@shared/types.js";
import type { MatchHistoryItem, MatchResult } from "@shared/profile/MatchHistory.js";

/**
 * Putting the world back the way it was, once, before the doors open.
 *
 * ── Why boot and not lazily ───────────────────────────────────────────
 * Because the reads that would trigger a lazy load are synchronous, and making
 * them async is the ripple this whole design exists to avoid. Loading up front
 * costs a few hundred milliseconds of start-up on a small deployment and makes
 * every read afterwards exactly as fast as it was before persistence existed.
 *
 * It also fails in the right place: a store that cannot be read makes the
 * server refuse to start, rather than making the first player's profile
 * mysteriously empty.
 *
 * ── The bound on how much it loads ────────────────────────────────────
 * `HYDRATE_PROFILE_LIMIT`. Loading every profile that has ever existed is
 * fine at this size and is not fine at a hundred thousand players, and a limit
 * that is written down can be raised deliberately; one that is absent gets
 * discovered as a start-up timeout. Players outside the window are not lost —
 * their rows are still in Postgres — they simply are not preloaded, and their
 * first write re-establishes them.
 */

const HYDRATE_PROFILE_LIMIT = Number(process.env.HYDRATE_PROFILE_LIMIT) || 5000;
const HYDRATE_MATCHES_PER_PLAYER = Number(process.env.HYDRATE_MATCHES_PER_PLAYER) || 25;

export interface HydrationReport {
  profiles: number;
  achievements: number;
  challengeClaims: number;
  matches: number;
  seasonStats: number;
  seasonClaims: number;
  friends: number;
  friendRequests: number;
  parties: number;
  invitations: number;
  durationMs: number;
}

function resultFor(isWinner: boolean, hasWinner: boolean): MatchResult {
  if (!hasWinner) return "DRAW";
  return isWinner ? "WIN" : "LOSS";
}

export async function hydrateProgression(): Promise<HydrationReport> {
  const started = Date.now();
  const repo = progressionRepository();

  const report: HydrationReport = {
    profiles: 0,
    achievements: 0,
    challengeClaims: 0,
    matches: 0,
    seasonStats: 0,
    seasonClaims: 0,
    friends: 0,
    friendRequests: 0,
    parties: 0,
    invitations: 0,
    durationMs: 0,
  };

  const profiles = await repo.listProfiles(HYDRATE_PROFILE_LIMIT);
  report.profiles = profiles.length;

  // Per-player reads, in a bounded loop rather than one query, because the
  // repository interface is deliberately per-player: a bulk read would be a
  // Postgres-shaped method that the in-memory implementation could only fake,
  // and the contract test would stop comparing like with like.
  const achievements: Array<{ playerId: string; achievementId: string; unlockedAt: number }> = [];
  const challengeClaims: Array<{ playerId: string; challengeId: string }> = [];
  const matchEntries: Array<{ playerId: string; match: MatchHistoryItem }> = [];
  const friendEdges: Array<{
    playerId: string;
    friendPlayerId: string;
    displayName: string;
    avatar?: string;
    createdAt: number;
  }> = [];
  const requests: Array<Parameters<typeof friendRequestsService.hydrate>[0][number]> = [];
  const seenRequestIds = new Set<string>();

  const season = SeasonEngine.getCurrentSeason();
  const seasonStats = await repo.listSeasonStats(season.id, HYDRATE_PROFILE_LIMIT);
  report.seasonStats = seasonStats.length;
  const seasonClaims: Array<{ seasonId: string; playerId: string; tierId: string }> = [];

  for (const profile of profiles) {
    const [unlocks, claims, page, friends, reqs, sClaims] = await Promise.all([
      repo.listAchievements(profile.playerId),
      repo.listChallengeClaims(profile.playerId),
      repo.listMatchesForPlayer(profile.playerId, { limit: HYDRATE_MATCHES_PER_PLAYER }),
      repo.listFriends(profile.playerId),
      repo.listFriendRequests(profile.playerId),
      repo.listSeasonClaims(season.id, profile.playerId),
    ]);

    achievements.push(...unlocks);
    challengeClaims.push(...claims.map((c) => ({ playerId: c.playerId, challengeId: c.challengeId })));
    seasonClaims.push(...sClaims.map((c) => ({ seasonId: c.seasonId, playerId: c.playerId, tierId: c.tierId })));

    for (const m of page.matches) {
      matchEntries.push({
        playerId: profile.playerId,
        match: {
          matchId: m.id,
          roomCode: m.roomCode,
          game: m.game as GameKind,
          startedAt: m.startedAt,
          finishedAt: m.finishedAt,
          durationMs: m.durationMs,
          result: resultFor(m.self.isWinner, Boolean(m.winnerId)),
          participants: m.participants.map((p) => ({
            playerId: p.playerId,
            name: p.displayName ?? "Player",
            avatar: p.avatar ?? undefined,
            isWinner: p.isWinner,
            isBot: p.isBot,
          })),
          // Replays are not persisted: the raw timeline is bounded and
          // expiring by design (see the migration, §12).
          replayAvailable: false,
        },
      });
    }

    friendEdges.push(
      ...friends.map((f) => ({
        playerId: f.playerId,
        friendPlayerId: f.friendPlayerId,
        displayName: f.displayName ?? "Player",
        avatar: f.avatar ?? undefined,
        createdAt: f.createdAt,
      })),
    );

    for (const r of reqs) {
      // Both sides of a request come back from both players' reads.
      if (seenRequestIds.has(r.id)) continue;
      seenRequestIds.add(r.id);
      requests.push({
        id: r.id,
        senderId: r.senderId,
        senderName: r.senderName ?? "Player",
        senderAvatar: r.senderAvatar ?? undefined,
        recipientId: r.recipientId,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      });
    }
  }

  const parties = await repo.listParties();
  const invitations: Array<Parameters<typeof partyService.hydrate>[1][number]> = [];
  for (const party of parties) {
    for (const member of party.members) {
      const found = await repo.listInvitations(member.playerId);
      for (const inv of found) {
        if (!invitations.some((i) => i.id === inv.id)) {
          invitations.push({
            id: inv.id,
            partyId: inv.partyId,
            inviterId: inv.inviterId,
            inviterName: inv.inviterName ?? "Player",
            inviteeId: inv.inviteeId,
            status: inv.status,
            createdAt: inv.createdAt,
          });
        }
      }
    }
  }

  profileService.hydrate(profiles, achievements);
  matchHistoryService.hydrate(matchEntries);
  challengeEngine.hydrate(challengeClaims);
  seasonService.hydrate(seasonStats, seasonClaims);
  friendsService.hydrate(friendEdges);
  // Both friend stores are refilled from the same rows. They are two views of
  // one relationship, and letting only one of them survive a restart is how
  // the leaderboard screen and the social screen came to disagree.
  recentPlayersService.hydrate(
    friendEdges.map((f) => ({ playerId: f.playerId, friendPlayerId: f.friendPlayerId })),
  );
  friendRequestsService.hydrate(requests);
  partyService.hydrate(
    parties.map((p) => ({
      id: p.id,
      leaderId: p.leaderId,
      members: p.members.map((m) => ({
        playerId: m.playerId,
        displayName: m.displayName ?? "Player",
        avatar: m.avatar ?? undefined,
        isLeader: m.isLeader,
        isReady: m.isReady,
        joinedAt: m.joinedAt,
      })),
      maxMembers: p.maxMembers,
      status: p.status,
      targetGame: (p.targetGame ?? undefined) as GameKind | undefined,
      targetRoomCode: p.targetRoomCode ?? undefined,
      targetTournamentId: p.targetTournamentId ?? undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    invitations,
  );

  report.achievements = achievements.length;
  report.challengeClaims = challengeClaims.length;
  report.matches = matchEntries.length;
  report.seasonClaims = seasonClaims.length;
  report.friends = friendEdges.length;
  report.friendRequests = requests.length;
  report.parties = parties.length;
  report.invitations = invitations.length;
  report.durationMs = Date.now() - started;

  logger.info({
    message:
      `Progression restored in ${report.durationMs}ms: ${report.profiles} profiles, ` +
      `${report.matches} matches, ${report.challengeClaims} challenge claims, ` +
      `${report.seasonClaims} season claims, ${report.friends} friendships, ` +
      `${report.parties} parties`,
    module: "PERSISTENCE",
  });

  return report;
}

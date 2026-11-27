import { logger } from "../lib/logger.js";
import { progressionRepository } from "./index.js";
import { profileService } from "../profile/ProfileService.js";
import { matchHistoryService } from "../profile/MatchHistoryService.js";
import { challengeEngine } from "../ranking/ChallengeEngine.js";
import { seasonService } from "../seasons/SeasonService.js";
import { recentPlayersService } from "../ranking/RecentPlayersService.js";
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

const HYDRATE_PROFILE_LIMIT = 500;
const HYDRATE_MATCHES_PER_PLAYER = 25;
/** Newest ledger rows read per player: enough for today's practice XP and a human-match count. */
const HYDRATE_XP_LEDGER_LIMIT = 200;

export interface HydrationReport {
  profiles: number;
  achievements: number;
  challengeClaims: number;
  matches: number;
  seasonStats: number;
  seasonClaims: number;
  friends: number;
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
    durationMs: 0,
  };

  const profiles: Awaited<ReturnType<typeof repo.listProfiles>> = [];
  const seenProfiles = new Set<string>();
  for (;;) {
    const page = await repo.listProfiles(HYDRATE_PROFILE_LIMIT, profiles.length);
    if (page.length === 0) break;
    for (const profile of page) {
      if (seenProfiles.has(profile.playerId)) throw new Error("Profile hydration did not advance");
      seenProfiles.add(profile.playerId);
      profiles.push(profile);
    }
  }
  report.profiles = profiles.length;

  // Per-player reads, in a bounded loop rather than one query, because the
  // repository interface is deliberately per-player: a bulk read would be a
  // Postgres-shaped method that the in-memory implementation could only fake,
  // and the contract test would stop comparing like with like.
  const achievements: Array<{ playerId: string; achievementId: string; unlockedAt: number }> = [];
  const challengeClaims: Array<{ playerId: string; challengeId: string }> = [];
  const matchEntries: Array<{ playerId: string; match: MatchHistoryItem }> = [];
  const friendEdges: Array<{ playerId: string; friendPlayerId: string }> = [];

  const season = SeasonEngine.getCurrentSeason();
  const seasonStats = await repo.listSeasonStats(season.id, HYDRATE_PROFILE_LIMIT);
  report.seasonStats = seasonStats.length;
  const seasonClaims: Array<{ seasonId: string; playerId: string; tierId: string }> = [];

  for (const profile of profiles) {
    const [unlocks, claims, page, friends, sClaims, xpLedger] = await Promise.all([
      repo.listAchievements(profile.playerId),
      repo.listChallengeClaims(profile.playerId),
      repo.listMatchesForPlayer(profile.playerId, { limit: HYDRATE_MATCHES_PER_PLAYER }),
      repo.listFriends(profile.playerId),
      repo.listSeasonClaims(season.id, profile.playerId),
      repo.listXp(profile.playerId, HYDRATE_XP_LEDGER_LIMIT),
    ]);

    // Rebuild what a restart would forget: today's practice-XP allowance and the
    // count of matches played with real people (both live only in the ledger).
    profileService.restoreFromLedger(profile.playerId, xpLedger);

    achievements.push(...unlocks);
    challengeClaims.push(...claims.map((c) => ({ playerId: c.playerId, challengeId: c.challengeId })));
    seasonClaims.push(...sClaims.map((c) => ({ seasonId: c.seasonId, playerId: c.playerId, tierId: c.tierId })));

    const matches = [...page.matches];
    const seenMatches = new Set(matches.map((m) => m.id));
    while (matches.length < page.total) {
      const next = await repo.listMatchesForPlayer(profile.playerId, {
        limit: HYDRATE_MATCHES_PER_PLAYER,
        offset: matches.length,
      });
      if (next.matches.length === 0 || next.total !== page.total) {
        throw new Error("Match hydration is incomplete");
      }
      for (const match of next.matches) {
        if (seenMatches.has(match.id)) throw new Error("Match hydration did not advance");
        seenMatches.add(match.id);
        matches.push(match);
      }
    }

    for (const m of matches) {
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
      ...friends.map((f) => ({ playerId: f.playerId, friendPlayerId: f.friendPlayerId })),
    );
  }

  profileService.hydrate(profiles, achievements, matchEntries);
  matchHistoryService.hydrate(matchEntries);
  challengeEngine.hydrate(challengeClaims);
  seasonService.hydrate(seasonStats, seasonClaims);
  // The leaderboard's friend list is refilled from the saved friendship rows. The Social
  // Hub's own friend, request and party stores were removed on 2026-11-27; their rows are
  // still in the database but nothing reads them back into memory.
  recentPlayersService.hydrate(friendEdges);

  report.achievements = achievements.length;
  report.challengeClaims = challengeClaims.length;
  report.matches = matchEntries.length;
  report.seasonClaims = seasonClaims.length;
  report.friends = friendEdges.length;
  report.durationMs = Date.now() - started;

  logger.info({
    message:
      `Progression restored in ${report.durationMs}ms: ${report.profiles} profiles, ` +
      `${report.matches} matches, ${report.challengeClaims} challenge claims, ` +
      `${report.seasonClaims} season claims, ${report.friends} friendships`,
    module: "PERSISTENCE",
  });

  return report;
}

import type { GameKind } from "@shared/types.js";
import type { RecentPlayer, FriendSummary } from "@shared/ranking/RecentPlayer.js";
import { profileService } from "../profile/ProfileService.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

interface ParticipantInfo {
  playerId: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
}

export class RecentPlayersService {
  // playerId -> Map<otherPlayerId, RecentPlayer>
  private recentHistory = new Map<string, Map<string, RecentPlayer>>();
  // playerId -> Set<friendId>
  private friends = new Map<string, Set<string>>();

  /**
   * Records match participants so players can see who they recently played with.
   */
  public recordMatch(params: {
    roomCode: string;
    game: GameKind;
    participants: ParticipantInfo[];
    timestamp?: number;
  }): void {
    const ts = params.timestamp || Date.now();
    const humans = params.participants.filter((p) => !p.isBot);

    for (const p1 of humans) {
      let p1Map = this.recentHistory.get(p1.playerId);
      if (!p1Map) {
        p1Map = new Map();
        this.recentHistory.set(p1.playerId, p1Map);
      }

      for (const p2 of humans) {
        if (p1.playerId === p2.playerId) continue;

        const existing = p1Map.get(p2.playerId);
        p1Map.set(p2.playerId, {
          playerId: p2.playerId,
          displayName: p2.name,
          avatar: p2.avatar,
          timesPlayedTogether: (existing?.timesPlayedTogether || 0) + 1,
          lastPlayedAt: ts,
          lastGame: params.game,
          lastRoomCode: params.roomCode,
        });
      }
    }
  }

  /**
   * Retrieves recent opponents / room participants for a player, sorted by recency.
   */
  public getRecentPlayers(playerId: string, limit = 20): RecentPlayer[] {
    const pMap = this.recentHistory.get(playerId);
    if (!pMap) return [];

    const list = Array.from(pMap.values());
    list.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    return list.slice(0, limit);
  }

  /**
   * Adds a player as a friend.
   */
  public addFriend(playerId: string, friendId: string): boolean {
    if (playerId === friendId) return false;
    let set = this.friends.get(playerId);
    if (!set) {
      set = new Set();
      this.friends.set(playerId, set);
    }
    set.add(friendId);
    /*
     * This store was invisible to persistence until durability was actually
     * measured. BHALYAM has TWO friend lists — `FriendsService` behind
     * /api/social, and this one behind /api/ranking — and only the first was
     * wired, so every friendship added from the leaderboard screen was lost on
     * restart while the social one survived. The duplication itself is a
     * genuine design problem and is recorded as debt; the missing write is
     * fixed here.
     */
    progressionSync.friendAdded({ playerId, friendPlayerId: friendId });
    return true;
  }

  /**
   * Removes a friend.
   */
  public removeFriend(playerId: string, friendId: string): boolean {
    const set = this.friends.get(playerId);
    if (!set) return false;
    const removed = set.delete(friendId);
    if (removed) progressionSync.friendRemoved(playerId, friendId);
    return removed;
  }

  /**
   * Gets friends list with live status and profiles.
   */
  public getFriends(playerId: string): FriendSummary[] {
    const set = this.friends.get(playerId);
    if (!set) return [];

    const result: FriendSummary[] = [];
    for (const fid of set) {
      const prof = profileService.getOrCreateProfile(fid);
      result.push({
        playerId: fid,
        displayName: prof.displayName,
        avatar: prof.avatar,
        status: "online",
        addedAt: prof.joinedAt,
      });
    }
    return result;
  }

  /** Restore the ranking-side friend edges at boot. */
  public hydrate(edges: Array<{ playerId: string; friendPlayerId: string }>): void {
    for (const edge of edges) {
      let set = this.friends.get(edge.playerId);
      if (!set) {
        set = new Set();
        this.friends.set(edge.playerId, set);
      }
      set.add(edge.friendPlayerId);
    }
  }

  public reset(): void {
    this.recentHistory.clear();
    this.friends.clear();
  }
}

export const recentPlayersService = new RecentPlayersService();

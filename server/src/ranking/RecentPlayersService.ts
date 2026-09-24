import type { GameKind } from "@shared/types.js";
import type { RecentPlayer, FriendSummary } from "@shared/ranking/RecentPlayer.js";
import { profileService } from "../profile/ProfileService.js";
import { friendsService } from "../social/FriendsService.js";

interface ParticipantInfo {
  playerId: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
}

export class RecentPlayersService {
  // playerId -> Map<otherPlayerId, RecentPlayer>
  private recentHistory = new Map<string, Map<string, RecentPlayer>>();

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
   * Removes a friend (delegated to FriendsService).
   *
   * There is deliberately no `addFriend` here: a friendship needs the other
   * player's consent, so it only ever comes from `FriendRequestsService`.
   */
  public removeFriend(playerId: string, friendId: string): boolean {
    return friendsService.removeFriend(playerId, friendId);
  }

  /**
   * Checks friendship (delegated to FriendsService).
   */
  public isFriend(playerId: string, friendId: string): boolean {
    return friendsService.isFriend(playerId, friendId);
  }

  /**
   * Gets friends list with live status and profiles (delegated to FriendsService).
   */
  public getFriends(playerId: string): FriendSummary[] {
    const friends = friendsService.getFriends(playerId);
    return friends.map((f) => {
      const prof = profileService.getProfile(f.friendPlayerId);
      return {
        playerId: f.friendPlayerId,
        displayName: f.displayName || prof?.displayName || "Player",
        avatar: f.avatar || prof?.avatar,
        status: "online",
        addedAt: f.createdAt || prof?.joinedAt || Date.now(),
      };
    });
  }

  /** Retained for interface backward compatibility; FriendsService is the single graph. */
  public hydrate(_edges: Array<{ playerId: string; friendPlayerId: string }>): void {
    // Single friendship graph lives in friendsService, hydrated directly in hydrateProgression.
  }

  public reset(): void {
    this.recentHistory.clear();
  }
}

export const recentPlayersService = new RecentPlayersService();

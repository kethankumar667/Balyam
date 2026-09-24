import type { Friend, SharedHistory } from "@shared/social/Friend.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

export class FriendsService {
  private static instance: FriendsService;
  // Key: playerId -> Map<friendPlayerId, Friend>
  private friendsMap = new Map<string, Map<string, Friend>>();
  // Key: `${p1}:${p2}` (sorted) -> SharedHistory
  private sharedHistoryMap = new Map<string, SharedHistory>();

  private constructor() {}

  public static getInstance(): FriendsService {
    if (!FriendsService.instance) {
      FriendsService.instance = new FriendsService();
    }
    return FriendsService.instance;
  }

  public addFriend(
    playerId: string,
    friendPlayerId: string,
    displayName: string,
    avatar?: string
  ): Friend {
    if (playerId === friendPlayerId) {
      throw new Error("Cannot add yourself as a friend");
    }

    if (!this.friendsMap.has(playerId)) {
      this.friendsMap.set(playerId, new Map());
    }

    const friend: Friend = {
      playerId,
      friendPlayerId,
      displayName,
      avatar,
      createdAt: Date.now(),
    };

    this.friendsMap.get(playerId)!.set(friendPlayerId, friend);
    progressionSync.friendAdded({ playerId, friendPlayerId, displayName, avatar });
    return friend;
  }

  public removeFriend(playerId: string, friendPlayerId: string): boolean {
    const playerFriends = this.friendsMap.get(playerId);
    if (!playerFriends) return false;
    const removed = playerFriends.delete(friendPlayerId);

    // Also remove reciprocal friendship if exists
    const friendFriends = this.friendsMap.get(friendPlayerId);
    if (friendFriends) {
      friendFriends.delete(playerId);
    }

    return removed;
  }

  public getFriends(playerId: string): Friend[] {
    const friends = this.friendsMap.get(playerId);
    if (!friends) return [];
    return Array.from(friends.values());
  }

  public isFriend(playerId: string, targetId: string): boolean {
    return this.friendsMap.get(playerId)?.has(targetId) || false;
  }

  public recordMatchTogether(
    p1: string,
    p2: string,
    wonTogether: boolean,
    isTournament = false
  ): void {
    const key = [p1, p2].sort().join(":");
    const existing = this.sharedHistoryMap.get(key) || {
      playerId: p1,
      friendPlayerId: p2,
      matchesPlayedTogether: 0,
      winsTogether: 0,
      tournamentsTogether: 0,
      lastPlayedAt: Date.now(),
    };

    existing.matchesPlayedTogether += 1;
    if (wonTogether) existing.winsTogether += 1;
    if (isTournament) existing.tournamentsTogether += 1;
    existing.lastPlayedAt = Date.now();

    this.sharedHistoryMap.set(key, existing);
  }

  public getSharedHistory(p1: string, p2: string): SharedHistory {
    const key = [p1, p2].sort().join(":");
    return (
      this.sharedHistoryMap.get(key) || {
        playerId: p1,
        friendPlayerId: p2,
        matchesPlayedTogether: 0,
        winsTogether: 0,
        tournamentsTogether: 0,
        lastPlayedAt: 0,
      }
    );
  }

  /** Refill the friendship graph from the durable store at boot. */
  public hydrate(edges: Friend[]): void {
    for (const edge of edges) {
      if (!this.friendsMap.has(edge.playerId)) this.friendsMap.set(edge.playerId, new Map());
      this.friendsMap.get(edge.playerId)!.set(edge.friendPlayerId, edge);
    }
  }

  public clear(): void {
    this.friendsMap.clear();
    this.sharedHistoryMap.clear();
  }
}

export const friendsService = FriendsService.getInstance();

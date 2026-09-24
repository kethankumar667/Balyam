import type { Friend } from "@shared/social/Friend.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

export class FriendsService {
  private static instance: FriendsService;
  // Key: playerId -> Map<friendPlayerId, Friend>
  private friendsMap = new Map<string, Map<string, Friend>>();

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

    if (removed) {
      progressionSync.friendRemoved(playerId, friendPlayerId);
      progressionSync.friendRemoved(friendPlayerId, playerId);
    }

    return removed;
  }

  public getFriends(playerId: string): Friend[] {
    const friends = this.friendsMap.get(playerId);
    if (!friends) return [];
    return Array.from(friends.values()).filter((f) =>
      this.friendsMap.get(f.friendPlayerId)?.has(playerId)
    );
  }

  public isFriend(playerId: string, targetId: string): boolean {
    const forward = this.friendsMap.get(playerId)?.has(targetId) ?? false;
    const reverse = this.friendsMap.get(targetId)?.has(playerId) ?? false;
    return forward && reverse;
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
  }
}

export const friendsService = FriendsService.getInstance();

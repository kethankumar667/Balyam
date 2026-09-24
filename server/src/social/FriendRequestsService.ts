import type { FriendRequest } from "@shared/social/FriendRequest.js";
import { friendsService } from "./FriendsService.js";
import { progressionSync } from "../persistence/ProgressionSync.js";

export class FriendRequestsService {
  private static instance: FriendRequestsService;
  private requests = new Map<string, FriendRequest>();

  private constructor() {}

  public static getInstance(): FriendRequestsService {
    if (!FriendRequestsService.instance) {
      FriendRequestsService.instance = new FriendRequestsService();
    }
    return FriendRequestsService.instance;
  }

  public sendRequest(
    senderId: string,
    senderName: string,
    recipientId: string,
    senderAvatar?: string
  ): FriendRequest {
    if (senderId === recipientId) {
      throw new Error("Cannot send friend request to yourself");
    }

    if (friendsService.isFriend(senderId, recipientId)) {
      throw new Error("Already friends with this player");
    }

    // Check existing pending request
    for (const req of this.requests.values()) {
      if (
        req.senderId === senderId &&
        req.recipientId === recipientId &&
        req.status === "PENDING"
      ) {
        return req;
      }
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const request: FriendRequest = {
      id,
      senderId,
      senderName,
      senderAvatar,
      recipientId,
      status: "PENDING",
      createdAt: Date.now(),
    };

    this.requests.set(id, request);
    progressionSync.friendRequestSaved(request);
    return request;
  }

  /**
   * One request by id, for the controller's ownership check.
   *
   * `acceptRequest` deliberately does not take a caller — it is a state
   * transition, not an authorization decision. The controller reads the
   * request, checks that the caller IS its recipient, and only then calls it.
   * Keeping the check out here means the service stays testable without a
   * request object, and the boundary stays in one visible place.
   */
  public getRequest(requestId: string): FriendRequest | undefined {
    return this.requests.get(requestId);
  }

  public acceptRequest(
    requestId: string,
    recipientName: string,
    recipientAvatar?: string
  ): FriendRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Friend request not found");
    if (request.status !== "PENDING") throw new Error("Friend request is not pending");

    request.status = "ACCEPTED";
    request.updatedAt = Date.now();
    progressionSync.friendRequestSaved(request);

    // Establish bidirectional friendship
    friendsService.addFriend(
      request.recipientId,
      request.senderId,
      request.senderName,
      request.senderAvatar
    );
    friendsService.addFriend(
      request.senderId,
      request.recipientId,
      recipientName,
      recipientAvatar
    );

    return request;
  }

  public declineRequest(requestId: string): FriendRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Friend request not found");
    if (request.status !== "PENDING") throw new Error("Friend request is not pending");

    request.status = "DECLINED";
    request.updatedAt = Date.now();
    progressionSync.friendRequestSaved(request);
    return request;
  }

  public getIncomingRequests(playerId: string): FriendRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.recipientId === playerId && r.status === "PENDING"
    );
  }

  public getOutgoingRequests(playerId: string): FriendRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.senderId === playerId && r.status === "PENDING"
    );
  }

  /**
   * Restore requests in every state.
   *
   * Accepted and declined rows come back too, deliberately: without them an
   * `accept` could be replayed after a restart as though it were the first
   * time, re-establishing a friendship somebody had already undone.
   */
  public hydrate(requests: FriendRequest[]): void {
    for (const request of requests) this.requests.set(request.id, request);
  }

  public clear(): void {
    this.requests.clear();
  }
}

export const friendRequestsService = FriendRequestsService.getInstance();

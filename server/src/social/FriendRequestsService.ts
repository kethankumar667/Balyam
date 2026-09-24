import { nanoid } from "nanoid";
import type { FriendRequest } from "@shared/social/FriendRequest.js";
import { friendsService } from "./FriendsService.js";
import { progressionSync } from "../persistence/ProgressionSync.js";
import {
  FRIEND_REQUEST_TTL_MS,
  FRIEND_REQUEST_DECLINE_COOLDOWN_MS,
  MAX_PENDING_OUTGOING_REQUESTS,
  MAX_FRIENDS_PER_PLAYER,
} from "./limits.js";

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

  private isExpired(req: FriendRequest, now = Date.now()): boolean {
    return now - req.createdAt > FRIEND_REQUEST_TTL_MS;
  }

  /**
   * Every request the service hands out, and every one it hands to the
   * persistence queue, is a copy of the stored one.
   *
   * Returning the stored object let a caller change a request's status by
   * assigning to it, and the queue reads its argument only when it runs — so
   * a later change could rewrite what an earlier save persisted.
   */
  private snapshot(request: FriendRequest): FriendRequest {
    return { ...request };
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

    if (friendsService.getFriends(senderId).length >= MAX_FRIENDS_PER_PLAYER) {
      throw new Error("Friend limit reached");
    }

    if (friendsService.getFriends(recipientId).length >= MAX_FRIENDS_PER_PLAYER) {
      throw new Error("Unable to send friend request to this player");
    }

    const now = Date.now();

    // 7-day re-request cooldown after recipient declined (R3.5)
    for (const req of this.requests.values()) {
      if (
        req.senderId === senderId &&
        req.recipientId === recipientId &&
        req.status === "DECLINED"
      ) {
        const declinedAt = req.updatedAt ?? req.createdAt;
        if (now - declinedAt < FRIEND_REQUEST_DECLINE_COOLDOWN_MS) {
          throw new Error("Unable to send friend request to this player");
        }
      }
    }

    // Expire any pending request in either direction between this pair before proceeding (F2)
    for (const req of this.requests.values()) {
      if (
        ((req.senderId === senderId && req.recipientId === recipientId) ||
          (req.senderId === recipientId && req.recipientId === senderId)) &&
        req.status === "PENDING" &&
        this.isExpired(req, now)
      ) {
        req.status = "EXPIRED";
        req.updatedAt = now;
        progressionSync.friendRequestSaved(this.snapshot(req));
      }
    }

    // Mutual request (D5): if recipient has an active pending request to sender, auto-accept it
    for (const req of this.requests.values()) {
      if (
        req.senderId === recipientId &&
        req.recipientId === senderId &&
        req.status === "PENDING" &&
        !this.isExpired(req, now)
      ) {
        return this.acceptRequest(req.id, senderName, senderAvatar);
      }
    }

    // Check existing pending request in the same direction
    for (const req of this.requests.values()) {
      if (
        req.senderId === senderId &&
        req.recipientId === recipientId &&
        req.status === "PENDING" &&
        !this.isExpired(req, now)
      ) {
        return this.snapshot(req);
      }
    }

    // Enforce max pending outgoing requests (R5.2)
    const activeOutgoing = this.getOutgoingRequests(senderId);
    if (activeOutgoing.length >= MAX_PENDING_OUTGOING_REQUESTS) {
      throw new Error("Maximum pending outgoing friend requests limit reached");
    }

    const id = `req_${nanoid()}`;
    const request: FriendRequest = {
      id,
      senderId,
      senderName,
      senderAvatar,
      recipientId,
      status: "PENDING",
      createdAt: now,
    };

    this.requests.set(id, request);
    progressionSync.friendRequestSaved(this.snapshot(request));
    return this.snapshot(request);
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
    const request = this.requests.get(requestId);
    return request ? this.snapshot(request) : undefined;
  }

  public acceptRequest(
    requestId: string,
    recipientName: string,
    recipientAvatar?: string
  ): FriendRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Friend request not found");
    if (request.status !== "PENDING") throw new Error("Friend request is not pending");
    if (this.isExpired(request)) throw new Error("Friend request has expired");

    request.status = "ACCEPTED";
    request.updatedAt = Date.now();
    progressionSync.friendRequestSaved(this.snapshot(request));

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

    return this.snapshot(request);
  }

  public declineRequest(requestId: string): FriendRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Friend request not found");
    if (request.status !== "PENDING") throw new Error("Friend request is not pending");
    if (this.isExpired(request)) throw new Error("Friend request has expired");

    request.status = "DECLINED";
    request.updatedAt = Date.now();
    progressionSync.friendRequestSaved(this.snapshot(request));
    return this.snapshot(request);
  }

  public cancelRequest(requestId: string): FriendRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Friend request not found");
    if (request.status !== "PENDING") throw new Error("Friend request is not pending");
    if (this.isExpired(request)) throw new Error("Friend request has expired");

    request.status = "CANCELLED";
    request.updatedAt = Date.now();
    progressionSync.friendRequestSaved(this.snapshot(request));
    return this.snapshot(request);
  }

  public getIncomingRequests(playerId: string): FriendRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.recipientId === playerId && r.status === "PENDING" && !this.isExpired(r))
      .map((r) => this.snapshot(r));
  }

  public getOutgoingRequests(playerId: string): FriendRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.senderId === playerId && r.status === "PENDING" && !this.isExpired(r))
      .map((r) => this.snapshot(r));
  }

  /**
   * Restore requests in every state.
   *
   * Accepted and declined rows come back too, deliberately: without them an
   * `accept` could be replayed after a restart as though it were the first
   * time, re-establishing a friendship somebody had already undone.
   */
  public hydrate(requests: FriendRequest[]): void {
    for (const request of requests) this.requests.set(request.id, { ...request });
  }

  public clear(): void {
    this.requests.clear();
  }
}

export const friendRequestsService = FriendRequestsService.getInstance();

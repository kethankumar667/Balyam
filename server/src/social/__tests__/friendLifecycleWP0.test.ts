import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { friendsService } from "../FriendsService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import type { FriendRequest } from "@shared/social/FriendRequest.js";
import { recentPlayersService } from "../../ranking/RecentPlayersService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { FRIEND_REQUEST_TTL_MS, MAX_PENDING_OUTGOING_REQUESTS, MAX_FRIENDS_PER_PLAYER } from "../limits.js";

describe("WP0 — Social Graph v1 Friend Lifecycle", () => {
  let repo: InMemoryProgressionRepository;

  beforeEach(() => {
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    friendsService.clear();
    friendRequestsService.clear();
    recentPlayersService.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("D1 — Unfriend is durable across rehydrate", () => {
    it("persists removal in both directions and survives rehydration", async () => {
      // 1. Establish friendship in both memory and repo
      friendsService.addFriend("player_alice", "player_bob", "Bob");
      friendsService.addFriend("player_bob", "player_alice", "Alice");
      await progressionSync.drain();

      // Check initially persisted in repo
      const friendsBeforeA = await repo.listFriends("player_alice");
      const friendsBeforeB = await repo.listFriends("player_bob");
      expect(friendsBeforeA.length).toBe(1);
      expect(friendsBeforeB.length).toBe(1);

      // 2. Remove friend from Alice's side
      const removed = friendsService.removeFriend("player_alice", "player_bob");
      expect(removed).toBe(true);
      await progressionSync.drain();

      // 3. Assert repo has removed both directions
      const friendsAfterA = await repo.listFriends("player_alice");
      const friendsAfterB = await repo.listFriends("player_bob");
      expect(friendsAfterA.length).toBe(0);
      expect(friendsAfterB.length).toBe(0);

      // 4. Simulate server restart: fresh service rehydrated from repo
      friendsService.clear();
      expect(friendsService.isFriend("player_alice", "player_bob")).toBe(false);
      expect(friendsService.isFriend("player_bob", "player_alice")).toBe(false);

      const rehydratedEdges = [
        ...(await repo.listFriends("player_alice")),
        ...(await repo.listFriends("player_bob")),
      ].map((f) => ({
        playerId: f.playerId,
        friendPlayerId: f.friendPlayerId,
        displayName: f.displayName ?? "Player",
        createdAt: f.createdAt,
      }));
      friendsService.hydrate(rehydratedEdges);

      expect(friendsService.getFriends("player_alice").length).toBe(0);
      expect(friendsService.getFriends("player_bob").length).toBe(0);
      expect(friendsService.isFriend("player_alice", "player_bob")).toBe(false);
    });
  });

  describe("D2 — Single Friend Graph (Consent preserved; one-way edges not friends)", () => {
    it("creates a PENDING request and isFriend remains false until recipient accepts", async () => {
      // The ranking route sends a request through the same service (route-level
      // coverage lives in socialRoutesWP0.test.ts); here we assert the graph rules.
      const req = friendRequestsService.sendRequest("player_carol", "Carol", "player_dan");
      expect(req.status).toBe("PENDING");
      await progressionSync.drain();

      // Consent not yet given: isFriend must be false
      expect(friendsService.isFriend("player_carol", "player_dan")).toBe(false);
      expect(recentPlayersService.isFriend("player_carol", "player_dan")).toBe(false);
      expect(recentPlayersService.getFriends("player_carol").length).toBe(0);

      // Recipient Dan accepts request
      friendRequestsService.acceptRequest(req.id, "Dan");
      await progressionSync.drain();

      // Now friends in both services
      expect(friendsService.isFriend("player_carol", "player_dan")).toBe(true);
      expect(friendsService.isFriend("player_dan", "player_carol")).toBe(true);
      expect(recentPlayersService.isFriend("player_carol", "player_dan")).toBe(true);

      const friendsList = recentPlayersService.getFriends("player_carol");
      expect(friendsList.length).toBe(1);
      expect(friendsList[0].playerId).toBe("player_dan");

      // Remove via recentPlayersService
      const removed = recentPlayersService.removeFriend("player_carol", "player_dan");
      expect(removed).toBe(true);
      await progressionSync.drain();

      expect(friendsService.isFriend("player_carol", "player_dan")).toBe(false);
      expect(recentPlayersService.isFriend("player_carol", "player_dan")).toBe(false);
      expect(recentPlayersService.getFriends("player_carol").length).toBe(0);
    });

    it("treats a one-way edge hydrated from repository as NOT a friend", () => {
      // Hydrate a one-way edge (e.g. legacy bad data where A has B, but B does not have A)
      friendsService.hydrate([
        {
          playerId: "player_one_way_a",
          friendPlayerId: "player_one_way_b",
          displayName: "B",
          createdAt: Date.now(),
        },
      ]);

      expect(friendsService.isFriend("player_one_way_a", "player_one_way_b")).toBe(false);
      expect(friendsService.isFriend("player_one_way_b", "player_one_way_a")).toBe(false);
      expect(friendsService.getFriends("player_one_way_a").length).toBe(0);
      expect(recentPlayersService.isFriend("player_one_way_a", "player_one_way_b")).toBe(false);
    });
  });

  describe("D4 — Cancel outgoing friend request", () => {
    it("cancels a pending request and updates status to CANCELLED", async () => {
      const req = friendRequestsService.sendRequest("player_eva", "Eva", "player_frank");
      expect(req.status).toBe("PENDING");
      await progressionSync.drain();

      const cancelled = friendRequestsService.cancelRequest(req.id);
      expect(cancelled.status).toBe("CANCELLED");
      await progressionSync.drain();

      // Verify no longer appears in incoming or outgoing pending lists
      expect(friendRequestsService.getIncomingRequests("player_frank").length).toBe(0);
      expect(friendRequestsService.getOutgoingRequests("player_eva").length).toBe(0);

      // Verify persisted to repo
      const stored = await repo.getFriendRequest(req.id);
      expect(stored?.status).toBe("CANCELLED");
    });

    it("throws when cancelling a non-existent or non-pending request", () => {
      expect(() => friendRequestsService.cancelRequest("non_existent")).toThrow("Friend request not found");

      const req = friendRequestsService.sendRequest("player_eva", "Eva", "player_frank");
      friendRequestsService.cancelRequest(req.id);
      expect(() => friendRequestsService.cancelRequest(req.id)).toThrow("Friend request is not pending");
    });
  });

  describe("D5 — Mutual request auto-accepts", () => {
    it("auto-accepts existing pending request when recipient sends mutual request", async () => {
      // 1. Grace sends request to Hank
      const req1 = friendRequestsService.sendRequest("player_grace", "Grace", "player_hank");
      expect(req1.status).toBe("PENDING");

      // 2. Hank sends request to Grace (mutual)
      const req2 = friendRequestsService.sendRequest("player_hank", "Hank", "player_grace");
      await progressionSync.drain();

      // Expect req1 to have been auto-accepted and returned
      expect(req2.id).toBe(req1.id);
      expect(req2.status).toBe("ACCEPTED");

      // Bidirectional friendship must now be established
      expect(friendsService.isFriend("player_grace", "player_hank")).toBe(true);
      expect(friendsService.isFriend("player_hank", "player_grace")).toBe(true);

      // Outgoing/incoming pending lists are now empty
      expect(friendRequestsService.getIncomingRequests("player_hank").length).toBe(0);
      expect(friendRequestsService.getOutgoingRequests("player_grace").length).toBe(0);
    });
  });

  describe("TTL — Friend requests expire after 30 days", () => {
    /** Fakes only Date, so the request TTL is tested by moving the clock, not by mutating a request. */
    const advancePastTtl = (extraMs: number): void => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + FRIEND_REQUEST_TTL_MS + extraMs);
    };

    it("omits expired requests from incoming and outgoing lists", () => {
      friendRequestsService.sendRequest("player_ian", "Ian", "player_jenny");
      expect(friendRequestsService.getIncomingRequests("player_jenny").length).toBe(1);

      advancePastTtl(1000);

      expect(friendRequestsService.getIncomingRequests("player_jenny").length).toBe(0);
      expect(friendRequestsService.getOutgoingRequests("player_ian").length).toBe(0);
    });

    it("refuses to accept or cancel an expired request", () => {
      const oldReq = friendRequestsService.sendRequest("player_ian", "Ian", "player_jenny");

      advancePastTtl(1000);

      expect(() => friendRequestsService.acceptRequest(oldReq.id, "Jenny")).toThrow(/expired/i);
      expect(() => friendRequestsService.cancelRequest(oldReq.id)).toThrow(/expired/i);
    });

    it("expires old pending request on resend so DB partial unique index allows new request (F2)", async () => {
      const firstReq = friendRequestsService.sendRequest("player_exp_a", "Alice", "player_exp_b");
      await progressionSync.drain();

      const initialStored = await repo.listFriendRequests("player_exp_a");
      expect(initialStored.length).toBe(1);
      expect(initialStored[0].status).toBe("PENDING");

      // Clock advances past the 30-day TTL
      advancePastTtl(5000);

      // Resend friend request between same pair
      const secondReq = friendRequestsService.sendRequest("player_exp_a", "Alice", "player_exp_b");
      expect(secondReq.id).not.toBe(firstReq.id);
      expect(secondReq.status).toBe("PENDING");
      await progressionSync.drain();

      // Repository must have exactly 1 PENDING and 1 EXPIRED row
      const stored = await repo.listFriendRequests("player_exp_a");
      expect(stored.length).toBe(2);
      const pendingRows = stored.filter((r) => r.status === "PENDING");
      const expiredRows = stored.filter((r) => r.status === "EXPIRED");
      expect(pendingRows.length).toBe(1);
      expect(expiredRows.length).toBe(1);
      expect(pendingRows[0].id).toBe(secondReq.id);
      expect(expiredRows[0].id).toBe(firstReq.id);
    });
  });

  describe("G9 — the service hands out copies, not its internal objects", () => {
    it("mutating a returned request cannot change the stored one", () => {
      const sent = friendRequestsService.sendRequest("player_copy_a", "A", "player_copy_b");
      sent.status = "ACCEPTED";
      sent.createdAt = 0;

      const stored = friendRequestsService.getRequest(sent.id);
      expect(stored?.status).toBe("PENDING");
      expect(stored?.createdAt).not.toBe(0);
      expect(friendRequestsService.getIncomingRequests("player_copy_b").length).toBe(1);
    });

    it("list getters return copies too", () => {
      const sent = friendRequestsService.sendRequest("player_copy_c", "C", "player_copy_d");
      const [listed] = friendRequestsService.getOutgoingRequests("player_copy_c");
      listed.status = "DECLINED";

      expect(friendRequestsService.getRequest(sent.id)?.status).toBe("PENDING");
    });

    it("hydrate copies its input, so later edits to the source array do not leak in", () => {
      const source: FriendRequest = {
        id: "req_hydrated",
        senderId: "player_copy_e",
        senderName: "E",
        recipientId: "player_copy_f",
        status: "PENDING",
        createdAt: Date.now(),
      };
      friendRequestsService.hydrate([source]);
      source.status = "DECLINED";

      expect(friendRequestsService.getRequest("req_hydrated")?.status).toBe("PENDING");
    });

    it("persists the state at call time, not whatever the object becomes before the queue drains", async () => {
      const saveSpy = vi.spyOn(repo, "saveFriendRequest");
      const sent = friendRequestsService.sendRequest("player_copy_g", "G", "player_copy_h");
      friendRequestsService.cancelRequest(sent.id);
      await progressionSync.drain();

      // Each save carries the status it was made with: PENDING first, then CANCELLED.
      expect(saveSpy.mock.calls.map(([record]) => record.status)).toEqual(["PENDING", "CANCELLED"]);
    });
  });

  describe("Limits — Max pending requests and friend count limits", () => {
    it("enforces max pending outgoing requests (100)", () => {
      for (let i = 0; i < MAX_PENDING_OUTGOING_REQUESTS; i++) {
        friendRequestsService.sendRequest("player_spammer", "Spammer", `player_target_${i}`);
      }

      expect(() =>
        friendRequestsService.sendRequest("player_spammer", "Spammer", "player_target_overflow")
      ).toThrow(/limit|pending/i);
    });

    it("enforces max friends limit (1000) with generic error for recipient (F9)", () => {
      const mockFriends = new Map();
      const fsInternal = friendsService as unknown as { friendsMap: Map<string, Map<string, unknown>> };
      for (let i = 0; i < MAX_FRIENDS_PER_PLAYER; i++) {
        const friendId = `friend_${i}`;
        mockFriends.set(friendId, {
          playerId: "player_popular",
          friendPlayerId: friendId,
          displayName: `Friend ${i}`,
          createdAt: Date.now(),
        });
        const reverseMap = new Map();
        reverseMap.set("player_popular", {
          playerId: friendId,
          friendPlayerId: "player_popular",
          displayName: "Popular",
          createdAt: Date.now(),
        });
        fsInternal.friendsMap.set(friendId, reverseMap);
      }
      fsInternal.friendsMap.set("player_popular", mockFriends);

      // Sender hit limit: reveals self friend limit
      expect(() =>
        friendRequestsService.sendRequest("player_popular", "Popular", "player_new")
      ).toThrow(/friend limit/i);

      // Recipient hit limit: generic error so recipient friend count is not leaked (F9 / R3.5)
      expect(() =>
        friendRequestsService.sendRequest("player_sender", "Sender", "player_popular")
      ).toThrow("Unable to send friend request to this player");
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { friendsService } from "../FriendsService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { presenceService } from "../PresenceService.js";

describe("Social & Friends Subsystem Suite", () => {
  beforeEach(() => {
    friendsService.clear();
    friendRequestsService.clear();
    presenceService.clear();
  });

  describe("FriendsService", () => {
    it("adds and retrieves friends", () => {
      const friend = friendsService.addFriend("p1", "p2", "Bob", "🦁");
      friendsService.addFriend("p2", "p1", "Alice", "🦊");
      expect(friend.playerId).toBe("p1");
      expect(friend.friendPlayerId).toBe("p2");

      const friends = friendsService.getFriends("p1");
      expect(friends.length).toBe(1);
      expect(friends[0].displayName).toBe("Bob");
    });

    it("prevents adding self as friend", () => {
      expect(() => friendsService.addFriend("p1", "p1", "Self")).toThrow();
    });

    it("removes friends cleanly", () => {
      friendsService.addFriend("p1", "p2", "Bob");
      friendsService.addFriend("p2", "p1", "Alice");
      expect(friendsService.isFriend("p1", "p2")).toBe(true);

      const removed = friendsService.removeFriend("p1", "p2");
      expect(removed).toBe(true);
      expect(friendsService.isFriend("p1", "p2")).toBe(false);
    });

    // Shared history moved to FriendshipHistoryService, which stores it durably;
    // see friendshipHistory.test.ts and sharedHistoryRoute.test.ts.
  });

  describe("FriendRequestsService", () => {
    it("manages friend request lifecycle (Send -> Accept)", () => {
      const req = friendRequestsService.sendRequest("p1", "Alice", "p2", "🐱");
      expect(req.status).toBe("PENDING");

      const incoming = friendRequestsService.getIncomingRequests("p2");
      expect(incoming.length).toBe(1);

      const accepted = friendRequestsService.acceptRequest(req.id, "Bob", "🐶");
      expect(accepted.status).toBe("ACCEPTED");

      // Verify bidirectional friendship created
      expect(friendsService.isFriend("p1", "p2")).toBe(true);
      expect(friendsService.isFriend("p2", "p1")).toBe(true);
    });

    it("handles declining friend requests", () => {
      const req = friendRequestsService.sendRequest("p1", "Alice", "p2");
      const declined = friendRequestsService.declineRequest(req.id);
      expect(declined.status).toBe("DECLINED");
      expect(friendsService.isFriend("p1", "p2")).toBe(false);
    });
  });

  describe("PresenceService", () => {
    it("tracks and queries realtime presence", () => {
      presenceService.setPresence("p1", "ONLINE", "Playing Ludo");
      const p = presenceService.getPresence("p1");
      expect(p.status).toBe("ONLINE");
      expect(p.activityDetail).toBe("Playing Ludo");

      const presences = presenceService.getPresences(["p1", "p2"]);
      expect(presences["p1"].status).toBe("ONLINE");
      expect(presences["p2"].status).toBe("OFFLINE");
    });
  });
});

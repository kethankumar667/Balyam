import { describe, it, expect, beforeEach } from "vitest";
import { recentPlayersService } from "../RecentPlayersService.js";
import { profileService } from "../../profile/ProfileService.js";
import { friendsService } from "../../social/FriendsService.js";
import { friendRequestsService } from "../../social/FriendRequestsService.js";
import type { FriendRequest } from "@shared/social/FriendRequest.js";

describe("Recent Players & Social Foundations", () => {
  beforeEach(() => {
    recentPlayersService.reset();
    profileService.reset();
    friendsService.clear();
    friendRequestsService.clear();
  });

  it("records match participants and provides recent players lookup", () => {
    recentPlayersService.recordMatch({
      roomCode: "LUDO10",
      game: "ludo",
      participants: [
        { playerId: "p1", name: "Alice" },
        { playerId: "p2", name: "Bob" },
      ],
    });

    const recentForAlice = recentPlayersService.getRecentPlayers("p1");
    expect(recentForAlice.length).toBe(1);
    expect(recentForAlice[0]?.playerId).toBe("p2");
    expect(recentForAlice[0]?.displayName).toBe("Bob");
    expect(recentForAlice[0]?.timesPlayedTogether).toBe(1);
  });

  it("handles adding and removing friends with consent", () => {
    profileService.getOrCreateProfile("p1", "Player One");
    profileService.getOrCreateProfile("friend_1", "Friend One");

    const req: FriendRequest = friendRequestsService.sendRequest("p1", "Player One", "friend_1");
    expect(req.status).toBe("PENDING");

    // Friends list is still empty because recipient has not accepted
    expect(recentPlayersService.isFriend("p1", "friend_1")).toBe(false);
    expect(recentPlayersService.getFriends("p1").length).toBe(0);

    // Recipient accepts
    friendRequestsService.acceptRequest(req.id, "Friend One");

    expect(recentPlayersService.isFriend("p1", "friend_1")).toBe(true);
    expect(recentPlayersService.getFriends("p1").length).toBe(1);
    expect(recentPlayersService.getFriends("p1")[0]?.displayName).toBe("Friend One");

    expect(recentPlayersService.removeFriend("p1", "friend_1")).toBe(true);
    expect(recentPlayersService.getFriends("p1").length).toBe(0);
  });
});

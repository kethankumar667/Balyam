import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FriendsList from "../FriendsList";
import FriendRequestPanel from "../FriendRequestPanel";
import OnlineFriendsPanel from "../OnlineFriendsPanel";
import PartyPanel from "../PartyPanel";
import PartyInvitationModal from "../PartyInvitationModal";
import SharedHistoryModal from "../SharedHistoryModal";
import SocialQuickActions from "../SocialQuickActions";
import SocialTipsCard from "../SocialTipsCard";
import { SocialHeroArtwork, SocialEmptyArtwork, SocialTipsArtwork } from "../SocialArtwork";

describe("Social & Party UI Components Suite", () => {
  it("renders SocialArtwork vector illustrations cleanly", () => {
    const { container: c1 } = render(<SocialHeroArtwork />);
    expect(c1.querySelector("svg")).toBeDefined();

    const { container: c2 } = render(<SocialEmptyArtwork />);
    expect(c2.querySelector("svg")).toBeDefined();

    const { container: c3 } = render(<SocialTipsArtwork />);
    expect(c3.querySelector("svg")).toBeDefined();
  });

  it("renders SocialQuickActions and triggers action callbacks", () => {
    const onCreateSquad = vi.fn();
    const onInviteFriends = vi.fn();
    const onOpenRecentRooms = vi.fn();

    render(
      <SocialQuickActions
        onCreateSquad={onCreateSquad}
        onInviteFriends={onInviteFriends}
        onOpenRecentRooms={onOpenRecentRooms}
      />
    );

    expect(screen.getByText("Quick Actions")).toBeDefined();
    expect(screen.getByText("Create Squad")).toBeDefined();
    expect(screen.getByText("Invite Friends")).toBeDefined();

    fireEvent.click(screen.getByText("Create Squad"));
    expect(onCreateSquad).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Invite Friends"));
    expect(onInviteFriends).toHaveBeenCalledTimes(1);
  });

  it("renders SocialTipsCard with 3 strategic gameplay tips", () => {
    render(<SocialTipsCard />);
    expect(screen.getByText("Squad Gaming Tips")).toBeDefined();
    expect(screen.getByText(/Squad Up for Tournaments/i)).toBeDefined();
    expect(screen.getByText(/Seamless WebRTC Voice/i)).toBeDefined();
    expect(screen.getByText(/Shared Match Records/i)).toBeDefined();
  });

  it("renders OnlineFriendsPanel with active presence and party invite trigger", () => {
    const onInviteToParty = vi.fn();
    const friends = [
      {
        playerId: "p1",
        friendPlayerId: "p2",
        displayName: "Aarav",
        avatar: "🦁",
        createdAt: Date.now(),
      },
    ];
    const presences = {
      p2: {
        playerId: "p2",
        status: "ONLINE" as const,
        activityDetail: "Playing Ludo",
        lastActiveAt: Date.now(),
      },
    };

    render(
      <OnlineFriendsPanel
        friends={friends}
        presences={presences}
        onInviteToParty={onInviteToParty}
      />
    );

    expect(screen.getByText(/1 friend currently online in the lounge!/i)).toBeDefined();
    expect(screen.getByText("Aarav")).toBeDefined();

    const inviteBtn = screen.getByRole("button", { name: /Invite Aarav to Party/i });
    fireEvent.click(inviteBtn);
    expect(onInviteToParty).toHaveBeenCalledTimes(1);
  });

  it("renders FriendsList with presence indicators and search filter", () => {
    const onRemoveFriend = vi.fn();
    const onInviteToParty = vi.fn();
    const onViewHistory = vi.fn();

    const friends = [
      {
        playerId: "p1",
        friendPlayerId: "p2",
        displayName: "Diya",
        avatar: "👑",
        createdAt: Date.now(),
      },
      {
        playerId: "p1",
        friendPlayerId: "p3",
        displayName: "Rohan",
        avatar: "⚡",
        createdAt: Date.now(),
      },
    ];

    const presences = {
      p2: {
        playerId: "p2",
        status: "IN_GAME" as const,
        activityDetail: "Ludo Grand Prix",
        lastActiveAt: Date.now(),
      },
      p3: {
        playerId: "p3",
        status: "OFFLINE" as const,
        lastActiveAt: Date.now(),
      },
    };

    render(
      <FriendsList
        friends={friends}
        presences={presences}
        onRemoveFriend={onRemoveFriend}
        onInviteToParty={onInviteToParty}
        onViewHistory={onViewHistory}
      />
    );

    expect(screen.getByText("Diya")).toBeDefined();
    expect(screen.getByText("Rohan")).toBeDefined();
    expect(screen.getByText("Ludo Grand Prix")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Search friends by name/i);
    fireEvent.change(searchInput, { target: { value: "Diya" } });

    expect(screen.getByText("Diya")).toBeDefined();
    expect(screen.queryByText("Rohan")).toBeNull();
  });

  it("renders FriendRequestPanel for sending and managing requests", () => {
    const onSendRequest = vi.fn();
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <FriendRequestPanel
        incoming={[
          {
            id: "req_1",
            senderId: "p_stranger",
            senderName: "Kavya",
            senderAvatar: "🌟",
            recipientId: "p1",
            status: "PENDING",
            createdAt: Date.now(),
          },
        ]}
        outgoing={[
          {
            id: "req_2",
            senderId: "p1",
            senderName: "Aarav",
            recipientId: "p_friend_target",
            status: "PENDING",
            createdAt: Date.now(),
          },
        ]}
        onSendRequest={onSendRequest}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );

    expect(screen.getByText("Kavya")).toBeDefined();
    expect(screen.getByText("Accept")).toBeDefined();
    expect(screen.getByText(/p_friend_target/i)).toBeDefined();

    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith("req_1");
  });

  it("renders PartyPanel for unformed party state and active party lobby", () => {
    const onCreateParty = vi.fn();
    const onSetReady = vi.fn();
    const onLeaveParty = vi.fn();
    const onDisbandParty = vi.fn();
    const onSetTarget = vi.fn();

    const { rerender } = render(
      <PartyPanel
        party={null}
        currentPlayerId="p1"
        onCreateParty={onCreateParty}
        onSetReady={onSetReady}
        onLeaveParty={onLeaveParty}
        onDisbandParty={onDisbandParty}
        onSetTarget={onSetTarget}
      />
    );

    expect(screen.getByText("Create a Multiplayer Squad")).toBeDefined();
    fireEvent.click(screen.getByText("Assemble Party"));
    expect(onCreateParty).toHaveBeenCalledTimes(1);

    // Rerender in active party
    rerender(
      <PartyPanel
        party={{
          id: "party_1",
          leaderId: "p1",
          members: [
            { playerId: "p1", displayName: "Aarav (Leader)", avatar: "👑", isLeader: true, isReady: true, joinedAt: Date.now() },
            { playerId: "p2", displayName: "Diya", avatar: "⚡", isLeader: false, isReady: false, joinedAt: Date.now() },
          ],
          maxMembers: 4,
          status: "INVITING",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        currentPlayerId="p1"
        onCreateParty={onCreateParty}
        onSetReady={onSetReady}
        onLeaveParty={onLeaveParty}
        onDisbandParty={onDisbandParty}
        onSetTarget={onSetTarget}
      />
    );

    expect(screen.getByText("Party Headquarters")).toBeDefined();
    expect(screen.getByText("Aarav (Leader)")).toBeDefined();
    expect(screen.getByText("Diya")).toBeDefined();
    expect(screen.getByText("Disband")).toBeDefined();
  });

  it("renders PartyInvitationModal and SharedHistoryModal dialogs", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onClose = vi.fn();

    render(
      <PartyInvitationModal
        invitation={{
          id: "pinv_1",
          partyId: "party_1",
          inviterId: "p1",
          inviterName: "Alice",
          inviteeId: "p2",
          status: "PENDING",
          createdAt: Date.now(),
        }}
        isOpen={true}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );

    expect(screen.getByText(/Alice/i)).toBeDefined();
    expect(screen.getByText(/SQUAD INVITATION/i)).toBeDefined();

    render(
      <SharedHistoryModal
        friend={{
          playerId: "p1",
          friendPlayerId: "p2",
          displayName: "Bob",
          createdAt: Date.now(),
        }}
        history={{
          playerId: "p1",
          friendPlayerId: "p2",
          matchesPlayedTogether: 12,
          winsTogether: 9,
          tournamentsTogether: 3,
          lastPlayedAt: Date.now(),
        }}
        isOpen={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Battles with Bob/i)).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("9")).toBeDefined();
  });
});

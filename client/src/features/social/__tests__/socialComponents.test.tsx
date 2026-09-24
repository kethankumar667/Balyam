import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("renders FriendsList without party/history buttons or a status when no handlers or presence are given (G2)", () => {
    render(
      <FriendsList
        friends={[{ playerId: "p1", friendPlayerId: "p2", displayName: "Diya", createdAt: Date.now() }]}
        presences={{}}
        onRemoveFriend={vi.fn()}
      />
    );

    expect(screen.getByText("Diya")).toBeDefined();
    expect(screen.getByRole("button", { name: /remove diya from friends/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /party invite/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /view shared history/i })).toBeNull();
    expect(screen.queryByText("Offline")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /filter friends by status/i })).toBeNull();
  });

  it("never prints a request's avatar value as text (G3)", () => {
    render(
      <FriendRequestPanel
        incoming={[
          {
            id: "req_x",
            senderId: "p_x",
            senderName: "Mallory",
            senderAvatar: "../../evil",
            recipientId: "p1",
            status: "PENDING",
            createdAt: Date.now(),
          },
        ]}
        outgoing={[]}
        onSendRequest={vi.fn()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );

    expect(screen.getByText("Mallory")).toBeDefined();
    expect(screen.queryByText("../../evil")).toBeNull();
  });

  it("renders FriendRequestPanel for sending, accepting, and cancelling requests", () => {
    const onSendRequest = vi.fn();
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onCancelRequest = vi.fn();

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
        onCancelRequest={onCancelRequest}
      />
    );

    expect(screen.getByText("Kavya")).toBeDefined();
    expect(screen.getByText("Accept")).toBeDefined();
    expect(screen.getByText(/p_friend_target/i)).toBeDefined();

    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith("req_1");

    // Test Cancel outgoing request
    const cancelBtn = screen.getByRole("button", { name: /Cancel friend request to p_friend_target/i });
    expect(cancelBtn).toBeDefined();
    fireEvent.click(cancelBtn);
    expect(onCancelRequest).toHaveBeenCalledWith("req_2");
  });

  it("requires confirmation modal before unfriending in FriendsList", async () => {
    const onRemoveFriend = vi.fn().mockResolvedValue(undefined);
    const friends = [
      {
        playerId: "p1",
        friendPlayerId: "p2",
        displayName: "Diya",
        avatar: "👑",
        createdAt: Date.now(),
      },
    ];
    const presences = {};

    render(
      <FriendsList
        friends={friends}
        presences={presences}
        onRemoveFriend={onRemoveFriend}
        onInviteToParty={vi.fn()}
        onViewHistory={vi.fn()}
      />
    );

    // Click remove button on friend card
    const removeBtn = screen.getByRole("button", { name: /Remove Diya from friends/i });
    act(() => {
      fireEvent.click(removeBtn);
    });

    // Confirm dialog must appear with explanation
    expect(screen.getByText(/Are you sure you want to remove/i)).toBeDefined();
    expect(onRemoveFriend).not.toHaveBeenCalled();

    // Cancel in modal dismisses dialog without calling onRemoveFriend
    const cancelModalBtn = screen.getByRole("button", { name: "Cancel" });
    act(() => {
      fireEvent.click(cancelModalBtn);
    });
    expect(screen.queryByText(/Are you sure you want to remove/i)).toBeNull();
    expect(onRemoveFriend).not.toHaveBeenCalled();

    // Open again and confirm with focus check (F5)
    let resolveRemove: () => void = () => {};
    const pendingPromise = new Promise<void>((resolve) => {
      resolveRemove = resolve;
    });
    onRemoveFriend.mockReturnValueOnce(pendingPromise);

    act(() => {
      fireEvent.click(removeBtn);
    });
    const confirmRemoveBtn = screen.getByRole("button", { name: "Remove Friend" });
    confirmRemoveBtn.focus();
    expect(document.activeElement).toBe(confirmRemoveBtn);

    // Click confirm; while pending, button should show "Removing…" and keep focus (F5)
    act(() => {
      fireEvent.click(confirmRemoveBtn);
    });
    expect(screen.getByText("Removing…")).toBeDefined();
    expect(document.activeElement).toBe(confirmRemoveBtn);

    // Resolve removal
    await act(async () => {
      resolveRemove();
    });
    expect(onRemoveFriend).toHaveBeenCalledWith("p2");
    expect(screen.queryByText(/Are you sure you want to remove/i)).toBeNull();
  });

  it("displays visible error in modal when unfriend fails without closing modal (F6)", async () => {
    const onRemoveFriend = vi.fn().mockRejectedValue(new Error("Network connection lost"));
    const friends = [
      {
        playerId: "p1",
        friendPlayerId: "p2",
        displayName: "Diya",
        avatar: "👑",
        createdAt: Date.now(),
      },
    ];

    render(
      <FriendsList
        friends={friends}
        presences={{}}
        onRemoveFriend={onRemoveFriend}
        onInviteToParty={vi.fn()}
        onViewHistory={vi.fn()}
      />
    );

    // Open unfriend modal
    const removeBtn = screen.getByRole("button", { name: /Remove Diya from friends/i });
    act(() => {
      fireEvent.click(removeBtn);
    });

    const confirmRemoveBtn = screen.getByRole("button", { name: "Remove Friend" });
    await act(async () => {
      fireEvent.click(confirmRemoveBtn);
    });

    // Error must be visible in modal and modal remains open
    expect(screen.getByText(/Network connection lost/i)).toBeDefined();
    expect(screen.getByText(/Are you sure you want to remove/i)).toBeDefined();
  });

  it("handles async onCancelRequest rejection and displays feedback error (F6)", async () => {
    const onCancelRequest = vi.fn().mockRejectedValue(new Error("Cancel failed on server"));

    render(
      <FriendRequestPanel
        incoming={[]}
        outgoing={[
          {
            id: "req_cancel_fail",
            senderId: "p1",
            senderName: "Aarav",
            recipientId: "p_target_fail",
            status: "PENDING",
            createdAt: Date.now(),
          },
        ]}
        onSendRequest={vi.fn()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancelRequest={onCancelRequest}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel friend request to p_target_fail/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(onCancelRequest).toHaveBeenCalledWith("req_cancel_fail");
    // Visible error feedback rendered
    expect(screen.getByText(/Cancel failed on server/i)).toBeDefined();
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

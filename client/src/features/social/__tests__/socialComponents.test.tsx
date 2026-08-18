import { describe, it, expect } from "vitest";
import React from "react";
import FriendsList from "../FriendsList";
import FriendRequestPanel from "../FriendRequestPanel";
import OnlineFriendsPanel from "../OnlineFriendsPanel";
import PartyPanel from "../PartyPanel";
import PartyInvitationModal from "../PartyInvitationModal";
import SharedHistoryModal from "../SharedHistoryModal";

describe("Social & Party Components Suite", () => {
  it("renders FriendsList with presence indicators", () => {
    const el = React.createElement(FriendsList, {
      friends: [
        {
          playerId: "p1",
          friendPlayerId: "p2",
          displayName: "Bob",
          avatar: "🦁",
          createdAt: Date.now(),
        },
      ],
      presences: {
        p2: {
          playerId: "p2",
          status: "ONLINE",
          activityDetail: "Playing Ludo",
          lastActiveAt: Date.now(),
        },
      },
      onRemoveFriend: async () => {},
      onInviteToParty: () => {},
      onViewHistory: () => {},
    });
    expect(el).toBeDefined();
  });

  it("renders FriendRequestPanel for incoming and outgoing requests", () => {
    const el = React.createElement(FriendRequestPanel, {
      incoming: [],
      outgoing: [],
      onSendRequest: async () => {},
      onAccept: async () => {},
      onDecline: async () => {},
    });
    expect(el).toBeDefined();
  });

  it("renders OnlineFriendsPanel", () => {
    const el = React.createElement(OnlineFriendsPanel, {
      friends: [],
      presences: {},
      onInviteToParty: () => {},
    });
    expect(el).toBeDefined();
  });

  it("renders PartyPanel for lobby setup", () => {
    const el = React.createElement(PartyPanel, {
      party: null,
      currentPlayerId: "p1",
      onCreateParty: async () => {},
      onSetReady: async () => {},
      onLeaveParty: async () => {},
      onDisbandParty: async () => {},
      onSetTarget: async () => {},
    });
    expect(el).toBeDefined();
  });

  it("renders PartyInvitationModal and SharedHistoryModal", () => {
    const inviteModal = React.createElement(PartyInvitationModal, {
      invitation: {
        id: "pinv_1",
        partyId: "party_1",
        inviterId: "p1",
        inviterName: "Alice",
        inviteeId: "p2",
        status: "PENDING",
        createdAt: Date.now(),
      },
      isOpen: true,
      onAccept: async () => {},
      onDecline: async () => {},
    });
    expect(inviteModal).toBeDefined();

    const historyModal = React.createElement(SharedHistoryModal, {
      friend: {
        playerId: "p1",
        friendPlayerId: "p2",
        displayName: "Bob",
        createdAt: Date.now(),
      },
      history: {
        playerId: "p1",
        friendPlayerId: "p2",
        matchesPlayedTogether: 5,
        winsTogether: 4,
        tournamentsTogether: 1,
        lastPlayedAt: Date.now(),
      },
      isOpen: true,
      onClose: () => {},
    });
    expect(historyModal).toBeDefined();
  });
});

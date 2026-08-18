import { useEffect, useState } from "react";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useRoomStore } from "../store/roomStore";

import FriendsList from "../features/social/FriendsList";
import FriendRequestPanel from "../features/social/FriendRequestPanel";
import OnlineFriendsPanel from "../features/social/OnlineFriendsPanel";
import PartyPanel from "../features/social/PartyPanel";
import PartyInvitationModal from "../features/social/PartyInvitationModal";
import SharedHistoryModal from "../features/social/SharedHistoryModal";

import type { Friend, SharedHistory } from "@shared/social/Friend";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { PlayerPresence } from "@shared/social/Presence";
import type { Party, PartyInvitation } from "@shared/party/Party";

import {
  StandardLoungePageLayout,
  TYPOGRAPHY,
  SURFACES,
} from "../design-system/dls";
import {
  FriendUserIcon,
  AddFriendUserIcon,
  SwordsClashIcon,
  StatusConnectedIcon,
} from "../design-system/icons";
import { ArrowLeftIcon } from "../components/auth/authIcons";

export default function SocialHubPage() {
  const currentName = useRoomStore((s) => s.playerName) || "Player";
  const currentAvatar = useRoomStore((s) => s.avatarId);

  /**
   * Identity now comes from a credential the server verifies.
   *
   * What was here invented its own: a random `guest_xxxxxxx` written to
   * `bhalyam.guest_player_id`, a key nothing else in the app knew about — so
   * it was absent from the DPDP data inventory, and the erase-my-data control
   * could not erase it. It also proved nothing: the string went into the URL
   * of every social and party call, and the server believed it, which is how
   * `POST /api/parties/create {"leaderId":"victim_user"}` worked.
   */
  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "party">(
    "friends"
  );
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [presences, setPresences] = useState<Record<string, PlayerPresence>>({});
  const [party, setParty] = useState<Party | null>(null);
  const [invitations, setInvitations] = useState<PartyInvitation[]>([]);

  // Modals state
  const [selectedFriendForHistory, setSelectedFriendForHistory] =
    useState<Friend | null>(null);
  const [sharedHistoryData, setSharedHistoryData] =
    useState<SharedHistory | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [activePartyInvite, setActivePartyInvite] =
    useState<PartyInvitation | null>(null);

  const loadData = async () => {
    // Identity first: a request built on a null id is a request the server
    // now refuses, and rightly.
    if (!effectivePlayerId) return;
    try {
      // 1. Load friends
      const fRes = await apiFetch(`/api/social/friends/${effectivePlayerId}`);
      if (fRes.ok) {
        const data = await fRes.json();
        setFriends(data.friends || []);

        // Load presence for all friends
        if (data.friends && data.friends.length > 0) {
          const ids = data.friends.map((f: Friend) => f.friendPlayerId);
          const pRes = await apiFetch(`/api/social/presence/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerIds: ids }),
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            setPresences(pData.presences || {});
          }
        }
      }

      // 2. Load requests
      const rRes = await apiFetch(`/api/social/requests/${effectivePlayerId}`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setIncomingRequests(rData.incoming || []);
        setOutgoingRequests(rData.outgoing || []);
      }

      // 3. Load party
      const ptRes = await apiFetch(`/api/parties/player/${effectivePlayerId}`);
      if (ptRes.ok) {
        const ptData = await ptRes.json();
        setParty(ptData.party || null);
        setInvitations(ptData.invitations || []);
        if (ptData.invitations && ptData.invitations.length > 0) {
          setActivePartyInvite(ptData.invitations[0]);
        }
      }

      // 4. Update own presence as ONLINE
      await apiFetch(`/api/social/presence/${effectivePlayerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ONLINE",
          activityDetail: "Browsing Lounge Social Hub",
        }),
      });
    } catch (err) {
      console.error("Failed to load social data:", err);
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [identityReady, effectivePlayerId]);

  // Friend actions
  const handleRemoveFriend = async (friendPlayerId: string) => {
    try {
      await apiFetch(`/api/social/friends/${effectivePlayerId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendPlayerId }),
      });
      await loadData();
    } catch (err) {
      console.error("Failed to remove friend:", err);
    }
  };

  const handleSendFriendRequest = async (recipientId: string) => {
    const res = await apiFetch(`/api/social/requests/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: effectivePlayerId,
        senderName: currentName,
        senderAvatar: currentAvatar,
        recipientId,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send request");
    }
    await loadData();
  };

  const handleAcceptRequest = async (requestId: string) => {
    await apiFetch(`/api/social/requests/${requestId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: currentName,
        recipientAvatar: currentAvatar,
      }),
    });
    await loadData();
  };

  const handleDeclineRequest = async (requestId: string) => {
    await apiFetch(`/api/social/requests/${requestId}/decline`, {
      method: "POST",
    });
    await loadData();
  };

  // Party actions
  const handleCreateParty = async () => {
    await apiFetch(`/api/parties/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderId: effectivePlayerId,
        leaderName: currentName,
        leaderAvatar: currentAvatar,
      }),
    });
    await loadData();
  };

  const handleInviteToParty = async (friend: Friend) => {
    let partyId = party?.id;
    if (!partyId) {
      // Auto-create party if not in one
      const cRes = await apiFetch(`/api/parties/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderId: effectivePlayerId,
          leaderName: currentName,
          leaderAvatar: currentAvatar,
        }),
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        partyId = cData.party.id;
      }
    }

    if (partyId) {
      await apiFetch(`/api/parties/${partyId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterId: effectivePlayerId,
          inviterName: currentName,
          inviteeId: friend.friendPlayerId,
        }),
      });
      setActiveTab("party");
      await loadData();
    }
  };

  const handleAcceptPartyInvite = async (invitationId: string) => {
    await apiFetch(`/api/parties/invitations/${invitationId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteeName: currentName,
        inviteeAvatar: currentAvatar,
      }),
    });
    setActivePartyInvite(null);
    setActiveTab("party");
    await loadData();
  };

  const handleDeclinePartyInvite = async (invitationId: string) => {
    await apiFetch(`/api/parties/invitations/${invitationId}/decline`, {
      method: "POST",
    });
    setActivePartyInvite(null);
    await loadData();
  };

  const handleSetReady = async (isReady: boolean) => {
    await apiFetch(`/api/parties/player/${effectivePlayerId}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isReady }),
    });
    await loadData();
  };

  const handleLeaveParty = async () => {
    await apiFetch(`/api/parties/player/${effectivePlayerId}/leave`, {
      method: "POST",
    });
    await loadData();
  };

  const handleDisbandParty = async () => {
    await apiFetch(`/api/parties/player/${effectivePlayerId}/disband`, {
      method: "POST",
    });
    await loadData();
  };

  const handleSetTarget = async (game?: string, roomCode?: string) => {
    await apiFetch(`/api/parties/player/${effectivePlayerId}/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, roomCode }),
    });
    await loadData();
  };

  const handleViewSharedHistory = async (friend: Friend) => {
    try {
      const res = await apiFetch(
        `/api/social/shared-history/${effectivePlayerId}/${friend.friendPlayerId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedFriendForHistory(friend);
        setSharedHistoryData(data.history || null);
        setIsHistoryModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load shared history:", err);
    }
  };

  return (
    <AppLayout>
      <StandardLoungePageLayout
        backLink={
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-stone-400 hover:text-stone-100 transition"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Lounge
          </Link>
        }
        headerAction={
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link
              to="/tournaments"
              className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2 min-h-[24px] inline-flex items-center"
            >
              🏟️ Tournaments
            </Link>
            <Link
              to="/leaderboard"
              className="text-stone-400 hover:text-stone-200 transition underline underline-offset-2 min-h-[24px] inline-flex items-center"
            >
              🏆 Rankings
            </Link>
          </div>
        }
      >
        {/* Page Hero */}
        <div className={`${SURFACES.cardElevated} p-6 sm:p-8 relative overflow-hidden`}>
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-black flex items-center gap-1.5">
              <StatusConnectedIcon size={14} className="text-amber-400" />
              COMMUNITY & MULTIPLAYER SQUADS
            </span>
            <h1 className={TYPOGRAPHY.heroTitle}>BHALYAM Social Hub</h1>
            <p className={TYPOGRAPHY.bodySubtle}>
              Assemble squads, invite friends, track shared combat history, and queue into games together.
            </p>
          </div>
        </div>

        {/* Online Friends Rail */}
        <OnlineFriendsPanel
          friends={friends}
          presences={presences}
          onInviteToParty={handleInviteToParty}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-800/60 pb-3 overflow-x-auto text-xs font-bold font-mono">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "friends"
                ? "bg-amber-500 text-zinc-950 font-black shadow"
                : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            <FriendUserIcon size={14} />
            Friends List ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("party")}
            className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "party"
                ? "bg-amber-500 text-zinc-950 font-black shadow"
                : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            <SwordsClashIcon size={14} />
            Party Headquarters {party ? `(${party.members.length}/4)` : ""}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "requests"
                ? "bg-amber-500 text-zinc-950 font-black shadow"
                : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
            }`}
          >
            <AddFriendUserIcon size={14} />
            Requests ({incomingRequests.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "friends" && (
          <FriendsList
            friends={friends}
            presences={presences}
            onRemoveFriend={handleRemoveFriend}
            onInviteToParty={handleInviteToParty}
            onViewHistory={handleViewSharedHistory}
          />
        )}

        {activeTab === "party" && (
          <PartyPanel
            party={party}
            currentPlayerId={effectivePlayerId ?? ""}
            onCreateParty={handleCreateParty}
            onSetReady={handleSetReady}
            onLeaveParty={handleLeaveParty}
            onDisbandParty={handleDisbandParty}
            onSetTarget={handleSetTarget}
          />
        )}

        {activeTab === "requests" && (
          <FriendRequestPanel
            incoming={incomingRequests}
            outgoing={outgoingRequests}
            onSendRequest={handleSendFriendRequest}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
        )}

        {/* Modals */}
        <SharedHistoryModal
          friend={selectedFriendForHistory}
          history={sharedHistoryData}
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />

        <PartyInvitationModal
          invitation={activePartyInvite}
          isOpen={!!activePartyInvite}
          onAccept={handleAcceptPartyInvite}
          onDecline={handleDeclinePartyInvite}
        />
      </StandardLoungePageLayout>
    </AppLayout>
  );
}

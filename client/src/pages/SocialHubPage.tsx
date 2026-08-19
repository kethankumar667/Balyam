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
import SocialQuickActions from "../features/social/SocialQuickActions";
import SocialTipsCard from "../features/social/SocialTipsCard";
import { SocialHeroArtwork } from "../features/social/SocialArtwork";

import type { Friend, SharedHistory } from "@shared/social/Friend";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { PlayerPresence } from "@shared/social/Presence";
import type { Party, PartyInvitation } from "@shared/party/Party";

import {
  FriendUserIcon,
  AddFriendUserIcon,
  SwordsClashIcon,
  StatusConnectedIcon,
} from "../design-system/icons";
import { ArrowLeftIcon } from "../components/auth/authIcons";

import { useAuthStore } from "../store/authStore";
import MemberLockedGate from "../components/auth/MemberLockedGate";

export default function SocialHubPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName) || (isMember ? "Member" : "Guest");
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "party">(
    "friends"
  );

  if (!isMember) {
    return <MemberLockedGate feature="social" />;
  }
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
    setActiveTab("party");
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
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Header Breadcrumbs Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link
                to="/tournaments"
                className="text-amber-500 hover:text-amber-400 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏟️ Tournaments
              </Link>
              <Link
                to="/leaderboard"
                className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏆 Rankings
              </Link>
            </div>
          </div>

          {/* Wide Social Hub Hero Banner */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/95 via-indigo-950/90 to-purple-900/95 border border-purple-800/40 text-white shadow-2xl relative overflow-hidden">
            {/* Ambient Radial Flare */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-xl">
                <span className="text-xs font-mono uppercase tracking-widest text-purple-300 font-black flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 w-fit">
                  <StatusConnectedIcon size={14} className="text-purple-300" />
                  COMMUNITY & MULTIPLAYER SQUADS
                </span>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                  BHALYAM Social Hub
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-sans">
                  Assemble 4-player squads, connect with fellow gamers, track head-to-head combat records, and queue seamlessly into multiplayer tournaments together!
                </p>
              </div>

              {/* Vector Artwork Region */}
              <div className="flex justify-center sm:justify-end flex-shrink-0">
                <SocialHeroArtwork className="w-44 h-32 sm:w-56 sm:h-40 drop-shadow-2xl" />
              </div>
            </div>
          </div>

          {/* Active Friends Notice Banner */}
          <OnlineFriendsPanel
            friends={friends}
            presences={presences}
            onInviteToParty={handleInviteToParty}
            onOpenInviteModal={() => setActiveTab("requests")}
          />

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--auth-card-edge)] pb-3 overflow-x-auto text-xs font-bold font-mono">
            <button
              onClick={() => setActiveTab("friends")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 min-h-[44px] ${
                activeTab === "friends"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              <FriendUserIcon size={15} />
              Friends List ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab("party")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 min-h-[44px] ${
                activeTab === "party"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              <SwordsClashIcon size={15} />
              Party Headquarters {party ? `(${party.members.length}/4)` : ""}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 min-h-[44px] ${
                activeTab === "requests"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              <AddFriendUserIcon size={15} />
              Requests ({incomingRequests.length})
            </button>
          </div>

          {/* Two-Column Desktop Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Primary Tab Content (8 of 12 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {activeTab === "friends" && (
                <FriendsList
                  friends={friends}
                  presences={presences}
                  onRemoveFriend={handleRemoveFriend}
                  onInviteToParty={handleInviteToParty}
                  onViewHistory={handleViewSharedHistory}
                  onOpenInviteModal={() => setActiveTab("requests")}
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
            </div>

            {/* Right Column: Secondary Side Panels (4 of 12 columns) */}
            <div className="lg:col-span-4 space-y-6">
              <SocialQuickActions
                onCreateSquad={handleCreateParty}
                onInviteFriends={() => setActiveTab("requests")}
                onOpenRecentRooms={() => {
                  if (typeof window !== "undefined") window.location.href = "/games";
                }}
              />
              <SocialTipsCard />
            </div>
          </div>

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
        </div>
      </div>
    </AppLayout>
  );
}

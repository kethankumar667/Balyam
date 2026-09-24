/**
 * BHALYAM Mandali — Futuristic Hub Page (Responsive Router Container)
 *
 * Selects between MandaliHubDesktop and MandaliHubMobile using useViewport().
 * Coordinates realtime socket connection, membership joining, theme toggling,
 * and M-10 Game Launch handoffs.
 *
 * Requirements:
 * - Full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Strictly NO usage of Sparkles from lucide-react. Uses Crown, Play, Trophy, Users, Zap, Sun, Moon.
 * - WCAG 2.1 AA compliant focus rings.
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useViewport } from "../../lib/useViewport";
import { useMandaliStore } from "../../store/mandaliStore";
import { toastStore } from "../../lib/toastStore";
import { useLeaveWhenMandaliGone } from "./useLeaveWhenMandaliGone";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import { usePlayerId } from "../../lib/playerIdentity";
import { MandaliHubDesktop } from "./MandaliHubDesktop";
import { MandaliHubMobile } from "./MandaliHubMobile";
import { CoinTransferModal } from "./CoinTransferModal";
import { CoinRequestCooldownModal } from "./CoinRequestCooldownModal";
import { useCoinRequestAction } from "./useCoinRequestAction";
import InviteShareSheet from "../../components/mandali/InviteShareSheet";
import GroupInfoModal from "../../components/mandali/GroupInfoModal";
import MemberManagementSheet from "../../components/mandali/MemberManagementSheet";
import LeaveMandaliDialog from "../../components/mandali/LeaveMandaliDialog";
import { leaveMandaliFlow } from "./mandaliLeaveFlow";
import PendingRequestsPanel from "../../components/mandali/PendingRequestsPanel";
import IncomingCoinRequestBanner from "../../components/mandali/IncomingCoinRequestBanner";
import NotificationLevelSheet from "../../components/mandali/NotificationLevelSheet";
import { useMandaliReadTracking } from "../../hooks/useMandaliReadTracking";
import { useMandaliInboxStore } from "../../store/mandaliInboxStore";
import { insertUnreadDivider } from "../../lib/mandaliUnreadDivider";
import { Play, Crown, Users, Zap } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";

export default function MandaliHubPage(): JSX.Element {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  // The owner deleting this Mandali while it is open (for them or anyone else) takes everyone back to the list.
  useLeaveWhenMandaliGone();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const viewport = useViewport();
  const { playerId } = usePlayerId();
  const isMember = useAuthStore((s) => s.isMember);
  const playerName = useRoomStore((s) => s.playerName);
  const avatarId = useRoomStore((s) => s.avatarId);

  const [showCoinTransfer, setShowCoinTransfer] = useState(false);
  const [coinTransferInitialType, setCoinTransferInitialType] = useState<"SEND" | "REQUEST">("SEND");
  const [preselectedMemberId, setPreselectedMemberId] = useState<string | undefined>(undefined);
  const [showInvite, setShowInvite] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [inviteInvitationId, setInviteInvitationId] = useState<string | undefined>(undefined);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const {
    activeMandali,
    members,
    channels,
    activeChannelId,
    messages,
    parties,
    memories,
    coinRequests,
    pendingJoinRequests,
    activeGameLaunch,
    isLoading,
    errorMessage,
    fetchMandaliByHandleOrId,
    setActiveChannel,
    sendMessage,
    reactToMessage,
    createParty,
    joinParty,
    leaveParty,
    launchParty,
    joinMandali,
    leaveMandali,
    initMandaliSocket,
    cleanupMandaliSocket,
    clearActiveLaunch,
    promoteMember,
    demoteMember,
    kickMember,
    banMember,
    transferOwnership,
    createInviteLink,
    resolveInviteLink,
    fetchPendingJoinRequests,
    decideJoinRequest,
    pinMessage,
    deleteMessage,
    fundCoinRequest,
    updateMandaliSettings,
    deleteMandali,
  } = useMandaliStore();

  const coinRequest = useCoinRequestAction({
    mandaliId: activeMandali?.id ?? null,
    playerId,
    members,
    channels,
    activeChannelId,
  });

  useEffect(() => {
    if (handle) {
      fetchMandaliByHandleOrId(handle);
    }
  }, [handle, fetchMandaliByHandleOrId]);

  // Resolve a `?invite=<token>` link once the Mandali loads. A valid,
  // unexpired token unlocks a direct join (bypassing approval per the RPC's
  // own rule) instead of the plain "preview only" visitor banner.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      const result = await resolveInviteLink(inviteToken);
      if (cancelled) return;
      if (result.valid && result.invitationId) {
        setInviteInvitationId(result.invitationId);
        setInviteError(null);
      } else {
        setInviteError("This invite link is invalid, expired, or has been reset.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, resolveInviteLink]);

  // The live channel is for members. A visitor looking at the storefront has
  // nothing to listen to (and the server would not let them in anyway).
  const isMemberOfActive = members.some((m) => m.playerId === playerId);
  useEffect(() => {
    if (activeMandali?.id && playerId && isMemberOfActive) {
      initMandaliSocket(activeMandali.id, playerId);
      return () => {
        cleanupMandaliSocket(activeMandali.id, playerId);
      };
    }
  }, [activeMandali?.id, playerId, isMemberOfActive, initMandaliSocket, cleanupMandaliSocket]);

  const selfMember = members.find((m) => m.playerId === playerId);
  const selfRole: string = selfMember?.role ?? "MEMBER";
  const isOwner = selfRole === "OWNER";
  const isAdmin = selfRole === "ADMIN";
  const canManageMembers = isOwner || isAdmin;
  const canEditInfo = isOwner || isAdmin || activeMandali?.editPermission === "ALL";

  // What the member had not read on arrival (for the "New messages" line), and
  // keeping their read pointer current while they are here.
  const unreadSince = useMandaliReadTracking(
    activeMandali?.id ?? null,
    isMember && Boolean(selfMember),
    activeChannelId ? messages[activeChannelId]?.length ?? 0 : 0
  );
  const notificationLevel = useMandaliInboxStore(
    (s) => s.digests.find((d) => d.mandaliId === activeMandali?.id)?.level ?? "ALL"
  );
  const setNotificationLevel = useMandaliInboxStore((s) => s.setLevel);

  // Only owners/admins ever need the pending-requests list — avoid an
  // unnecessary fetch (and an unnecessary 403 for ordinary members) for
  // everyone else.
  useEffect(() => {
    if (activeMandali?.id && canManageMembers) {
      fetchPendingJoinRequests(activeMandali.id);
    }
  }, [activeMandali?.id, canManageMembers, fetchPendingJoinRequests]);

  if (!isLoading && errorMessage && !activeMandali) {
    return (
      <AppLayout>
        <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Mandali Not Found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate("/mandali")}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm shadow-md"
          >
            Back to Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !activeMandali) {
    return (
      <AppLayout>
        <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-bold">Connecting to Mandali Lounge...</p>
        </div>
      </AppLayout>
    );
  }

  const isCurrentMember = members.some((m) => m.playerId === playerId);
  const activeChannelMessages = activeChannelId ? messages[activeChannelId] || [] : [];

  // Requests where I am the person being asked, still open and unexpired.
  const now = Date.now();
  const incomingCoinRequests = Object.values(coinRequests)
    .filter((r) => r.payerIdentityId === playerId && r.status === "OPEN" && r.expiresAt > now)
    .sort((a, b) => a.createdAt - b.createdAt);

  const handleLaunchToRoom = () => {
    if (!activeGameLaunch) return;
    const targetRoom = activeGameLaunch.roomCode;
    clearActiveLaunch();
    navigate(`/room/${targetRoom}`);
  };

  const handleOpenCoinTransfer = (memberId?: string) => {
    setPreselectedMemberId(memberId);
    setCoinTransferInitialType("SEND");
    setShowCoinTransfer(true);
  };

  const sharedProps = {
    mandali: activeMandali,
    members,
    channels,
    activeChannelId,
    messages: insertUnreadDivider(activeChannelMessages, unreadSince, playerId) as typeof activeChannelMessages,
    notificationLevel,
    onOpenNotificationSettings: () => setShowNotificationSettings(true),
    parties,
    memories,
    currentUserId: playerId,
    selfId: playerId ?? "",
    isOwner,
    canManageMembers,
    canEditInfo,
    pendingRequestCount: pendingJoinRequests.length,
    coinRequests,
    isCoinRequestCoolingDown: coinRequest.isCoolingDown,
    onSelectChannel: setActiveChannel,
    onSendMessage: (content: string) => sendMessage(content, playerId || undefined),
    onReactMessage: (messageId: string, emoji: string) => reactToMessage(messageId, emoji, playerId || undefined),
    onCreateParty: (game: any, modeId: string, title: string, slots: number) =>
      createParty(game, modeId, title, slots, playerId || undefined),
    onJoinParty: (partyId: string) => joinParty(partyId, playerId || undefined),
    onLeaveParty: (partyId: string) => leaveParty(partyId, playerId || undefined),
    onLaunchParty: (partyId: string) => launchParty(partyId, playerId || undefined),
    onOpenCoinTransfer: handleOpenCoinTransfer,
    onRequestCoins: () => void coinRequest.requestCoins(),
    onPayCoinRequest: fundCoinRequest,
    onPinMessage: (channelId: string, messageId: string, pinned: boolean) => pinMessage(channelId, messageId, pinned),
    onDeleteMessage: (channelId: string, messageId: string) => deleteMessage(channelId, messageId),
    onOpenInvite: () => setShowInvite(true),
    onOpenGroupInfo: () => setShowGroupInfo(true),
    onOpenMembers: () => setShowMembers(true),
    onOpenPendingRequests: () => setShowPendingRequests(true),
    // Opens the confirmation. Both layouts share this, so it is the one place leaving is started.
    onLeaveMandali: () => setShowLeave(true),
  };

  return (
    <AppLayout customTail={activeMandali ? `@${activeMandali.handle}` : undefined}>
      <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden relative select-none">
        {/* Visitor Banner if not yet a member */}
        {!isCurrentMember && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold flex-shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {inviteInvitationId
                  ? `You've been invited to join ${activeMandali.name}!`
                  : inviteError
                  ? inviteError
                  : isMember
                  ? `You are previewing ${activeMandali.name}. Join to chat in real-time and squad up!`
                  : `You are previewing ${activeMandali.name}. Sign in as a BHALYAM member to join, chat, and transfer coins.`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isMember ? (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await joinMandali(
                      activeMandali.id,
                      undefined,
                      {
                        playerId: playerId || undefined,
                        displayName: playerName || "Mandali Member",
                        avatar: avatarId || "file_0000000084c48208b1f893419d784cf2_1.jpg",
                      },
                      inviteInvitationId
                    );
                    if (!res.success) {
                      alert(res.error || "Failed to join");
                      return;
                    }
                    if (inviteToken) {
                      searchParams.delete("invite");
                      setSearchParams(searchParams, { replace: true });
                    }
                  }}
                  className="min-h-[36px] px-4 py-1 rounded-lg bg-slate-950 text-amber-400 font-extrabold hover:bg-slate-900 transition-colors shadow"
                >
                  Join Mandali
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="min-h-[36px] px-4 py-1 rounded-lg bg-slate-950 text-amber-400 font-extrabold hover:bg-slate-900 transition-colors shadow"
                >
                  Sign In to Join
                </button>
              )}
            </div>
          </div>
        )}

        {isCurrentMember && (
          <IncomingCoinRequestBanner requests={incomingCoinRequests} members={members} onPay={fundCoinRequest} />
        )}

        {/* Responsive Viewport Switcher */}
        <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
          {!isCurrentMember ? (
            // Someone who is not in this Mandali sees its storefront — never its
            // conversation or its controls. The server sends them nothing more.
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-md text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">{activeMandali.name}</h1>
                <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5">@{activeMandali.handle}</p>
                {activeMandali.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{activeMandali.description}</p>
                )}
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">
                  {activeMandali.memberCount} of {activeMandali.maxMembers} members
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  Join to read the conversation and play with the group.
                </p>
              </div>
            </div>
          ) : viewport === "desktop" ? (
            <MandaliHubDesktop {...sharedProps} />
          ) : (
            <MandaliHubMobile {...sharedProps} />
          )}
        </div>

      {/* M-10 Game Launch Handoff Overlay */}
      {activeGameLaunch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-inner">
              <Play className="w-8 h-8 fill-current" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block mb-2">
              Squad Match Launched!
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
              Your Squad is Entering the Arena
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">
              Room Code:{" "}
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-base">
                {activeGameLaunch.roomCode}
              </span>{" "}
              ({activeGameLaunch.game.toUpperCase()})
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearActiveLaunch}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleLaunchToRoom}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Enter Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coin Transfer Modal (For sending coins) */}
      {showCoinTransfer && activeMandali && (
        <CoinTransferModal
          mandaliId={activeMandali.id}
          channelId={activeChannelId ?? undefined}
          members={members}
          currentUserId={playerId}
          preselectedMemberId={preselectedMemberId}
          initialType={coinTransferInitialType}
          onClose={() => setShowCoinTransfer(false)}
        />
      )}

      {/* Coin Request Cooldown Modal (Shown when under cooling period) */}
      {coinRequest.showCooldown && (
        <CoinRequestCooldownModal
          cooldownEndsAt={coinRequest.cooldownEndsAt}
          onClose={coinRequest.closeCooldown}
          onRequestCoins={() => void coinRequest.requestCoins()}
        />
      )}

      {activeMandali && (
        <InviteShareSheet
          open={showInvite}
          onClose={() => setShowInvite(false)}
          mandaliName={activeMandali.name}
          mandaliHandle={activeMandali.handle}
          onCreateLink={async () => {
            const res = await createInviteLink(activeMandali.id);
            return { success: res.success, token: res.invitation?.token, error: res.error };
          }}
        />
      )}

      {activeMandali && (
        <GroupInfoModal
          open={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          mandali={activeMandali}
          canEditInfo={canEditInfo}
          isOwner={isOwner}
          onSave={(patch) => updateMandaliSettings(activeMandali.id, patch)}
          onDelete={async (confirmHandle) => {
            const result = await deleteMandali(activeMandali.id, confirmHandle);
            if (result.success) toastStore.show(`“${activeMandali.name}” was deleted.`, "success");
            return result;
          }}
        />
      )}

      {activeMandali && (
        <LeaveMandaliDialog
          open={showLeave}
          onClose={() => setShowLeave(false)}
          mandaliName={activeMandali.name}
          isOwner={isOwner}
          candidates={members
            .filter((m) => m.playerId !== playerId && m.state === "ACTIVE")
            .map((m) => ({ playerId: m.playerId, displayName: m.displayName, role: m.role }))}
          onLeave={async (newHostId) => {
            const result = await leaveMandaliFlow({ transferOwnership, leaveMandali }, activeMandali.id, newHostId);
            if (result.success) navigate("/mandali", { replace: true });
            return result;
          }}
          onDeleteInstead={() => {
            setShowLeave(false);
            setShowGroupInfo(true);
          }}
        />
      )}

      <MemberManagementSheet
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={members}
        selfId={playerId ?? ""}
        onPromote={(targetId) => promoteMember(activeMandali.id, targetId)}
        onDemote={(targetId) => demoteMember(activeMandali.id, targetId)}
        onKick={(targetId) => kickMember(activeMandali.id, targetId)}
        onBan={(targetId) => banMember(activeMandali.id, targetId)}
        onTransferOwnership={(targetId) => transferOwnership(activeMandali.id, targetId)}
      />

      {isCurrentMember && (
        <NotificationLevelSheet
          open={showNotificationSettings}
          onClose={() => setShowNotificationSettings(false)}
          mandaliName={activeMandali.name}
          level={notificationLevel}
          onChange={(level) => setNotificationLevel(activeMandali.id, level)}
        />
      )}

      <PendingRequestsPanel
        open={showPendingRequests}
        onClose={() => setShowPendingRequests(false)}
        requests={pendingJoinRequests}
        onDecide={decideJoinRequest}
      />
      </div>
    </AppLayout>
  );
}

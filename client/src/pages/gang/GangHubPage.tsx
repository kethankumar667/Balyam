/**
 * BHALYAM Gang — Futuristic Hub Page (Responsive Router Container)
 *
 * Selects between GangHubDesktop and GangHubMobile using useViewport().
 * Coordinates realtime socket connection, membership joining, theme toggling,
 * and M-10 Game Launch handoffs.
 *
 * Requirements:
 * - Full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Strictly NO usage of Sparkles from lucide-react. Uses Crown, Play, Trophy, Users, Zap, Sun, Moon.
 * - WCAG 2.1 AA compliant focus rings.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { GameKind } from "@shared/types.js";
import { useViewport } from "../../lib/useViewport";
import { useGangStore } from "../../store/gangStore";
import { toastStore } from "../../lib/toastStore";
import { useLeaveWhenGangGone } from "./useLeaveWhenGangGone";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import { usePlayerId } from "../../lib/playerIdentity";
import { GangHubDesktop } from "./GangHubDesktop";
import { GangHubMobile } from "./GangHubMobile";
import { CoinTransferModal } from "./CoinTransferModal";
import { CoinRequestCooldownModal } from "./CoinRequestCooldownModal";
import { useCoinRequestAction } from "./useCoinRequestAction";
import InviteShareSheet from "../../components/gang/InviteShareSheet";
import GroupInfoModal from "../../components/gang/GroupInfoModal";
import MemberManagementSheet from "../../components/gang/MemberManagementSheet";
import LeaveGangDialog from "../../components/gang/LeaveGangDialog";
import { leaveGangFlow } from "./gangLeaveFlow";
import PendingRequestsPanel from "../../components/gang/PendingRequestsPanel";
import IncomingCoinRequestBanner from "../../components/gang/IncomingCoinRequestBanner";
import NotificationLevelSheet from "../../components/gang/NotificationLevelSheet";
import { useGangReadTracking } from "../../hooks/useGangReadTracking";
import { useGangInboxStore } from "../../store/gangInboxStore";
import { insertUnreadDivider } from "../../lib/gangUnreadDivider";
import AppLayout from "../../components/layout/AppLayout";
import { useTranslation } from "../../hooks/useTranslation";
import { useIsMinor } from "../../hooks/useAgeGatePending";
import { AlbumButton, AlbumCover } from "../../components/gang/album";

export default function GangHubPage(): JSX.Element {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  // The owner deleting this Gang while it is open (for them or anyone else) takes everyone back to the list.
  useLeaveWhenGangGone();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const viewport = useViewport();
  const { playerId } = usePlayerId();
  const isMember = useAuthStore((s) => s.isMember);
  const playerName = useRoomStore((s) => s.playerName);
  const avatarId = useRoomStore((s) => s.avatarId);

  const [showCoinTransfer, setShowCoinTransfer] = useState(false);
  const isMinor = useIsMinor();
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
  const [joinFailed, setJoinFailed] = useState(false);
  const { t } = useTranslation();

  const {
    activeGang,
    members,
    channels,
    activeChannelId,
    messages,
    memories,
    coinRequests,
    pendingJoinRequests,
    isLoading,
    errorMessage,
    fetchGangByHandleOrId,
    setActiveChannel,
    sendMessage,
    reactToMessage,
    joinGang,
    leaveGang,
    initGangSocket,
    cleanupGangSocket,
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
    updateGangSettings,
    deleteGang,
  } = useGangStore();

  // A Gang is one conversation plus its games. The older "announcements" and
  // "squad-formation" rooms are no longer shown: only text rooms are offered, and the
  // active room is always one of them (the games have their own view).
  const chatChannels = useMemo(() => {
    const text = channels.filter((c) => c.type === "TEXT");
    return text.length > 0 ? text : channels;
  }, [channels]);
  const chatChannelId = chatChannels.some((c) => c.channelId === activeChannelId)
    ? activeChannelId
    : chatChannels[0]?.channelId ?? null;

  const coinRequest = useCoinRequestAction({
    gangId: activeGang?.id ?? null,
    playerId,
    members,
    channels: chatChannels,
    activeChannelId: chatChannelId,
  });

  useEffect(() => {
    if (handle) {
      fetchGangByHandleOrId(handle);
    }
  }, [handle, fetchGangByHandleOrId]);

  // Resolve a `?invite=<token>` link once the Gang loads. A valid,
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
        setInviteError(t("gang.visit.inviteBad"));
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
    if (activeGang?.id && playerId && isMemberOfActive) {
      initGangSocket(activeGang.id, playerId);
      return () => {
        cleanupGangSocket(activeGang.id, playerId);
      };
    }
  }, [activeGang?.id, playerId, isMemberOfActive, initGangSocket, cleanupGangSocket]);

  const selfMember = members.find((m) => m.playerId === playerId);
  const selfRole: string = selfMember?.role ?? "MEMBER";
  const isOwner = selfRole === "OWNER";
  const isAdmin = selfRole === "ADMIN";
  const canManageMembers = isOwner || isAdmin;
  const canEditInfo = isOwner || isAdmin || activeGang?.editPermission === "ALL";

  // What the member had not read on arrival (for the "New messages" line), and
  // keeping their read pointer current while they are here.
  const unreadSince = useGangReadTracking(
    activeGang?.id ?? null,
    isMember && Boolean(selfMember),
    chatChannelId ? messages[chatChannelId]?.length ?? 0 : 0
  );
  const notificationLevel = useGangInboxStore(
    (s) => s.digests.find((d) => d.gangId === activeGang?.id)?.level ?? "ALL"
  );
  const setNotificationLevel = useGangInboxStore((s) => s.setLevel);

  // Only owners/admins ever need the pending-requests list — avoid an
  // unnecessary fetch (and an unnecessary 403 for ordinary members) for
  // everyone else.
  useEffect(() => {
    if (activeGang?.id && canManageMembers) {
      fetchPendingJoinRequests(activeGang.id);
    }
  }, [activeGang?.id, canManageMembers, fetchPendingJoinRequests]);

  // Keep the store's active room on a conversation room (it may still point at a hidden one).
  useEffect(() => {
    if (chatChannelId && chatChannelId !== activeChannelId) setActiveChannel(chatChannelId);
  }, [chatChannelId, activeChannelId, setActiveChannel]);

  if (!isLoading && errorMessage && !activeGang) {
    return (
      <AppLayout>
        <div className="album-surface flex min-h-[70vh] flex-1 flex-col items-center justify-center p-6 text-center">
          <h2 className="m-0 text-xl font-semibold text-album-ink">{t("gang.gone.title")}</h2>
          <p className="mb-6 mt-2 max-w-sm text-[15px] leading-relaxed text-album-ink2">{errorMessage}</p>
          <AlbumButton variant="primary" size="lg" onClick={() => navigate("/gang")}>
            {t("gang.gone.action")}
          </AlbumButton>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !activeGang) {
    return (
      <AppLayout>
        <div className="album-surface flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-3 text-album-ink2">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-album-line border-t-album-foil motion-reduce:animate-none" />
          <p role="status" className="m-0 text-[15px]">
            {t("gang.loading")}
          </p>
        </div>
      </AppLayout>
    );
  }

  const isCurrentMember = members.some((m) => m.playerId === playerId);
  const activeChannelMessages = chatChannelId ? messages[chatChannelId] || [] : [];

  // Requests where I am the person being asked, still open and unexpired.
  const now = Date.now();
  const incomingCoinRequests = Object.values(coinRequests)
    .filter((r) => r.payerIdentityId === playerId && r.status === "OPEN" && r.expiresAt > now)
    .sort((a, b) => a.createdAt - b.createdAt);

  // Joins as this device's identity. A refusal is said in the page, not in an alert box.
  const handleJoin = async () => {
    setJoinFailed(false);
    const res = await joinGang(
      activeGang.id,
      undefined,
      {
        playerId: playerId || undefined,
        displayName: playerName || "Gang Member",
        avatar: avatarId || "file_0000000084c48208b1f893419d784cf2_1.jpg",
      },
      inviteInvitationId
    );
    if (!res.success) {
      setJoinFailed(true);
      return;
    }
    if (inviteToken) {
      searchParams.delete("invite");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleOpenCoinTransfer = (memberId?: string) => {
    setPreselectedMemberId(memberId);
    setCoinTransferInitialType("SEND");
    setShowCoinTransfer(true);
  };

  const sharedProps = {
    gang: activeGang,
    members,
    channels: chatChannels,
    activeChannelId: chatChannelId,
    messages: insertUnreadDivider(activeChannelMessages, unreadSince, playerId) as typeof activeChannelMessages,
    notificationLevel,
    onOpenNotificationSettings: () => setShowNotificationSettings(true),
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
    // A real room is made by the normal create flow (AppLayout opens it for `state.newRoom`), and
    // `shareToGang` makes the sheet post the finished room into this group.
    onStartGame: async (game: GameKind) => {
      navigate("/", { state: { newRoom: game, shareToGang: activeGang.id } });
      return { success: true };
    },
    // Under-18 limited mode: no sending or asking for coins between players (every entry point hides when this is absent).
    onOpenCoinTransfer: isMinor ? undefined : handleOpenCoinTransfer,
    onRequestCoins: () => void coinRequest.requestCoins(),
    onPayCoinRequest: fundCoinRequest,
    onPinMessage: (channelId: string, messageId: string, pinned: boolean) => pinMessage(channelId, messageId, pinned),
    onDeleteMessage: (channelId: string, messageId: string) => deleteMessage(channelId, messageId),
    onOpenInvite: () => setShowInvite(true),
    onOpenGroupInfo: () => setShowGroupInfo(true),
    onOpenMembers: () => setShowMembers(true),
    onOpenPendingRequests: () => setShowPendingRequests(true),
    // Opens the confirmation. Both layouts share this, so it is the one place leaving is started.
    onLeaveGang: () => setShowLeave(true),
  };

  return (
    // The phone layout of a group you belong to carries its own bottom tabs and a back arrow to the list, so the
    // global bar steps aside (a stranger's storefront and the desktop layout have no tabs of their own).
    <AppLayout
      customTail={activeGang ? `@${activeGang.handle}` : undefined}
      tabBar={!(isCurrentMember && viewport === "mobile")}
    >
      <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden relative select-none">
        {isCurrentMember && (
          <IncomingCoinRequestBanner requests={incomingCoinRequests} members={members} onPay={fundCoinRequest} />
        )}

        {/* Responsive Viewport Switcher */}
        <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
          {!isCurrentMember ? (
            // Someone who is not in this Gang sees its storefront: never its
            // conversation or its controls. The server sends them nothing more.
            <div className="album-surface flex flex-1 items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-sm">
                <AlbumCover
                  variant="tile"
                  gangId={activeGang.id}
                  name={activeGang.name}
                  subtitle={t("gang.visit.people", { count: activeGang.memberCount, max: activeGang.maxMembers })}
                />
                <div className="mt-6 text-center">
                  <p className="m-0 text-lg font-semibold leading-snug text-album-ink">
                    {inviteInvitationId
                      ? t("gang.visit.invited", { name: activeGang.name })
                      : t("gang.visit.preview", { name: activeGang.name })}
                  </p>
                  {activeGang.description && (
                    <p className="mb-0 mt-2 text-[15px] leading-relaxed text-album-ink2">{activeGang.description}</p>
                  )}
                  <p className="mb-0 mt-2 text-[15px] leading-relaxed text-album-ink3">
                    {isMember ? t("gang.visit.body") : t("gang.visit.signInPrompt", { name: activeGang.name })}
                  </p>
                  {(inviteError || joinFailed) && (
                    <p role="alert" className="mb-0 mt-3 text-[15px] font-medium leading-relaxed text-album-danger">
                      {inviteError ?? t("gang.visit.joinFailed")}
                    </p>
                  )}
                  <AlbumButton
                    variant="primary"
                    size="lg"
                    className="mt-5 w-full"
                    onClick={isMember ? handleJoin : () => navigate("/login")}
                  >
                    {isMember ? t("gang.visit.join", { name: activeGang.name }) : t("gang.visit.signIn")}
                  </AlbumButton>
                </div>
              </div>
            </div>
          ) : viewport === "desktop" ? (
            <GangHubDesktop {...sharedProps} />
          ) : (
            <GangHubMobile {...sharedProps} />
          )}
        </div>

      {/* Coin Transfer Modal (For sending coins) */}
      {showCoinTransfer && activeGang && !isMinor && (
        <CoinTransferModal
          gangId={activeGang.id}
          channelId={chatChannelId ?? undefined}
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

      {activeGang && (
        <InviteShareSheet
          open={showInvite}
          onClose={() => setShowInvite(false)}
          gangName={activeGang.name}
          gangHandle={activeGang.handle}
          onCreateLink={async () => {
            const res = await createInviteLink(activeGang.id);
            return { success: res.success, token: res.invitation?.token, error: res.error };
          }}
        />
      )}

      {activeGang && (
        <GroupInfoModal
          open={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          gang={activeGang}
          canEditInfo={canEditInfo}
          isOwner={isOwner}
          onSave={(patch) => updateGangSettings(activeGang.id, patch)}
          onDelete={async (confirmHandle) => {
            const result = await deleteGang(activeGang.id, confirmHandle);
            if (result.success) toastStore.show(`“${activeGang.name}” was deleted.`, "success");
            return result;
          }}
        />
      )}

      {activeGang && (
        <LeaveGangDialog
          open={showLeave}
          onClose={() => setShowLeave(false)}
          gangName={activeGang.name}
          isOwner={isOwner}
          candidates={members
            .filter((m) => m.playerId !== playerId && m.state === "ACTIVE")
            .map((m) => ({ playerId: m.playerId, displayName: m.displayName, role: m.role }))}
          onLeave={async (newHostId) => {
            const result = await leaveGangFlow({ transferOwnership, leaveGang }, activeGang.id, newHostId);
            if (result.success) navigate("/gang", { replace: true });
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
        onPromote={(targetId) => promoteMember(activeGang.id, targetId)}
        onDemote={(targetId) => demoteMember(activeGang.id, targetId)}
        onKick={(targetId) => kickMember(activeGang.id, targetId)}
        onBan={(targetId) => banMember(activeGang.id, targetId)}
        onTransferOwnership={(targetId) => transferOwnership(activeGang.id, targetId)}
      />

      {isCurrentMember && (
        <NotificationLevelSheet
          open={showNotificationSettings}
          onClose={() => setShowNotificationSettings(false)}
          gangName={activeGang.name}
          level={notificationLevel}
          onChange={(level) => setNotificationLevel(activeGang.id, level)}
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

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

import React, { useEffect, useMemo, useState } from "react";
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
import { Play } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton, AlbumCover, AlbumSheet } from "../../components/mandali/album";
import { gameLabel } from "../../components/mandali/album/games";

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
  const [joinFailed, setJoinFailed] = useState(false);
  const { t } = useTranslation();

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

  // A Mandali is one conversation plus its games. The older "announcements" and
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
    mandaliId: activeMandali?.id ?? null,
    playerId,
    members,
    channels: chatChannels,
    activeChannelId: chatChannelId,
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
        setInviteError(t("mandali.visit.inviteBad"));
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
    chatChannelId ? messages[chatChannelId]?.length ?? 0 : 0
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

  // Keep the store's active room on a conversation room (it may still point at a hidden one).
  useEffect(() => {
    if (chatChannelId && chatChannelId !== activeChannelId) setActiveChannel(chatChannelId);
  }, [chatChannelId, activeChannelId, setActiveChannel]);

  if (!isLoading && errorMessage && !activeMandali) {
    return (
      <AppLayout>
        <div className="album-surface flex min-h-[70vh] flex-1 flex-col items-center justify-center p-6 text-center">
          <h2 className="m-0 text-xl font-semibold text-album-ink">{t("mandali.gone.title")}</h2>
          <p className="mb-6 mt-2 max-w-sm text-[15px] leading-relaxed text-album-ink2">{errorMessage}</p>
          <AlbumButton variant="primary" size="lg" onClick={() => navigate("/mandali")}>
            {t("mandali.gone.action")}
          </AlbumButton>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !activeMandali) {
    return (
      <AppLayout>
        <div className="album-surface flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-3 text-album-ink2">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-album-line border-t-album-foil motion-reduce:animate-none" />
          <p role="status" className="m-0 text-[15px]">
            {t("mandali.loading")}
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

  const handleLaunchToRoom = () => {
    if (!activeGameLaunch) return;
    const targetRoom = activeGameLaunch.roomCode;
    clearActiveLaunch();
    navigate(`/room/${targetRoom}`);
  };

  // Joins as this device's identity. A refusal is said in the page, not in an alert box.
  const handleJoin = async () => {
    setJoinFailed(false);
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
    mandali: activeMandali,
    members,
    channels: chatChannels,
    activeChannelId: chatChannelId,
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
        {isCurrentMember && (
          <IncomingCoinRequestBanner requests={incomingCoinRequests} members={members} onPay={fundCoinRequest} />
        )}

        {/* Responsive Viewport Switcher */}
        <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
          {!isCurrentMember ? (
            // Someone who is not in this Mandali sees its storefront: never its
            // conversation or its controls. The server sends them nothing more.
            <div className="album-surface flex flex-1 items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-sm">
                <AlbumCover
                  variant="tile"
                  mandaliId={activeMandali.id}
                  name={activeMandali.name}
                  subtitle={t("mandali.visit.people", { count: activeMandali.memberCount, max: activeMandali.maxMembers })}
                />
                <div className="mt-6 text-center">
                  <p className="m-0 text-lg font-semibold leading-snug text-album-ink">
                    {inviteInvitationId
                      ? t("mandali.visit.invited", { name: activeMandali.name })
                      : t("mandali.visit.preview", { name: activeMandali.name })}
                  </p>
                  {activeMandali.description && (
                    <p className="mb-0 mt-2 text-[15px] leading-relaxed text-album-ink2">{activeMandali.description}</p>
                  )}
                  <p className="mb-0 mt-2 text-[15px] leading-relaxed text-album-ink3">
                    {isMember ? t("mandali.visit.body") : t("mandali.visit.signInPrompt", { name: activeMandali.name })}
                  </p>
                  {(inviteError || joinFailed) && (
                    <p role="alert" className="mb-0 mt-3 text-[15px] font-medium leading-relaxed text-album-danger">
                      {inviteError ?? t("mandali.visit.joinFailed")}
                    </p>
                  )}
                  <AlbumButton
                    variant="primary"
                    size="lg"
                    className="mt-5 w-full"
                    onClick={isMember ? handleJoin : () => navigate("/login")}
                  >
                    {isMember ? t("mandali.visit.join", { name: activeMandali.name }) : t("mandali.visit.signIn")}
                  </AlbumButton>
                </div>
              </div>
            </div>
          ) : viewport === "desktop" ? (
            <MandaliHubDesktop {...sharedProps} />
          ) : (
            <MandaliHubMobile {...sharedProps} />
          )}
        </div>

      {/* The game the group just opened: one calm prompt, one way in */}
      <AlbumSheet
        open={Boolean(activeGameLaunch)}
        onClose={clearActiveLaunch}
        title={activeGameLaunch ? t("mandali.launch.title", { game: gameLabel(activeGameLaunch.game) }) : ""}
        description={t("mandali.launch.body")}
        footer={
          <div className="flex gap-3">
            <AlbumButton variant="quiet" className="flex-1" onClick={clearActiveLaunch}>
              {t("mandali.launch.dismiss")}
            </AlbumButton>
            <AlbumButton variant="primary" className="flex-1" onClick={handleLaunchToRoom} icon={<Play className="h-4 w-4 fill-current" aria-hidden="true" />}>
              {t("mandali.launch.join")}
            </AlbumButton>
          </div>
        }
      >
        <p className="m-0 text-sm text-album-ink3">{t("mandali.launch.code")}</p>
        <p className="mb-1 mt-1 text-3xl font-semibold tabular-nums tracking-[0.2em] text-album-ink">{activeGameLaunch?.roomCode}</p>
      </AlbumSheet>

      {/* Coin Transfer Modal (For sending coins) */}
      {showCoinTransfer && activeMandali && (
        <CoinTransferModal
          mandaliId={activeMandali.id}
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

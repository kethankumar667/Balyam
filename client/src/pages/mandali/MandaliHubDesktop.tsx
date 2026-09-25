/**
 * BHALYAM Mandali — desktop layout (>= 1024 px).
 *
 * An open album spread, not the phone stretched wide:
 *   left   — the cover, everything you can do with the group, and its rooms
 *   middle — the page: the conversation (or, in a game room, what is being played)
 *   right  — the facing page: who is here, and the group's memories
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - Mouse and keyboard first: visible focus, sensible tab order, no hover-only actions.
 * - Zero usage of Sparkles from lucide-react.
 * - Every visible string goes through t() so the group can read it in their language.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Gamepad2, Hash, Megaphone, Plus } from "lucide-react";
import type { NotificationLevel } from "@shared/mandali/notifications.js";
import type {
  Mandali,
  MandaliChannel,
  MandaliCoinRequest,
  MandaliMember,
  MandaliMemory,
  MandaliMessage,
  MandaliParty,
} from "@shared/mandali/types.js";
import type { GameKind } from "@shared/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { PartyLoungeCard } from "../../components/mandali/PartyLoungeCard";
import { GnapakaluTimeline } from "../../components/mandali/GnapakaluTimeline";
import {
  AlbumButton,
  AlbumCover,
  Composer,
  GroupMenu,
  MessageFeed,
  PeopleList,
  StartGameSheet,
} from "../../components/mandali/album";

export interface MandaliHubDesktopProps {
  mandali: Mandali;
  members: MandaliMember[];
  channels: MandaliChannel[];
  activeChannelId: string | null;
  messages: MandaliMessage[];
  parties: MandaliParty[];
  memories: MandaliMemory[];
  currentUserId: string | null;
  selfId: string;
  isOwner: boolean;
  canManageMembers: boolean;
  canEditInfo: boolean;
  pendingRequestCount: number;
  coinRequests: Record<string, MandaliCoinRequest>;
  onSelectChannel: (channelId: string) => void;
  onSendMessage: (content: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onCreateParty: (game: GameKind, modeId: string, title: string, slots: number) => void;
  onJoinParty: (partyId: string) => void;
  onLeaveParty: (partyId: string) => void;
  onLaunchParty: (partyId: string) => void;
  onOpenCoinTransfer?: (preselectedMemberId?: string) => void;
  onRequestCoins: () => void;
  isCoinRequestCoolingDown?: boolean;
  onPayCoinRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  onPinMessage: (channelId: string, messageId: string, pinned: boolean) => Promise<{ success: boolean; error?: string }>;
  onDeleteMessage: (channelId: string, messageId: string) => Promise<{ success: boolean; error?: string }>;
  onOpenInvite: () => void;
  onOpenGroupInfo: () => void;
  onOpenMembers: () => void;
  onOpenPendingRequests: () => void;
  onLeaveMandali: () => void;
  notificationLevel?: NotificationLevel;
  onOpenNotificationSettings?: () => void;
}

/** How many memories the facing page shows before the full list on the Memories screen. */
const MEMORIES_ON_FACING_PAGE = 3;

export const MandaliHubDesktop: React.FC<MandaliHubDesktopProps> = ({
  mandali,
  members,
  channels,
  activeChannelId,
  messages,
  parties,
  memories,
  currentUserId,
  selfId,
  canManageMembers,
  pendingRequestCount,
  coinRequests,
  onSelectChannel,
  onSendMessage,
  onReactMessage,
  onCreateParty,
  onJoinParty,
  onLeaveParty,
  onLaunchParty,
  onOpenCoinTransfer,
  onRequestCoins,
  isCoinRequestCoolingDown,
  onPayCoinRequest,
  onPinMessage,
  onDeleteMessage,
  onOpenInvite,
  onOpenGroupInfo,
  onOpenMembers,
  onOpenPendingRequests,
  onLeaveMandali,
  notificationLevel = "ALL",
  onOpenNotificationSettings,
}) => {
  const { t } = useTranslation();
  const [startOpen, setStartOpen] = useState(false);

  const activeChannel = channels.find((c) => c.channelId === activeChannelId) ?? channels[0];
  const isPlayRoom = activeChannel?.type === "PARTY_FINDING" || Boolean(activeChannel?.name.includes("squad"));
  const onlineCount = members.filter((m) => m.presence === "online" || m.presence === "in-game").length;

  return (
    <div className="album-surface flex h-full min-h-0 w-full flex-1 overflow-hidden">
      {/* ── Left: the cover, the menu, the rooms ── */}
      <aside className="album-scroll flex w-64 flex-shrink-0 flex-col overflow-y-auto border-r border-album-line bg-album-page xl:w-72">
        <div className="p-4 pb-3">
          <Link
            to="/mandali"
            className="album-focus -ml-1 mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg pl-1 pr-3 text-sm font-semibold text-album-ink2 transition-colors hover:text-album-foil"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t("mandali.back.all")}
          </Link>
          <AlbumCover
            variant="card"
            mandaliId={mandali.id}
            name={mandali.name}
            subtitle={
              <>
                <span className="block">@{mandali.handle}</span>
                <span className="block">
                  {t("mandali.header.people", { count: members.length })}
                  {onlineCount > 0 ? ` · ${t("mandali.header.hereNow", { count: onlineCount })}` : ""}
                </span>
              </>
            }
          />
        </div>

        <section aria-labelledby="mandali-rooms" className="px-2 pb-2 pt-1">
          <h2 id="mandali-rooms" className="m-0 px-3 pb-1.5 text-sm font-semibold text-album-ink3">
            {t("mandali.rooms.title")}
          </h2>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {channels.map((channel) => {
              const current = channel.channelId === activeChannelId;
              const Icon = channel.type === "PARTY_FINDING" ? Gamepad2 : channel.type === "ANNOUNCEMENT" ? Megaphone : Hash;
              return (
                <li key={channel.channelId}>
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel.channelId)}
                    aria-current={current ? "true" : undefined}
                    className={`album-focus flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold transition-colors ${
                      current ? "bg-album-foilfill/20 text-album-ink" : "text-album-ink2 hover:bg-album-field"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-album-foil" aria-hidden="true" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <nav aria-label={mandali.name} className="mt-2 border-t border-album-line px-2 pb-4 pt-3">
          <GroupMenu
            notificationLevel={notificationLevel}
            canManageMembers={canManageMembers}
            pendingRequestCount={pendingRequestCount}
            onInvite={onOpenInvite}
            onCoins={onOpenCoinTransfer ? () => onOpenCoinTransfer() : undefined}
            onInfo={onOpenGroupInfo}
            onNotifications={onOpenNotificationSettings}
            onManage={onOpenMembers}
            onRequests={onOpenPendingRequests}
            onLeave={onLeaveMandali}
          />
        </nav>
      </aside>

      {/* ── Middle: the page ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[64px] flex-shrink-0 items-center justify-between gap-4 border-b border-album-line px-6 py-3">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-lg font-semibold leading-tight text-album-ink">{activeChannel?.name ?? ""}</h2>
            <p className="m-0 mt-0.5 truncate text-sm text-album-ink3">{activeChannel?.description || t("mandali.rooms.default")}</p>
          </div>
          {isPlayRoom && (
            <AlbumButton variant="primary" onClick={() => setStartOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              {t("mandali.play.start")}
            </AlbumButton>
          )}
        </header>

        {isPlayRoom ? (
          <div className="album-scroll flex-1 overflow-y-auto p-6">
            {parties.length === 0 ? (
              <div className="mx-auto max-w-md px-4 py-20 text-center">
                <p className="album-hand m-0 text-5xl leading-none text-album-foil">{t("mandali.play.empty.title")}</p>
                <p className="mb-6 mt-4 text-base leading-relaxed text-album-ink2">
                  {t("mandali.play.empty.body", { name: mandali.name })}
                </p>
                <AlbumButton variant="primary" size="lg" onClick={() => setStartOpen(true)}>
                  {t("mandali.play.empty.action")}
                </AlbumButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {parties.map((party) => (
                  <PartyLoungeCard
                    key={party.partyId}
                    party={party}
                    currentUserId={currentUserId}
                    onJoin={onJoinParty}
                    onLeave={onLeaveParty}
                    onLaunch={onLaunchParty}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <MessageFeed
              variant="desktop"
              messages={messages}
              members={members}
              mandaliName={mandali.name}
              currentUserId={currentUserId}
              selfId={selfId}
              coinRequests={coinRequests}
              canManageMembers={canManageMembers}
              onReact={onReactMessage}
              onPin={onPinMessage}
              onDelete={onDeleteMessage}
              onPayCoinRequest={onPayCoinRequest}
            />
            <Composer
              variant="desktop"
              groupName={mandali.name}
              onSend={onSendMessage}
              onRequestCoins={onRequestCoins}
              coinCoolingDown={isCoinRequestCoolingDown}
            />
          </>
        )}
      </main>

      {/* ── Right: the facing page ── */}
      <aside className="album-scroll w-64 flex-shrink-0 space-y-6 overflow-y-auto border-l border-album-line bg-album-raised p-4 shadow-[inset_10px_0_14px_-12px_rgb(0_0_0/0.35)] xl:w-72 xl:p-5">
        <section aria-labelledby="mandali-people">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 id="mandali-people" className="m-0 text-lg font-semibold text-album-ink">
                {t("mandali.people.title")}
              </h2>
              <p className="m-0 text-sm text-album-ink3">
                {t("mandali.header.people", { count: members.length })}
                {onlineCount > 0 ? ` · ${t("mandali.people.online", { count: onlineCount })}` : ""}
              </p>
            </div>
          </div>
          <PeopleList members={members} currentUserId={currentUserId} onCoinsWith={onOpenCoinTransfer ? (id) => onOpenCoinTransfer(id) : undefined} />
        </section>

        <section aria-labelledby="mandali-memories" className="border-t border-album-line pt-6">
          <h2 id="mandali-memories" className="m-0 flex flex-wrap items-baseline gap-x-3 text-lg font-semibold text-album-ink">
            {t("mandali.memories.title")}
            <span className="album-hand text-2xl font-normal text-album-foil">{t("mandali.memories.script")}</span>
          </h2>
          <p className="mb-3 mt-1 text-sm text-album-ink3">{t("mandali.memories.hint")}</p>
          <GnapakaluTimeline memories={memories.slice(0, MEMORIES_ON_FACING_PAGE)} compact />
        </section>
      </aside>

      <StartGameSheet open={startOpen} onClose={() => setStartOpen(false)} onStart={(game, title, seats) => onCreateParty(game, "casual", title, seats)} />
    </div>
  );
};

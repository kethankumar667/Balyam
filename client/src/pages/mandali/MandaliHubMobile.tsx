/**
 * BHALYAM Mandali — phone layout (< 768 px).
 *
 * The group's album, held in one hand. A leatherette cover across the top with
 * the group's name stamped on it; the conversation below; four plain tabs along
 * the thumb: Chat, Play, Memories, People. Everything you can do with the group
 * lives in one labelled menu, not in a grid of tiny icons.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - Touch targets at least 44 x 44 px; body text at least 15 px.
 * - Zero usage of Sparkles from lucide-react.
 * - Every visible string goes through t() so the group can read it in their language.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, Gamepad2, Hash, Link2, MessageSquare, MoreVertical, Plus, Users } from "lucide-react";
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
  AlbumSheet,
  Composer,
  GroupMenu,
  MessageFeed,
  PeopleList,
  StartGameSheet,
} from "../../components/mandali/album";

export interface MandaliHubMobileProps {
  mandali: Mandali;
  members: MandaliMember[];
  channels: MandaliChannel[];
  activeChannelId: string | null;
  messages: MandaliMessage[];
  parties: MandaliParty[];
  memories: MandaliMemory[];
  currentUserId: string | null;
  onSelectChannel: (channelId: string) => void;
  onSendMessage: (content: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onCreateParty: (game: GameKind, modeId: string, title: string, slots: number) => void;
  onJoinParty: (partyId: string) => void;
  onLeaveParty: (partyId: string) => void;
  onLaunchParty: (partyId: string) => void;
  onOpenCoinTransfer?: (preselectedMemberId?: string) => void;
  onLeaveMandali: () => void;
  selfId: string | null;
  isOwner: boolean;
  canManageMembers: boolean;
  canEditInfo: boolean;
  pendingRequestCount: number;
  coinRequests: Record<string, MandaliCoinRequest>;
  onRequestCoins: () => void;
  isCoinRequestCoolingDown?: boolean;
  onPayCoinRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  onPinMessage: (channelId: string, messageId: string, pinned: boolean) => void;
  onDeleteMessage: (channelId: string, messageId: string) => void;
  onOpenInvite: () => void;
  onOpenGroupInfo: () => void;
  onOpenMembers: () => void;
  onOpenPendingRequests: () => void;
  notificationLevel?: NotificationLevel;
  onOpenNotificationSettings?: () => void;
}

type Tab = "chat" | "play" | "memories" | "people";

const TABS: ReadonlyArray<{ id: Tab; icon: typeof MessageSquare; labelKey: string }> = [
  { id: "chat", icon: MessageSquare, labelKey: "mandali.tab.chat" },
  { id: "play", icon: Gamepad2, labelKey: "mandali.tab.play" },
  { id: "memories", icon: BookOpen, labelKey: "mandali.tab.memories" },
  { id: "people", icon: Users, labelKey: "mandali.tab.people" },
];

const COVER_ICON_BUTTON =
  "album-focus flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl text-[rgb(var(--album-cover-foil))] transition-colors hover:bg-white/10";

export const MandaliHubMobile: React.FC<MandaliHubMobileProps> = ({
  mandali,
  members,
  channels,
  activeChannelId,
  messages,
  parties,
  memories,
  currentUserId,
  onSelectChannel,
  onSendMessage,
  onReactMessage,
  onCreateParty,
  onJoinParty,
  onLeaveParty,
  onLaunchParty,
  onOpenCoinTransfer,
  onLeaveMandali,
  selfId,
  canManageMembers,
  pendingRequestCount,
  coinRequests,
  onRequestCoins,
  isCoinRequestCoolingDown,
  onPayCoinRequest,
  onPinMessage,
  onDeleteMessage,
  onOpenInvite,
  onOpenGroupInfo,
  onOpenMembers,
  onOpenPendingRequests,
  notificationLevel = "ALL",
  onOpenNotificationSettings,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  const activeChannel = channels.find((c) => c.channelId === activeChannelId) ?? channels[0];
  const onlineCount = members.filter((m) => m.presence === "online" || m.presence === "in-game").length;
  const subtitle = [
    t("mandali.header.people", { count: members.length }),
    onlineCount > 0 ? t("mandali.header.hereNow", { count: onlineCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="album-surface flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AlbumCover
        variant="band"
        mandaliId={mandali.id}
        name={mandali.name}
        subtitle={subtitle}
        leading={
          <Link to="/mandali" aria-label={t("mandali.back")} className={COVER_ICON_BUTTON}>
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
        }
        trailing={
          <>
            <button type="button" onClick={onOpenInvite} aria-label={t("mandali.menu.invite")} className={COVER_ICON_BUTTON}>
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("mandali.header.menu")}
              aria-haspopup="dialog"
              className={COVER_ICON_BUTTON}
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        }
      />

      <main className="relative flex min-h-0 flex-1 flex-col">
        {tab === "chat" && (
          <>
            {channels.length > 1 && (
              <div className="flex-shrink-0 border-b border-album-line px-3 py-1.5">
                <AlbumButton
                  variant="ghost"
                  onClick={() => setRoomsOpen(true)}
                  icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                  className="!min-h-[40px] !px-2.5 !text-sm"
                >
                  {t("mandali.channel.switch", { name: activeChannel?.name ?? "" })}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </AlbumButton>
              </div>
            )}
            <MessageFeed
              variant="phone"
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
              variant="phone"
              groupName={mandali.name}
              onSend={onSendMessage}
              onRequestCoins={onRequestCoins}
              coinCoolingDown={isCoinRequestCoolingDown}
            />
          </>
        )}

        {tab === "play" && (
          <div className="album-scroll flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-semibold text-album-ink">{t("mandali.play.title")}</h2>
              {parties.length > 0 && (
                <AlbumButton variant="primary" onClick={() => setStartOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  {t("mandali.play.start")}
                </AlbumButton>
              )}
            </div>
            {parties.length === 0 ? (
              <div className="flex min-h-[55dvh] flex-col items-center justify-center px-4 py-8 text-center">
                <p className="album-hand m-0 text-4xl leading-none text-album-foil">{t("mandali.play.empty.title")}</p>
                <p className="mx-auto mb-5 mt-3 max-w-xs text-[15px] leading-relaxed text-album-ink2">
                  {t("mandali.play.empty.body", { name: mandali.name })}
                </p>
                <AlbumButton variant="primary" size="lg" onClick={() => setStartOpen(true)}>
                  {t("mandali.play.empty.action")}
                </AlbumButton>
              </div>
            ) : (
              <div className="space-y-3">
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
        )}

        {tab === "memories" && (
          <div className="album-scroll flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4">
              <h2 className="m-0 flex flex-wrap items-baseline gap-x-3 text-xl font-semibold text-album-ink">
                {t("mandali.memories.title")}
                <span className="album-hand text-2xl font-normal text-album-foil">{t("mandali.memories.script")}</span>
              </h2>
              <p className="m-0 mt-1 text-sm text-album-ink3">{t("mandali.memories.hint")}</p>
            </div>
            <GnapakaluTimeline memories={memories} />
          </div>
        )}

        {tab === "people" && (
          <div className="album-scroll flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="m-0 text-xl font-semibold text-album-ink">{t("mandali.people.title")}</h2>
                <p className="m-0 mt-0.5 text-sm text-album-ink3">
                  {t("mandali.header.people", { count: members.length })}
                  {onlineCount > 0 ? ` · ${t("mandali.people.online", { count: onlineCount })}` : ""}
                </p>
              </div>
            </div>
            <PeopleList members={members} currentUserId={currentUserId} onCoinsWith={onOpenCoinTransfer ? (id) => onOpenCoinTransfer(id) : undefined} />
            <div className="px-1 pt-4">
              <AlbumButton variant="quiet" size="lg" onClick={onOpenInvite} icon={<Link2 className="h-4 w-4" aria-hidden="true" />} className="w-full">
                {t("mandali.menu.invite")}
              </AlbumButton>
            </div>
          </div>
        )}
      </main>

      <nav aria-label={mandali.name} className="grid flex-shrink-0 grid-cols-4 border-t border-album-line bg-album-page pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? "page" : undefined}
              className={`album-focus relative flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                active ? "text-album-foil" : "text-album-ink3 hover:text-album-ink"
              }`}
            >
              <span aria-hidden="true" className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full ${active ? "bg-album-foilfill" : "bg-transparent"}`} />
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {t(labelKey)}
            </button>
          );
        })}
      </nav>

      <AlbumSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={mandali.name} description={`@${mandali.handle}`}>
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
          onChoose={() => setMenuOpen(false)}
        />
      </AlbumSheet>

      <AlbumSheet open={roomsOpen} onClose={() => setRoomsOpen(false)} title={t("mandali.channel.title")}>
        <ul className="m-0 list-none space-y-1 p-0">
          {channels.map((channel) => {
            const current = channel.channelId === activeChannelId;
            return (
              <li key={channel.channelId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectChannel(channel.channelId);
                    setRoomsOpen(false);
                    setTab("chat");
                  }}
                  aria-current={current ? "true" : undefined}
                  className={`album-focus flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left text-base font-semibold ${
                    current ? "bg-album-foilfill/20 text-album-ink" : "text-album-ink2 hover:bg-album-field"
                  }`}
                >
                  <Hash className="h-[18px] w-[18px] text-album-foil" aria-hidden="true" />
                  {channel.name}
                </button>
              </li>
            );
          })}
        </ul>
      </AlbumSheet>

      <StartGameSheet open={startOpen} onClose={() => setStartOpen(false)} onStart={(game, title, seats) => onCreateParty(game, "casual", title, seats)} />
    </div>
  );
};

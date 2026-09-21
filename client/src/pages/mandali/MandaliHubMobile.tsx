/**
 * BHALYAM Mandali — Futuristic Mobile Hub Layout (< 768px)
 *
 * FAANG/MAANG-grade mobile gaming HUD with 4-tab thumb navigation:
 * - Tab 1: Chat (Active text channel realtime messages + composer)
 * - Tab 2: Squads (Active party squads + form squad bottom sheet)
 * - Tab 3: Gnapakalu (Shared memories timeline)
 * - Tab 4: Members (Roster, presence, and roles)
 *
 * Requirements:
 * - Full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Touch targets strictly >= 44x44px.
 * - Zero usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy, Users, Zap.
 * - Bottom sheets for navigation drawers.
 * - WCAG 2.1 AA focus rings.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Gamepad2,
  Trophy,
  Users,
  ChevronLeft,
  ChevronDown,
  Plus,
  Send,
  Crown,
  LogOut,
  Hash,
  Zap,
  Coins,
} from "lucide-react";
import type {
  Mandali,
  MandaliMember,
  MandaliChannel,
  MandaliMessage,
  MandaliParty,
  MandaliMemory,
} from "@shared/mandali/types.js";
import { PartyLoungeCard } from "../../components/mandali/PartyLoungeCard";
import { GnapakaluTimeline } from "../../components/mandali/GnapakaluTimeline";
import type { GameKind } from "@shared/types.js";

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return "/Bhalyam-logo.png";
  if (avatar.startsWith("/") || avatar.startsWith("http")) return avatar;
  if (avatar.endsWith(".jpg") || avatar.endsWith(".png") || avatar.endsWith(".webp") || avatar.endsWith(".svg")) {
    return `/Avatars/${avatar}`;
  }
  return `/Avatars/${avatar}.png`;
}

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
}

type MobileTab = "chat" | "squads" | "gnapakalu" | "members";

const EMOJI_REACTIONS = ["🔥", "👑", "🎯", "👏", "❤️"];

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
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>("chat");
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [newSquadGame, setNewSquadGame] = useState<GameKind>("ludo");
  const [newSquadTitle, setNewSquadTitle] = useState("");
  const [newSquadSlots, setNewSquadSlots] = useState(4);

  const activeChannel = channels.find((c) => c.channelId === activeChannelId) || channels[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  const handleFormSquad = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateParty(
      newSquadGame,
      "casual",
      newSquadTitle.trim() || `${newSquadGame.toUpperCase()} Squad`,
      newSquadSlots
    );
    setShowCreateSquad(false);
    setNewSquadTitle("");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none transition-colors duration-200">
      {/* ── TOP APP BAR ── */}
      <header className="h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 px-3 flex items-center justify-between z-20 flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            to="/mandali"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Back to Mandalis"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight truncate max-w-[150px]">
              {mandali.name}
            </h1>
            {/* Channel switch trigger */}
            <button
              type="button"
              onClick={() => setShowChannelDrawer(true)}
              className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-bold focus-visible:outline-none"
            >
              <span>#{activeChannel?.name || "lounge-chat"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onLeaveMandali}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
            title="Leave Mandali"
            aria-label="Leave Mandali"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN TAB CONTENT ── */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50/50 dark:bg-slate-950">
        {/* TAB 1: CHAT */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs font-medium">
                  Welcome to #{activeChannel?.name}! Start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.messageId}
                      className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <img
                        src={getAvatarUrl(msg.senderAvatar)}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 object-cover flex-shrink-0 border border-slate-300 dark:border-slate-700 mt-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png";
                        }}
                      />

                      <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          {msg.senderRole === "OWNER" && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-400 font-extrabold">
                              Founder
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                            isMine
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold rounded-tr-none"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Reactions Bar */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {Object.entries(msg.reactions || {}).map(([emoji, players]) => {
                            if (!players || players.length === 0) return null;
                            const hasReacted = currentUserId ? players.includes(currentUserId) : false;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onReactMessage(msg.messageId, emoji)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                                  hasReacted
                                    ? "bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{players.length}</span>
                              </button>
                            );
                          })}

                          {/* Quick Emoji Toggles */}
                          <div className="flex items-center gap-0.5 pl-1">
                            {EMOJI_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onReactMessage(msg.messageId, emoji)}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] active:scale-125"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile Composer */}
            <form
              onSubmit={handleSend}
              className="p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 flex items-center gap-2 flex-shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message #${activeChannel?.name || "chat"}...`}
                maxLength={500}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:border-amber-500 focus:outline-none font-medium"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center disabled:opacity-50 active:scale-95 shadow-sm font-bold"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: SQUADS */}
        {activeTab === "squads" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-500" />
                Active Squads ({parties.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSquad(true)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Form Squad
              </button>
            </div>

            {parties.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <Gamepad2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">No Squads Active</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto mb-3 font-medium">
                  Form a party for Ludo, Hand Cricket, or Rummy to play with Mandali members.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateSquad(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-sm"
                >
                  Form First Squad
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {parties.map((p) => (
                  <PartyLoungeCard
                    key={p.partyId}
                    party={p}
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

        {/* TAB 3: GNAPAKALU (MEMORIES) */}
        {activeTab === "gnapakalu" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Gnapakalu (జ్ఞాపకాలు) Archive
              </h3>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">Shared Memories</span>
            </div>

            <GnapakaluTimeline memories={memories} />
          </div>
        )}

        {/* TAB 4: ROSTER / MEMBERS */}
        {activeTab === "members" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                Mandali Members ({members.length})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {members.filter((m) => m.presence === "online").length} Online
              </span>
            </div>

            {/* Quick Clan Coin Transfer Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Clan Economy</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenCoinTransfer?.()}
                className="min-h-[36px] px-3.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xs transition-all active:scale-95"
              >
                Send / Request
              </button>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.memberId}
                  className="min-h-[48px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={getAvatarUrl(member.avatar)}
                        alt={member.displayName}
                        className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 object-cover border border-slate-300 dark:border-slate-700"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png";
                        }}
                      />
                      <div
                        className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${
                          member.presence === "online" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-none">
                        {member.displayName}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-medium">{member.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {member.playerId !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => onOpenCoinTransfer?.(member.playerId)}
                        className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-amber-500 transition-colors flex items-center justify-center"
                        title={`Send or request coins with ${member.displayName}`}
                      >
                        <Coins className="w-4 h-4" />
                      </button>
                    )}
                    {member.role === "OWNER" && <Crown className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM THUMB TAB BAR ── */}
      <nav className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 grid grid-cols-4 z-20 flex-shrink-0 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "chat" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("squads")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "squads" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px]">Squads</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gnapakalu")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "gnapakalu" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Gnapakalu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "members" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Roster</span>
        </button>
      </nav>

      {/* ── CHANNEL DRAWER BOTTOM SHEET ── */}
      {showChannelDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Select Channel</h3>
              <button
                type="button"
                onClick={() => setShowChannelDrawer(false)}
                className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-900 dark:text-slate-400 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              {channels.map((ch) => (
                <button
                  key={ch.channelId}
                  type="button"
                  onClick={() => {
                    onSelectChannel(ch.channelId);
                    setShowChannelDrawer(false);
                    setActiveTab("chat");
                  }}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    ch.channelId === activeChannelId
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>{ch.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SQUAD CREATION BOTTOM SHEET ── */}
      {showCreateSquad && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-500" />
                Form a Game Squad
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSquad(false)}
                className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-900 dark:text-slate-400 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSquad} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Squad Name
                </label>
                <input
                  type="text"
                  value={newSquadTitle}
                  onChange={(e) => setNewSquadTitle(e.target.value)}
                  placeholder="e.g. Hyderabad Quick Ludo"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Game</label>
                <select
                  value={newSquadGame}
                  onChange={(e) => setNewSquadGame(e.target.value as GameKind)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs capitalize font-medium"
                >
                  <option value="ludo">Ludo (2-4 players)</option>
                  <option value="handcricket">Hand Cricket (2 players)</option>
                  <option value="rummy">Rummy (2-6 players)</option>
                  <option value="snl">Snakes & Ladders (2-4 players)</option>
                  <option value="uno">UNO (2-4 players)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 shadow-md"
                >
                  Form Squad Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

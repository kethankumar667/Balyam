/**
 * BHALYAM Mandali — Mobile Hub Layout (< 768px)
 *
 * Dedicated mobile-first layout with 4-tab thumb navigation:
 * - Tab 1: Chat (Active text channel realtime messages + composer)
 * - Tab 2: Squads (Active party squads + form squad bottom sheet)
 * - Tab 3: Gnapakalu (Shared memories timeline)
 * - Tab 4: Members (Roster, presence, and roles)
 *
 * Rules:
 * - Touch targets strictly >= 44x44px.
 * - Zero usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy, Users.
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ── TOP APP BAR ── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link
            to="/mandali"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Back to Mandalis"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="font-bold text-white text-sm leading-tight truncate max-w-[150px]">
              {mandali.name}
            </h1>
            {/* Channel switch trigger */}
            <button
              type="button"
              onClick={() => setShowChannelDrawer(true)}
              className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold focus-visible:outline-none"
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
            title="Leave Mandali"
            aria-label="Leave Mandali"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN TAB CONTENT ── */}
      <main className="flex-1 overflow-y-auto relative">
        {/* TAB 1: CHAT */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Welcome to #{activeChannel?.name}! Start the chat.
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
                        src={`/Avatars/${msg.senderAvatar || "avatar_1"}.png`}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full bg-slate-800 object-cover flex-shrink-0 border border-slate-700 mt-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />

                      <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-[11px] text-white">
                            {msg.senderName}
                          </span>
                          {msg.senderRole === "OWNER" && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold">
                              Founder
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isMine
                              ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none"
                              : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
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
                                className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${
                                  hasReacted
                                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                    : "bg-slate-900 border-slate-800 text-slate-400"
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
              className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 flex-shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message #${activeChannel?.name || "chat"}...`}
                maxLength={500}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center disabled:opacity-50 active:scale-95"
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
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                Active Squads ({parties.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSquad(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                Form Squad
              </button>
            </div>

            {parties.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="font-bold text-white text-sm mb-1">No Squads Active</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-3">
                  Form a party for Ludo, Hand Cricket, or Rummy to play with Mandali members.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateSquad(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
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
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Gnapakalu (జ్ఞాపకాలు) Archive
              </h3>
              <span className="text-[10px] text-amber-400 font-semibold">Shared Memories</span>
            </div>

            <GnapakaluTimeline memories={memories} />
          </div>
        )}

        {/* TAB 4: ROSTER / MEMBERS */}
        {activeTab === "members" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Mandali Members ({members.length})
              </h3>
              <span className="text-xs text-slate-400">
                {members.filter((m) => m.presence === "online").length} Online
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.memberId}
                  className="min-h-[48px] p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={`/Avatars/${member.avatar || "avatar_1"}.png`}
                        alt={member.displayName}
                        className="w-9 h-9 rounded-full bg-slate-800 object-cover border border-slate-700"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                      <div
                        className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-slate-900 ${
                          member.presence === "online" ? "bg-emerald-500" : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs leading-none">
                        {member.displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 capitalize">{member.role}</span>
                    </div>
                  </div>

                  {member.role === "OWNER" && <Crown className="w-4 h-4 text-amber-400" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM THUMB TAB BAR ── */}
      <nav className="h-16 bg-slate-900 border-t border-slate-800 grid grid-cols-4 z-20 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "chat" ? "text-amber-400 font-bold" : "text-slate-400"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("squads")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "squads" ? "text-amber-400 font-bold" : "text-slate-400"
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px]">Squads</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gnapakalu")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "gnapakalu" ? "text-amber-400 font-bold" : "text-slate-400"
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Gnapakalu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "members" ? "text-amber-400 font-bold" : "text-slate-400"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Roster</span>
        </button>
      </nav>

      {/* ── CHANNEL DRAWER BOTTOM SHEET ── */}
      {showChannelDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Select Channel</h3>
              <button
                type="button"
                onClick={() => setShowChannelDrawer(false)}
                className="min-h-[44px] min-w-[44px] text-slate-400 font-bold flex items-center justify-center"
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
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    ch.channelId === activeChannelId
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-950 text-slate-300 border border-slate-800"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                Form a Game Squad
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSquad(false)}
                className="min-h-[44px] min-w-[44px] text-slate-400 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSquad} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Squad Name
                </label>
                <input
                  type="text"
                  value={newSquadTitle}
                  onChange={(e) => setNewSquadTitle(e.target.value)}
                  placeholder="e.g. Hyderabad Quick Ludo"
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Game</label>
                <select
                  value={newSquadGame}
                  onChange={(e) => setNewSquadGame(e.target.value as GameKind)}
                  className="w-full min-h-[44px] px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs capitalize"
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
                  className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
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

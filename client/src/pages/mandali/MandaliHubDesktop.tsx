/**
 * BHALYAM Mandali — Futuristic Desktop Hub Layout (>= 1024px)
 *
 * FAANG/MAANG-grade 3-Column Command Lounge:
 * - Left: Channels Rail & Holographic Crest
 * - Center: Realtime Channel Chat / Squad Party Lounge
 * - Right: Member Roster & Gnapakalu Memories Archive
 *
 * Requirements:
 * - Full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Zero usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy, Users, Zap.
 * - WCAG 2.1 AA focus rings.
 */

import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Hash,
  Volume2,
  Gamepad2,
  Users,
  Trophy,
  Crown,
  Shield,
  ShieldCheck,
  Flame,
  Send,
  Plus,
  Smile,
  LogOut,
  ChevronLeft,
  Calendar,
  Zap,
  Coins,
  Link2,
  Info,
  UserCheck,
  Pin,
  Trash2,
} from "lucide-react";
import type {
  Mandali,
  MandaliMember,
  MandaliChannel,
  MandaliMessage,
  MandaliParty,
  MandaliMemory,
  MandaliCoinRequest,
} from "@shared/mandali/types.js";
import { PartyLoungeCard } from "../../components/mandali/PartyLoungeCard";
import { GnapakaluTimeline } from "../../components/mandali/GnapakaluTimeline";
import CoinRequestCard from "../../components/mandali/CoinRequestCard";
import EmojiPicker, { insertAtCaret } from "../../components/mandali/EmojiPicker";
import type { GameKind } from "@shared/types.js";

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return "/Bhalyam-logo.png";
  if (avatar.startsWith("/") || avatar.startsWith("http")) return avatar;
  if (avatar.endsWith(".jpg") || avatar.endsWith(".png") || avatar.endsWith(".webp") || avatar.endsWith(".svg")) {
    return `/Avatars/${avatar}`;
  }
  return `/Avatars/${avatar}.png`;
}

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
}

const CHAT_MAX_LENGTH = 500;

const EMOJI_REACTIONS = ["🔥", "👑", "🎯", "👏", "❤️"];

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
  isOwner,
  canManageMembers,
  canEditInfo: _canEditInfo,
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
}) => {
  const [chatInput, setChatInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiSelect = (emoji: string) => {
    const result = insertAtCaret(chatInputRef.current, chatInput, emoji, CHAT_MAX_LENGTH);
    if (!result) return;
    setChatInput(result.next);
    requestAnimationFrame(() => {
      chatInputRef.current?.focus();
      chatInputRef.current?.setSelectionRange(result.caret, result.caret);
    });
  };
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [newPartyGame, setNewPartyGame] = useState<GameKind>("ludo");
  const [newPartyTitle, setNewPartyTitle] = useState("");
  const [newPartySlots, setNewPartySlots] = useState(4);

  const activeChannel = channels.find((c) => c.channelId === activeChannelId) || channels[0];
  const isPartyChannel =
    activeChannel?.type === "PARTY_FINDING" || activeChannel?.name.includes("squad");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setShowEmoji(false);
    setChatInput("");
  };

  const handleFormSquad = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateParty(
      newPartyGame,
      "casual",
      newPartyTitle.trim() || `${newPartyGame.toUpperCase()} Squad`,
      newPartySlots
    );
    setShowCreateParty(false);
    setNewPartyTitle("");
  };

  return (
    <div className="flex flex-1 min-h-0 h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none transition-colors duration-200">
      {/* ── COLUMN 1: Channels & Community Crest Rail ── */}
      <aside className="w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col justify-between flex-shrink-0 shadow-xs">
        <div>
          {/* Header */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
            <Link
              to="/mandali"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 mb-3 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 rounded p-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
              All Mandalis
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-lg shadow-inner">
                <Crown className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-black text-slate-900 dark:text-white text-base truncate leading-snug">
                  {mandali.name}
                </h1>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 font-mono font-semibold">@{mandali.handle}</p>
              </div>
            </div>
          </div>

          {/* Level & XP Strip */}
          <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-950/30 border-b border-slate-200/60 dark:border-slate-800/40 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Community Rank</span>
            <span className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Level {mandali.level}
            </span>
          </div>

          {/* Group Management Actions */}
          <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-slate-800/40 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onOpenInvite}
              className="min-h-[40px] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              Invite
            </button>
            <button
              type="button"
              onClick={onOpenGroupInfo}
              className="min-h-[40px] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Group Info
            </button>
            {canManageMembers && (
              <button
                type="button"
                onClick={onOpenMembers}
                className="min-h-[40px] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Manage
              </button>
            )}
            {canManageMembers && (
              <button
                type="button"
                onClick={onOpenPendingRequests}
                className="relative min-h-[40px] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Requests
                {pendingRequestCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {pendingRequestCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Channels Section */}
          <div className="p-3">
            <h2 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
              Channels
            </h2>

            <div className="space-y-1">
              {channels.map((ch) => {
                const isActive = ch.channelId === activeChannelId;
                const isPartyType = ch.type === "PARTY_FINDING";
                return (
                  <button
                    key={ch.channelId}
                    type="button"
                    onClick={() => onSelectChannel(ch.channelId)}
                    className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                      isActive
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {isPartyType ? (
                      <Gamepad2 className="w-4 h-4 flex-shrink-0" />
                    ) : ch.type === "ANNOUNCEMENT" ? (
                      <Volume2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Hash className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Rail Actions */}
        <div className="p-3 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Voice Ready</span>
          </div>

          <button
            type="button"
            onClick={onLeaveMandali}
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
            title="Leave Mandali"
            aria-label="Leave Mandali"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── COLUMN 2: Main Lounge (Chat or Parties) ── */}
      <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 relative overflow-hidden">
        {/* Channel Header Bar */}
        <header className="h-16 border-b border-slate-200/90 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white/70 dark:bg-slate-900/40 backdrop-blur-md z-10 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-slate-700">
              {isPartyChannel ? <Gamepad2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base leading-none">
                #{activeChannel?.name || "lounge-chat"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {activeChannel?.description || "Community conversation and play"}
              </p>
            </div>
          </div>

          {/* Action button in squad channel */}
          {isPartyChannel && (
            <button
              type="button"
              onClick={() => setShowCreateParty(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              Form Squad
            </button>
          )}
        </header>

        {/* Content Body */}
        {isPartyChannel ? (
          /* SQUAD PARTIES VIEW */
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-300 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-amber-500" />
                Active Squads Forming ({parties.length})
              </h3>
            </div>

            {parties.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
                <Gamepad2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Active Squads</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-4 font-medium">
                  Form a party for Ludo, Hand Cricket, Rummy, or UNO and rally your Mandali
                  teammates!
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateParty(true)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  Form First Squad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

            {/* Create Party Form Modal Drawer */}
            {showCreateParty && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-amber-500" />
                      Form a Game Squad
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateParty(false)}
                      className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleFormSquad} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Squad Name
                      </label>
                      <input
                        type="text"
                        value={newPartyTitle}
                        onChange={(e) => setNewPartyTitle(e.target.value)}
                        placeholder="e.g. Hyderabad Weekend Ludo"
                        className="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Game</label>
                      <select
                        value={newPartyGame}
                        onChange={(e) => setNewPartyGame(e.target.value as GameKind)}
                        className="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm capitalize font-medium"
                      >
                        <option value="ludo">Ludo (2-4 players)</option>
                        <option value="handcricket">Hand Cricket (2 players)</option>
                        <option value="rummy">Rummy (2-6 players)</option>
                        <option value="snl">Snakes & Ladders (2-4 players)</option>
                        <option value="uno">UNO (2-4 players)</option>
                        <option value="dotsboxes">Dots & Boxes (2 players)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Slots
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={6}
                        value={newPartySlots}
                        onChange={(e) => setNewPartySlots(Number(e.target.value))}
                        className="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full min-h-[48px] rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 shadow-md"
                      >
                        Rally Squad
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TEXT CHAT FEED */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-slate-500 text-sm font-medium">
                  Welcome to #{activeChannel?.name}! Be the first to start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const canModerate = isMine || canManageMembers;

                  if (msg.kind === "SYSTEM") {
                    return (
                      <div key={msg.messageId} className="flex justify-center">
                        <span className="text-[11px] px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-medium">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  if (msg.kind === "COIN_REQUEST") {
                    return (
                      <div key={msg.messageId} className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        <img
                          src={getAvatarUrl(msg.senderAvatar)}
                          alt=""
                          className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 object-cover flex-shrink-0 border border-slate-300 dark:border-slate-700"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png"; }}
                        />
                        <CoinRequestCard
                          message={msg}
                          request={coinRequests[msg.messageId]}
                          selfId={selfId}
                          members={members}
                          onPay={onPayCoinRequest}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.messageId}
                      className={`flex gap-3 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <img
                        src={getAvatarUrl(msg.senderAvatar)}
                        alt={msg.senderName}
                        className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 object-cover flex-shrink-0 border border-slate-300 dark:border-slate-700"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png";
                        }}
                      />

                      <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-slate-500">{timeStr}</span>
                          {msg.senderRole === "OWNER" && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold">
                              Founder
                            </span>
                          )}
                          {msg.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                        </div>

                        <div className="relative">
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                              isMine
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold rounded-tr-none"
                                : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                            }`}
                          >
                            {msg.content ? msg.content : <span className="italic opacity-60">Message deleted</span>}
                          </div>

                          {/* Pin / delete — opacity-0 hover reveal, matches the reaction picker pattern below */}
                          {msg.content && (
                            <div className={`absolute top-0 ${isMine ? "-left-14" : "-right-14"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                              {canManageMembers && (
                                <button
                                  type="button"
                                  onClick={() => onPinMessage(msg.channelId, msg.messageId, !msg.pinned)}
                                  aria-label={msg.pinned ? "Unpin message" : "Pin message"}
                                  className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canModerate && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteMessage(msg.channelId, msg.messageId)}
                                  aria-label="Delete message"
                                  className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reactions Bar */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {Object.entries(msg.reactions || {}).map(([emoji, players]) => {
                            if (!players || players.length === 0) return null;
                            const hasReacted = currentUserId ? players.includes(currentUserId) : false;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onReactMessage(msg.messageId, emoji)}
                                className={`text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                                  hasReacted
                                    ? "bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-extrabold text-[10px]">{players.length}</span>
                              </button>
                            );
                          })}

                          {/* Quick Emoji Pickers on Hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pl-1">
                            {EMOJI_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onReactMessage(msg.messageId, emoji)}
                                className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition-transform active:scale-125"
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

            {/* Chat Composer */}
            <form
              onSubmit={handleSend}
              className="p-4 bg-white/80 dark:bg-slate-900/60 border-t border-slate-200/90 dark:border-slate-800 flex items-center gap-3 flex-shrink-0 backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => onRequestCoins()}
                title={isCoinRequestCoolingDown ? "Coin request on cooldown (tap to check remaining time)" : "Request 100 coins (Instant)"}
                aria-label={isCoinRequestCoolingDown ? "Request coins — on cooldown, tap to see the time left" : "Request coins"}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 relative focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <Coins className="w-4 h-4" />
                {isCoinRequestCoolingDown && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 border-2 border-white dark:border-slate-900" />
                )}
              </button>

              <div className="relative flex-1">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message #${activeChannel?.name || "channel"}...`}
                  maxLength={CHAT_MAX_LENGTH}
                  className="w-full min-h-[44px] pl-4 pr-12 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <EmojiPicker open={showEmoji} onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
                <button
                  type="button"
                  data-emoji-trigger
                  onClick={() => setShowEmoji((open) => !open)}
                  aria-expanded={showEmoji}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label="Add Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── COLUMN 3: Roster & Gnapakalu Shelf ── */}
      <aside className="w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-l border-slate-200/90 dark:border-slate-800 flex flex-col justify-between flex-shrink-0 overflow-y-auto p-4 space-y-6 shadow-xs">
        {/* Members Roster */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-500" />
              Members ({members.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenCoinTransfer?.()}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                title="Transfer or Request Coins"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Coins</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                {members.filter((m) => m.presence === "online").length} Online
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {members.map((member) => (
              <div
                key={member.memberId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={getAvatarUrl(member.avatar)}
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 object-cover border border-slate-300 dark:border-slate-700"
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
                      className="w-7 h-7 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-amber-500 transition-colors flex items-center justify-center"
                      title={`Send or request coins with ${member.displayName}`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {member.role === "OWNER" && <Crown className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gnapakalu (జ్ఞాపకాలు) Archive */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Gnapakalu Archive
            </h3>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">Shared History</span>
          </div>

          <GnapakaluTimeline memories={memories.slice(0, 3)} />
        </div>
      </aside>
    </div>
  );
};

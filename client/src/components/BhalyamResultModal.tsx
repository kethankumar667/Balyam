import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, RotateCcw } from "lucide-react";
import type { Player } from "@shared/types";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import { findAvatar } from "../lib/avatars";
import CountUp from "./CountUp";
import { SettlementView } from "./economy/SettlementView";
import { fireFireworksBurst } from "../animations/particles/comicBursts";

export interface RankedPlayerResult {
  id: string;
  name: string;
  score: number;
  avatar?: string;
}

export interface BhalyamResultModalProps {
  winnerId?: string | null;
  winnerName?: string;
  winnerScore?: number;
  rankedPlayers: RankedPlayerResult[];
  players: Player[];
  selfId: string | null;
  onClose: () => void;
  onLeave?: () => void;
  title?: string;
  pointsLabel?: string;
  matchId?: string;
}

export default function BhalyamResultModal({
  winnerId,
  winnerName,
  winnerScore,
  rankedPlayers,
  players,
  selfId,
  onClose,
  onLeave,
  title,
  pointsLabel,
  matchId,
}: BhalyamResultModalProps) {
  const reduceMotion = useReducedMotion();
  const isSelfWinner = winnerId != null && winnerId === selfId;
  const displayWinnerName = winnerName ?? (winnerId ? players.find((p) => p.id === winnerId)?.name : "Winner") ?? "Winner";

  useEffect(() => {
    if (!reduceMotion) {
      fireFireworksBurst({ intensity: isSelfWinner ? 0.95 : 0.75 });
    }
  }, [reduceMotion, isSelfWinner]);

  const rematch = useRoomStore((s) => s.rematch);
  const roomState = useRoomStore((s) => s.roomState);
  const isHost = roomState?.hostId === selfId;
  const myResponse = selfId ? rematch.responses[selfId] : undefined;

  function requestRematch() {
    getSocket().emit("rematch:request");
  }
  function acceptRematch() {
    getSocket().emit("rematch:respond", "accept");
  }
  function declineRematch() {
    getSocket().emit("rematch:respond", "decline");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Match results"
    >
      <motion.div
        className="relative w-full max-w-xl md:max-w-2xl rounded-[32px] bg-[#FFFDF6] border-2 border-[#EADFC7] shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden p-5 sm:p-7 md:p-8"
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
      >
        {/* Background decorative doodles */}
        <DoodleBackground />

        {/* Top Close '✕' Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#EFE5D2] hover:bg-[#E2D5BE] active:scale-95 flex items-center justify-center text-[#735F4C] text-sm font-black transition z-20 shadow-xs cursor-pointer"
        >
          ✕
        </button>

        {/* Top Trophy Header */}
        <div className="relative z-10 flex flex-col items-center text-center pt-1 pb-2">
          {/* 3D Golden Trophy Cup with Celebration Sprinkles */}
          <div className="relative mb-2 flex items-center justify-center">
            <svg
              className="absolute -top-3 w-40 h-20 pointer-events-none overflow-visible"
              viewBox="0 0 160 80"
              fill="none"
            >
              <circle cx="28" cy="18" r="3.5" fill="#EF4444" />
              <circle cx="48" cy="8" r="2.5" fill="#3B82F6" />
              <circle cx="112" cy="10" r="3" fill="#10B981" />
              <circle cx="134" cy="22" r="3.5" fill="#F59E0B" />
              <circle cx="20" cy="42" r="2" fill="#8B5CF6" />
              <circle cx="140" cy="46" r="2.5" fill="#EC4899" />
              <path d="M 32 30 Q 36 22 42 26" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 120 28 Q 128 20 124 34" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 52 4 Q 60 12 56 20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              <path d="M 104 6 Q 98 14 106 22" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>

            {/* Golden 3D Trophy */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.45)]">
              <svg viewBox="0 0 80 80" className="w-full h-full">
                <defs>
                  <linearGradient id="trophyGold2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFF176" />
                    <stop offset="35%" stopColor="#FBC02D" />
                    <stop offset="75%" stopColor="#F57F17" />
                    <stop offset="100%" stopColor="#E65100" />
                  </linearGradient>
                  <linearGradient id="trophyBase2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D4C41" />
                    <stop offset="100%" stopColor="#3E2723" />
                  </linearGradient>
                  <linearGradient id="trophyPlinth2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD54F" />
                    <stop offset="100%" stopColor="#FF8F00" />
                  </linearGradient>
                </defs>
                <path d="M 16 26 C 10 26 8 40 22 42" fill="none" stroke="url(#trophyGold2)" strokeWidth="5" strokeLinecap="round" />
                <path d="M 64 26 C 70 26 72 40 58 42" fill="none" stroke="url(#trophyGold2)" strokeWidth="5" strokeLinecap="round" />
                <path d="M 20 18 Q 40 18 60 18 L 56 42 C 54 52 46 54 40 54 C 34 54 26 52 24 42 Z" fill="url(#trophyGold2)" />
                <ellipse cx="40" cy="18" rx="20" ry="4" fill="#FFF59D" opacity="0.9" />
                <path d="M 40 26 L 42 32 L 48 32 L 43 36 L 45 42 L 40 38 L 35 42 L 37 36 L 32 32 L 38 32 Z" fill="#FFFFFF" opacity="0.95" />
                <path d="M 36 54 L 44 54 L 42 63 L 38 63 Z" fill="url(#trophyPlinth2)" />
                <rect x="28" y="63" width="24" height="6" rx="2" fill="url(#trophyBase2)" />
                <rect x="24" y="68" width="32" height="6" rx="2" fill="url(#trophyBase2)" />
                <rect x="32" y="69.5" width="16" height="3" rx="1" fill="#FFE082" />
              </svg>
            </div>
          </div>

          {/* Winner Headline */}
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1B0E] tracking-tight">
            {title ?? (isSelfWinner ? "- You win! -" : `- ${displayWinnerName} wins! -`)}
          </h2>

          {/* Points Subtitle */}
          {(winnerScore !== undefined || pointsLabel) && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-amber-600 font-extrabold text-sm sm:text-base">
              <span className="text-amber-500 font-serif">☆</span>
              <span>{pointsLabel ?? `+${winnerScore ?? 0} points`}</span>
              <span className="text-amber-500 font-serif">☆</span>
            </div>
          )}
        </div>

        {/* 2-Column Main Content Body */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-4 sm:my-5">
          {/* LEFT: Polaroid Memory Card */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[210px] sm:max-w-[230px] bg-white p-3 pb-4 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-[#E9DFCB] flex flex-col items-center transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="absolute -top-2.5 left-2.5 w-9 h-4 bg-[#F2E8D3]/90 border border-[#DECDB2]/70 -rotate-12 rounded-[2px] shadow-xs pointer-events-none" aria-hidden />
              <div className="absolute -top-2.5 right-2.5 w-9 h-4 bg-[#F2E8D3]/90 border border-[#DECDB2]/70 rotate-12 rounded-[2px] shadow-xs pointer-events-none" aria-hidden />

              <div className="w-full aspect-[4/3.2] rounded-lg overflow-hidden bg-gradient-to-b from-[#FFF5D6] via-[#FFF9E6] to-[#FFEEC2] border border-[#F5E8C8] flex items-center justify-center relative p-1.5">
                <CelebrationIllustration />
              </div>

              <div className="text-center mt-2.5 space-y-0.5">
                <p className="text-xs sm:text-[13px] font-black text-[#3A2819] leading-tight font-body">
                  Great game!
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-[#6D533C] leading-tight">
                  Well played everyone! 👏
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Scores Leaderboard */}
          <div className="md:col-span-7 bg-[#FCF8EE] border border-[#EDE2CC] rounded-2xl p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8A7564]">
                SCORES
              </span>
            </div>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {rankedPlayers.map((p, index) => {
                const isWinnerRow = p.id === winnerId || index === 0;
                const avatarOpt = p.avatar ? findAvatar(p.avatar) : null;
                const rankNum = index + 1;
                // A placement badge only means something when this score is
                // genuinely higher than every player ranked below it, and
                // distinct from the player ranked immediately above it — the
                // generic (non-game-specific) scorecard fallback gives every
                // non-winner an identical score, so without both checks
                // "Runner-Up"/"3rd" would be assigned by arbitrary seat
                // order rather than any real placement (the last row's
                // "everyone below" check is vacuously true with nobody left
                // to compare against, which the tie-with-previous check catches).
                const hasDistinctPlacement =
                  (index === 0 || p.score !== rankedPlayers[index - 1].score) &&
                  rankedPlayers.slice(index + 1).every((other) => other.score < p.score);

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                      isWinnerRow
                        ? "bg-[#FFECC7] border border-[#FCD68A] text-[#2B1B0E] shadow-xs"
                        : "bg-white/60 hover:bg-white border border-[#EDE2CC]/60 text-[#4A3828]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                        rankNum === 1
                          ? "bg-[#F59E0B] text-white"
                          : rankNum === 2
                            ? "bg-[#94A3B8] text-white"
                            : rankNum === 3
                              ? "bg-[#CD7F32] text-white"
                              : "bg-[#D6C7B2] text-[#4A3828]"
                      }`}
                    >
                      {rankNum}
                    </div>

                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-amber-300/40 bg-amber-100/50 flex items-center justify-center text-[10px]">
                      {avatarOpt?.src ? (
                        <img src={avatarOpt.src} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <span className="truncate flex-1 font-extrabold text-[#2C1D11] flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.id === selfId && <span className="text-xs text-[#7C6652] font-semibold">(you)</span>}
                      {isWinnerRow && <Crown className="w-4 h-4 text-amber-600 fill-amber-500/30 flex-shrink-0" aria-hidden />}
                      {rankNum === 2 && !isWinnerRow && hasDistinctPlacement && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                          Runner-Up
                        </span>
                      )}
                      {rankNum === 3 && !isWinnerRow && hasDistinctPlacement && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/60 text-amber-800">
                          3rd
                        </span>
                      )}
                    </span>

                    <span className={`tabular-nums shrink-0 font-black ${isWinnerRow ? "text-amber-800 text-sm" : "text-[#7C6652]"}`}>
                      <CountUp end={p.score} duration={1.2} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Screen Reader Live Announcement */}
        <div className="sr-only" role="status" aria-live="polite">
          {isSelfWinner ? "You won the match!" : `${displayWinnerName} won the match.`}
        </div>

        {/* AUTHORITATIVE SETTLEMENT MOTION VIEW */}
        {matchId && (
          <div className="relative z-10 my-3">
            <SettlementView matchId={matchId} />
          </div>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <div className="relative z-10 mt-5 pt-1 space-y-2.5">
          {rematch.status === "accepted" && rematch.startsAt ? (
            <CountdownBox startsAt={rematch.startsAt} />
          ) : rematch.status === "declined" ? (
            <div className="rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-center">
              {players.find((p) => p.id === rematch.declinedBy)?.name ?? "Player"} declined the rematch.
            </div>
          ) : rematch.status === "pending" ? (
            isHost || myResponse === "accept" ? (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 px-4 py-2.5 text-center space-y-2">
                <div className="text-amber-900 font-bold text-xs sm:text-sm">
                  Waiting for players… ({Object.values(rematch.responses).filter((r) => r === "accept").length} / {Object.values(rematch.responses).length})
                </div>
                <button
                  type="button"
                  onClick={declineRematch}
                  className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  Cancel Rematch
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 space-y-2">
                <div className="text-amber-900 font-bold text-xs sm:text-sm text-center">
                  Host wants a rematch. Are you in?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={acceptRematch}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={declineRematch}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer shadow"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={requestRematch}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-base text-white bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] active:scale-[0.98] shadow-[0_4px_16px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" aria-hidden />
              <span>Play Again</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl font-black text-sm text-[#3E2C1E] bg-[#EFE5D3] hover:bg-[#E5D7C0] active:scale-[0.98] border border-[#DFCDB5] transition cursor-pointer text-center"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onLeave ?? onClose}
              className="py-3 px-4 rounded-2xl font-black text-sm text-white bg-[#4A2D1B] hover:bg-[#382012] active:scale-[0.98] transition cursor-pointer text-center"
            >
              Leave Table
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DoodleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <svg className="absolute top-2 left-3 w-16 h-16 text-[#E07A5F]/40" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M 10 10 Q 25 5 20 25 T 35 40" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.5" fill="#3D5A80" />
        <circle cx="38" cy="22" r="1.5" fill="#E07A5F" />
      </svg>
      <svg className="absolute top-3 right-14 w-12 h-12 text-[#D2C5B0]/60" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M 20 4 L 22 14 L 32 16 L 22 18 L 20 28 L 18 18 L 8 16 L 18 14 Z" fill="none" />
        <circle cx="32" cy="8" r="1" fill="#D2C5B0" />
      </svg>
      <div className="absolute bottom-3 left-4 opacity-40">
        <svg className="w-10 h-10 text-[#7C6652]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </div>
      <svg className="absolute bottom-3 right-5 w-16 h-16 text-[#D2C5B0]/50" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M 45 40 Q 55 45 48 55 T 35 50" strokeLinecap="round" />
        <path d="M 30 20 L 32 26 L 38 27 L 32 29 L 30 35 L 28 29 L 22 27 L 28 26 Z" fill="none" />
      </svg>
    </div>
  );
}

function CelebrationIllustration() {
  return (
    <svg viewBox="0 0 220 170" className="w-full h-full">
      <defs>
        <linearGradient id="pGoldModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="50%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="2" fill="#F59E0B" opacity="0.6" />
      <circle cx="190" cy="35" r="2.5" fill="#EF4444" opacity="0.6" />
      <circle cx="45" cy="15" r="1.5" fill="#3B82F6" opacity="0.6" />
      <circle cx="175" cy="20" r="2" fill="#10B981" opacity="0.6" />
      <path d="M 35 45 L 37 49 L 41 50 L 37 51 L 35 55 L 33 51 L 29 50 L 33 49 Z" fill="#F59E0B" opacity="0.5" />
      <path d="M 185 50 L 187 54 L 191 55 L 187 56 L 185 60 L 183 56 L 179 55 L 183 54 Z" fill="#F59E0B" opacity="0.5" />

      {/* Left Character (Blue Hoodie) */}
      <g transform="translate(18, 52)">
        <path d="M 28 55 C 10 38 12 18 20 12 C 24 8 30 18 28 32" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1.5" />
        <circle cx="18" cy="12" r="5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <path d="M 20 50 C 15 80 18 105 45 105 C 55 105 58 80 55 50 Z" fill="#2563EB" stroke="#1E40AF" strokeWidth="1.5" />
        <rect x="33" y="42" width="8" height="10" fill="#FFCC80" />
        <ellipse cx="37" cy="32" rx="14" ry="15" fill="#FFCC80" stroke="#D97706" strokeWidth="1.2" />
        <path d="M 23 28 C 23 15 32 15 37 15 C 45 15 51 20 51 28 C 48 24 43 25 38 25 C 33 25 27 25 23 28 Z" fill="#1E293B" />
        <ellipse cx="32" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <ellipse cx="42" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <path d="M 33 36 Q 37 42 41 36 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="1" />
        <circle cx="28" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="46" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
      </g>

      {/* Right Character (Orange Hoodie) */}
      <g transform="translate(130, 52)">
        <path d="M 38 52 C 55 40 58 24 50 18 C 45 14 40 22 40 35" fill="#EA580C" stroke="#9A3412" strokeWidth="1.5" />
        <circle cx="53" cy="18" r="5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <rect x="52" y="11" width="3" height="6" rx="1.5" fill="#FFCC80" />
        <path d="M 12 50 C 10 80 15 105 45 105 C 55 105 58 80 52 50 Z" fill="#F97316" stroke="#9A3412" strokeWidth="1.5" />
        <rect x="25" y="42" width="8" height="10" fill="#FFCC80" />
        <ellipse cx="29" cy="32" rx="14" ry="15" fill="#FFCC80" stroke="#D97706" strokeWidth="1.2" />
        <path d="M 15 28 C 14 16 24 14 29 14 C 36 14 43 18 43 28 C 40 24 35 24 30 24 C 25 24 19 24 15 28 Z" fill="#451A03" />
        <ellipse cx="24" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <ellipse cx="34" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <path d="M 25 36 Q 29 42 33 36 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="1" />
        <circle cx="20" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="38" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
      </g>

      {/* Center Character (Green Hoodie, Glasses, Trophy) */}
      <g transform="translate(75, 40)">
        <path d="M 18 55 C 10 35 22 18 28 8" fill="none" stroke="#15803D" strokeWidth="7" strokeLinecap="round" />
        <path d="M 52 55 C 60 35 48 18 42 8" fill="none" stroke="#15803D" strokeWidth="7" strokeLinecap="round" />
        <circle cx="28" cy="8" r="4.5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <circle cx="42" cy="8" r="4.5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <path d="M 16 55 C 12 85 16 115 54 115 C 58 85 54 55 54 55 Z" fill="#16A34A" stroke="#14532D" strokeWidth="1.5" />
        <rect x="31" y="44" width="8" height="10" fill="#FFCC80" />
        <ellipse cx="35" cy="34" rx="15" ry="16" fill="#FFCC80" stroke="#D97706" strokeWidth="1.2" />
        <path d="M 20 30 C 20 16 30 14 35 14 C 42 14 50 18 50 30 C 46 25 41 25 36 25 C 31 25 25 26 20 30 Z" fill="#0F172A" />
        <rect x="23" y="29" width="10" height="8" rx="2" fill="none" stroke="#0F172A" strokeWidth="1.8" />
        <rect x="37" y="29" width="10" height="8" rx="2" fill="none" stroke="#0F172A" strokeWidth="1.8" />
        <line x1="33" y1="33" x2="37" y2="33" stroke="#0F172A" strokeWidth="1.8" />
        <ellipse cx="28" cy="33" rx="1.5" ry="2" fill="#0F172A" />
        <ellipse cx="42" cy="33" rx="1.5" ry="2" fill="#0F172A" />
        <path d="M 28 39 Q 35 47 42 39 Z" fill="#DC2626" stroke="#0F172A" strokeWidth="1" />
        <circle cx="22" cy="37" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="48" cy="37" r="2.5" fill="#F87171" opacity="0.6" />

        {/* Trophy */}
        <g transform="translate(18, -26)">
          <path d="M 5 12 C 0 12 -2 22 8 23" fill="none" stroke="url(#pGoldModal)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 29 12 C 34 12 36 22 26 23" fill="none" stroke="url(#pGoldModal)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 8 6 Q 17 6 26 6 L 24 22 C 22 28 18 29 17 29 C 16 29 12 28 10 22 Z" fill="url(#pGoldModal)" />
          <ellipse cx="17" cy="6" rx="9" ry="2" fill="#FFF9C4" />
          <path d="M 17 12 L 18 15 L 21 15 L 18.5 17 L 19.5 20 L 17 18 L 14.5 20 L 15.5 17 L 13 15 L 16 15 Z" fill="#FFFFFF" />
          <rect x="14" y="29" width="6" height="5" fill="#FFA000" />
          <rect x="11" y="34" width="12" height="4" rx="1" fill="#5D4037" />
        </g>
      </g>
    </svg>
  );
}

function CountdownBox({ startsAt }: { startsAt: number }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, startsAt - Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, startsAt - Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [startsAt]);
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 font-bold text-center text-sm shadow-xs"
    >
      Next game starting in{" "}
      <span className="text-emerald-700 font-mono tabular-nums text-base">{seconds}s</span>…
    </div>
  );
}

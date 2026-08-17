import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Player, UnoPlayerState } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";
import { findAvatar } from "../../lib/avatars";
import { fireUnoWinConfetti } from "./uno-confetti";
import { useAnimationConfig } from "../../animations/helpers/useAnimationConfig";
import { WinnerCelebration } from "../../animations/card/WinnerCelebration";
import { VictoryDance } from "../../animations/card/VictoryDance";
import type { FeltAnchor } from "../../animations/helpers/types";

const VICTORY_DANCE_ANCHOR: FeltAnchor = { left: "50%", top: "32%" };

export interface UnoResultModalProps {
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  onClose: () => void;
  onLeave?: () => void;
}

export default function UnoResultModal({
  state,
  players,
  selfId,
  onClose,
  onLeave,
}: UnoResultModalProps) {
  const winnerId = state.winnerId;
  const winnerPlayer = players.find((p) => p.id === winnerId);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const isSelfWinner = winnerId != null && winnerId === selfId;
  const animConfig = useAnimationConfig();

  const rematch = useRoomStore((s) => s.rematch);
  const roomState = useRoomStore((s) => s.roomState);
  const isHost = roomState?.hostId === selfId;
  const myResponse = selfId ? rematch.responses[selfId] : undefined;

  useEffect(() => {
    if (isSelfWinner) fireUnoWinConfetti();
  }, [isSelfWinner]);

  const ranked = [...state.playerOrder].sort(
    (a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0),
  );

  const winnerScore = winnerId ? (state.scores[winnerId] ?? 0) : 0;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs select-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Match results"
    >
      {isSelfWinner && <WinnerCelebration config={animConfig} />}
      {isSelfWinner && <VictoryDance anchor={VICTORY_DANCE_ANCHOR} config={animConfig} />}

      <motion.div
        className="relative w-full max-w-xl md:max-w-2xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-[32px] bg-[#FFFDF6] border-2 border-[#EADFC7] shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden p-4 sm:p-6 md:p-8 my-auto"
        initial={animConfig.reducedMotion ? false : { scale: 0.88, opacity: 0, y: 16 }}
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
          className="absolute top-3 right-3 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#EFE5D2] hover:bg-[#E2D5BE] active:scale-95 flex items-center justify-center text-[#735F4C] text-sm font-black transition z-20 shadow-xs cursor-pointer"
        >
          ✕
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain space-y-3 sm:space-y-4">
          {/* Top Trophy Header */}
          <div className="relative z-10 flex flex-col items-center text-center pt-1 pb-1 sm:pb-2">
            {/* 3D Golden Trophy Cup with Celebration Sprinkles */}
            <div className="relative mb-1.5 sm:mb-2 flex items-center justify-center">
            {/* Confetti particles around trophy */}
            <svg
              className="absolute -top-3 w-40 h-20 pointer-events-none overflow-visible"
              viewBox="0 0 160 80"
              fill="none"
            >
              {/* Confetti streamers */}
              <circle cx="28" cy="18" r="3.5" fill="#EF4444" />
              <circle cx="48" cy="8" r="2.5" fill="#3B82F6" />
              <circle cx="112" cy="10" r="3" fill="#10B981" />
              <circle cx="134" cy="22" r="3.5" fill="#F59E0B" />
              <circle cx="20" cy="42" r="2" fill="#8B5CF6" />
              <circle cx="140" cy="46" r="2.5" fill="#EC4899" />
              {/* Ribbon dashes */}
              <path
                d="M 32 30 Q 36 22 42 26"
                stroke="#F97316"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 120 28 Q 128 20 124 34"
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 52 4 Q 60 12 56 20"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 104 6 Q 98 14 106 22"
                stroke="#EF4444"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            {/* Golden 3D Trophy */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.45)]">
              <svg viewBox="0 0 80 80" className="w-full h-full">
                <defs>
                  <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFF176" />
                    <stop offset="35%" stopColor="#FBC02D" />
                    <stop offset="75%" stopColor="#F57F17" />
                    <stop offset="100%" stopColor="#E65100" />
                  </linearGradient>
                  <linearGradient id="trophyBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D4C41" />
                    <stop offset="100%" stopColor="#3E2723" />
                  </linearGradient>
                  <linearGradient id="trophyPlinth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD54F" />
                    <stop offset="100%" stopColor="#FF8F00" />
                  </linearGradient>
                </defs>
                {/* Handles */}
                <path
                  d="M 16 26 C 10 26 8 40 22 42"
                  fill="none"
                  stroke="url(#trophyGold)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M 64 26 C 70 26 72 40 58 42"
                  fill="none"
                  stroke="url(#trophyGold)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Main Cup */}
                <path
                  d="M 20 18 Q 40 18 60 18 L 56 42 C 54 52 46 54 40 54 C 34 54 26 52 24 42 Z"
                  fill="url(#trophyGold)"
                />
                {/* Cup Rim Highlight */}
                <ellipse cx="40" cy="18" rx="20" ry="4" fill="#FFF59D" opacity="0.9" />
                {/* Star on Cup */}
                <path
                  d="M 40 26 L 42 32 L 48 32 L 43 36 L 45 42 L 40 38 L 35 42 L 37 36 L 32 32 L 38 32 Z"
                  fill="#FFFFFF"
                  opacity="0.95"
                />
                {/* Stem */}
                <path d="M 36 54 L 44 54 L 42 63 L 38 63 Z" fill="url(#trophyPlinth)" />
                {/* Base */}
                <rect x="28" y="63" width="24" height="6" rx="2" fill="url(#trophyBase)" />
                <rect x="24" y="68" width="32" height="6" rx="2" fill="url(#trophyBase)" />
                {/* Gold plaque on base */}
                <rect x="32" y="69.5" width="16" height="3" rx="1" fill="#FFE082" />
              </svg>
            </div>
          </div>

          {/* Winner Headline */}
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#2B1B0E] tracking-tight">
            {isSelfWinner
              ? "- You win! -"
              : winnerId
                ? `- ${nameOf(winnerId)} wins! -`
                : "- Round Over -"}
          </h2>

          {/* Points Subtitle */}
          <div className="mt-1 flex items-center justify-center gap-1.5 text-amber-600 font-extrabold text-sm sm:text-base">
            <span className="text-amber-500 font-serif">☆</span>
            <span>
              {state.targetScore != null
                ? `${winnerScore} pts (${state.round} round${state.round === 1 ? "" : "s"})`
                : `+${winnerScore} points`}
            </span>
            <span className="text-amber-500 font-serif">☆</span>
          </div>
        </div>

        {/* 2-Column Main Content Body */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-5 items-center my-2 sm:my-4">
          {/* LEFT: Polaroid Memory Card */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[150px] sm:max-w-[180px] md:max-w-[220px] bg-white p-2.5 sm:p-3 pb-3 sm:pb-4 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-[#E9DFCB] flex flex-col items-center transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              {/* Masking tape on top-left */}
              <div
                className="absolute -top-2.5 left-2.5 w-7 sm:w-9 h-3.5 sm:h-4 bg-[#F2E8D3]/90 border border-[#DECDB2]/70 -rotate-12 rounded-[2px] shadow-xs pointer-events-none"
                aria-hidden
              />
              {/* Masking tape on top-right */}
              <div
                className="absolute -top-2.5 right-2.5 w-7 sm:w-9 h-3.5 sm:h-4 bg-[#F2E8D3]/90 border border-[#DECDB2]/70 rotate-12 rounded-[2px] shadow-xs pointer-events-none"
                aria-hidden
              />

              {/* Cheerful Group Celebration Illustration */}
              <div className="w-full aspect-[4/3.2] rounded-lg overflow-hidden bg-gradient-to-b from-[#FFF5D6] via-[#FFF9E6] to-[#FFEEC2] border border-[#F5E8C8] flex items-center justify-center relative p-1">
                <CelebrationIllustration winnerName={winnerPlayer?.name ?? "Winner"} />
              </div>

              {/* Handwritten style caption */}
              <div className="text-center mt-2 space-y-0.5">
                <p className="text-[11px] sm:text-xs md:text-[13px] font-black text-[#3A2819] leading-tight font-body">
                  Great game!
                </p>
                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#6D533C] leading-tight">
                  Well played everyone! 👏
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Scores Leaderboard */}
          <div className="md:col-span-7 bg-[#FCF8EE] border border-[#EDE2CC] rounded-2xl p-2.5 sm:p-3.5 md:p-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between px-1 pb-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#8A7564]">
                SCORES
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5 max-h-[140px] sm:max-h-[180px] overflow-y-auto pr-1">
              {ranked.map((id, index) => {
                const isWinnerRow = id === winnerId;
                const p = players.find((pl) => pl.id === id);
                const avatarOpt = p?.avatar ? findAvatar(p.avatar) : null;
                const rankNum = index + 1;

                return (
                  <div
                    key={id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                      isWinnerRow
                        ? "bg-[#FFECC7] border border-[#FCD68A] text-[#2B1B0E] shadow-xs"
                        : "bg-white/60 hover:bg-white border border-[#EDE2CC]/60 text-[#4A3828]"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div
                      className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] shrink-0 ${
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

                    {/* Avatar */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden shrink-0 border border-amber-300/40 bg-amber-100/50 flex items-center justify-center text-[10px]">
                      {avatarOpt?.src ? (
                        <img
                          src={avatarOpt.src}
                          alt={nameOf(id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{nameOf(id).slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Name */}
                    <span className="truncate flex-1 font-extrabold text-[#2C1D11]">
                      {nameOf(id)}
                      {id === selfId && " (you)"}
                      {isWinnerRow && " 👑"}
                    </span>

                    {/* Score */}
                    <span
                      className={`tabular-nums shrink-0 font-black ${
                        isWinnerRow ? "text-amber-800 text-xs sm:text-sm" : "text-[#7C6652]"
                      }`}
                    >
                      {state.scores[id] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="relative z-10 mt-3 sm:mt-5 pt-1 space-y-2 sm:space-y-2.5">
          {/* Rematch Status / Primary Action Button */}
          {rematch.status === "accepted" && rematch.startsAt ? (
            <CountdownBox startsAt={rematch.startsAt} />
          ) : rematch.status === "declined" ? (
            <div className="rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-center">
              {players.find((p) => p.id === rematch.declinedBy)?.name ?? "Player"} declined the
              rematch.
            </div>
          ) : rematch.status === "pending" ? (
            isHost || myResponse === "accept" ? (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 px-4 py-2.5 text-center space-y-2">
                <div className="text-amber-900 font-bold text-xs sm:text-sm">
                  Waiting for players… (
                  {Object.values(rematch.responses).filter((r) => r === "accept").length} /{" "}
                  {Object.values(rematch.responses).length})
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
                    className="flex-1 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={declineRematch}
                    className="flex-1 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Idle: Big Primary "Play Again" Button */
            <button
              type="button"
              onClick={requestRematch}
              className="w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] hover:from-[#EA580C] hover:to-[#9A3412] active:scale-[0.98] shadow-[0_4px_16px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span className="text-base sm:text-lg animate-spin-slow">🔄</span>
              <span>Play Again</span>
            </button>
          )}

          {/* Secondary Action Row: Continue & Leave Table */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-0.5 sm:pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm text-[#3E2C1E] bg-[#EFE5D3] hover:bg-[#E5D7C0] active:scale-[0.98] border border-[#DFCDB5] transition cursor-pointer text-center"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onLeave ?? onClose}
              className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-[#4A2D1B] hover:bg-[#382012] active:scale-[0.98] transition cursor-pointer text-center"
            >
              Leave Table
            </button>
          </div>
        </div>
      </div>
    </motion.div>
    </div>
  );
}

/** Background Doodles (Airplane, Stars, Ribbon swirls) */
function DoodleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Top Left Ribbon Swirl */}
      <svg
        className="absolute top-2 left-3 w-16 h-16 text-[#E07A5F]/40"
        viewBox="0 0 60 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M 10 10 Q 25 5 20 25 T 35 40" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.5" fill="#3D5A80" />
        <circle cx="38" cy="22" r="1.5" fill="#E07A5F" />
      </svg>

      {/* Top Right Star & Swirl */}
      <svg
        className="absolute top-3 right-14 w-12 h-12 text-[#D2C5B0]/60"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M 20 4 L 22 14 L 32 16 L 22 18 L 20 28 L 18 18 L 8 16 L 18 14 Z" fill="none" />
        <circle cx="32" cy="8" r="1" fill="#D2C5B0" />
      </svg>

      {/* Bottom Left Paper Airplane */}
      <div className="absolute bottom-3 left-4 opacity-40">
        <svg
          className="w-10 h-10 text-[#7C6652]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </div>

      {/* Bottom Right Star & Swirls */}
      <svg
        className="absolute bottom-3 right-5 w-16 h-16 text-[#D2C5B0]/50"
        viewBox="0 0 60 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M 45 40 Q 55 45 48 55 T 35 50" strokeLinecap="round" />
        <path d="M 30 20 L 32 26 L 38 27 L 32 29 L 30 35 L 28 29 L 22 27 L 28 26 Z" fill="none" />
      </svg>
    </div>
  );
}

/** Celebration illustration showing 3 happy friends celebrating with the trophy */
function CelebrationIllustration({ winnerName }: { winnerName: string }) {
  return (
    <svg viewBox="0 0 220 170" className="w-full h-full">
      <defs>
        <linearGradient id="pGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="50%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>
      </defs>

      {/* Background Sparkles */}
      <circle cx="30" cy="30" r="2" fill="#F59E0B" opacity="0.6" />
      <circle cx="190" cy="35" r="2.5" fill="#EF4444" opacity="0.6" />
      <circle cx="45" cy="15" r="1.5" fill="#3B82F6" opacity="0.6" />
      <circle cx="175" cy="20" r="2" fill="#10B981" opacity="0.6" />
      <path
        d="M 35 45 L 37 49 L 41 50 L 37 51 L 35 55 L 33 51 L 29 50 L 33 49 Z"
        fill="#F59E0B"
        opacity="0.5"
      />
      <path
        d="M 185 50 L 187 54 L 191 55 L 187 56 L 185 60 L 183 56 L 179 55 L 183 54 Z"
        fill="#F59E0B"
        opacity="0.5"
      />

      {/* ── 1. LEFT CHARACTER (Blue Hoodie, Cheering) ── */}
      <g transform="translate(18, 52)">
        {/* Raised Left Arm */}
        <path
          d="M 28 55 C 10 38 12 18 20 12 C 24 8 30 18 28 32"
          fill="#3B82F6"
          stroke="#1E40AF"
          strokeWidth="1.5"
        />
        <circle cx="18" cy="12" r="5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />

        {/* Body (Blue Hoodie) */}
        <path
          d="M 20 50 C 15 80 18 105 45 105 C 55 105 58 80 55 50 Z"
          fill="#2563EB"
          stroke="#1E40AF"
          strokeWidth="1.5"
        />
        {/* Head & Neck */}
        <rect x="33" y="42" width="8" height="10" fill="#FFCC80" />
        <ellipse
          cx="37"
          cy="32"
          rx="14"
          ry="15"
          fill="#FFCC80"
          stroke="#D97706"
          strokeWidth="1.2"
        />
        {/* Hair */}
        <path
          d="M 23 28 C 23 15 32 15 37 15 C 45 15 51 20 51 28 C 48 24 43 25 38 25 C 33 25 27 25 23 28 Z"
          fill="#1E293B"
        />
        {/* Cheerful Face */}
        <ellipse cx="32" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <ellipse cx="42" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <path
          d="M 33 36 Q 37 42 41 36 Z"
          fill="#EF4444"
          stroke="#1E293B"
          strokeWidth="1"
        />
        {/* Cheeks */}
        <circle cx="28" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="46" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
      </g>

      {/* ── 2. RIGHT CHARACTER (Orange Hoodie, Thumbs Up) ── */}
      <g transform="translate(130, 52)">
        {/* Raised Right Arm & Thumbs Up */}
        <path
          d="M 38 52 C 55 40 58 24 50 18 C 45 14 40 22 40 35"
          fill="#EA580C"
          stroke="#9A3412"
          strokeWidth="1.5"
        />
        {/* Hand with Thumbs Up */}
        <circle cx="53" cy="18" r="5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <rect x="52" y="11" width="3" height="6" rx="1.5" fill="#FFCC80" />

        {/* Body (Orange Hoodie) */}
        <path
          d="M 12 50 C 10 80 15 105 45 105 C 55 105 58 80 52 50 Z"
          fill="#F97316"
          stroke="#9A3412"
          strokeWidth="1.5"
        />
        {/* Head & Neck */}
        <rect x="25" y="42" width="8" height="10" fill="#FFCC80" />
        <ellipse
          cx="29"
          cy="32"
          rx="14"
          ry="15"
          fill="#FFCC80"
          stroke="#D97706"
          strokeWidth="1.2"
        />
        {/* Curly Hair */}
        <path
          d="M 15 28 C 14 16 24 14 29 14 C 36 14 43 18 43 28 C 40 24 35 24 30 24 C 25 24 19 24 15 28 Z"
          fill="#451A03"
        />
        {/* Cheerful Smile */}
        <ellipse cx="24" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <ellipse cx="34" cy="30" rx="1.5" ry="2" fill="#1E293B" />
        <path
          d="M 25 36 Q 29 42 33 36 Z"
          fill="#EF4444"
          stroke="#1E293B"
          strokeWidth="1"
        />
        <circle cx="20" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="38" cy="34" r="2.5" fill="#F87171" opacity="0.6" />
      </g>

      {/* ── 3. CENTER CHARACTER (Green Hoodie, Glasses, Holding Trophy) ── */}
      <g transform="translate(75, 40)">
        {/* Arms holding the trophy high */}
        <path
          d="M 18 55 C 10 35 22 18 28 8"
          fill="none"
          stroke="#15803D"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 52 55 C 60 35 48 18 42 8"
          fill="none"
          stroke="#15803D"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Hands on trophy */}
        <circle cx="28" cy="8" r="4.5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />
        <circle cx="42" cy="8" r="4.5" fill="#FFCC80" stroke="#D97706" strokeWidth="1" />

        {/* Body (Green Hoodie) */}
        <path
          d="M 16 55 C 12 85 16 115 54 115 C 58 85 54 55 54 55 Z"
          fill="#16A34A"
          stroke="#14532D"
          strokeWidth="1.5"
        />

        {/* Head */}
        <rect x="31" y="44" width="8" height="10" fill="#FFCC80" />
        <ellipse
          cx="35"
          cy="34"
          rx="15"
          ry="16"
          fill="#FFCC80"
          stroke="#D97706"
          strokeWidth="1.2"
        />

        {/* Neat Hair */}
        <path
          d="M 20 30 C 20 16 30 14 35 14 C 42 14 50 18 50 30 C 46 25 41 25 36 25 C 31 25 25 26 20 30 Z"
          fill="#0F172A"
        />

        {/* Black Rim Glasses */}
        <rect
          x="23"
          y="29"
          width="10"
          height="8"
          rx="2"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.8"
        />
        <rect
          x="37"
          y="29"
          width="10"
          height="8"
          rx="2"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.8"
        />
        <line
          x1="33"
          y1="33"
          x2="37"
          y2="33"
          stroke="#0F172A"
          strokeWidth="1.8"
        />

        {/* Happy Eyes behind glasses */}
        <ellipse cx="28" cy="33" rx="1.5" ry="2" fill="#0F172A" />
        <ellipse cx="42" cy="33" rx="1.5" ry="2" fill="#0F172A" />

        {/* Big Proud Smile */}
        <path
          d="M 28 39 Q 35 47 42 39 Z"
          fill="#DC2626"
          stroke="#0F172A"
          strokeWidth="1"
        />
        {/* Cheeks */}
        <circle cx="22" cy="37" r="2.5" fill="#F87171" opacity="0.6" />
        <circle cx="48" cy="37" r="2.5" fill="#F87171" opacity="0.6" />

        {/* ── Golden Trophy held in the air! ── */}
        <g transform="translate(18, -26)">
          <path
            d="M 5 12 C 0 12 -2 22 8 23"
            fill="none"
            stroke="url(#pGold)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 29 12 C 34 12 36 22 26 23"
            fill="none"
            stroke="url(#pGold)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 8 6 Q 17 6 26 6 L 24 22 C 22 28 18 29 17 29 C 16 29 12 28 10 22 Z"
            fill="url(#pGold)"
          />
          <ellipse cx="17" cy="6" rx="9" ry="2" fill="#FFF9C4" />
          <path
            d="M 17 12 L 18 15 L 21 15 L 18.5 17 L 19.5 20 L 17 18 L 14.5 20 L 15.5 17 L 13 15 L 16 15 Z"
            fill="#FFFFFF"
          />
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

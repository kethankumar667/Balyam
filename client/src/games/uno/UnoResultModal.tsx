import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Player, UnoPlayerState } from "@shared/types";
import Modal from "../../components/Modal";
import RematchPanel from "../../components/RematchPanel";
import PrizeWonChip from "../../components/economy/PrizeWonChip";
import PlayerSettlementSummary from "../../components/economy/PlayerSettlementSummary";
import { findAvatar } from "../../lib/avatars";
import { fireUnoWinConfetti } from "./uno-confetti";
import { useAnimationConfig } from "../../animations/helpers/useAnimationConfig";
import { WinnerCelebration } from "../../animations/card/WinnerCelebration";
import { VictoryDance } from "../../animations/card/VictoryDance";
import type { FeltAnchor } from "../../animations/helpers/types";
import { useRoomStore } from "../../store/roomStore";
import { deriveTerminalMatchId } from "../../lib/economyMotionTriggers";
import { useMatchSettlement, winnerPrizesFor } from "../../hooks/useMatchSettlement";

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

  useEffect(() => {
    if (isSelfWinner) fireUnoWinConfetti();
  }, [isSelfWinner]);

  const ranked = [...state.playerOrder].sort(
    (a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0),
  );

  const winnerScore = winnerId ? (state.scores[winnerId] ?? 0) : 0;

  // Real-money prize per placement, for a paid match only — see the hook's
  // own doc comment for why this is a re-derivation of a real, authoritative
  // amount (EconomyService's own math, shared verbatim) rather than a guess.
  const roomState = useRoomStore((s) => s.roomState);
  const matchId = deriveTerminalMatchId(roomState);
  const { settlement } = useMatchSettlement(matchId);
  const winnerPrizes = winnerPrizesFor(settlement);
  const myRankIndex = selfId ? ranked.indexOf(selfId) : -1;
  const selfIsGuest = selfId ? players.find((p) => p.id === selfId)?.isGuest ?? false : false;

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Match results"
      mobileSheet={false}
      panelClassName="w-full max-w-lg md:max-w-2xl max-h-[92dvh] flex flex-col rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.55)]"
    >
      {isSelfWinner && <WinnerCelebration config={animConfig} />}
      {isSelfWinner && <VictoryDance anchor={VICTORY_DANCE_ANCHOR} config={animConfig} />}

      <motion.div
        className="relative flex flex-col h-full min-h-0 bg-[#F7F0E3] border-2 border-[#D8C7AA]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, #FFFDF8 0%, #F5ECDD 100%)",
        }}
        initial={animConfig.reducedMotion ? false : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
      >
        {/* Left Spiral Binder Ring Holes */}
        <div
          className="absolute left-2 sm:left-3.5 top-4 bottom-4 flex flex-col justify-between items-center w-4 sm:w-5 pointer-events-none z-20"
          aria-hidden
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#423223] shadow-[inset_0_2px_3px_rgba(0,0,0,0.65),0_1px_1px_rgba(255,255,255,0.7)] border border-[#2D2116]/80 relative"
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/20" />
            </div>
          ))}
        </div>

        {/* Background Hand-Drawn Doodles */}
        <DoodleBackground />

        {/* Top Close '✕' Button — sits above the scroll area so it's always reachable */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFE4D0] hover:bg-[#E2D5BD] active:scale-95 flex items-center justify-center text-[#6E553F] border border-[#D5C4A8] text-sm font-black transition z-30 shadow-xs cursor-pointer"
        >
          ✕
        </button>

        {/* Header (fixed at top, never scrolls) */}
        <div className="flex-shrink-0 pl-8 sm:pl-12 pr-4 sm:pr-8 pt-4 sm:pt-6 relative z-10">
          {/* Top Trophy & Header */}
          <div className="flex flex-col items-center text-center">
            {/* Hand-Drawn Golden Trophy Icon */}
            <div className="relative mb-1 flex items-center justify-center">
              <div className="w-16 h-14 sm:w-20 sm:h-18 flex items-center justify-center">
                <HandDrawnTrophy />
              </div>
            </div>

            {/* Winner Headline with Retro Hatch Whiskers */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#A84A15] font-black text-lg sm:text-xl tracking-tighter" aria-hidden>
                ≍
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-[#2B1B0E] tracking-tight">
                {isSelfWinner
                  ? "You Win!"
                  : winnerId
                    ? `${nameOf(winnerId)} Wins!`
                    : "Round Over"}
              </h2>
              <span className="text-[#A84A15] font-black text-lg sm:text-xl tracking-tighter" aria-hidden>
                ≍
              </span>
            </div>

            {/* Points Subtitle Badge */}
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[#D6C4A6] bg-[#FAF4EA]/80 text-[#8C3F10] font-extrabold text-xs sm:text-sm shadow-2xs">
              <span className="text-amber-500 font-serif">☆</span>
              <span>
                {state.targetScore != null
                  ? `${winnerScore} points (${state.round} round${state.round === 1 ? "" : "s"})`
                  : `+${winnerScore} points`}
              </span>
              <span className="text-amber-500 font-serif">☆</span>
            </div>
          </div>
        </div>

        {/* Scrollable body — the only region that scrolls, so the header and
            action dock below stay reachable no matter how tall the content
            gets (short phones, a full 4th-place row, the settlement panel,
            or all three at once). */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pl-8 sm:pl-12 pr-4 sm:pr-8 pb-2 relative z-10 space-y-2 sm:space-y-4">
          {/* 2-Column Main Content Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-5 items-center my-1 sm:my-2">
            {/* LEFT: Polaroid Photo Card */}
            <div className="hidden md:flex md:col-span-5 justify-center">
              <div className="relative w-full max-w-[160px] sm:max-w-[190px] md:max-w-[220px] bg-white p-2.5 sm:p-3 pb-3 sm:pb-4 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.14)] border border-[#E4D7C0] flex flex-col items-center transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                {/* Masking tape on top-center */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 sm:h-5 bg-[#E8DAC2]/90 border border-[#D0BF9F]/70 -rotate-2 rounded-[2px] shadow-2xs pointer-events-none"
                  aria-hidden
                />

                {/* Cartoon Illustration */}
                <div className="w-full aspect-[4/3.2] rounded-lg overflow-hidden bg-gradient-to-b from-[#FFF5D8] via-[#FFF9EA] to-[#FFEEC6] border border-[#F5E8C8] flex items-center justify-center relative p-1">
                  <CelebrationIllustration winnerName={winnerPlayer?.name ?? "Winner"} />
                </div>

                {/* Handwritten style caption */}
                <div className="text-center mt-2 space-y-0.5">
                  <p className="text-[12px] sm:text-[13px] md:text-sm font-black text-[#3A2819] leading-tight font-body">
                    Great game!
                  </p>
                  <p className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#6D533C] leading-tight flex items-center justify-center gap-1">
                    <span>Well played everyone!</span>
                    <span className="text-rose-600">♥</span>
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Ruled Memo Scores Sheet */}
            <div className="md:col-span-7 relative bg-[#FAF5EB] border border-[#E4D7BE] rounded-2xl p-3 sm:p-4 shadow-xs space-y-2">
              {/* Masking tape on top-right */}
              <div
                className="absolute -top-2.5 right-3 w-10 sm:w-12 h-4 sm:h-4.5 bg-[#E8DAC2]/90 border border-[#D0BF9F]/70 rotate-6 rounded-[2px] shadow-2xs pointer-events-none"
                aria-hidden
              />

              {/* Memo Binder notches on left edge */}
              <div className="absolute left-1 top-4 bottom-4 flex flex-col justify-between items-center w-1.5 pointer-events-none opacity-40">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#8C7660]" />
                ))}
              </div>

              {/* Scores Header */}
              <div className="flex items-center justify-center gap-1.5 pb-1 border-b border-[#E8DCC6]">
                <span className="text-[#A84A15] text-xs font-bold" aria-hidden>
                  ≍
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#A84A15]">
                  SCORES
                </span>
                <span className="text-[#A84A15] text-xs font-bold" aria-hidden>
                  ≍
                </span>
              </div>

              {/* Lined Leaderboard List */}
              <div className="space-y-1.5 max-h-[140px] sm:max-h-[175px] overflow-y-auto pr-1">
                {ranked.map((id, index) => {
                  const isWinnerRow = id === winnerId;
                  const p = players.find((pl) => pl.id === id);
                  const avatarOpt = p?.avatar ? findAvatar(p.avatar) : null;
                  const rankNum = index + 1;

                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border-b border-[#EADBCA]/70 transition-colors ${
                        isWinnerRow
                          ? "bg-[#FFECC7]/60 text-[#2B1B0E]"
                          : "text-[#4A3828]"
                      }`}
                    >
                      {/* Number Circle Badge (1: Gold, 2: Blue, 3: Bronze, 4+: Green) */}
                      <div
                        className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] text-white shrink-0 shadow-2xs ${
                          rankNum === 1
                            ? "bg-[#E5A124]"
                            : rankNum === 2
                              ? "bg-[#3B82F6]"
                              : rankNum === 3
                                ? "bg-[#C86D32]"
                                : "bg-[#529658]"
                        }`}
                      >
                        {rankNum}
                      </div>

                      {/* Avatar */}
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden shrink-0 border border-amber-400/50 bg-amber-100/50 flex items-center justify-center text-[10px]">
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
                          isWinnerRow ? "text-[#B91C1C] text-sm sm:text-base" : "text-[#5C4533]"
                        }`}
                      >
                        {state.scores[id] ?? 0}
                      </span>

                      {/* Prize — only for a paid, settled match, and only the placements it actually paid */}
                      {winnerPrizes?.[rankNum - 1] && <PrizeWonChip amount={winnerPrizes[rankNum - 1]} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action dock (fixed at bottom, never scrolls out of reach) */}
        <div className="flex-shrink-0 pl-8 sm:pl-12 pr-4 sm:pr-8 pb-4 sm:pb-6 pt-2 sm:pt-3 relative z-10 space-y-2 sm:space-y-2.5">
            <PlayerSettlementSummary
              settlement={settlement}
              myRank={myRankIndex}
              isGuest={selfIsGuest}
            />

            {/* Rematch — the shared panel every game uses, instead of a
                UNO-specific reimplementation of the same pending/accepted/
                declined states. Same protocol, same look everywhere now. */}
            <RematchPanel players={players} selfId={selfId} />

            {/* Secondary Action Row: Continue & Leave Table */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-0.5">
              {/* Continue: Tan Stitched Kraft Button */}
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-[#422C19] bg-[#E8CBA0] hover:bg-[#DEC093] active:scale-[0.98] border-2 border-[#CBB083] border-dashed shadow-2xs transition cursor-pointer text-center"
              >
                Continue
              </button>

              {/* Leave Table: Crimson Red Stitched Button */}
              <button
                type="button"
                onClick={onLeave ?? onClose}
                className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-white bg-[#9E2A2B] hover:bg-[#882223] active:scale-[0.98] border-2 border-[#C54A4B] border-dashed shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
              >
                <span>Leave Table</span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
      </motion.div>
    </Modal>
  );
}

/** Background Doodles matching the notebook sketchbook style */
function DoodleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Top Left: Red Hatched Star & Wire Coil */}
      <div className="absolute top-2.5 left-10 sm:left-14 flex items-center gap-1 opacity-80">
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-9 sm:h-9">
          <path
            d="M 20 4 L 24 14 L 35 15 L 26 23 L 29 34 L 20 28 L 11 34 L 14 23 L 5 15 L 16 14 Z"
            fill="#E85D4E"
            fillOpacity="0.18"
            stroke="#C93B2B"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <line x1="14" y1="18" x2="26" y2="28" stroke="#C93B2B" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="12" y1="24" x2="22" y2="34" stroke="#C93B2B" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="18" y1="12" x2="28" y2="22" stroke="#C93B2B" strokeWidth="1.2" strokeLinecap="round" />
        </svg>

        <svg viewBox="0 0 50 40" className="w-8 h-6 sm:w-10 sm:h-8 text-[#5C4533]/45">
          <path
            d="M 10 20 C 15 8, 30 8, 25 22 C 20 32, 38 32, 40 18 C 42 10, 28 10, 22 25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Top Right: Paperclip & Blue Hatched Star */}
      <div className="absolute top-2.5 right-12 sm:right-16 flex items-center gap-2 opacity-80">
        <svg viewBox="0 0 32 48" className="w-5 h-8 sm:w-6 sm:h-9 text-[#4B443B]">
          <path
            d="M 8 20 L 8 36 C 8 42, 22 42, 22 36 L 22 12 C 22 4, 2 4, 2 14 L 2 36 C 2 46, 28 46, 28 34 L 28 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-9 sm:h-9">
          <path
            d="M 20 4 L 24 14 L 35 15 L 26 23 L 29 34 L 20 28 L 11 34 L 14 23 L 5 15 L 16 14 Z"
            fill="#3B82F6"
            fillOpacity="0.16"
            stroke="#2563EB"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <line x1="14" y1="16" x2="26" y2="28" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="18" y1="12" x2="24" y2="18" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Bottom Left: Paper Airplane & Dashed Loop */}
      <div className="absolute bottom-2.5 left-10 sm:left-14 opacity-75">
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-9 sm:h-9 text-[#5C4533]">
          <path
            d="M 6 22 L 34 6 L 22 34 L 18 24 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M 18 24 L 34 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M 4 34 C 8 36, 12 30, 8 26 C 6 24, 4 28, 6 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      {/* Bottom Right: Hand-Drawn Flower/Rose Swirl */}
      <div className="absolute bottom-2.5 right-6 sm:right-10 opacity-70">
        <svg viewBox="0 0 50 50" className="w-8 h-8 sm:w-10 sm:h-10 text-[#5C4533]">
          <path
            d="M 25 25 C 22 22, 28 20, 27 26 C 26 30, 20 28, 22 22 C 24 16, 32 18, 33 25 C 34 32, 22 36, 18 28 C 14 20, 26 12, 34 16 C 40 20, 38 34, 28 38 C 18 42, 10 30, 14 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

/** Golden Hand-Drawn Trophy with Star Badge & Radiant Stars */
function HandDrawnTrophy() {
  return (
    <svg viewBox="0 0 90 70" className="w-full h-full overflow-visible">
      {/* Radiant stars around trophy */}
      <circle cx="12" cy="18" r="1.5" fill="#EAB308" />
      <circle cx="78" cy="16" r="1.5" fill="#EAB308" />
      <path d="M 16 10 L 17 12 L 19 13 L 17 14 L 16 16 L 15 14 L 13 13 L 15 12 Z" fill="#EAB308" />
      <path d="M 72 26 L 73 28 L 75 29 L 73 30 L 72 32 L 71 30 L 69 29 L 71 28 Z" fill="#EAB308" />

      {/* Trophy Handles */}
      <path
        d="M 28 22 C 16 22 14 36 30 38"
        fill="none"
        stroke="#422C1A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 28 22 C 18 22 16 34 29 36"
        fill="none"
        stroke="#EAB308"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M 62 22 C 74 22 76 36 60 38"
        fill="none"
        stroke="#422C1A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 62 22 C 72 22 74 34 61 36"
        fill="none"
        stroke="#EAB308"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Main Cup Body */}
      <path
        d="M 30 16 Q 45 16 60 16 L 56 40 C 53 49 48 50 45 50 C 42 50 37 49 34 40 Z"
        fill="#FACC15"
        stroke="#422C1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Cup Rim Highlight */}
      <ellipse cx="45" cy="16" rx="15" ry="3" fill="#FEF08A" stroke="#422C1A" strokeWidth="2" />

      {/* Star on Cup */}
      <path
        d="M 45 24 L 46.5 28.5 L 51 28.5 L 47.5 31.5 L 49 36 L 45 33 L 41 36 L 42.5 31.5 L 39 28.5 L 43.5 28.5 Z"
        fill="#FFFFFF"
        stroke="#422C1A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Stem */}
      <path d="M 42 50 L 48 50 L 47 57 L 43 57 Z" fill="#EAB308" stroke="#422C1A" strokeWidth="2" />

      {/* Base Pedestal */}
      <rect x="36" y="57" width="18" height="5" rx="1.5" fill="#92400E" stroke="#422C1A" strokeWidth="2" />
      <rect x="32" y="62" width="26" height="5" rx="1.5" fill="#78350F" stroke="#422C1A" strokeWidth="2" />
    </svg>
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

      {/* Background Stars */}
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


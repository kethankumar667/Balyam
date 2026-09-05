import { useState } from "react";
import type { ChatMessage, Player, TambolaClaimType, TambolaPlayerState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";
import SeatAvatar from "../../components/profile/SeatAvatar";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import GameThemeToggle from "../../components/theme/GameThemeToggle";
import type { GameSkinTheme } from "../../hooks/useGameTheme";

export interface TambolaBoardProps {
  state: TambolaPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
  /** Full room roster (carries `avatar`), used to draw each seat's picture. */
  players: Player[];
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  theme?: GameSkinTheme;
  toggleTheme?: () => void;
  isNotebook?: boolean;
  isNeon?: boolean;
}

export default function TambolaBoardMobile({ state, selfId, onMove, players, messages, roomCode, roomPhase, theme, toggleTheme, isNeon }: TambolaBoardProps) {
  const [showCalledList, setShowCalledList] = useState(false);
  const reactions = useSeatReactions();
  const isArranging = state.phase === "arranging";
  const myPlayer = state.players.find((p) => p.id === selfId);
  const avatarById = new Map<string, string | undefined>();
  for (const r of players) avatarById.set(r.id, r.avatar);

  const handleMark = (row: number, col: number) => {
    onMove("markCell", { row, col });
  };

  const handleClaim = (claimType: TambolaClaimType) => {
    onMove("claim", { claimType });
  };

  const handleShuffle = () => {
    onMove("shuffleTicket");
  };

  const handleLock = () => {
    onMove("ready");
  };

  const claimsList: { type: TambolaClaimType; label: string }[] = [
    { type: "early5", label: "Early 5" },
    { type: "topLine", label: "Top Line" },
    { type: "middleLine", label: "Middle Line" },
    { type: "bottomLine", label: "Bottom Line" },
    { type: "fullHouse", label: "Full House" },
  ];

  /* ── 1. Arranging / Shuffle Phase (Mobile) ── */
  if (isArranging) {
    return (
      <div className={`flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 font-sans space-y-4 justify-center transition-colors duration-300 ${isNeon ? "bg-slate-950 text-slate-100" : "text-ink-hi"}`}>
        <div className={`border-2 rounded-2xl p-5 shadow-xl space-y-4 text-center transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30" : "bg-surface-0 border-surface-rim"}`}>
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">
                Tambola / Housie Lounge
              </div>
              <h1 className="text-2xl font-display font-black mt-1">
                Your Lucky Ticket
              </h1>
            </div>
            {toggleTheme && theme && (
              <GameThemeToggle theme={theme} onToggle={toggleTheme} variant="compact" />
            )}
          </div>
          <p className="text-xs text-ink-mid">
            Tap <strong className="text-pink-600 font-bold">Shuffle</strong> until you like your numbers, then tap <strong className="text-emerald-600 font-bold">Start Game</strong>!
          </p>

          {/* 3x9 Ticket Preview */}
          <div className={`p-3 rounded-xl border shadow-inner ${isNeon ? "bg-slate-950/60 border-purple-500/20" : "bg-surface-1/90 border-surface-rim"}`}>
            <div className="grid grid-rows-3 gap-1.5">
              {state.myTicket.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-9 gap-1">
                  {row.map((val, cIdx) => {
                    if (val === 0) {
                      return <div key={cIdx} className={`${isNeon ? "bg-slate-900/40" : "bg-surface-0/50"} rounded-lg h-9`} />;
                    }
                    return (
                      <div
                        key={cIdx}
                        className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center border shadow-xs ${isNeon ? "bg-slate-900 border-purple-500/40 text-slate-100" : "bg-white/90 dark:bg-surface-0 border-surface-rim text-ink-hi"}`}
                      >
                        {val}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={handleShuffle}
              className="flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm bg-pink-600 hover:bg-pink-700 active:scale-95 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={handleLock}
              className={`flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 ${
                myPlayer?.isReady
                  ? "bg-emerald-700 text-white cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer"
              }`}
            >
              <span>{myPlayer?.isReady ? "✓" : "🚀"}</span>
              <span>{myPlayer?.isReady ? "Ready!" : "Start Game"}</span>
            </button>
          </div>

          {/* Player status pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-surface-rim">
            {state.players.map((p) => (
              <span
                key={p.id}
                ref={reactions.registerCardRef(p.id)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                  p.isReady
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-surface-1 border-surface-rim text-ink-mid"
                }`}
              >
                <span>{p.isReady ? "✓" : "⏳"}</span>
                <SeatAvatar
                  avatar={avatarById.get(p.id)}
                  name={p.name ?? p.id}
                  className="w-5 h-5"
                  textClassName="text-[8px]"
                />
                <span>{p.id === selfId ? "You" : p.name ?? p.id}</span>
              </span>
            ))}
          </div>
        </div>

        {roomCode && (
          <InlineRoomRail
            code={roomCode}
            game="tambola"
            phase={roomPhase}
            players={players}
            selfId={selfId}
            messages={messages}
          />
        )}

        <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
      </div>
    );
  }

  /* ── 2. Playing / Finished Phase (Mobile) ── */
  return (
    <div className={`flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 font-sans space-y-4 transition-colors duration-300 ${isNeon ? "bg-slate-950 text-slate-100" : "text-ink-hi"}`}>
      {/* Current Call Display */}
      <div className={`border rounded-2xl p-4 text-center shadow-lg relative overflow-hidden flex flex-col items-center transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)]" : "bg-surface-0 border-pink-500/30"}`}>
        <div className="flex justify-between items-center w-full text-xs text-ink-mid mb-2">
          <span>Tambola / Housie</span>
          {toggleTheme && theme && (
            <GameThemeToggle theme={theme} onToggle={toggleTheme} variant="compact" />
          )}
          <span>Called: {state.calledNumbers.length} / 90</span>
        </div>

        <motion.div
          key={state.currentCall}
          initial={{ scale: 0.2, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 flex items-center justify-center text-4xl font-display text-white shadow-2xl border-2 border-white/50 my-2 animate-glow-pulse"
        >
          {state.currentCall || "—"}
        </motion.div>

        <button
          onClick={() => setShowCalledList(!showCalledList)}
          className="text-xs text-pink-600 dark:text-pink-300 font-semibold hover:underline mt-1 cursor-pointer"
        >
          {showCalledList ? "Hide Called Numbers" : "View All Called Numbers"}
        </button>
      </div>

      {/* Called Numbers Drawer */}
      <AnimatePresence>
        {showCalledList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-surface-1 border border-surface-rim rounded-xl p-3 max-h-40 overflow-y-auto"
          >
            <div className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-2 uppercase">Drawn Numbers</div>
            <div className="flex flex-wrap gap-1.5">
              {state.calledNumbers.map((num) => (
                <span
                  key={num}
                  className="w-7 h-7 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center justify-center"
                >
                  {num}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tambola Ticket (3x9 Grid) */}
      <div className={`border rounded-2xl p-3 shadow-xl transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30" : "bg-surface-0 border-surface-rim"}`}>
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 flex justify-between items-center">
          <span>Your Ticket</span>
          <span className="text-[11px] text-ink-mid">Tap numbers as they're called</span>
        </div>

        <div className={`grid grid-rows-3 gap-1.5 p-2 rounded-xl border ${isNeon ? "bg-slate-950/60 border-purple-500/20" : "bg-surface-1/80 border-surface-rim"}`}>
          {state.myTicket.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-9 gap-1">
              {row.map((val, cIdx) => {
                const isMarked = state.myMarkedCells[rIdx][cIdx];
                const isCalled = val > 0 && state.calledNumbers.includes(val);
                const isCurrent = val > 0 && state.currentCall === val;

                if (val === 0) {
                  return <div key={cIdx} className={`${isNeon ? "bg-slate-900/40" : "bg-surface-0/50"} rounded-lg h-9`} />;
                }

                return (
                  <button
                    key={cIdx}
                    onClick={() => handleMark(rIdx, cIdx)}
                    disabled={!isCalled}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition border active:scale-95 ${
                      isMarked
                        ? isNeon
                          ? "bg-emerald-500 border-cyan-300 text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                          : "bg-emerald-500 border-emerald-300 text-black shadow-lg"
                        : isCurrent
                        ? isNeon
                          ? "bg-pink-600 border-white text-white animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.8)]"
                          : "bg-pink-500 border-white text-white animate-pulse"
                        : isCalled
                        ? isNeon
                          ? "bg-purple-950/80 border-pink-500/50 text-pink-300 cursor-pointer shadow-[0_0_8px_rgba(236,72,153,0.3)]"
                          : "bg-pink-500/20 border-pink-500/40 text-pink-700 dark:text-pink-200 cursor-pointer"
                        : isNeon
                        ? "bg-slate-900/90 border-slate-800 text-slate-400 opacity-70"
                        : "bg-surface-0 border-surface-rim text-ink-mute opacity-70"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Claim Buttons */}
      <div className="bg-surface-0 border border-surface-rim rounded-2xl p-3 shadow-lg space-y-2">
        <div className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Claims</div>
        <div className="grid grid-cols-2 gap-2">
          {claimsList.map((c) => {
            const winner = state.winners.find((w) => w.type === c.type);
            const isWon = Boolean(winner);
            const isWonByMe = winner?.winnerId === selfId;

            return (
              <button
                key={c.type}
                onClick={() => handleClaim(c.type)}
                disabled={isWon}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition border ${
                  isWonByMe
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                    : isWon
                    ? "bg-surface-1 border-surface-rim text-ink-mute line-through cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700 border-pink-400/40 text-white shadow active:scale-95 cursor-pointer"
                }`}
              >
                <span>{c.label}</span>
                {winner && (
                  <span className="text-[9px] font-normal truncate max-w-[60px] opacity-80">
                    {winner.winnerId === selfId ? "You!" : winner.winnerName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="tambola"
          phase={roomPhase}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

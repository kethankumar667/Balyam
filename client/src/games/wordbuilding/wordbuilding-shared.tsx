import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Player,
  WordBuildingPublicState,
  WordBuildingScoredWord,
} from "@shared/types";
import type { Ink } from "./inks";
import type { WordBuildingBoardModel } from "./useWordBuildingBoard";
import CoachHintButton, { type CoachState } from "../../components/CoachHintButton";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import GameThemeToggle from "../../components/theme/GameThemeToggle";
import type { GameSkinTheme } from "../../hooks/useGameTheme";

/**
 * Word Building — shared presentational layer.
 *
 * Every dumb sub-component the board renders lives here so the mobile and
 * desktop shells share one source of truth. Logic/state live in
 * useWordBuildingBoard; this file is render-only. The `wb-cell-pulse`
 * keyframe now lives in index.css (was an inline <style> in Grid).
 */

/* ─────────────────────────── Workbook paper shell ─────────────────────────── */

export function WorkbookPaper({ children, isNeon }: { children: React.ReactNode; isNeon?: boolean }) {
  if (isNeon) {
    return (
      <div
        className="relative mx-auto rounded-xl overflow-hidden mt-3 text-slate-100 transition-colors duration-300"
        style={{
          background: "linear-gradient(180deg, #090d16 0%, #030712 100%)",
          boxShadow:
            "0 14px 26px -10px rgba(0,0,0,0.8), 0 0 25px rgba(56, 189, 248, 0.2), inset 0 0 0 1px rgba(56, 189, 248, 0.3)",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(56, 189, 248, 0.08) 26px 27px, transparent 27px 28px), linear-gradient(to right, transparent 0 54px, rgba(236, 72, 153, 0.3) 54px 55px, transparent 55px 100%)",
        }}
      >
        {/* Neon corner accent */}
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: 40,
            height: 40,
            background: "linear-gradient(225deg, rgba(56, 189, 248, 0.4) 0%, rgba(0,0,0,0) 60%)",
            clipPath: "polygon(100% 0, 0 0, 100% 100%)",
          }}
          aria-hidden
        />
        {/* Neon HUD watermark */}
        <div
          className="absolute bottom-2 right-4 pointer-events-none font-mono tracking-widest uppercase"
          style={{ fontSize: 13, color: "#38bdf8", opacity: 0.6 }}
          aria-hidden
        >
          [CYBER // LEXICON 47]
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto rounded-md overflow-hidden mt-3 transition-colors duration-300"
      style={{
        background: "linear-gradient(180deg, #fdf6e3 0%, #f0debb 100%)",
        boxShadow:
          "0 14px 26px -10px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(120,82,40,0.10)",
        // Sepia rules every 28px + the teacher's red margin line at 56px.
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(150,108,58,0.34) 26px 27px, transparent 27px 28px), linear-gradient(to right, transparent 0 54px, #c2403a 54px 55px, transparent 55px 100%)",
        backgroundBlendMode: "multiply",
      }}
    >
      {/* Folded top-right corner */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: 40,
          height: 40,
          background:
            "linear-gradient(225deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 60%), linear-gradient(225deg, #ecdcb0 0%, #fbf3df 60%)",
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }}
        aria-hidden
      />
      {/* Tiny ink stain */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "62%",
          top: 12,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,45,18,0.5) 0%, rgba(124,45,18,0) 70%)",
          filter: "blur(0.4px)",
        }}
        aria-hidden
      />
      {/* Page number — bottom-right, handwritten */}
      <div
        className="absolute bottom-2 right-4 pointer-events-none"
        style={{ fontSize: 22, color: "#5a4a3a", transform: "rotate(-3deg)" }}
        aria-hidden
      >
        — 47 —
      </div>
      {children}
    </div>
  );
}

export function MarginDoodles({ isNeon }: { isNeon?: boolean }) {
  if (isNeon) {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Neon HUD crosshair reticle */}
        <svg
          style={{ position: "absolute", left: 10, top: 60, opacity: 0.4 }}
          width="32" height="32" viewBox="0 0 32 32"
        >
          <circle cx="16" cy="16" r="12" stroke="#38bdf8" strokeWidth="1" fill="none" strokeDasharray="4 2" />
          <line x1="16" y1="2" x2="16" y2="30" stroke="#38bdf8" strokeWidth="1" />
          <line x1="2" y1="16" x2="30" y2="16" stroke="#38bdf8" strokeWidth="1" />
        </svg>
        {/* Neon circuit nodes */}
        <svg
          style={{ position: "absolute", right: 14, bottom: 25, opacity: 0.4 }}
          width="36" height="36" viewBox="0 0 36 36"
        >
          <path d="M4 18 H18 V32 M18 18 L30 6" stroke="#ec4899" strokeWidth="1.2" fill="none" />
          <circle cx="4" cy="18" r="2.5" fill="#ec4899" />
          <circle cx="18" cy="32" r="2.5" fill="#ec4899" />
          <circle cx="30" cy="6" r="2.5" fill="#ec4899" />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Paper plane near top-left margin */}
      <svg
        style={{ position: "absolute", left: 8, top: 60, opacity: 0.55 }}
        width="34" height="22" viewBox="0 0 34 22"
      >
        <path
          d="M2 11 L30 3 L18 21 L14 14 Z"
          stroke="#a8531f" strokeWidth="1.2" fill="none" strokeLinejoin="round"
        />
        <path d="M14 14 L30 3" stroke="#a8531f" strokeWidth="0.8" />
      </svg>
      {/* Smiley */}
      <svg
        style={{ position: "absolute", left: 8, bottom: 70, opacity: 0.55 }}
        width="28" height="28" viewBox="0 0 28 28"
      >
        <circle cx="14" cy="14" r="11" stroke="#9b1c1c" strokeWidth="1.2" fill="none" />
        <circle cx="10" cy="12" r="1.2" fill="#9b1c1c" />
        <circle cx="18" cy="12" r="1.2" fill="#9b1c1c" />
        <path d="M9 17 Q14 21 19 17" stroke="#9b1c1c" strokeWidth="1.2" fill="none" />
      </svg>
      {/* Star sticker bottom-right margin */}
      <svg
        style={{ position: "absolute", right: 14, bottom: 30, opacity: 0.7 }}
        width="32" height="32" viewBox="0 0 32 32"
      >
        <polygon
          points="16,2 20,12 31,13 22,20 25,31 16,25 7,31 10,20 1,13 12,12"
          fill="#fde68a" stroke="#b45309" strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────── Grid ─────────────────────────── */

export function Grid({
  board,
  size,
  cellPx,
  selected,
  canPlay,
  cellOverlays,
  inkOf,
  activeAnnotation,
  activePulse,
  hintCells,
  onPickCell,
  isNeon,
}: {
  board: string[][];
  size: number;
  cellPx: number;
  selected: { r: number; c: number } | null;
  canPlay: boolean;
  cellOverlays: Map<string, WordBuildingScoredWord[]>;
  inkOf: Record<string, Ink>;
  /** Word whose teacher-tick annotation is currently visible (or null). */
  activeAnnotation: WordBuildingScoredWord | null;
  /** Word whose cells should pulse-highlight right now (or null). */
  activePulse: WordBuildingScoredWord | null;
  /** Cells the AI Coach is pointing at, as "r,c" keys. */
  hintCells: ReadonlySet<string>;
  onPickCell: (r: number, c: number) => void;
  isNeon?: boolean;
}) {
  // Cell key set for the pulsing word — used inside the cell render to overlay
  // the brief highlight. Memoised so an unrelated re-render (timer tick, hover)
  // doesn't rebuild the set; only changes when the pulsing word changes.
  const pulseCells = useMemo(
    () => new Set(activePulse ? activePulse.cells.map((c) => `${c.r},${c.c}`) : []),
    [activePulse],
  );
  const pulseInk = activePulse ? inkOf[activePulse.scorerId] : null;
  return (
    <div
      className="relative inline-block rounded-sm transition-colors duration-300"
      style={{
        background: isNeon ? "rgba(15, 23, 42, 0.75)" : "rgba(255,255,255,0.45)",
        padding: 6,
        boxShadow: isNeon ? "inset 0 0 0 1px rgba(56, 189, 248, 0.25)" : "inset 0 0 0 1px rgba(120,82,40,0.18)",
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
          gridAutoRows: `${cellPx}px`,
          gap: 2,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const k = `${r},${c}`;
            const overlays = cellOverlays.get(k) ?? [];
            const filled = cell !== "";
            const isSel = selected?.r === r && selected?.c === c;
            const isHint = hintCells.has(k);
            const lastOverlay = overlays[overlays.length - 1];
            const inkOwner = lastOverlay?.scorerId ? inkOf[lastOverlay.scorerId] : null;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onPickCell(r, c)}
                disabled={!canPlay || filled}
                className="relative flex items-center justify-center transition"
                style={{
                  width: cellPx,
                  height: cellPx,
                  background: isSel
                    ? isNeon ? "rgba(56, 189, 248, 0.35)" : "rgba(251,191,36,0.55)"
                    : filled
                    ? isNeon
                      ? inkOwner ? `${inkOwner.inkColor}2c` : "rgba(30, 41, 59, 0.85)"
                      : inkOwner?.highlight ?? "transparent"
                    : isNeon
                    ? "rgba(15, 23, 42, 0.85)"
                    : "rgba(255,255,255,0.55)",
                  border: isSel
                    ? isNeon ? "1.5px dashed #38bdf8" : "1.5px dashed #b45309"
                    : isNeon
                    ? "1px solid rgba(56, 189, 248, 0.22)"
                    : "1px solid rgba(120,82,40,0.18)",
                  cursor: canPlay && !filled ? "pointer" : "default",
                  // Coach ring sits OUTSIDE the cell border so it reads as an
                  // annotation over the sheet rather than as a new cell state.
                  outline: isHint ? (isNeon ? "2.5px solid #38bdf8" : "2.5px solid #E6A11E") : undefined,
                  outlineOffset: isHint ? 1 : undefined,
                  fontFamily: "'Caveat', 'Patrick Hand', cursive",
                  fontSize: cellPx * 0.62,
                  lineHeight: 1,
                  color: filled
                    ? isNeon
                      ? overlays.length > 0 && lastOverlay?.scorerId
                        ? inkOf[lastOverlay.scorerId]?.inkColor || "#38bdf8"
                        : "#f8fafc"
                      : overlays.length > 0
                      ? (lastOverlay?.scorerId && inkOf[lastOverlay.scorerId]?.inkColor) || "#1e293b"
                      : "#1e293b"
                    : "transparent",
                  textShadow: isNeon && filled
                    ? `0 0 8px ${overlays.length > 0 && lastOverlay?.scorerId ? inkOf[lastOverlay.scorerId]?.inkColor || "#38bdf8" : "#38bdf8"}`
                    : filled && overlays.length > 0
                    ? (lastOverlay?.scorerId && inkOf[lastOverlay.scorerId]?.inkShadow) || "0 0 0.4px rgba(0,0,0,0.5)"
                    : "0 0 0.4px rgba(0,0,0,0.5)",
                  transform: filled ? `rotate(${(((r * 7 + c * 13) % 5) - 2) * 0.6}deg)` : "none",
                }}
                aria-label={
                  filled
                    ? `Cell ${r + 1},${c + 1}: ${cell}`
                    : `Empty cell ${r + 1},${c + 1}`
                }
              >
                {filled ? (
                  <motion.span
                    key={cell}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {cell}
                  </motion.span>
                ) : null}
                {/* Brief celebration pulse over freshly-scored cells. Pointer
                    events disabled so it never blocks the next placement. */}
                {pulseCells.has(k) && pulseInk && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: 3,
                      background: `radial-gradient(circle, ${pulseInk.inkColor}55 0%, ${pulseInk.inkColor}00 70%)`,
                      animation: "wb-cell-pulse 1.4s ease-out forwards",
                      boxShadow: `0 0 12px ${pulseInk.inkColor}88`,
                    }}
                    aria-hidden
                  />
                )}
                {/* Bottom underline per scored word, stacked when overlapping */}
                {overlays.length > 0 && (
                  <span
                    className="absolute left-0.5 right-0.5"
                    style={{
                      bottom: 1,
                      height: Math.min(3, overlays.length),
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {overlays.slice(0, 3).map((w, i) => (
                      <span
                        key={`${w.id}-${i}`}
                        style={{
                          height: 1,
                          background: inkOf[w.scorerId]?.inkColor ?? "#000",
                          opacity: 0.75,
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {/* Teacher annotation — auto-dismisses after ~2.2s via the parent's
          timer (sets activeAnnotation to null), AnimatePresence handles the
          fade-out. */}
      <AnimatePresence>
        {activeAnnotation && (
          <TeacherTickFor
            key={activeAnnotation.id}
            word={activeAnnotation}
            cellPx={cellPx}
            ink={inkOf[activeAnnotation.scorerId]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Annotation tiers are static — hoisted out of TeacherTickFor's render.
const TICK_TIERS: Record<number, { label: string; stars: number }> = {
  3: { label: "Good!", stars: 3 },
  4: { label: "Well done!", stars: 4 },
  5: { label: "Very Good!", stars: 5 },
  6: { label: "Excellent!", stars: 5 },
};

function TeacherTickFor({
  word,
  cellPx,
  ink,
}: {
  word: WordBuildingScoredWord;
  cellPx: number;
  ink?: Ink;
}) {
  const tier = (word.points >= 6 ? TICK_TIERS[6] : TICK_TIERS[word.points]) ?? TICK_TIERS[3]!;

  const last = word.cells[word.cells.length - 1];
  if (!last) return null;
  const left = (last.c + 1) * (cellPx + 2) + 8; // +2 for grid gap
  const top = last.r * (cellPx + 2) + 2;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10, rotate: -8 }}
      animate={{ opacity: 1, x: 0, rotate: -6 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{
        position: "absolute",
        left,
        top,
        color: ink?.inkColor ?? "#9b1c1c",
        textShadow: ink?.inkShadow ?? "0 0 0.4px rgba(155,28,28,0.55)",
        fontFamily: "'Caveat', 'Patrick Hand', cursive",
        fontSize: 22,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <span className="mr-1">✓</span>
      <span>{tier.label}</span>{" "}
      <span style={{ color: "#b45309", fontSize: 16 }}>
        {"★".repeat(tier.stars)}{" "}
        <span style={{ color: ink?.inkColor }}>+{word.points}</span>
      </span>
    </motion.div>
  );
}

/* ─────────────────────────── Student bar (header) ─────────────────────────── */

export function StudentBar({
  state,
  inkOf,
  nameOf,
  avatarOf,
  selfId,
  remainingSec,
  coach,
  onOpenTutorial,
  onLeave,
  registerCardRef,
  onTarget,
  activeTargetId,
  onCloseTarget,
  theme,
  onToggleTheme,
  isNeon,
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  selfId: string | null;
  remainingSec: number | null;
  /** AI Coach state from the board model. Omitted by shells without one. */
  coach?: CoachState;
  onOpenTutorial: () => void;
  onLeave?: () => void;
  /** Opponent-targeted reactions: registers this row as the fly-to/flinch anchor for `pid`. */
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
  theme?: GameSkinTheme;
  onToggleTheme?: () => void;
  isNeon?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
      {/* Leave — top-left */}
      {onLeave && (
        <button
          type="button"
          onClick={onLeave}
          className="rounded-full px-3 py-1.5 transition active:translate-y-px"
          style={{
            background: isNeon ? "#0f172a" : "#4A3F35",
            border: isNeon ? "1px solid rgba(56,189,248,0.3)" : "1px solid #3a3028",
            color: isNeon ? "#e2e8f0" : "#FFF3E3",
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            fontSize: 18,
            cursor: "pointer",
          }}
          aria-label="Leave game"
        >
          Leave
        </button>
      )}
      {/* Theme toggle button */}
      {onToggleTheme && theme && (
        <GameThemeToggle theme={theme} onToggle={onToggleTheme} variant="compact" />
      )}
      {state.playerOrder.map((pid) => {
        const ink = inkOf[pid];
        const isTurn = state.turnPlayerId === pid;
        const me = pid === selfId;
        const isTargetActive = activeTargetId === pid;
        return (
          <div
            key={pid}
            ref={registerCardRef?.(pid)}
            className={`relative rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 transition min-w-[96px] sm:min-w-[130px] ${!me ? "cursor-pointer hover:brightness-110 active:scale-[0.98]" : ""}`}
            onClick={!me ? () => onTarget?.(pid) : undefined}
            title={!me ? `Tap to react at ${nameOf(pid)}` : undefined}
            style={{
              background: isTurn
                ? isNeon ? "rgba(56,189,248,0.22)" : "rgba(251,191,36,0.22)"
                : isNeon ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.55)",
              border: isTurn
                ? `2px solid ${isNeon ? "#38bdf8" : ink.inkColor}`
                : isNeon ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(120,82,40,0.22)",
              boxShadow: isTurn
                ? isNeon ? "0 0 16px rgba(56,189,248,0.35)" : `0 0 0 2px ${ink.inkColor}22 inset`
                : undefined,
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
            }}
          >
            {isTargetActive && onCloseTarget && (
              <SeatTargetReactionWheel
                game="wordbuilding"
                targetPlayerId={pid}
                targetPlayerName={nameOf(pid)}
                onClose={onCloseTarget}
                position="bottom"
              />
            )}
            <div className="flex items-center gap-1.5">
              <SeatAvatar avatar={avatarOf(pid)} name={nameOf(pid)} className="w-6 h-6" textClassName="text-[9px]" />
              <span className="font-black text-[17px] sm:text-[22px]" style={{ color: ink.inkColor }}>
                {nameOf(pid)}{me ? " (you)" : ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 14, color: isNeon ? "#94a3b8" : "#6b5b48" }}>Marks</span>
              <span
                className="font-black text-[22px] sm:text-[28px]"
                style={{ color: ink.inkColor, lineHeight: 1 }}
              >
                {state.scores[pid] ?? 0}
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex-1" />
      {/* Coach — sits beside the timer because both answer "what now?".
          Only while the round is live; a hint on a finished sheet is noise. */}
      {coach && state.phase === "playing" && <CoachHintButton coach={coach} />}
      {/* Timer */}
      {remainingSec != null && state.phase === "playing" && (
        <div
          className="rounded-full px-3 py-1 font-black text-[17px] sm:text-[22px]"
          style={{
            background: remainingSec <= 5 ? "rgba(220,38,38,0.25)" : isNeon ? "rgba(56,189,248,0.15)" : "rgba(124,45,18,0.12)",
            color: remainingSec <= 5 ? (isNeon ? "#f87171" : "#7f1d1d") : isNeon ? "#38bdf8" : "#7c2d12",
            border: `1.5px solid ${remainingSec <= 5 ? (isNeon ? "#ef4444" : "#7f1d1d") : isNeon ? "#38bdf8" : "#7c2d12"}`,
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            textAlign: "center",
          }}
        >
          ⏱ {remainingSec}s
        </div>
      )}
      {/* Help — top-right */}
      <button
        type="button"
        onClick={onOpenTutorial}
        className="rounded-full px-3 py-1.5 transition active:translate-y-px"
        style={{
          background: isNeon ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.7)",
          border: isNeon ? "1px solid rgba(56,189,248,0.3)" : "1px solid #c2a578",
          color: isNeon ? "#38bdf8" : "#7c2d12",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
          fontSize: 18,
          cursor: "pointer",
        }}
        aria-label="How to play Word Building"
        title="How to play"
      >
        ? Help
      </button>
    </div>
  );
}

/* ─────────────────────────── Letter pad ─────────────────────────── */

const LETTER_PAD_ROWS = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ"];

export function LetterPad({
  onPick,
  onCancel,
  isNeon,
}: {
  onPick: (letter: string) => void;
  onCancel: () => void;
  isNeon?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className={isNeon ? "text-slate-300" : "text-[#6b5b48]"} style={{ fontSize: 18 }}>
        Pick a letter — or just type on your keyboard. <button
          type="button"
          onClick={onCancel}
          className={`ml-2 underline ${isNeon ? "text-cyan-400 hover:text-cyan-300" : "text-[#7c2d12]"}`}
        >Cancel</button>
      </div>
      {LETTER_PAD_ROWS.map((row) => (
        <div key={row} className="flex gap-1.5">
          {row.split("").map((L) => (
            <button
              key={L}
              type="button"
              onClick={() => onPick(L)}
              className="font-black transition active:translate-y-px"
              style={{
                width: 30, height: 36,
                background: isNeon ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.85)",
                border: isNeon ? "1px solid rgba(56,189,248,0.35)" : "1px solid #c2a578",
                borderRadius: 4,
                color: isNeon ? "#38bdf8" : "#1e3a8a",
                fontFamily: "'Caveat', 'Patrick Hand', cursive",
                fontSize: 22,
                cursor: "pointer",
                boxShadow: isNeon ? "0 0 8px rgba(56,189,248,0.2)" : "0 1px 0 rgba(120,82,40,0.18)",
              }}
            >
              {L}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Footer (vocabulary + leaderboard) ─────────────────────────── */

export function FooterRow({
  state,
  inkOf,
  nameOf,
  selfId,
  className = "mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 px-1",
  isNeon,
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  selfId: string | null;
  /** Layout shells override the grid arrangement (stacked vs side-by-side). */
  className?: string;
  isNeon?: boolean;
}) {
  // Most recent 12 words newest first.
  const vocab = state.scoredWords.slice(-12).reverse();
  const standings = state.playerOrder
    .map((pid) => ({ pid, score: state.scores[pid] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return (
    <div className={className}>
      {/* Vocabulary feed */}
      <div
        className="rounded-md px-4 py-3 transition-colors duration-300"
        style={{
          background: isNeon ? "linear-gradient(180deg, #0f172a, #0b0f19)" : "linear-gradient(180deg,#fbf3df,#f0e3c2)",
          border: isNeon ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid rgba(120,82,40,0.22)",
          boxShadow: isNeon ? "0 0 15px rgba(56, 189, 248, 0.08)" : undefined,
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        <div
          className="mb-2"
          style={{
            fontSize: 22,
            color: isNeon ? "#38bdf8" : "#7c2d12",
            borderBottom: isNeon ? "1px dashed rgba(56, 189, 248, 0.3)" : "1px dashed rgba(120,82,40,0.45)",
            paddingBottom: 4,
          }}
        >
          Vocabulary Found
        </div>
        {vocab.length === 0 && (
          <div style={{ color: isNeon ? "#94a3b8" : "#7a6651", fontSize: 18 }}>
            No words yet. Open a row or column with a letter and watch it light up.
          </div>
        )}
        <ul className="space-y-1" style={{ maxHeight: 90, overflowY: "auto" }}>
          {vocab.map((w) => (
            <li key={w.id} className="flex items-baseline justify-between" style={{ fontSize: 20 }}>
              <span>
                <span style={{ color: inkOf[w.scorerId]?.inkColor ?? (isNeon ? "#38bdf8" : "#1e293b"), fontWeight: 700 }}>
                  {w.word}
                </span>
                <span className="ml-2" style={{ fontSize: 14, color: isNeon ? "#94a3b8" : "#7a6651" }}>
                  — {nameOf(w.scorerId)} ({w.orientation})
                </span>
              </span>
              <span style={{ color: isNeon ? "#38bdf8" : "#b45309", fontWeight: 700 }}>+{w.points}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Leaderboard styled like the attendance register */}
      <div
        className="rounded-md px-4 py-3 transition-colors duration-300"
        style={{
          background: isNeon ? "linear-gradient(180deg, #0f172a, #0b0f19)" : "linear-gradient(180deg,#fbf3df,#f0e3c2)",
          border: isNeon ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid rgba(120,82,40,0.22)",
          boxShadow: isNeon ? "0 0 15px rgba(56, 189, 248, 0.08)" : undefined,
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        <div
          className="mb-2 flex items-baseline justify-between"
          style={{
            fontSize: 22,
            color: isNeon ? "#38bdf8" : "#7c2d12",
            borderBottom: isNeon ? "1px dashed rgba(56, 189, 248, 0.3)" : "1px dashed rgba(120,82,40,0.45)",
            paddingBottom: 4,
          }}
        >
          <span>Class Standings</span>
          <span style={{ fontSize: 14, color: isNeon ? "#94a3b8" : "#7a6651" }}>
            {state.filledCells}/{state.totalCells} cells filled
          </span>
        </div>
        <ol className="space-y-1">
          {standings.map((row, i) => {
            const me = row.pid === selfId;
            return (
              <li key={row.pid} className="flex items-baseline justify-between" style={{ fontSize: 20 }}>
                <span>
                  <span style={{ color: isNeon ? "#94a3b8" : "#7a6651", marginRight: 8 }}>{i + 1}.</span>
                  <span style={{ color: inkOf[row.pid]?.inkColor ?? (isNeon ? "#38bdf8" : "#1e293b"), fontWeight: 700 }}>
                    {nameOf(row.pid)}
                  </span>
                  {me && <span style={{ fontSize: 14, color: isNeon ? "#94a3b8" : "#7a6651" }}> (you)</span>}
                </span>
                <span style={{ color: inkOf[row.pid]?.inkColor ?? (isNeon ? "#38bdf8" : "#1e293b"), fontWeight: 800 }}>
                  {row.score}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ─────────────────────────── Report card (endgame) ─────────────────────────── */

export function ReportCardOverlay({
  state,
  nameOf,
  inkOf,
  onClose,
}: {
  state: WordBuildingPublicState;
  nameOf: (id: string) => string;
  inkOf: Record<string, Ink>;
  onClose: () => void;
}) {
  const standings = state.playerOrder
    .map((pid) => ({ pid, score: state.scores[pid] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const champ = state.winnerId;
  const longest = state.scoredWords.reduce<WordBuildingScoredWord | null>(
    (best, w) => (best == null || w.word.length > best.word.length ? w : best),
    null,
  );
  const top = state.scoredWords.reduce<WordBuildingScoredWord | null>(
    (best, w) => (best == null || w.points > best.points ? w : best),
    null,
  );
  const totalWords = state.scoredWords.length;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Word Building report card"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full rounded-md overflow-hidden"
        style={{
          // Solid base color so the felt + scored cells underneath don't
          // bleed through. See TutorialModal for the same fix rationale.
          backgroundColor: "#fbf3df",
          backgroundImage:
            "linear-gradient(180deg, rgba(251,243,223,0) 0%, rgba(246,235,208,1) 100%), " +
            "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(56,89,168,0.32) 26px 27px, transparent 27px 28px), " +
            "linear-gradient(to right, transparent 0 38px, #c2403a 38px 39px, transparent 39px 100%)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
          padding: "20px 22px 22px 50px",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        {/* Close button — tap target outside the gutter so it doesn't
            collide with the red margin line. Backdrop click also closes. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report card"
          className="absolute right-2 top-2 rounded-full transition active:translate-y-px"
          style={{
            width: 30,
            height: 30,
            background: "rgba(124,45,18,0.12)",
            border: "1px solid rgba(124,45,18,0.4)",
            color: "#7c2d12",
            fontFamily: "'Caveat', cursive",
            fontSize: 20,
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ×
        </button>
        <div
          className="text-center mb-2"
          style={{
            fontSize: 28,
            color: "#7c2d12",
            borderBottom: "2px solid #7c2d12",
            paddingBottom: 4,
          }}
        >
          ★ Vocabulary Report Card ★
        </div>
        <div className="text-center mb-3" style={{ fontSize: 20, color: "#1e3a8a" }}>
          Class Topper:{" "}
          <span style={{ color: champ ? inkOf[champ]?.inkColor : "#1e3a8a", fontWeight: 800 }}>
            {champ ? nameOf(champ) : "—"}
          </span>
        </div>
        <Row label="Total Words Found" value={String(totalWords)} />
        <Row
          label="Longest Word"
          value={longest ? `${longest.word} (${longest.word.length})` : "—"}
        />
        <Row
          label="Highest Scoring Move"
          value={top ? `${top.word} +${top.points}` : "—"}
        />
        <div
          className="mt-3 pt-2"
          style={{ borderTop: "1px dashed #7a6651", fontSize: 20, color: "#7c2d12" }}
        >
          Final Marks
        </div>
        <ol className="space-y-0.5 mt-1">
          {standings.map((s, i) => (
            <li key={s.pid} className="flex justify-between" style={{ fontSize: 20 }}>
              <span>
                {i + 1}.{" "}
                <span style={{ color: inkOf[s.pid]?.inkColor, fontWeight: 700 }}>
                  {nameOf(s.pid)}
                </span>
              </span>
              <span style={{ color: inkOf[s.pid]?.inkColor, fontWeight: 800 }}>
                {s.score}
              </span>
            </li>
          ))}
        </ol>
        {/* School seal + signature */}
        <div className="flex items-end justify-between mt-4">
          <div
            className="flex items-center justify-center"
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              border: "2px dashed #7c2d12",
              color: "#7c2d12",
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.1,
              opacity: 0.85,
              transform: "rotate(-8deg)",
            }}
          >
            BHALYAM<br />ENGLISH<br />WORKBOOK
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#1e3a8a",
              transform: "rotate(-4deg)",
              borderBottom: "1px solid #1e3a8a",
              paddingBottom: 2,
            }}
          >
            ~ Teacher
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 20 }}>
      <span style={{ color: "#5a4a3a" }}>{label}</span>
      <span style={{ color: "#1e3a8a", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────── Workbook board area ─────────────────────────── */

/**
 * The full workbook page: handwritten subject/room header, the centred grid,
 * the on-screen letter pad (when it's your turn and a cell is picked), the
 * waiting/error captions and the margin doodles. Shared verbatim by both
 * shells — only `cellPx` and the surrounding column layout differ.
 */
export function WorkbookBoard({
  m,
  state,
  cellPx,
  roomCode,
}: {
  m: WordBuildingBoardModel;
  state: WordBuildingPublicState;
  cellPx: number;
  roomCode?: string;
}) {
  return (
    <WorkbookPaper isNeon={m.isNeon}>
      {/* Page header — handwritten subject + date line */}
      <div
        className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 px-3 sm:px-6 pt-3 sm:pt-4 pb-2 select-none text-[14px] sm:text-[20px] transition-colors duration-300"
        style={{ color: m.isNeon ? "#38bdf8" : "#7c2d12" }}
      >
        <div>
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>{m.isNeon ? "TERMINAL:" : "Subject:"}</span>{" "}
          <span style={{ borderBottom: m.isNeon ? "1px dotted #38bdf866" : "1px dotted #7c2d1255" }}>
            {m.isNeon ? "CYBER LEXICON // MATRIX" : "English Vocabulary"}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: 700 }}>Room:</span>{" "}
          <span style={{ borderBottom: m.isNeon ? "1px dotted #38bdf866" : "1px dotted #7c2d1255" }}>{roomCode ?? "—"}</span>
        </div>
      </div>

      {/* Centered grid */}
      <div className="flex flex-col items-center px-3 pb-4 pt-1">
        <Grid
          board={state.board}
          size={m.size}
          cellPx={cellPx}
          selected={m.selected}
          canPlay={m.canPlay}
          cellOverlays={m.cellOverlays}
          inkOf={m.inkOf}
          activeAnnotation={m.activeAnnotation}
          activePulse={m.activePulse}
          hintCells={m.coach.highlight}
          onPickCell={m.pickCell}
          isNeon={m.isNeon}
        />

        {/* Letter input — keyboard on desktop, on-screen for mobile */}
        {m.canPlay && m.selected && (
          <LetterPad onPick={m.placeLetter} onCancel={() => m.setSelected(null)} isNeon={m.isNeon} />
        )}
        {!m.myTurn && state.phase === "playing" && (
          <div className="mt-3 transition-colors duration-300" style={{ color: m.isNeon ? "#94a3b8" : "#7a6651", fontSize: 22 }}>
            Waiting for{" "}
            <span style={{ color: m.inkOf[state.turnPlayerId]?.inkColor ?? (m.isNeon ? "#38bdf8" : "#7c2d12") }}>
              {m.nameOf(state.turnPlayerId)}
            </span>{" "}
            to write…
          </div>
        )}
        {m.error && (
          <div className="mt-2 text-rose-500 font-semibold" style={{ fontSize: 18 }}>
            {m.error}
          </div>
        )}
      </div>

      {/* Margin doodles (decorative; absolutely positioned within paper) */}
      <MarginDoodles isNeon={m.isNeon} />
    </WorkbookPaper>
  );
}

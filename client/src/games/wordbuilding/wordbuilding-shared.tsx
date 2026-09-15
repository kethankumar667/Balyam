import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Player,
  WordBuildingPublicState,
  WordBuildingScoredWord,
} from "@shared/types";
import { getInkDisplayColor, type Ink } from "./inks";
import type { WordBuildingBoardModel } from "./useWordBuildingBoard";
import CoachHintButton, { type CoachState } from "../../components/CoachHintButton";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import GameThemeToggle from "../../components/theme/GameThemeToggle";
import type { GameSkinTheme } from "../../hooks/useGameTheme";
import { useFullscreenToggle } from "../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../lib/fullscreen";

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
          [WORDS // BUILDING]
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
      className="relative inline-block rounded-2xl transition-colors duration-300"
      style={{
        background: isNeon ? "#ffffff" : "rgba(255,255,255,0.45)",
        padding: 8,
        boxShadow: isNeon
          ? "0 14px 35px -5px rgba(0,0,0,0.4), 0 0 20px rgba(56, 189, 248, 0.25), inset 0 0 0 1px rgba(226, 232, 240, 0.8)"
          : "inset 0 0 0 1px rgba(120,82,40,0.18)",
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
                    ? isNeon ? "rgba(224, 242, 254, 0.95)" : "rgba(251,191,36,0.55)"
                    : filled
                    ? isNeon
                      ? inkOwner ? inkOwner.highlight : "rgba(241, 245, 249, 0.95)"
                      : inkOwner?.highlight ?? "transparent"
                    : isNeon
                    ? "rgba(255, 255, 255, 0.95)"
                    : "rgba(255,255,255,0.55)",
                  border: isSel
                    ? isNeon ? "2px dashed #0284c7" : "1.5px dashed #b45309"
                    : isNeon
                    ? "1px solid rgba(203, 213, 225, 0.8)"
                    : "1px solid rgba(120,82,40,0.18)",
                  cursor: canPlay && !filled ? "pointer" : "default",
                  outline: isHint ? (isNeon ? "2.5px solid #0284c7" : "2.5px solid #E6A11E") : undefined,
                  outlineOffset: isHint ? 1 : undefined,
                  fontFamily: "'Caveat', 'Patrick Hand', cursive",
                  fontSize: cellPx * 0.62,
                  lineHeight: 1,
                  color: filled
                    ? overlays.length > 0
                      ? (lastOverlay?.scorerId && inkOf[lastOverlay.scorerId]?.inkColor) || "#0f172a"
                      : "#0f172a"
                    : "transparent",
                  textShadow: filled && overlays.length > 0
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
    </div>
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
  const { isFullscreen, toggleFullscreen } = useFullscreenToggle();
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
                ? `2px solid ${getInkDisplayColor(ink, isNeon)}`
                : isNeon ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(120,82,40,0.22)",
              boxShadow: isTurn
                ? isNeon ? `0 0 16px ${ink.neonColor}66` : `0 0 0 2px ${ink.inkColor}22 inset`
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
              <span className="font-black text-[17px] sm:text-[22px]" style={{ color: getInkDisplayColor(ink, isNeon) }}>
                {nameOf(pid)}{me ? " (you)" : ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 14, color: isNeon ? "#94a3b8" : "#6b5b48" }}>Marks</span>
              <span
                className="font-black text-[22px] sm:text-[28px]"
                style={{ color: getInkDisplayColor(ink, isNeon), lineHeight: 1 }}
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
      {/* Fullscreen toggle — beside Help, top-right */}
      {isFullscreenSupported() && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-full px-3 py-1.5 transition active:translate-y-px"
          style={{
            background: isNeon ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.7)",
            border: isNeon ? "1px solid rgba(56,189,248,0.3)" : "1px solid #c2a578",
            color: isNeon ? "#38bdf8" : "#7c2d12",
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            fontSize: 18,
            cursor: "pointer",
          }}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          ⛶ {isFullscreen ? "Exit FS" : "Fullscreen"}
        </button>
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
  selectedCell,
  disabled,
  alwaysOpen,
}: {
  onPick: (letter: string) => void;
  onCancel?: () => void;
  isNeon?: boolean;
  selectedCell?: { r: number; c: number } | null;
  disabled?: boolean;
  alwaysOpen?: boolean;
}) {
  const isCellPicked = !!selectedCell;

  return (
    <div className="mt-3 w-full flex flex-col items-center gap-1.5 select-none">
      <div
        className={`text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 ${
          isNeon ? (isCellPicked ? "text-cyan-300" : "text-slate-400") : isCellPicked ? "text-[#1e3a8a]" : "text-[#6b5b48]"
        }`}
      >
        {isCellPicked ? (
          <span>
            Cell ({selectedCell.r + 1}, {selectedCell.c + 1}) selected — Click a letter or type on keyboard:
          </span>
        ) : (
          <span>Click an empty cell on the grid to write</span>
        )}
        {isCellPicked && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider transition ${
              isNeon
                ? "bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/60"
                : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300"
            }`}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {LETTER_PAD_ROWS.map((row) => (
          <div key={row} className="flex gap-1.5 justify-center">
            {row.split("").map((L) => (
              <button
                key={L}
                type="button"
                onClick={() => onPick(L)}
                disabled={disabled}
                className={`font-black transition-all active:scale-95 ${
                  isCellPicked
                    ? "hover:scale-105 hover:brightness-110 cursor-pointer shadow-md"
                    : "opacity-85 hover:opacity-100 cursor-pointer"
                }`}
                style={{
                  width: 34,
                  height: 38,
                  background: isNeon
                    ? isCellPicked
                      ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
                      : "rgba(15,23,42,0.85)"
                    : isCellPicked
                    ? "#ffffff"
                    : "rgba(255,255,255,0.9)",
                  border: isNeon
                    ? isCellPicked
                      ? "1.5px solid #38bdf8"
                      : "1px solid rgba(56,189,248,0.28)"
                    : isCellPicked
                    ? "1.5px solid #1e3a8a"
                    : "1px solid #c2a578",
                  borderRadius: 6,
                  color: isNeon ? (isCellPicked ? "#38bdf8" : "#94a3b8") : isCellPicked ? "#1e3a8a" : "#475569",
                  fontFamily: "'Caveat', 'Patrick Hand', cursive",
                  fontSize: 22,
                  boxShadow: isNeon
                    ? isCellPicked
                      ? "0 0 10px rgba(56,189,248,0.35)"
                      : "none"
                    : isCellPicked
                    ? "0 2px 4px rgba(30,58,138,0.2)"
                    : "0 1px 0 rgba(120,82,40,0.18)",
                }}
              >
                {L}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Vocabulary Feed Card ─────────────────────────── */

export function VocabularyFoundCard({
  state,
  inkOf,
  nameOf,
  isNeon,
  maxHeight = 220,
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  isNeon?: boolean;
  maxHeight?: number | string;
}) {
  const vocab = state.scoredWords.slice(-16).reverse();

  return (
    <div
      className="rounded-2xl p-4 transition-colors duration-300 flex flex-col"
      style={{
        background: isNeon
          ? "linear-gradient(180deg, #0B0E28, #070919)"
          : "linear-gradient(180deg, #fbf3df, #f0e3c2)",
        border: isNeon ? "1px solid rgba(56, 189, 248, 0.25)" : "1.5px solid rgba(120,82,40,0.25)",
        boxShadow: isNeon ? "0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(56, 189, 248, 0.08)" : "0 4px 12px rgba(120,82,40,0.08)",
        fontFamily: "'Caveat', 'Patrick Hand', cursive",
      }}
    >
      <div
        className="mb-2 pb-2 flex items-center justify-between"
        style={{
          borderBottom: isNeon ? "1px dashed rgba(56, 189, 248, 0.3)" : "1px dashed rgba(120,82,40,0.4)",
        }}
      >
        <h2 className="text-xl font-black" style={{ color: isNeon ? "#38bdf8" : "#7c2d12" }}>
          Vocabulary Found
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: isNeon ? "rgba(56,189,248,0.15)" : "rgba(120,82,40,0.15)", color: isNeon ? "#38bdf8" : "#7c2d12" }}>
          {state.scoredWords.length} words
        </span>
      </div>

      {vocab.length === 0 ? (
        <div className="py-4 text-center text-sm font-semibold" style={{ color: isNeon ? "#64748b" : "#7a6651" }}>
          No words yet. Complete a row, column or diagonal word to score!
        </div>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto no-scrollbar pr-1 flex-1" style={{ maxHeight }}>
          {vocab.map((w) => {
            const ink = inkOf[w.scorerId];
            return (
              <li
                key={w.id}
                className="flex items-center justify-between px-2.5 py-1 rounded-xl transition"
                style={{
                  background: isNeon ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
                  border: isNeon ? "1px solid rgba(56,189,248,0.15)" : "1px solid rgba(120,82,40,0.12)",
                }}
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    className="font-black text-xl truncate"
                    style={{ color: getInkDisplayColor(ink, isNeon) }}
                  >
                    {w.word}
                  </span>
                  <span className="text-xs truncate" style={{ color: isNeon ? "#94a3b8" : "#7a6651" }}>
                    — {nameOf(w.scorerId)} ({w.orientation})
                  </span>
                </div>
                <span
                  className="font-black text-lg px-2 py-0.2 rounded-md"
                  style={{
                    color: isNeon ? "#38bdf8" : "#b45309",
                    background: isNeon ? "rgba(56,189,248,0.15)" : "rgba(180,83,9,0.1)",
                  }}
                >
                  +{w.points}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────── Class Standings Card ─────────────────────────── */

export function ClassStandingsCard({
  state,
  inkOf,
  nameOf,
  selfId,
  isNeon,
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  selfId: string | null;
  isNeon?: boolean;
}) {
  const standings = state.playerOrder
    .map((pid) => ({ pid, score: state.scores[pid] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div
      className="rounded-2xl p-4 transition-colors duration-300 flex flex-col"
      style={{
        background: isNeon
          ? "linear-gradient(180deg, #0B0E28, #070919)"
          : "linear-gradient(180deg, #fbf3df, #f0e3c2)",
        border: isNeon ? "1px solid rgba(56, 189, 248, 0.25)" : "1.5px solid rgba(120,82,40,0.25)",
        boxShadow: isNeon ? "0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(56, 189, 248, 0.08)" : "0 4px 12px rgba(120,82,40,0.08)",
        fontFamily: "'Caveat', 'Patrick Hand', cursive",
      }}
    >
      <div
        className="mb-2 pb-2 flex items-center justify-between"
        style={{
          borderBottom: isNeon ? "1px dashed rgba(56, 189, 248, 0.3)" : "1px dashed rgba(120,82,40,0.4)",
        }}
      >
        <h2 className="text-xl font-black" style={{ color: isNeon ? "#38bdf8" : "#7c2d12" }}>
          Class Standings
        </h2>
        <span className="text-xs font-bold" style={{ color: isNeon ? "#94a3b8" : "#7a6651" }}>
          {state.filledCells}/{state.totalCells} cells filled
        </span>
      </div>

      <ol className="space-y-1.5">
        {standings.map((row, i) => {
          const me = row.pid === selfId;
          const ink = inkOf[row.pid];
          return (
            <li
              key={row.pid}
              className="flex items-center justify-between px-2.5 py-1 rounded-xl transition"
              style={{
                background: isNeon ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
                border: isNeon ? "1px solid rgba(56,189,248,0.15)" : "1px solid rgba(120,82,40,0.12)",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold w-4" style={{ color: isNeon ? "#64748b" : "#7a6651" }}>
                  {i + 1}.
                </span>
                <span
                  className="font-bold text-lg truncate"
                  style={{ color: getInkDisplayColor(ink, isNeon) }}
                >
                  {nameOf(row.pid)}
                </span>
                {me && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                    style={{
                      background: isNeon ? "rgba(56,189,248,0.2)" : "rgba(30,58,138,0.12)",
                      color: isNeon ? "#38bdf8" : "#1e3a8a",
                    }}
                  >
                    You
                  </span>
                )}
              </div>
              <span
                className="font-black text-xl"
                style={{ color: getInkDisplayColor(ink, isNeon) }}
              >
                {row.score}
              </span>
            </li>
          );
        })}
      </ol>
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
  className?: string;
  isNeon?: boolean;
}) {
  return (
    <div className={className}>
      <VocabularyFoundCard state={state} inkOf={inkOf} nameOf={nameOf} isNeon={isNeon} maxHeight={120} />
      <ClassStandingsCard state={state} inkOf={inkOf} nameOf={nameOf} selfId={selfId} isNeon={isNeon} />
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
            {m.isNeon ? "WORDS BUILDING // MATRIX" : "English Vocabulary"}
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
            <span style={{ color: getInkDisplayColor(m.inkOf[state.turnPlayerId], m.isNeon, m.isNeon ? "#38bdf8" : "#7c2d12") }}>
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

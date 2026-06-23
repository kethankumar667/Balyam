import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Player,
  WordBuildingPublicState,
  WordBuildingScoredWord,
} from "@shared/types";
import type { Ink } from "./inks";
import type { WordBuildingBoardModel } from "./useWordBuildingBoard";

/**
 * Word Building — shared presentational layer.
 *
 * Every dumb sub-component the board renders lives here so the mobile and
 * desktop shells share one source of truth. Logic/state live in
 * useWordBuildingBoard; this file is render-only. The `wb-cell-pulse`
 * keyframe now lives in index.css (was an inline <style> in Grid).
 */

/* ─────────────────────────── Workbook paper shell ─────────────────────────── */

export function WorkbookPaper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded-md overflow-hidden mt-3"
      style={{
        background: "linear-gradient(180deg, #fbf3df 0%, #f6ebd0 100%)",
        boxShadow:
          "0 14px 26px -10px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(120,82,40,0.10)",
        // Blue rules every 28px + the teacher's red margin line at 56px.
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(56,89,168,0.32) 26px 27px, transparent 27px 28px), linear-gradient(to right, transparent 0 54px, #c2403a 54px 55px, transparent 55px 100%)",
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
          background: "radial-gradient(circle, rgba(30,58,138,0.55) 0%, rgba(30,58,138,0) 70%)",
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

export function MarginDoodles() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Paper plane near top-left margin */}
      <svg
        style={{ position: "absolute", left: 8, top: 60, opacity: 0.55 }}
        width="34" height="22" viewBox="0 0 34 22"
      >
        <path
          d="M2 11 L30 3 L18 21 L14 14 Z"
          stroke="#1e3a8a" strokeWidth="1.2" fill="none" strokeLinejoin="round"
        />
        <path d="M14 14 L30 3" stroke="#1e3a8a" strokeWidth="0.8" />
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
  onPickCell,
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
  onPickCell: (r: number, c: number) => void;
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
      className="relative inline-block rounded-sm"
      style={{
        background: "rgba(255,255,255,0.45)",
        padding: 6,
        boxShadow: "inset 0 0 0 1px rgba(120,82,40,0.18)",
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
            const inkOwner = overlays.length > 0 ? inkOf[overlays[overlays.length - 1].scorerId] : null;
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
                    ? "rgba(251,191,36,0.55)"
                    : filled
                    ? inkOwner?.highlight ?? "transparent"
                    : "rgba(255,255,255,0.55)",
                  border: isSel
                    ? "1.5px dashed #b45309"
                    : "1px solid rgba(120,82,40,0.18)",
                  cursor: canPlay && !filled ? "pointer" : "default",
                  fontFamily: "'Caveat', 'Patrick Hand', cursive",
                  fontSize: cellPx * 0.62,
                  lineHeight: 1,
                  color: filled ? overlays.length > 0
                    ? overlays[overlays.length - 1].scorerId &&
                      inkOf[overlays[overlays.length - 1].scorerId]?.inkColor
                    : "#1e293b" : "transparent",
                  textShadow: filled && overlays.length > 0
                    ? inkOf[overlays[overlays.length - 1].scorerId]?.inkShadow
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
  const tier = word.points >= 6 ? TICK_TIERS[6] : TICK_TIERS[word.points] ?? TICK_TIERS[3];

  const last = word.cells[word.cells.length - 1];
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
  selfId,
  remainingSec,
  onOpenTutorial,
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  selfId: string | null;
  remainingSec: number | null;
  onOpenTutorial: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      {state.playerOrder.map((pid) => {
        const ink = inkOf[pid];
        const isTurn = state.turnPlayerId === pid;
        const me = pid === selfId;
        return (
          <div
            key={pid}
            className="rounded-lg px-3 py-1.5 transition"
            style={{
              background: isTurn ? "rgba(251,191,36,0.22)" : "rgba(255,255,255,0.55)",
              border: isTurn ? `2px solid ${ink.inkColor}` : "1px solid rgba(120,82,40,0.22)",
              boxShadow: isTurn ? `0 0 0 2px ${ink.inkColor}22 inset` : undefined,
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              minWidth: 130,
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-black" style={{ color: ink.inkColor, fontSize: 22 }}>
                {nameOf(pid)}{me ? " (you)" : ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 14, color: "#6b5b48" }}>Marks</span>
              <span
                className="font-black"
                style={{ color: ink.inkColor, fontSize: 28, lineHeight: 1 }}
              >
                {state.scores[pid] ?? 0}
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onOpenTutorial}
        className="rounded-full px-3 py-1.5 transition active:translate-y-px"
        style={{
          background: "rgba(255,255,255,0.7)",
          border: "1px solid #c2a578",
          color: "#7c2d12",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
          fontSize: 18,
          cursor: "pointer",
        }}
        aria-label="How to play Word Building"
        title="How to play"
      >
        ? Help
      </button>
      {remainingSec != null && state.phase === "playing" && (
        <div
          className="rounded-full px-4 py-1.5 font-black"
          style={{
            background: remainingSec <= 5 ? "rgba(220,38,38,0.18)" : "rgba(30,58,138,0.12)",
            color: remainingSec <= 5 ? "#7f1d1d" : "#1e3a8a",
            border: `1.5px solid ${remainingSec <= 5 ? "#7f1d1d" : "#1e3a8a"}`,
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            fontSize: 22,
            minWidth: 90,
            textAlign: "center",
          }}
        >
          ⏱ {remainingSec}s
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Letter pad ─────────────────────────── */

const LETTER_PAD_ROWS = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ"];

export function LetterPad({
  onPick,
  onCancel,
}: {
  onPick: (letter: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="text-[#6b5b48]" style={{ fontSize: 18 }}>
        Pick a letter — or just type on your keyboard. <button
          type="button"
          onClick={onCancel}
          className="ml-2 underline text-[#7c2d12]"
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
                background: "rgba(255,255,255,0.85)",
                border: "1px solid #c2a578",
                borderRadius: 4,
                color: "#1e3a8a",
                fontFamily: "'Caveat', 'Patrick Hand', cursive",
                fontSize: 22,
                cursor: "pointer",
                boxShadow: "0 1px 0 rgba(120,82,40,0.18)",
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
}: {
  state: WordBuildingPublicState;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  selfId: string | null;
  /** Layout shells override the grid arrangement (stacked vs side-by-side). */
  className?: string;
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
        className="rounded-md px-4 py-3"
        style={{
          background: "linear-gradient(180deg,#fbf3df,#f0e3c2)",
          border: "1px solid rgba(120,82,40,0.22)",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        <div
          className="mb-2"
          style={{
            fontSize: 22,
            color: "#7c2d12",
            borderBottom: "1px dashed rgba(120,82,40,0.45)",
            paddingBottom: 4,
          }}
        >
          Vocabulary Found
        </div>
        {vocab.length === 0 && (
          <div style={{ color: "#7a6651", fontSize: 18 }}>
            No words yet. Open a row or column with a letter and watch it light up.
          </div>
        )}
        <ul className="space-y-1">
          {vocab.map((w) => (
            <li key={w.id} className="flex items-baseline justify-between" style={{ fontSize: 20 }}>
              <span>
                <span style={{ color: inkOf[w.scorerId]?.inkColor, fontWeight: 700 }}>
                  {w.word}
                </span>
                <span className="ml-2" style={{ fontSize: 14, color: "#7a6651" }}>
                  — {nameOf(w.scorerId)} ({w.orientation})
                </span>
              </span>
              <span style={{ color: "#b45309", fontWeight: 700 }}>+{w.points}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Leaderboard styled like the attendance register */}
      <div
        className="rounded-md px-4 py-3"
        style={{
          background: "linear-gradient(180deg,#fbf3df,#f0e3c2)",
          border: "1px solid rgba(120,82,40,0.22)",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        <div
          className="mb-2 flex items-baseline justify-between"
          style={{
            fontSize: 22,
            color: "#7c2d12",
            borderBottom: "1px dashed rgba(120,82,40,0.45)",
            paddingBottom: 4,
          }}
        >
          <span>Class Standings</span>
          <span style={{ fontSize: 14, color: "#7a6651" }}>
            {state.filledCells}/{state.totalCells} cells filled
          </span>
        </div>
        <ol className="space-y-1">
          {standings.map((row, i) => {
            const me = row.pid === selfId;
            return (
              <li key={row.pid} className="flex items-baseline justify-between" style={{ fontSize: 20 }}>
                <span>
                  <span style={{ color: "#7a6651", marginRight: 8 }}>{i + 1}.</span>
                  <span style={{ color: inkOf[row.pid]?.inkColor, fontWeight: 700 }}>
                    {nameOf(row.pid)}
                  </span>
                  {me && <span style={{ fontSize: 14, color: "#7a6651" }}> (you)</span>}
                </span>
                <span style={{ color: inkOf[row.pid]?.inkColor, fontWeight: 800 }}>
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
    <WorkbookPaper>
      {/* Page header — handwritten subject + date line */}
      <div
        className="flex justify-between items-baseline px-6 pt-4 pb-2 select-none"
        style={{ fontSize: 20, color: "#1e3a8a" }}
      >
        <div>
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>Subject:</span>{" "}
          <span style={{ borderBottom: "1px dotted #1e3a8a55" }}>English Vocabulary</span>
        </div>
        <div>
          <span style={{ fontWeight: 700 }}>Room:</span>{" "}
          <span style={{ borderBottom: "1px dotted #1e3a8a55" }}>{roomCode ?? "—"}</span>
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
          onPickCell={m.pickCell}
        />

        {/* Letter input — keyboard on desktop, on-screen for mobile */}
        {m.canPlay && m.selected && (
          <LetterPad onPick={m.placeLetter} onCancel={() => m.setSelected(null)} />
        )}
        {!m.myTurn && state.phase === "playing" && (
          <div className="mt-3 text-[#7a6651]" style={{ fontSize: 22 }}>
            Waiting for{" "}
            <span style={{ color: m.inkOf[state.turnPlayerId]?.inkColor }}>
              {m.nameOf(state.turnPlayerId)}
            </span>{" "}
            to write…
          </div>
        )}
        {m.error && (
          <div className="mt-2 text-rose-700" style={{ fontSize: 18 }}>
            {m.error}
          </div>
        )}
      </div>

      {/* Margin doodles (decorative; absolutely positioned within paper) */}
      <MarginDoodles />
    </WorkbookPaper>
  );
}

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { DotsBoxesPublicState } from "@shared/types";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

/* ─────────────────────────── Player pens ─────────────────────────── */
/*
 * Rough Notebook Edition aesthetic — each player draws with the writing
 * implement they smuggled into class. Pencil graphite, blue ballpoint,
 * red checker pen, green ink. The visual signature carries identity all
 * the way through: line stroke color, claimed-box initial color, score
 * card accent. Shared verbatim by both the mobile and desktop shells.
 */
export type Pen = {
  name: string;
  color: string;
  /** Slightly softer color for box fills + score backgrounds. */
  softColor: string;
  /** Subtle drop-shadow approximating graphite/ink bleed. */
  shadow: string;
};

export const PENS: Pen[] = [
  { name: "HB Pencil",      color: "#3b3a36", softColor: "rgba(59,58,54,0.16)",  shadow: "0 0.5px 0 rgba(0,0,0,0.18)" },
  { name: "Reynolds Blue",  color: "#1e3a8a", softColor: "rgba(30,58,138,0.14)", shadow: "0 0.5px 0 rgba(30,58,138,0.30)" },
  { name: "Hero Red",       color: "#9b1c1c", softColor: "rgba(155,28,28,0.14)", shadow: "0 0.5px 0 rgba(155,28,28,0.32)" },
  { name: "Camlin Green",   color: "#14532d", softColor: "rgba(20,83,45,0.14)",  shadow: "0 0.5px 0 rgba(20,83,45,0.30)" },
];

export function penFor(idx: number): Pen {
  return PENS[((idx % PENS.length) + PENS.length) % PENS.length];
}

/* ─────────────────────────── Board geometry constants ─────────────────────────── */
/** Dot diameter and line thickness are fixed; only `cellPx` scales per tier. */
const DOT_PX = 7;
const LINE_THICK = 4;

/* ─────────────────────────── Notebook shell ─────────────────────────── */

export function NotebookPaper({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded-sm overflow-hidden mt-3"
      style={{
        // Squared graph paper — gray-blue grid on aged cream.
        background: "#f4f0e2",
        backgroundImage: [
          // Vertical grid lines (every 24px)
          "linear-gradient(to right, rgba(56,89,168,0.20) 1px, transparent 1px)",
          // Horizontal grid lines (every 24px)
          "linear-gradient(to bottom, rgba(56,89,168,0.20) 1px, transparent 1px)",
          // Subtle warm vignette so the paper isn't flat
          "radial-gradient(ellipse at top, rgba(0,0,0,0) 0%, rgba(80,60,30,0.05) 100%)",
        ].join(", "),
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
        boxShadow:
          "0 14px 26px -10px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(120,82,40,0.10)",
        transform: "rotate(-0.4deg)",
      }}
    >
      {/* Folded top-right corner */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: 36,
          height: 36,
          background:
            "linear-gradient(225deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 60%), linear-gradient(225deg, #e3d6b4 0%, #f4f0e2 60%)",
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }}
        aria-hidden
      />
      {/* Eraser smudge */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: "18%",
          top: 10,
          width: 24,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(180,160,120,0.45) 0%, rgba(180,160,120,0) 70%)",
          filter: "blur(1.5px)",
        }}
        aria-hidden
      />
      {/* Coffee ring — top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 18,
          top: 22,
          width: 46,
          height: 46,
          borderRadius: "50%",
          border: "2px solid rgba(120,72,30,0.18)",
          boxShadow: "inset 0 0 12px rgba(120,72,30,0.10)",
          opacity: 0.7,
        }}
        aria-hidden
      />
      {/* Page number */}
      <div
        className="absolute bottom-2 right-4 pointer-events-none"
        style={{ fontSize: 18, color: "#5a4a3a", transform: "rotate(-2deg)" }}
        aria-hidden
      >
        — Page 23 —
      </div>
      {children}
    </div>
  );
}

export function NotebookHeader({ roomCode, boxesPerSide }: { roomCode: string; boxesPerSide: number }) {
  return (
    <div
      className="flex justify-between items-baseline px-6 pt-4 pb-3 select-none"
      style={{ fontSize: 20, color: "#3b3a36" }}
    >
      <div>
        <span style={{ fontWeight: 700, letterSpacing: 1 }}>Subject:</span>{" "}
        <span style={{ borderBottom: "1px dotted #3b3a3655" }}>
          Maths · {boxesPerSide}×{boxesPerSide} boxes
        </span>
      </div>
      <div>
        <span style={{ fontWeight: 700 }}>Room:</span>{" "}
        <span style={{ borderBottom: "1px dotted #3b3a3655" }}>{roomCode}</span>
      </div>
    </div>
  );
}

export function NotebookMarginDoodles() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Spiral doodle in the bottom-left margin */}
      <svg
        style={{ position: "absolute", left: 8, bottom: 80, opacity: 0.5 }}
        width="34" height="34" viewBox="0 0 34 34"
      >
        <path
          d="M17 17 m0,-2 a2,2 0 1,0 0,4 a2,2 0 1,0 0,-4 m0,-2 a4,4 0 1,1 0,8 a4,4 0 1,1 0,-8 m0,-2 a6,6 0 1,0 0,12 a6,6 0 1,0 0,-12"
          stroke="#3b3a36" strokeWidth="1.2" fill="none"
        />
      </svg>
      {/* Tiny exam-style box check */}
      <svg
        style={{ position: "absolute", right: 14, bottom: 70, opacity: 0.55 }}
        width="32" height="32" viewBox="0 0 32 32"
      >
        <rect x="4" y="4" width="22" height="22" stroke="#9b1c1c" strokeWidth="1.5" fill="none" />
        <path d="M8 16 L14 22 L24 8" stroke="#9b1c1c" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      {/* Pencil sketch */}
      <svg
        style={{ position: "absolute", left: 18, top: 110, opacity: 0.55 }}
        width="42" height="14" viewBox="0 0 42 14"
      >
        <path d="M2 7 L36 7" stroke="#3b3a36" strokeWidth="1.4" fill="none" />
        <polygon points="36,3 41,7 36,11" fill="#3b3a36" />
        <rect x="2" y="4" width="6" height="6" fill="#fbbf24" stroke="#3b3a36" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

/* ─────────────────────────── Candidate line (tap target) ─────────────────────────── */

function CandidateLine({
  horizontal,
  left,
  top,
  length,
  canPlay,
  onClick,
  selfPenColor,
}: {
  horizontal: boolean;
  left: number;
  top: number;
  length: number;
  canPlay: boolean;
  onClick: () => void;
  selfPenColor?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      disabled={!canPlay}
      style={{
        position: "absolute",
        left,
        top,
        width: horizontal ? length : 20,
        height: horizontal ? 20 : length,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: canPlay ? "pointer" : "default",
      }}
      aria-label={horizontal ? "Draw horizontal line" : "Draw vertical line"}
    >
      {/* Preview stroke — only when hovering AND it's our turn */}
      {hover && canPlay && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: horizontal ? length : 3,
            height: horizontal ? 3 : length,
            background: selfPenColor ?? "#3b3a36",
            opacity: 0.45,
            borderRadius: 2,
          }}
          aria-hidden
        />
      )}
    </button>
  );
}

/* ─────────────────────────── Notebook board (dots / lines / boxes / tap targets) ─────────────────────────── */

/**
 * The play surface itself: drawn strokes, claimed boxes, the dot grid, and
 * the invisible tap targets over every empty edge. Shared by both shells —
 * the ONLY thing that differs per tier is `cellPx` (mobile keeps the
 * compact 64/48/38, desktop scales it up).
 *
 * Pulled out of the shell on purpose: nothing here depends on the turn
 * countdown, so the live clock (see {@link TurnTimer}) can tick without
 * re-rendering this geometry.
 */
export function NotebookBoard({
  state,
  cellPx,
  penOf,
  initialOf,
  drawnH,
  drawnV,
  canPlay,
  selfPenColor,
  onDraw,
}: {
  state: DotsBoxesPublicState;
  cellPx: number;
  penOf: Record<string, Pen>;
  initialOf: (id: string) => string;
  drawnH: Set<string>;
  drawnV: Set<string>;
  canPlay: boolean;
  selfPenColor?: string;
  onDraw: (kind: "h" | "v", r: number, c: number) => void;
}) {
  const size = state.options.boardSize;
  const totalPx = (size - 1) * cellPx + DOT_PX;

  // The dot grid never changes between real state updates — only when the
  // board size or cell scale changes. Memoise it so it isn't rebuilt on
  // every render of the surrounding shell.
  const dots = useMemo(() => {
    const out: ReactNode[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        out.push(
          <div
            key={`dot-${r}-${c}`}
            style={{
              position: "absolute",
              left: c * cellPx,
              top: r * cellPx,
              width: DOT_PX,
              height: DOT_PX,
              borderRadius: "50%",
              background: "#2a221a",
              boxShadow: "0 0.5px 0 rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
          />,
        );
      }
    }
    return out;
  }, [size, cellPx]);

  return (
    <div className="relative" style={{ width: totalPx, height: totalPx }}>
      {/* Drawn LINES — pencil/ink strokes, render under dots */}
      {state.hLines.map((l) => {
        const pen = penOf[l.playerId];
        const x = l.c * cellPx + DOT_PX / 2;
        const y = l.r * cellPx + DOT_PX / 2;
        const w = cellPx - DOT_PX;
        return (
          <motion.div
            key={`h-${l.r}-${l.c}-${l.playerId}`}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: x + DOT_PX / 2 - 1,
              top: y - LINE_THICK / 2 + DOT_PX / 2,
              width: w + 2,
              height: LINE_THICK,
              background: pen?.color ?? "#3b3a36",
              boxShadow: pen?.shadow,
              borderRadius: 2,
              transformOrigin: "left center",
            }}
          />
        );
      })}
      {state.vLines.map((l) => {
        const pen = penOf[l.playerId];
        const x = l.c * cellPx + DOT_PX / 2;
        const y = l.r * cellPx + DOT_PX / 2;
        const h = cellPx - DOT_PX;
        return (
          <motion.div
            key={`v-${l.r}-${l.c}-${l.playerId}`}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: x - LINE_THICK / 2 + DOT_PX / 2,
              top: y + DOT_PX / 2 - 1,
              width: LINE_THICK,
              height: h + 2,
              background: pen?.color ?? "#3b3a36",
              boxShadow: pen?.shadow,
              borderRadius: 2,
              transformOrigin: "top center",
            }}
          />
        );
      })}

      {/* Claimed BOXES — initial of the claimer, in their pen */}
      {state.claims.map((cl) => {
        const pen = penOf[cl.ownerId];
        const x = cl.c * cellPx + DOT_PX;
        const y = cl.r * cellPx + DOT_PX;
        const w = cellPx - DOT_PX;
        const h = cellPx - DOT_PX;
        return (
          <motion.div
            key={`box-${cl.r}-${cl.c}`}
            initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: ((cl.r * 7 + cl.c * 13) % 7 - 3) * 0.8 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: h,
              background: pen?.softColor ?? "rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              fontSize: cellPx * 0.72,
              color: pen?.color,
              fontWeight: 700,
              textShadow: pen?.shadow,
              pointerEvents: "none",
            }}
          >
            {initialOf(cl.ownerId)}
          </motion.div>
        );
      })}

      {/* DOTS — small graphite circles, rendered above lines */}
      {dots}

      {/* TAP TARGETS for undrawn lines — generous hit areas centred
          over each empty edge. Stay clickable only on your turn. */}
      {/* Horizontal candidates: (r in 0..size-1) × (c in 0..size-2) */}
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size - 1 }).map((_, c) => {
          const key = `${r},${c}`;
          if (drawnH.has(key)) return null;
          const x = c * cellPx + DOT_PX / 2;
          const y = r * cellPx + DOT_PX / 2;
          const w = cellPx - DOT_PX;
          return (
            <CandidateLine
              key={`hh-${r}-${c}`}
              horizontal
              left={x + DOT_PX / 2}
              top={y - 10 + DOT_PX / 2}
              length={w}
              canPlay={canPlay}
              onClick={() => onDraw("h", r, c)}
              selfPenColor={selfPenColor}
            />
          );
        }),
      )}
      {/* Vertical candidates: (r in 0..size-2) × (c in 0..size-1) */}
      {Array.from({ length: size - 1 }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const key = `${r},${c}`;
          if (drawnV.has(key)) return null;
          const x = c * cellPx + DOT_PX / 2;
          const y = r * cellPx + DOT_PX / 2;
          const h = cellPx - DOT_PX;
          return (
            <CandidateLine
              key={`vv-${r}-${c}`}
              horizontal={false}
              left={x - 10 + DOT_PX / 2}
              top={y + DOT_PX / 2}
              length={h}
              canPlay={canPlay}
              onClick={() => onDraw("v", r, c)}
              selfPenColor={selfPenColor}
            />
          );
        }),
      )}
    </div>
  );
}

/* ─────────────────────────── Turn timer (isolated clock) ─────────────────────────── */

/**
 * The live turn countdown chip. It owns its own 250ms tick via the shared
 * {@link useTurnSecondsLeft} hook, so only THIS leaf re-renders four times
 * a second — the board geometry and score chips stay put between real
 * state updates. (The previous single-board version held `now` at the top
 * of the component, re-rendering the entire board on every tick.)
 */
function TurnTimer({ state }: { state: DotsBoxesPublicState }) {
  const remainingSec = useTurnSecondsLeft(state.turnDeadline);
  // Match the original guard exactly: show only while playing with a live
  // deadline (turnDeadline truthy).
  if (state.phase !== "playing" || !state.turnDeadline) return null;
  return (
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
  );
}

/* ─────────────────────────── Score bar ─────────────────────────── */

export function ScoreBar({
  state,
  penOf,
  nameOf,
  selfId,
  vertical = false,
}: {
  state: DotsBoxesPublicState;
  penOf: Record<string, Pen>;
  nameOf: (id: string) => string;
  selfId: string | null;
  /** Desktop side-rail mode: stack the player chips in a column. */
  vertical?: boolean;
}) {
  return (
    <div
      className={
        vertical
          ? "flex flex-col items-stretch gap-2 px-2"
          : "flex flex-wrap items-center gap-2 px-2"
      }
    >
      {state.playerOrder.map((pid) => {
        const pen = penOf[pid];
        const isTurn = state.turnPlayerId === pid;
        const me = pid === selfId;
        return (
          <div
            key={pid}
            className="rounded-lg px-3 py-1.5 transition"
            style={{
              background: isTurn ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.6)",
              border: isTurn ? `2px solid ${pen.color}` : "1px solid rgba(120,82,40,0.22)",
              boxShadow: isTurn ? `0 0 0 2px ${pen.color}22 inset` : undefined,
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              minWidth: 130,
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="font-black"
                style={{ color: pen.color, fontSize: 22 }}
              >
                {nameOf(pid)}{me ? " (you)" : ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 14, color: "#6b5b48" }}>
                {pen.name}
              </span>
              <span
                className="font-black"
                style={{ color: pen.color, fontSize: 28, lineHeight: 1 }}
              >
                {state.scores[pid] ?? 0}
              </span>
            </div>
          </div>
        );
      })}
      {!vertical && <div className="flex-1" />}
      <TurnTimer state={state} />
    </div>
  );
}

/* ─────────────────────────── End-of-game report card ─────────────────────────── */

export function ReportCardOverlay({
  state,
  nameOf,
  penOf,
  initialOf,
  onClose,
}: {
  state: DotsBoxesPublicState;
  nameOf: (id: string) => string;
  penOf: Record<string, Pen>;
  initialOf: (id: string) => string;
  onClose: () => void;
}) {
  const standings = state.playerOrder
    .map((pid) => ({ pid, score: state.scores[pid] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const totalBoxes = state.claims.length;
  const champ = state.winnerId;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dots & Boxes results"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -1.5 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full rounded-md overflow-hidden"
        style={{
          // Solid base color so the board underneath doesn't bleed
          // through. `background` shorthand was setting backgroundColor
          // OK here but being explicit makes the intent clear.
          backgroundColor: "#f4f0e2",
          backgroundImage: [
            "linear-gradient(to right, rgba(56,89,168,0.18) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(56,89,168,0.18) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "24px 24px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
          padding: "20px 22px 18px",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
        }}
      >
        {/* Close button — backdrop click also closes. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close results"
          className="absolute right-2 top-2 rounded-full transition active:translate-y-px"
          style={{
            width: 30,
            height: 30,
            background: "rgba(59,58,54,0.10)",
            border: "1px solid rgba(59,58,54,0.4)",
            color: "#3b3a36",
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
            color: "#3b3a36",
            borderBottom: "2px solid #3b3a36",
            paddingBottom: 4,
          }}
        >
          ✓ Maths Period — Results
        </div>
        <div className="text-center mb-3" style={{ fontSize: 20, color: "#1e3a8a" }}>
          {champ ? (
            <>Champion: <span style={{ color: penOf[champ]?.color, fontWeight: 800 }}>{nameOf(champ)}</span></>
          ) : (
            <>It's a tie!</>
          )}
        </div>

        <div className="flex justify-center mb-3" style={{ fontSize: 18, color: "#5a4a3a" }}>
          {totalBoxes} boxes closed across {state.moveCount} lines drawn
        </div>

        <ol className="space-y-1 mt-1">
          {standings.map((s, i) => {
            const pen = penOf[s.pid];
            return (
              <li
                key={s.pid}
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  fontSize: 22,
                  background: pen?.softColor,
                  border: `1px solid ${pen?.color ?? "#3b3a36"}33`,
                }}
              >
                <span className="flex items-center gap-2">
                  <span style={{ color: "#7a6651", marginRight: 4 }}>{i + 1}.</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: pen?.color,
                      color: "#fbf3df",
                      fontFamily: "'Caveat', cursive",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {initialOf(s.pid)}
                  </span>
                  <span style={{ color: pen?.color, fontWeight: 700 }}>{nameOf(s.pid)}</span>
                </span>
                <span style={{ color: pen?.color, fontWeight: 800 }}>{s.score}</span>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-4 text-right"
          style={{
            fontSize: 22,
            color: "#9b1c1c",
            transform: "rotate(-3deg)",
            borderBottom: "1px solid #9b1c1c66",
            paddingBottom: 2,
            display: "inline-block",
            float: "right",
          }}
        >
          ~ Teacher's tick
        </div>
        <div style={{ clear: "both" }} />
      </motion.div>
    </div>
  );
}

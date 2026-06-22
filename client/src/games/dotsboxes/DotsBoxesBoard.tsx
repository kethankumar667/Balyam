import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ChatMessage,
  DotsBoxesPublicState,
  Player,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";

/* ─────────────────────────── Player pens ─────────────────────────── */
/*
 * Rough Notebook Edition aesthetic — each player draws with the writing
 * implement they smuggled into class. Pencil graphite, blue ballpoint,
 * red checker pen, green ink. The visual signature carries identity all
 * the way through: line stroke color, claimed-box initial color, score
 * card accent.
 */
type Pen = {
  name: string;
  color: string;
  /** Slightly softer color for box fills + score backgrounds. */
  softColor: string;
  /** Subtle drop-shadow approximating graphite/ink bleed. */
  shadow: string;
};

const PENS: Pen[] = [
  { name: "HB Pencil",      color: "#3b3a36", softColor: "rgba(59,58,54,0.16)",  shadow: "0 0.5px 0 rgba(0,0,0,0.18)" },
  { name: "Reynolds Blue",  color: "#1e3a8a", softColor: "rgba(30,58,138,0.14)", shadow: "0 0.5px 0 rgba(30,58,138,0.30)" },
  { name: "Hero Red",       color: "#9b1c1c", softColor: "rgba(155,28,28,0.14)", shadow: "0 0.5px 0 rgba(155,28,28,0.32)" },
  { name: "Camlin Green",   color: "#14532d", softColor: "rgba(20,83,45,0.14)",  shadow: "0 0.5px 0 rgba(20,83,45,0.30)" },
];

function penFor(idx: number): Pen {
  return PENS[((idx % PENS.length) + PENS.length) % PENS.length];
}

/* ─────────────────────────── Component ─────────────────────────── */

interface BoardProps {
  state: DotsBoxesPublicState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
}

export default function DotsBoxesBoard({
  state,
  players,
  selfId,
  roomCode,
}: BoardProps) {
  const size = state.options.boardSize;
  const boxesPerSide = size - 1;
  const myTurn = state.turnPlayerId === selfId;
  const canPlay = myTurn && state.phase === "playing";

  // Same turn cue as every other BHALYAM board — fires once per
  // transition into the local player's turn.
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // End-of-round scorecard dismissed flag. Re-opens automatically when
  // the phase flips back to "playing" (rematch).
  const [reportDismissed, setReportDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setReportDismissed(false);
  }, [state.phase]);

  // Player → pen and initial.
  const penOf = useMemo(() => {
    const map: Record<string, Pen> = {};
    state.playerOrder.forEach((pid, idx) => {
      map[pid] = penFor(idx);
    });
    return map;
  }, [state.playerOrder]);
  const nameOf = (id: string): string =>
    players.find((p) => p.id === id)?.name ?? "?";
  const initialOf = (id: string): string =>
    (nameOf(id).trim().charAt(0) || "?").toUpperCase();

  // Lookup sets — used to check whether each candidate line is already drawn.
  const drawnH = useMemo(() => {
    const s = new Set<string>();
    for (const l of state.hLines) s.add(`${l.r},${l.c}`);
    return s;
  }, [state.hLines]);
  const drawnV = useMemo(() => {
    const s = new Set<string>();
    for (const l of state.vLines) s.add(`${l.r},${l.c}`);
    return s;
  }, [state.vLines]);
  const hOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of state.hLines) m.set(`${l.r},${l.c}`, l.playerId);
    return m;
  }, [state.hLines]);
  const vOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of state.vLines) m.set(`${l.r},${l.c}`, l.playerId);
    return m;
  }, [state.vLines]);
  const boxOwner = useMemo(() => {
    const m = new Map<string, string>();
    for (const cl of state.claims) m.set(`${cl.r},${cl.c}`, cl.ownerId);
    return m;
  }, [state.claims]);

  /* ─── "Bonus move!" hint when the last move closed a box ─── */
  const [bonusBanner, setBonusBanner] = useState<{ id: number; pid: string } | null>(null);
  const prevMoveCount = useRef(0);
  useEffect(() => {
    if (state.moveCount === prevMoveCount.current) return;
    prevMoveCount.current = state.moveCount;
    if (state.lastMoveScored) {
      setBonusBanner({ id: Date.now(), pid: state.turnPlayerId });
      const t = window.setTimeout(() => setBonusBanner(null), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state.moveCount, state.lastMoveScored, state.turnPlayerId]);

  /* ─── Turn countdown ─── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remainingMs = state.turnDeadline ? Math.max(0, state.turnDeadline - now) : null;
  const remainingSec = remainingMs == null ? null : Math.ceil(remainingMs / 1000);

  /* ─── Move dispatch ─── */
  const [error, setError] = useState<string | null>(null);
  function drawLine(kind: "h" | "v", r: number, c: number) {
    if (!canPlay) return;
    const key = `${r},${c}`;
    if ((kind === "h" ? drawnH : drawnV).has(key)) return;
    // playerId is passed for pass-and-play proxying.
    getSocket().emit("game:move", {
      type: "draw",
      data: { kind, r, c },
      playerId: selfId ?? undefined,
    });
    setError(null);
  }

  /* ─── Board geometry ─── */
  // Pick a cell size that fits comfortably on mobile portrait, scales up
  // on desktop. 9x9 dots = 8 cells; cap so the whole board stays in view.
  const cellPx = useMemo(() => {
    if (size === 5) return 64;
    if (size === 7) return 48;
    return 38; // 9
  }, [size]);
  const dotPx = 7;
  const lineThick = 4;
  const totalPx = (size - 1) * cellPx + dotPx;

  /* ─── Render ─── */
  return (
    <div
      className="relative w-full mx-auto"
      style={{
        maxWidth: 980,
        fontFamily: "'Patrick Hand', 'Caveat', 'Georgia', serif",
      }}
    >
      {/* Top: scoreboard + turn indicator */}
      <ScoreBar
        state={state}
        penOf={penOf}
        nameOf={nameOf}
        selfId={selfId}
        remainingSec={remainingSec}
      />

      {/* Rough Notebook page */}
      <NotebookPaper>
        <NotebookHeader roomCode={roomCode ?? "—"} boxesPerSide={boxesPerSide} />

        <div className="flex justify-center px-3 pb-6">
          <div
            className="relative"
            style={{ width: totalPx, height: totalPx }}
          >
            {/* Drawn LINES — pencil/ink strokes, render under dots */}
            {state.hLines.map((l) => {
              const pen = penOf[l.playerId];
              const x = l.c * cellPx + dotPx / 2;
              const y = l.r * cellPx + dotPx / 2;
              const w = cellPx - dotPx;
              return (
                <motion.div
                  key={`h-${l.r}-${l.c}-${l.playerId}`}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: x + dotPx / 2 - 1,
                    top: y - lineThick / 2 + dotPx / 2,
                    width: w + 2,
                    height: lineThick,
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
              const x = l.c * cellPx + dotPx / 2;
              const y = l.r * cellPx + dotPx / 2;
              const h = cellPx - dotPx;
              return (
                <motion.div
                  key={`v-${l.r}-${l.c}-${l.playerId}`}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: x - lineThick / 2 + dotPx / 2,
                    top: y + dotPx / 2 - 1,
                    width: lineThick,
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
              const x = cl.c * cellPx + dotPx;
              const y = cl.r * cellPx + dotPx;
              const w = cellPx - dotPx;
              const h = cellPx - dotPx;
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
            {Array.from({ length: size }).map((_, r) =>
              Array.from({ length: size }).map((_, c) => (
                <div
                  key={`dot-${r}-${c}`}
                  style={{
                    position: "absolute",
                    left: c * cellPx,
                    top: r * cellPx,
                    width: dotPx,
                    height: dotPx,
                    borderRadius: "50%",
                    background: "#2a221a",
                    boxShadow: "0 0.5px 0 rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.15)",
                    pointerEvents: "none",
                  }}
                />
              )),
            )}

            {/* TAP TARGETS for undrawn lines — generous hit areas centred
                over each empty edge. Stay clickable only on your turn. */}
            {/* Horizontal candidates: (r in 0..size-1) × (c in 0..size-2) */}
            {Array.from({ length: size }).map((_, r) =>
              Array.from({ length: size - 1 }).map((_, c) => {
                const key = `${r},${c}`;
                if (drawnH.has(key)) return null;
                const x = c * cellPx + dotPx / 2;
                const y = r * cellPx + dotPx / 2;
                const w = cellPx - dotPx;
                return (
                  <CandidateLine
                    key={`hh-${r}-${c}`}
                    horizontal
                    left={x + dotPx / 2}
                    top={y - 10 + dotPx / 2}
                    length={w}
                    canPlay={canPlay}
                    onClick={() => drawLine("h", r, c)}
                    selfPenColor={selfId ? penOf[selfId]?.color : undefined}
                  />
                );
              }),
            )}
            {/* Vertical candidates: (r in 0..size-2) × (c in 0..size-1) */}
            {Array.from({ length: size - 1 }).map((_, r) =>
              Array.from({ length: size }).map((_, c) => {
                const key = `${r},${c}`;
                if (drawnV.has(key)) return null;
                const x = c * cellPx + dotPx / 2;
                const y = r * cellPx + dotPx / 2;
                const h = cellPx - dotPx;
                return (
                  <CandidateLine
                    key={`vv-${r}-${c}`}
                    horizontal={false}
                    left={x - 10 + dotPx / 2}
                    top={y + dotPx / 2}
                    length={h}
                    canPlay={canPlay}
                    onClick={() => drawLine("v", r, c)}
                    selfPenColor={selfId ? penOf[selfId]?.color : undefined}
                  />
                );
              }),
            )}
          </div>
        </div>

        <NotebookMarginDoodles />
      </NotebookPaper>

      {!myTurn && state.phase === "playing" && (
        <div className="text-center mt-2" style={{ fontSize: 20, color: "#7a6651" }}>
          Waiting for{" "}
          <span style={{ color: penOf[state.turnPlayerId]?.color }}>
            {nameOf(state.turnPlayerId)}
          </span>{" "}
          to draw a line…
        </div>
      )}
      {error && (
        <div className="mt-2 text-rose-700 text-center" style={{ fontSize: 18 }}>
          {error}
        </div>
      )}

      {/* Bonus move banner — brief, non-blocking */}
      <AnimatePresence>
        {bonusBanner && (
          <motion.div
            key={bonusBanner.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 26,
              fontWeight: 700,
              color: penOf[bonusBanner.pid]?.color ?? "#7c2d12",
              textShadow: "0 2px 6px rgba(0,0,0,0.25)",
              background: "rgba(252,247,231,0.95)",
              border: `2px solid ${penOf[bonusBanner.pid]?.color ?? "#7c2d12"}`,
              borderRadius: 12,
              padding: "6px 18px",
              boxShadow: "0 10px 20px -10px rgba(0,0,0,0.4)",
            }}
          >
            ✓ {nameOf(bonusBanner.pid)} closes a box — bonus move!
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-of-game report — dismissable so the finished board can be
          inspected behind it. Re-opens on the next round. */}
      {state.phase === "finished" && !reportDismissed && (
        <ReportCardOverlay
          state={state}
          nameOf={nameOf}
          penOf={penOf}
          initialOf={initialOf}
          onClose={() => setReportDismissed(true)}
        />
      )}

      {/* 10-second turn-out warning */}
      <TurnTimeWarning deadline={state.turnDeadline} active={myTurn && state.phase === "playing"} />
    </div>
  );
}

/* ─────────────────────────── Notebook shell ─────────────────────────── */

function NotebookPaper({ children }: { children: React.ReactNode }) {
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

function NotebookHeader({ roomCode, boxesPerSide }: { roomCode: string; boxesPerSide: number }) {
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

function NotebookMarginDoodles() {
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

/* ─────────────────────────── Score bar ─────────────────────────── */

function ScoreBar({
  state,
  penOf,
  nameOf,
  selfId,
  remainingSec,
}: {
  state: DotsBoxesPublicState;
  penOf: Record<string, Pen>;
  nameOf: (id: string) => string;
  selfId: string | null;
  remainingSec: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
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
      <div className="flex-1" />
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

/* ─────────────────────────── End-of-game report card ─────────────────────────── */

function ReportCardOverlay({
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

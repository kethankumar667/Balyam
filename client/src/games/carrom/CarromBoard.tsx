import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, CarromPublicState, Player } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import InlineRoomRail from "../../components/InlineRoomRail";

export interface CarromBoardProps {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  onMove: (type: string, data?: unknown) => void;
}

const COLORS = {
  board: "#E8CFA0",
  frame: "#6D4323",
  line: "#8A5A2B",
  white: "#FAF3E4",
  black: "#2B2118",
  queen: "#B4232A",
  striker: "#F0F4F8",
  pocket: "#241A10",
};

/**
 * Carrom board.
 *
 * Aim by dragging: the drag direction sets the angle and its length sets the
 * power, which is the gesture the physical game already teaches (pull back,
 * let go). Everything is drawn as SVG at the server's own coordinate scale —
 * no sprite assets, and no second copy of the board geometry to drift.
 *
 * The client never simulates. It sends a shot and renders the broadcasts that
 * follow; a strike animates because the server is ticking at 60 Hz, not
 * because anything here is integrating.
 */
export default function CarromBoard({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  roomPhase,
  onMove,
}: CarromBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const mySeat = state.seats.find((s) => s.playerId === selfId);
  const myTurn = state.turnPlayerId === selfId && state.phase === "aiming";
  const striker = state.pieces.find((p) => p.kind === "striker");

  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  /** Convert a pointer event into board coordinates. */
  function toBoard(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CARROM_BOARD.size,
      y: ((e.clientY - r.top) / r.height) * CARROM_BOARD.size,
    };
  }

  const aim = useMemo(() => {
    if (!drag || !striker) return null;
    const dx = striker.x - drag.x;
    const dy = striker.y - drag.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 1) return null;
    // Pull-back distance maps to power, capped at a third of the board so a
    // long drag off-screen does not read as infinite force.
    const power = Math.min(1, pull / (CARROM_BOARD.size / 3));
    return { angle: Math.atan2(dy, dx), power, dx, dy };
  }, [drag, striker]);

  function release() {
    if (aim && myTurn) onMove("shoot", { angle: aim.angle, power: aim.power });
    setDrag(null);
  }

  // Escape cancels an aim — a mis-started drag must not cost a shot.
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  const pockets = [
    { x: CARROM_BOARD.cushion, y: CARROM_BOARD.cushion },
    { x: CARROM_BOARD.size - CARROM_BOARD.cushion, y: CARROM_BOARD.cushion },
    { x: CARROM_BOARD.cushion, y: CARROM_BOARD.size - CARROM_BOARD.cushion },
    { x: CARROM_BOARD.size - CARROM_BOARD.cushion, y: CARROM_BOARD.size - CARROM_BOARD.cushion },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Scores */}
      <div className="flex items-stretch gap-2">
        {state.seats.map((s) => (
          <div
            key={s.playerId}
            className="flex-1 rounded-xl px-3 py-2"
            style={{
              background: s.playerId === state.turnPlayerId ? "rgba(230,161,30,0.22)" : "rgba(0,0,0,0.06)",
              border: `2px solid ${s.playerId === state.turnPlayerId ? "#E6A11E" : "transparent"}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: s.color === "white" ? COLORS.white : COLORS.black,
                  border: "1px solid #8A5A2B",
                }}
              />
              <span className="text-sm font-bold truncate">
                {nameOf(s.playerId)}
                {s.playerId === selfId ? " (you)" : ""}
              </span>
              <span className="ml-auto text-lg font-black tabular-nums">{s.score}</span>
            </div>
            <p className="text-[11px] opacity-70">{s.remaining} coins left</p>
          </div>
        ))}
      </div>

      {state.queenPendingFor && (
        <p className="text-xs font-semibold text-center" style={{ color: COLORS.queen }}>
          {state.queenPendingFor === selfId
            ? "You hold the queen — cover her with one of your coins this shot."
            : `${nameOf(state.queenPendingFor)} must cover the queen.`}
        </p>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CARROM_BOARD.size} ${CARROM_BOARD.size}`}
        className="w-full rounded-xl touch-none select-none"
        style={{ background: COLORS.board, border: `6px solid ${COLORS.frame}` }}
        onPointerDown={(e) => {
          if (!myTurn) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(toBoard(e));
        }}
        onPointerMove={(e) => {
          if (!drag || !myTurn) return;
          setDrag(toBoard(e));
        }}
        onPointerUp={release}
        onPointerCancel={() => setDrag(null)}
      >
        {/* Playfield markings */}
        <rect
          x={CARROM_BOARD.cushion}
          y={CARROM_BOARD.cushion}
          width={CARROM_BOARD.size - CARROM_BOARD.cushion * 2}
          height={CARROM_BOARD.size - CARROM_BOARD.cushion * 2}
          fill="none"
          stroke={COLORS.line}
          strokeWidth={0.6}
        />
        <circle
          cx={CARROM_BOARD.size / 2}
          cy={CARROM_BOARD.size / 2}
          r={CARROM_BOARD.coinRadius * 4.8}
          fill="none"
          stroke={COLORS.line}
          strokeWidth={0.5}
          opacity={0.7}
        />
        {/* Baselines */}
        {[CARROM_BOARD.baseline, CARROM_BOARD.size - CARROM_BOARD.baseline].map((y) => (
          <line
            key={y}
            x1={CARROM_BOARD.cushion + 4}
            x2={CARROM_BOARD.size - CARROM_BOARD.cushion - 4}
            y1={y}
            y2={y}
            stroke={COLORS.line}
            strokeWidth={0.5}
            opacity={0.8}
          />
        ))}

        {pockets.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={CARROM_BOARD.pocketRadius} fill={COLORS.pocket} />
        ))}

        {/* Pieces */}
        {state.pieces
          .filter((p) => !p.pocketed)
          .map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.kind === "striker" ? CARROM_BOARD.strikerRadius : CARROM_BOARD.coinRadius}
              fill={
                p.kind === "striker"
                  ? COLORS.striker
                  : p.kind === "queen"
                  ? COLORS.queen
                  : p.kind === "white"
                  ? COLORS.white
                  : COLORS.black
              }
              stroke={COLORS.frame}
              strokeWidth={0.35}
            />
          ))}

        {/* Aim line — mirrored through the striker, because you pull BACK to
            shoot forward and the guide must show where the striker will go. */}
        {aim && striker && (
          <>
            <line
              x1={striker.x}
              y1={striker.y}
              x2={striker.x + Math.cos(aim.angle) * 30 * aim.power}
              y2={striker.y + Math.sin(aim.angle) * 30 * aim.power}
              stroke={COLORS.queen}
              strokeWidth={0.8}
              strokeDasharray="2 1.5"
            />
            <circle cx={striker.x} cy={striker.y} r={CARROM_BOARD.strikerRadius + 1} fill="none" stroke={COLORS.queen} strokeWidth={0.5} />
          </>
        )}
      </svg>

      {/* Striker placement — only meaningful while aiming */}
      {myTurn && (
        <label className="flex items-center gap-3 text-xs font-semibold">
          <span className="whitespace-nowrap">Striker</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.strikerPos}
            onChange={(e) => onMove("place", { pos: Number(e.target.value) })}
            className="flex-1"
          />
        </label>
      )}

      <p className="text-center text-xs opacity-80 min-h-[1.2em]">
        {state.isOver
          ? state.winnerId
            ? `${nameOf(state.winnerId)} wins.`
            : "Match over."
          : state.phase === "resolving"
          ? "Shot in play…"
          : myTurn
          ? mySeat
            ? `Drag back from the striker to shoot ${mySeat.color}.`
            : "Your shot."
          : `Waiting for ${state.turnPlayerId ? nameOf(state.turnPlayerId) : "the next player"}…`}
      </p>
      {state.lastShot && (
        <p className="text-center text-[11px] opacity-60">Last shot: {state.lastShot}</p>
      )}

      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="carrom"
          phase={roomPhase ?? "playing"}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      )}
    </div>
  );
}

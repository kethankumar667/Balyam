import React, { useMemo, useRef, useState, useEffect } from "react";
import type { CarromBoardProps } from "./CarromBoard";
import type { StrikerSkin, BoardFeltSkin } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import { CarromScoreHeader, CarromSvgBoard, CarromControls, type AimData } from "./carrom-shared";
import CarromSkinModal from "./CarromSkinModal";
import InlineRoomRail from "../../components/InlineRoomRail";

export default function CarromBoardDesktop({
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
  const [showSkins, setShowSkins] = useState(false);
  const [localStriker, setLocalStriker] = useState<StrikerSkin>(state.strikerSkin ?? "pearl");
  const [localFelt, setLocalFelt] = useState<BoardFeltSkin>(state.boardSkin ?? "birch");

  const mySeat = state.seats.find((s) => s.playerId === selfId);
  const myTurn = state.turnPlayerId === selfId && state.phase === "aiming";
  const striker = state.pieces.find((p) => p.kind === "striker");

  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  function toBoard(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CARROM_BOARD.size,
      y: ((e.clientY - r.top) / r.height) * CARROM_BOARD.size,
    };
  }

  const aim: AimData | null = useMemo(() => {
    if (!drag || !striker) return null;
    const dx = striker.x - drag.x;
    const dy = striker.y - drag.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 1) return null;
    const power = Math.min(1, pull / (CARROM_BOARD.size / 3));
    return { angle: Math.atan2(dy, dx), power, dx, dy };
  }, [drag, striker]);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!myTurn) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(toBoard(e));
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag || !myTurn) return;
    setDrag(toBoard(e));
  }

  function handlePointerUp() {
    if (aim && myTurn) {
      onMove("shoot", { angle: aim.angle, power: aim.power });
    }
    setDrag(null);
  }

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  const activeState = useMemo(
    () => ({
      ...state,
      strikerSkin: localStriker,
      boardSkin: localFelt,
    }),
    [state, localStriker, localFelt]
  );

  return (
    <div className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-100 p-6 select-none flex items-start justify-center gap-6">
      {/* Left Column: Board & Controls */}
      <div className="flex-1 max-w-[700px] flex flex-col gap-4">
        {/* Score Header */}
        <CarromScoreHeader
          state={activeState}
          players={players}
          selfId={selfId}
          onOpenSkins={() => setShowSkins(true)}
        />

        {/* High-Definition SVG Board */}
        <CarromSvgBoard
          state={activeState}
          selfId={selfId}
          myTurn={myTurn}
          aim={aim}
          svgRef={svgRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* Aim & Position Controls */}
        <CarromControls
          myTurn={myTurn}
          strikerPos={state.strikerPos}
          onPlace={(pos) => onMove("place", { pos })}
          queenPendingFor={state.queenPendingFor}
          selfId={selfId}
          isOver={state.phase === "finished"}
          winnerId={state.seats.find((s) => s.remaining === 0)?.playerId ?? null}
          phase={state.phase}
          nameOf={nameOf}
        />
      </div>

      {/* Right Column: Game Info Dashboard & Room Rail */}
      <aside className="w-80 shrink-0 sticky top-6 flex flex-col gap-4">
        {/* How to Play Card */}
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-2">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
            🎯 Carrom Lounge Rules
          </h3>
          <ul className="text-xs font-semibold text-stone-300 space-y-1.5 list-disc list-inside opacity-90">
            <li>Slide the position slider to position your striker along the baseline.</li>
            <li>Drag backward from the striker to set shot angle & power gauge.</li>
            <li>The blue dotted ray shows predicted 1-cushion bank shot rebounds!</li>
            <li>Customize your Striker skin & Board felt skin anytime via the Skins button.</li>
          </ul>
        </div>

        {/* Room Rail */}
        {roomCode && (
          <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl">
            <InlineRoomRail
              code={roomCode}
              game="carrom"
              phase={roomPhase ?? "playing"}
              players={players}
              selfId={selfId}
              messages={messages}
            />
          </div>
        )}
      </aside>

      {/* Custom Skins Modal */}
      <CarromSkinModal
        open={showSkins}
        onClose={() => setShowSkins(false)}
        currentStriker={localStriker}
        currentFelt={localFelt}
        onSelectStriker={(skin) => {
          setLocalStriker(skin);
          onMove("setOptions", { strikerSkin: skin });
        }}
        onSelectFelt={(skin) => {
          setLocalFelt(skin);
          onMove("setOptions", { boardSkin: skin });
        }}
      />
    </div>
  );
}

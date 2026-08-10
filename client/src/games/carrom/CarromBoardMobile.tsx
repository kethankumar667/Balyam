import React, { useMemo, useRef, useState, useEffect } from "react";
import type { CarromBoardProps } from "./CarromBoard";
import type { StrikerSkin, BoardFeltSkin } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import {
  CarromLoungeHeader,
  CarromPlayerCards,
  CarromTurnBar,
  CarromSvgBoard,
  CarromShotControls,
  CarromActivityLog,
  CarromBottomBar,
  type AimData,
} from "./carrom-shared";
import CarromSkinModal from "./CarromSkinModal";

export default function CarromBoardMobile({
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

  const modeLabel =
    state.mode === "freestyle"
      ? "Freestyle"
      : state.mode === "discpool"
      ? "Disc Pool"
      : "Classic";

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

  // Unread chat badge
  const chatBadge = messages.length;

  return (
    <div
      className="h-full min-h-0 overflow-hidden flex flex-col select-none font-sans"
      style={{
        background: "linear-gradient(180deg, #F7E8C4 0%, #EED8B0 50%, #E8D0A0 100%)",
      }}
    >
      {/* ─── Carrom Lounge Header ─── */}
      <CarromLoungeHeader
        modeLabel={modeLabel}
        onOpenSkins={() => setShowSkins(true)}
      />

      {/* ─── Player Cards Row ─── */}
      <CarromPlayerCards
        state={activeState}
        players={players}
        selfId={selfId}
      />

      {/* ─── Turn Indicator Bar ─── */}
      <CarromTurnBar
        state={activeState}
        nameOf={nameOf}
        selfId={selfId}
      />

      {/* ─── SVG Board ─── */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-2 py-1 max-h-[50vh]">
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
      </div>

      {/* ─── Shot Controls ─── */}
      <div className="px-2 pb-1">
        <CarromShotControls
          myTurn={myTurn}
          strikerPos={state.strikerPos}
          onPlace={(pos) => onMove("place", { pos })}
          aim={aim}
          phase={state.phase}
        />
      </div>

      {/* ─── Activity Log ─── */}
      <div className="px-2 pb-1">
        <CarromActivityLog
          lastShot={state.lastShot}
          lastCombo={state.lastCombo}
        />
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <CarromBottomBar chatBadge={chatBadge > 0 ? chatBadge : undefined} />

      {/* ─── Custom Skins Modal ─── */}
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

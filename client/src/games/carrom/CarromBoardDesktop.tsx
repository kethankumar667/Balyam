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
  CarromRulesList,
  useCarromFeed,
  type AimData,
} from "./carrom-shared";
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
  onLeave,
}: CarromBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [showSkins, setShowSkins] = useState(false);
  const [localStriker, setLocalStriker] = useState<StrikerSkin>(state.strikerSkin ?? "pearl");
  const [localFelt, setLocalFelt] = useState<BoardFeltSkin>(state.boardSkin ?? "birch");

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

  const feed = useCarromFeed(state.phase, state.lastShot, state.lastCombo);

  return (
    <div
      className="h-full min-h-0 overflow-hidden select-none font-sans flex flex-col"
      style={{
        background: "linear-gradient(180deg, #F7E8C4 0%, #EED8B0 50%, #E8D0A0 100%)",
      }}
    >
      {/* ─── Full-width Header ─── */}
      <CarromLoungeHeader
        modeLabel={modeLabel}
        onOpenSkins={() => setShowSkins(true)}
        onLeave={onLeave}
      />

      {/* ─── 3-Column Desktop Layout ───
          `items-stretch`, not `items-start`. The side columns used to hug the
          top, which left roughly 650px of bare background under each of them
          while the board column ran the full height. Both columns now span the
          row and hand their spare height to a panel that can use it — the shot
          history on the left, the room rail (chat) on the right. */}
      <div className="flex-1 flex items-stretch justify-center gap-5 p-5 min-h-0">

        {/* ─── LEFT PANEL: Players + Turn + Activity ─── */}
        <aside className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
          {/* Player Cards — the vertical variant of the shared component */}
          <CarromPlayerCards
            state={activeState}
            players={players}
            selfId={selfId}
            orientation="column"
          />

          {/* Turn Indicator */}
          <div
            className="rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background: "#FFF3DB",
              border: "1.5px solid #E8D5B5",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <CarromTurnBar
              state={activeState}
              nameOf={nameOf}
              selfId={selfId}
            />
          </div>

          {/* Shot history — absorbs the leftover column height */}
          <CarromActivityLog entries={feed} fill />
        </aside>

        {/* ─── CENTER: Board + Shot Controls ─── */}
        <div className="flex-1 max-w-[680px] flex flex-col gap-3 min-h-0 overflow-y-auto">
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

          <CarromShotControls
            myTurn={myTurn}
            strikerPos={state.strikerPos}
            onPlace={(pos) => onMove("place", { pos })}
            aim={aim}
            phase={state.phase}
          />
        </div>

        {/* ─── RIGHT PANEL: Rules + Room Rail ─── */}
        <aside className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
          {/* How to Play */}
          <div
            className="p-4 rounded-2xl space-y-2 flex-shrink-0"
            style={{
              background: "#FFF8ED",
              border: "1.5px solid #E8D5B5",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              className="text-xs font-black uppercase tracking-wide"
              style={{ color: "#4A2C17" }}
            >
              How to Play
            </h3>
            <CarromRulesList />
          </div>

          {/* Room Rail (Chat / Voice / Players) */}
          {roomCode && (
            <div
              className="rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col justify-end"
              style={{
                border: "1.5px solid #E8D5B5",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
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
      </div>

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

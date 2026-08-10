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
      />

      {/* ─── 3-Column Desktop Layout ─── */}
      <div className="flex-1 flex items-start justify-center gap-5 p-5 min-h-0 overflow-y-auto">

        {/* ─── LEFT PANEL: Players + Turn + Activity ─── */}
        <aside
          className="w-72 shrink-0 flex flex-col gap-3 sticky top-0"
        >
          {/* Player Cards — stacked vertically on desktop */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFF8ED",
              border: "1.5px solid #E8D5B5",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #E8D5B5" }}>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#4A2C17" }}>
                Players
              </span>
            </div>
            {state.seats.map((s) => {
              const isTurn = s.playerId === state.turnPlayerId && state.phase !== "finished";
              const isSelf = s.playerId === selfId;
              const name = nameOf(s.playerId);
              const isWhite = s.color === "white";

              return (
                <div
                  key={s.playerId}
                  className="flex items-center gap-3 px-3 py-2.5 transition-all duration-200"
                  style={{
                    background: isTurn ? "#E4B12815" : "transparent",
                    borderBottom: "1px solid #E8D5B5",
                    borderLeft: isTurn ? "3px solid #E4B128" : "3px solid transparent",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{
                      background: isWhite
                        ? "linear-gradient(135deg, #F0EAD6, #D4C4A0)"
                        : "linear-gradient(135deg, #4A3728, #2A1A10)",
                      border: `2px solid ${isTurn ? "#E4B128" : isWhite ? "#C4A87A" : "#6B4226"}`,
                    }}
                  >
                    <span
                      className="font-black text-sm"
                      style={{ color: isWhite ? "#4A2C17" : "#E8D5B5" }}
                    >
                      {(name[0] ?? "?").toUpperCase()}
                    </span>
                  </div>

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate" style={{ color: "#4A2C17" }}>
                        {name}
                      </span>
                      {isSelf && (
                        <span
                          className="text-[8px] font-black uppercase px-1.5 py-0 rounded-full"
                          style={{ background: "#2E8B57", color: "#fff", lineHeight: "13px" }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: isWhite
                            ? "radial-gradient(circle at 35% 35%, #FFFDF7, #E3D3B4)"
                            : "radial-gradient(circle at 35% 35%, #3A3029, #1A130E)",
                          border: `1px solid ${isWhite ? "#8C6339" : "#A36D43"}`,
                        }}
                      />
                      <span className="text-[9px] font-bold uppercase" style={{ color: "#6D432388" }}>
                        {s.remaining} left
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-lg font-black tabular-nums leading-none" style={{ color: "#4A2C17" }}>
                      {s.score}
                    </span>
                    <span className="text-[7px] font-extrabold uppercase tracking-widest" style={{ color: "#6D432366" }}>
                      PTS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn Indicator */}
          <div
            className="rounded-2xl overflow-hidden"
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

          {/* Activity Log */}
          <CarromActivityLog
            lastShot={state.lastShot}
            lastCombo={state.lastCombo}
          />
        </aside>

        {/* ─── CENTER: Board + Shot Controls ─── */}
        <div className="flex-1 max-w-[680px] flex flex-col gap-3 min-h-0">
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
        <aside className="w-72 shrink-0 sticky top-0 flex flex-col gap-3">
          {/* How to Play */}
          <div
            className="p-4 rounded-2xl space-y-2"
            style={{
              background: "#FFF8ED",
              border: "1.5px solid #E8D5B5",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              className="text-xs font-black uppercase tracking-wide flex items-center gap-2"
              style={{ color: "#4A2C17" }}
            >
              📜 Carrom Lounge Rules
            </h3>
            <ul
              className="text-[11px] font-semibold space-y-1.5 list-disc list-inside"
              style={{ color: "#6D4323" }}
            >
              <li>Slide the position slider to place your striker on the baseline.</li>
              <li>Drag backward from the striker to set aim angle & power.</li>
              <li>The dashed line shows predicted trajectory — including bank shots!</li>
              <li>Pot all your coins + cover the Queen to win.</li>
              <li>Customize Striker & Board skins anytime via 🎨 button.</li>
            </ul>
          </div>

          {/* Room Rail (Chat / Voice / Players) */}
          {roomCode && (
            <div
              className="rounded-2xl overflow-hidden"
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

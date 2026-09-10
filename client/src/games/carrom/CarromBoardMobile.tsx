import React, { useMemo, useRef, useState, useEffect } from "react";
import type { CarromBoardProps } from "./CarromBoard";
import type { StrikerSkin, BoardFeltSkin } from "@shared/types";
import { CARROM_BOARD } from "@shared/types";
import {
  CarromSvgBoard,
  useCarromFeed,
  pointerToBoard,
  type AimData,
} from "./carrom-shared";
import CarromMatchHud from "./CarromMatchHud";
import CarromStrikerSlider from "./CarromStrikerSlider";
import CarromQuickChatPopover from "./CarromQuickChatPopover";
import CarromMenuPopover from "./CarromMenuPopover";
import CarromSkinModal from "./CarromSkinModal";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { HapticsManager } from "../../services/HapticsManager";

export default function CarromBoardMobile({
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
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [unread, setUnread] = useState(0);

  const [localStriker, setLocalStriker] = useState<StrikerSkin>(state.strikerSkin ?? "pearl");
  const [localFelt, setLocalFelt] = useState<BoardFeltSkin>(state.boardSkin ?? "birch");
  const reactions = useSeatReactions(selfId);

  const selfSeatIndex = state.seats.findIndex((s) => s.playerId === selfId);
  const isFlipped = selfSeatIndex === 1;
  const opponentSeat = state.seats.find((s) => s.playerId !== selfId);

  const myTurn = state.turnPlayerId === selfId && state.phase === "aiming";
  const striker = state.pieces.find((p) => p.kind === "striker");

  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  const avatarOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.avatar]));
    return (id: string) => map.get(id);
  }, [players]);

  function toBoard(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    return pointerToBoard(svg.getBoundingClientRect(), e.clientX, e.clientY, isFlipped);
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
      className="h-full min-h-0 overflow-hidden flex flex-col justify-between select-none font-sans relative"
      style={{
        background: "radial-gradient(circle at 50% 38%, #0C2144 0%, #061226 55%, #020611 100%)",
      }}
    >
      {/* ─── Top Match Face-Off HUD ─── */}
      <CarromMatchHud
        state={activeState}
        players={players}
        selfId={selfId}
        nameOf={nameOf}
        avatarOf={avatarOf}
      />

      {/* ─── Central Carrom Board Area ─── */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-2 py-1 max-h-[60vh]">
        <CarromSvgBoard
          state={activeState}
          selfId={selfId}
          myTurn={myTurn}
          aim={aim}
          svgRef={svgRef}
          isFlipped={isFlipped}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* ─── Inset Wooden Striker Slider ─── */}
      <div className="px-4 py-1 flex-shrink-0">
        <CarromStrikerSlider
          myTurn={myTurn}
          phase={state.phase}
          strikerPos={state.strikerPos}
          onPlace={(pos) => onMove("place", { pos })}
          isFlipped={isFlipped}
        />
      </div>

      {/* ─── Bottom Floating Action Buttons (FABs) ─── */}
      <div className="w-full flex items-center justify-between px-6 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0 z-20">
        {/* Left: Quick Chat FAB */}
        <button
          type="button"
          onClick={() => {
            HapticsManager.getInstance().subtle();
            setShowQuickChat((prev) => !prev);
          }}
          aria-label="Quick chat and reactions"
          className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform duration-100 shadow-[0_0_16px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/80"
          style={{
            background: "radial-gradient(circle at 35% 35%, #FEF08A 0%, #EAB308 55%, #92400E 100%)",
          }}
        >
          <span className="text-2xl leading-none drop-shadow-sm select-none">💬</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* Right: Hamburger Menu Options FAB */}
        <button
          type="button"
          onClick={() => {
            HapticsManager.getInstance().subtle();
            setShowMenu((prev) => !prev);
          }}
          aria-label="Game options and menu"
          className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform duration-100 shadow-[0_0_16px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/80"
          style={{
            background: "radial-gradient(circle at 35% 35%, #FEF08A 0%, #EAB308 55%, #92400E 100%)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* ─── Quick Chat Popover Drawer ─── */}
      <CarromQuickChatPopover
        isOpen={showQuickChat}
        onClose={() => setShowQuickChat(false)}
        opponentId={opponentSeat?.playerId}
      />

      {/* ─── Menu Options Popover Drawer ─── */}
      <CarromMenuPopover
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onOptions={() => setShowSkins(true)}
        onLeave={onLeave ?? (() => {})}
      />

      {/* ─── Custom Skins & Rules Modal ─── */}
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

      {/* Background Room Rail for socket signaling */}
      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="carrom"
          phase={roomPhase ?? "playing"}
          players={players}
          selfId={selfId}
          messages={messages}
          hideStrip
          onUnreadChange={setUnread}
        />
      )}

      {/* Floating Reactions Layer */}
      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

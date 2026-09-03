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
  CarromRulesList,
  useCarromFeed,
  pointerToBoard,
  type AimData,
} from "./carrom-shared";
import CarromSkinModal from "./CarromSkinModal";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { useTutorialGate, markSeen } from "../../components/GameTutorial";

/** Same "seen" bookkeeping convention as every other game's tutorial gate. */
const CARROM_RULES_KEY = "carrom.tutorial.completed.v1";

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
  const [unread, setUnread] = useState(0);
  const [localStriker, setLocalStriker] = useState<StrikerSkin>(state.strikerSkin ?? "pearl");
  const [localFelt, setLocalFelt] = useState<BoardFeltSkin>(state.boardSkin ?? "birch");
  const reactions = useSeatReactions(selfId);
  const selfSeatIndex = state.seats.findIndex((s) => s.playerId === selfId);
  const isFlipped = selfSeatIndex === 1;

  const myTurn = state.turnPlayerId === selfId && state.phase === "aiming";
  // Auto-opens once per browser the first time this player reaches the
  // board (desktop keeps the same rules permanently visible in a column —
  // see carrom-shared.tsx — so only the mobile popover needed this gate).
  // Never over a live aiming turn, matching the other games' tutorial gates.
  const rulesTut = useTutorialGate(CARROM_RULES_KEY, !myTurn);
  const showRules = rulesTut.open;
  const closeRules = () => {
    markSeen(CARROM_RULES_KEY);
    rulesTut.setOpen(false);
  };
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

  const feed = useCarromFeed(state.phase, state.lastShot, state.lastCombo);

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
        onLeave={onLeave}
        onToggleRules={() => (showRules ? closeRules() : rulesTut.setOpen(true))}
        rulesOpen={showRules}
      />

      {/* ─── Rules sheet (desktop keeps these permanently open in a column) ─── */}
      {showRules && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ background: "#FFF3DB", borderBottom: "1.5px solid #E8D5B5" }}
        >
          <CarromRulesList />
          <button
            type="button"
            onClick={closeRules}
            className="text-[10px] font-bold uppercase px-2 py-1 rounded mt-2 cursor-pointer"
            style={{ background: "#F0DFB8", border: "1px solid #E8D5B5", color: "#6D4323" }}
          >
            Close
          </button>
        </div>
      )}

      {/* ─── Player Cards Row ─── */}
      <CarromPlayerCards
        state={activeState}
        players={players}
        selfId={selfId}
        registerCardRef={reactions.registerCardRef}
        onTarget={reactions.openTarget}
        activeTargetId={reactions.activeTargetId}
        onCloseTarget={reactions.closeTarget}
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
          isFlipped={isFlipped}
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
          isFlipped={isFlipped}
        />
      </div>

      {/* ─── Activity Log ─── */}
      <div className="px-2 pb-1">
        <CarromActivityLog entries={feed} />
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <CarromBottomBar unread={unread} />

      {/* Strip-less room rail: the bottom bar above is the only visible
          toolbar, and it opens these panels through the
          `bhalyam:open-room-panel` bridge — the same arrangement Ludo mobile
          uses. Without this mount, mobile Carrom had no chat, voice, player
          list or room code at all. */}
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

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

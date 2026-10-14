import React, { useMemo, useRef, useState, useEffect } from "react";
import type { CarromBoardProps } from "./CarromBoard";
import type { StrikerSkin, BoardFeltSkin } from "@shared/types";
import {
  CarromLoungeHeader,
  CarromPlayerCards,
  CarromTurnBar,
  CarromSvgBoard,
  CarromShotControls,
  CarromActivityLog,
  CarromRulesList,
  useCarromFeed,
} from "./carrom-shared";
import { useCarromAim } from "./useCarromAim";
import { useThrottledPlace } from "./useThrottledPlace";
import CarromSkinModal from "./CarromSkinModal";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { CarromAudio } from "./carromAudio";
import { CarromVfxOverlay } from "./CarromVfxOverlay";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useAudio } from "../../hooks/useAudio";

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
  const [showSkins, setShowSkins] = useState(false);
  const { settings } = useAudio();

  // Carrom's procedural sound effects (carromAudio.ts) run through their own
  // Web Audio engine, separate from the shared AudioManager Howler sounds —
  // sync them to the same global mute toggle so muting the app actually
  // silences the striker punches, clacks, and celebration chimes too.
  useEffect(() => {
    CarromAudio.setMuted(settings.isMuted);
  }, [settings.isMuted]);
  const [localStriker, setLocalStriker] = useState<StrikerSkin>(state.strikerSkin ?? "pearl");
  const [localFelt, setLocalFelt] = useState<BoardFeltSkin>(state.boardSkin ?? "birch");
  const reactions = useSeatReactions(selfId);
  const selfSeatIndex = state.seats.findIndex((s) => s.playerId === selfId);
  const isFlipped = selfSeatIndex === 1;

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

  const [activeImpact, setActiveImpact] = useState<{ x: number; y: number; power: number } | null>(null);

  // Sliding the striker sends at most one message per 50 ms instead of one per input event.
  const placeStriker = useThrottledPlace((pos) => onMove("place", { pos }));

  // Pull back with the mouse (primary button) to aim, release to shoot. The same input as the mobile
  // board (useCarromAim); Escape cancels.
  const { aim, handlers: aimHandlers } = useCarromAim({
    svgRef,
    isFlipped,
    enabled: myTurn && !!striker,
    onShoot: (shot) => {
      CarromAudio.playStrikerPunch(shot.power);
      setActiveImpact({ x: striker?.x ?? 50, y: striker?.y ?? 50, power: shot.power });
      onMove("shoot", { angle: shot.angle, power: shot.power });
    },
  });

  // Audio feedback for combos and fouls
  useEffect(() => {
    if (!state.lastCombo) return;
    if (state.lastCombo.includes("Queen")) {
      CarromAudio.playCelebrationChime();
    } else if (state.lastCombo.includes("Foul")) {
      CarromAudio.playFoulBuzzer();
    } else {
      CarromAudio.playCoinClack(0.85);
    }
  }, [state.lastCombo]);

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

      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={myTurn && state.phase === "aiming"}
        chipless
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
            registerCardRef={reactions.registerCardRef}
            onTarget={reactions.openTarget}
            activeTargetId={reactions.activeTargetId}
            onCloseTarget={reactions.closeTarget}
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
          <div className="relative w-full">
            <CarromSvgBoard
              state={activeState}
              selfId={selfId}
              myTurn={myTurn}
              aim={aim}
              svgRef={svgRef}
              isFlipped={isFlipped}
              onPointerDown={aimHandlers.onPointerDown}
              onPointerMove={aimHandlers.onPointerMove}
              onPointerUp={aimHandlers.onPointerUp}
              onPointerCancel={aimHandlers.onPointerCancel}
            />
            <CarromVfxOverlay
              lastCombo={state.lastCombo}
              activeImpact={activeImpact}
            />
          </div>

          <CarromShotControls
            myTurn={myTurn}
            strikerPos={state.strikerPos}
            onPlace={placeStriker}
            aim={aim}
            phase={state.phase}
            isFlipped={isFlipped}
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
            <CarromRulesList mode={state.mode} />
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

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

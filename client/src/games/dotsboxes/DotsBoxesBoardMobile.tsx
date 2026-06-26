import { motion, AnimatePresence } from "framer-motion";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import {
  NotebookPaper,
  NotebookHeader,
  NotebookMarginDoodles,
  NotebookBoard,
  ScoreBar,
  ReportCardOverlay,
  ClassroomScene,
} from "./dotsboxes-shared";
import { useDotsBoxesBoard, type DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { DOTSBOXES_TUTORIAL } from "../tutorials";
import RematchPanel from "../../components/RematchPanel";

/**
 * Touch-first single-column layout. The scoreboard wraps across the top,
 * the notebook page (with the board centred inside) sits below it, and
 * every overlay is full-width. Compact cell sizing (64/48/38) keeps even
 * the 9×9 board inside a 360px viewport.
 */
export default function DotsBoxesBoardMobile(props: DotsBoxesBoardProps) {
  const {
    state,
    boxesPerSide,
    myTurn,
    canPlay,
    cellPx,
    penOf,
    nameOf,
    initialOf,
    selfPenColor,
    drawnH,
    drawnV,
    bonusBanner,
    error,
    reportDismissed,
    setReportDismissed,
    drawLine,
  } = useDotsBoxesBoard(props);
  const tut = useTutorialGate(DOTSBOXES_TUTORIAL.key);

  return (
    <ClassroomScene footer={state.phase === "finished" ? <RematchPanel players={props.players} selfId={props.selfId} className="bg-[#fef9f0]/90 border-2 border-amber-700/40 rounded-lg" /> : undefined}>
    <div
      className="relative w-full mx-auto"
      style={{
        maxWidth: 720,
        fontFamily: "'Patrick Hand', 'Caveat', 'Georgia', serif",
      }}
    >
      {/* Leave (top-left) + Tutorial (top-right) */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={props.onLeave}
          className="text-sm font-semibold px-3 py-1 rounded"
          style={{ background: "rgba(74,63,53,0.88)", color: "#FFF3E3", fontFamily: "'Caveat','Patrick Hand',cursive", fontSize: 15 }}
        >
          ← Leave
        </button>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      {/* Top: scoreboard + turn indicator (wraps on narrow phones) */}
      <ScoreBar state={state} penOf={penOf} nameOf={nameOf} selfId={props.selfId} />

      {/* Rough Notebook page */}
      <NotebookPaper>
        <NotebookHeader roomCode={props.roomCode ?? "—"} boxesPerSide={boxesPerSide} />

        <div className="flex justify-center px-3 pb-6">
          <NotebookBoard
            state={state}
            cellPx={cellPx}
            penOf={penOf}
            initialOf={initialOf}
            drawnH={drawnH}
            drawnV={drawnV}
            canPlay={canPlay}
            selfPenColor={selfPenColor}
            onDraw={drawLine}
          />
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

      {/* In-board chat / players / voice / reactions rail — parity with the
          other games (was missing; see REFACTOR_AUDIT.md B8/C1). */}
      <div className="mt-3">
        <InlineRoomRail
          code={props.roomCode ?? ""}
          game="dotsboxes"
          phase={props.roomPhase ?? state.phase}
          players={props.players}
          selfId={props.selfId}
          messages={props.messages ?? []}
        />
      </div>

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

      {tut.open && (
        <GameTutorial
          slides={DOTSBOXES_TUTORIAL.slides}
          storageKey={DOTSBOXES_TUTORIAL.key}
          accent={DOTSBOXES_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
    </ClassroomScene>
  );
}

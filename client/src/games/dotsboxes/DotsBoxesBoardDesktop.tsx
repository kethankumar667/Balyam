import { motion, AnimatePresence } from "framer-motion";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import {
  NotebookPaper,
  NotebookHeader,
  NotebookMarginDoodles,
  NotebookBoard,
  ScoreBar,
  ReportCardOverlay,
} from "./dotsboxes-shared";
import { useDotsBoxesBoard, type DotsBoxesBoardProps } from "./useDotsBoxesBoard";

/**
 * Dedicated desktop layout — not the mobile column stretched. The play
 * surface keeps the full width of the notebook page with a genuinely
 * enlarged board (cellScale 1.4), and the scoreboard + turn status move out
 * into a persistent right-hand rail so they never crowd the board. Hover
 * affordances on candidate edges (the preview stroke) come for free with a
 * fine pointer.
 */
export default function DotsBoxesBoardDesktop(props: DotsBoxesBoardProps) {
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
  } = useDotsBoxesBoard(props, 1.4);

  return (
    <div
      className="relative w-full mx-auto flex flex-row items-start justify-center gap-6"
      style={{
        maxWidth: 1280,
        fontFamily: "'Patrick Hand', 'Caveat', 'Georgia', serif",
      }}
    >
      {/* Main play column — enlarged board on the notebook page */}
      <div className="flex-1 min-w-0 flex justify-center">
        <NotebookPaper>
          <NotebookHeader roomCode={props.roomCode ?? "—"} boxesPerSide={boxesPerSide} />

          <div className="flex justify-center px-8 pb-10 pt-2">
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
      </div>

      {/* Persistent right rail — scoreboard, turn status, errors. */}
      <aside
        className="shrink-0 sticky top-4 rounded-lg overflow-hidden"
        style={{
          width: 300,
          background: "rgba(252,247,231,0.92)",
          border: "1px solid rgba(120,82,40,0.25)",
          boxShadow: "0 14px 26px -16px rgba(0,0,0,0.35)",
          padding: "14px 12px",
        }}
      >
        <div
          className="text-center mb-3 select-none"
          style={{
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            fontSize: 26,
            color: "#3b3a36",
            borderBottom: "2px solid #3b3a36",
            paddingBottom: 4,
          }}
        >
          Scoreboard
        </div>

        {/* Stacked score chips + the live turn timer (vertical mode). */}
        <ScoreBar
          state={state}
          penOf={penOf}
          nameOf={nameOf}
          selfId={props.selfId}
          vertical
        />

        {/* Persistent turn status — replaces the mobile "Waiting…" caption. */}
        <div
          className="text-center mt-4"
          style={{
            fontFamily: "'Caveat', 'Patrick Hand', cursive",
            fontSize: 22,
          }}
        >
          {state.phase === "playing" ? (
            myTurn ? (
              <span style={{ color: penOf[state.turnPlayerId]?.color ?? "#14532d", fontWeight: 800 }}>
                Your turn — draw a line
              </span>
            ) : (
              <span style={{ color: "#7a6651" }}>
                Waiting for{" "}
                <span style={{ color: penOf[state.turnPlayerId]?.color }}>
                  {nameOf(state.turnPlayerId)}
                </span>{" "}
                to draw a line…
              </span>
            )
          ) : (
            <span style={{ color: "#7a6651" }}>Round complete</span>
          )}
        </div>

        {error && (
          <div className="mt-3 text-rose-700 text-center" style={{ fontSize: 18 }}>
            {error}
          </div>
        )}
      </aside>

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

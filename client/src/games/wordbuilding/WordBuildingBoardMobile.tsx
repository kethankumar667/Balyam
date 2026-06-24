import { useEffect, useState } from "react";
import WordBuildingTutorialModal from "./TutorialModal";
import InlineRoomRail from "../../components/InlineRoomRail";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useWordBuildingBoard, type WordBuildingBoardProps } from "./useWordBuildingBoard";
import {
  StudentBar,
  WorkbookBoard,
  FooterRow,
  ReportCardOverlay,
} from "./wordbuilding-shared";

/**
 * Viewport-fitted cell size. The original board hard-coded 44/38/28px by board
 * size, which overflowed phones (a 15×15 @28px ≈ 450px). Here we shrink each
 * cell so the whole grid fits the available width, capped at the original
 * sizes so it never balloons on a roomy phone. Recomputed on resize/rotate.
 */
function useFitCellPx(size: number): number {
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 360));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const cap = size === 8 ? 44 : size === 10 ? 38 : 28;
  // Available width inside the centred column: viewport − px-3 gutters (24) −
  // grid inline padding (12) − a small safety margin (8).
  const avail = Math.min(vw, 980) - 44;
  const raw = Math.floor((avail - (size - 1) * 2) / size);
  return Math.max(16, Math.min(cap, raw));
}

/**
 * Word Building — mobile shell.
 *
 * Single column, touch-first: score bar → workbook page (grid sized to fit
 * the viewport, on-screen letter pad) → vocabulary/standings footer below.
 */
export default function WordBuildingBoardMobile(props: WordBuildingBoardProps) {
  const { state, selfId, roomCode, players, messages, roomPhase } = props;
  const m = useWordBuildingBoard(props);
  const cellPx = useFitCellPx(m.size);

  return (
    <div
      className="relative w-full mx-auto"
      style={{ maxWidth: 980, fontFamily: "'Caveat', 'Patrick Hand', 'Georgia', serif" }}
    >
      <StudentBar
        state={state}
        inkOf={m.inkOf}
        nameOf={m.nameOf}
        selfId={selfId}
        remainingSec={m.remainingSec}
        onOpenTutorial={() => m.setTutorialOpen(true)}
      />

      <WorkbookBoard m={m} state={state} cellPx={cellPx} roomCode={roomCode} />

      <FooterRow
        state={state}
        inkOf={m.inkOf}
        nameOf={m.nameOf}
        selfId={selfId}
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 px-1"
      />

      {/* In-board chat / players / voice / reactions rail — parity with the
          other games (was missing; see REFACTOR_AUDIT.md B9/C1). */}
      <div className="mt-4 px-1">
        <InlineRoomRail
          code={roomCode ?? ""}
          game="wordbuilding"
          phase={roomPhase ?? state.phase}
          players={players}
          selfId={selfId}
          messages={messages ?? []}
        />
      </div>

      {state.phase === "finished" && !m.reportDismissed && (
        <ReportCardOverlay
          state={state}
          nameOf={m.nameOf}
          inkOf={m.inkOf}
          onClose={() => m.setReportDismissed(true)}
        />
      )}

      {m.tutorialOpen && <WordBuildingTutorialModal onClose={() => m.setTutorialOpen(false)} />}

      {/* 10-second turn-out warning — only renders while it's MY turn and the
          deadline is within the window. Pointer-events disabled. */}
      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />
    </div>
  );
}

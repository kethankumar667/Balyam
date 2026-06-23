import WordBuildingTutorialModal from "./TutorialModal";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useWordBuildingBoard, type WordBuildingBoardProps } from "./useWordBuildingBoard";
import {
  StudentBar,
  WorkbookBoard,
  FooterRow,
  ReportCardOverlay,
} from "./wordbuilding-shared";

// Desktop has room for larger cells than the mobile fit — fixed per board
// size, comfortably within the 1200px column. Physical-keyboard input stays
// the primary path (the keydown handler lives in the hook, always active);
// the on-screen pad still appears when a cell is selected.
function desktopCellPx(size: number): number {
  if (size === 8) return 52;
  if (size === 10) return 46;
  return 34; // 15
}

/**
 * Word Building — desktop shell.
 *
 * Two-column: the workbook page on the left, a persistent right rail carrying
 * the vocabulary feed + class standings (stacked) so they never push the board
 * down. A real desktop arrangement rather than the stacked phone layout.
 */
export default function WordBuildingBoardDesktop(props: WordBuildingBoardProps) {
  const { state, selfId, roomCode } = props;
  const m = useWordBuildingBoard(props);
  const cellPx = desktopCellPx(m.size);

  return (
    <div
      className="relative w-full mx-auto"
      style={{ maxWidth: 1200, fontFamily: "'Caveat', 'Patrick Hand', 'Georgia', serif" }}
    >
      <StudentBar
        state={state}
        inkOf={m.inkOf}
        nameOf={m.nameOf}
        selfId={selfId}
        remainingSec={m.remainingSec}
        onOpenTutorial={() => m.setTutorialOpen(true)}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5 items-start mt-1">
        <div className="min-w-0">
          <WorkbookBoard m={m} state={state} cellPx={cellPx} roomCode={roomCode} />
        </div>

        <aside className="lg:sticky lg:top-4">
          <FooterRow
            state={state}
            inkOf={m.inkOf}
            nameOf={m.nameOf}
            selfId={selfId}
            className="grid grid-cols-1 gap-3"
          />
        </aside>
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

      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />
    </div>
  );
}

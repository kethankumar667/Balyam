import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import {
  HcCelebrationLayer,
  TeamSelectPhase,
  TossPhase,
  TossChoicePhase,
  InningsPhase,
  MatchSummary,
  type HandCricketBoardProps,
} from "./hc-shared";
import {
  HcNotebookPage,
  HcNotebookHeader,
  HcCountryPickerNotebook,
  HcFranchisePickerNotebook,
  HcPhaseCard,
} from "./hc-notebook";

/**
 * Hand Cricket — mobile notebook shell.
 *
 * Single-column portrait layout matching the reference screenshot:
 *   1. Full-width header (cricket-ball icon + "HAND CRICKET" + pills + matchup chips)
 *   2. Country / franchise picker (teamSelect phase) OR phase content (toss / innings / finished)
 *   3. Tutorial FAB pinned to bottom-right.
 *
 * The header embeds InlineRoomRail so the room code + chat rail are always
 * reachable without a separate sidebar. The notebook frame (wood border + 
 * ring holes + ruled parchment) comes from HcNotebookPage.
 */
export default function HandCricketBoardMobile({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: HandCricketBoardProps) {
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);

  const isTeamSelect = state.phase === "teamSelect";
  const isIpl = state.options.category === "ipl";

  return (
    <HcNotebookPage>
      {/* ── Header ── */}
      <HcNotebookHeader
        state={state}
        players={players}
        selfId={sid}
        roomCode={roomCode}
        roomPhase={roomPhase}
        messages={messages}
      />

      {/* ── Phase content ── */}
      {isTeamSelect ? (
        isIpl ? (
          <HcFranchisePickerNotebook state={state} selfId={sid} players={players} />
        ) : (
          <HcCountryPickerNotebook state={state} selfId={sid} players={players} />
        )
      ) : (
        <div className="px-4 pb-20 pt-1 space-y-4">
          {state.phase === "toss" && (
            <HcPhaseCard>
              <TossPhase state={state} selfId={sid} players={players} />
            </HcPhaseCard>
          )}
          {state.phase === "tossChoice" && (
            <HcPhaseCard>
              <TossChoicePhase state={state} selfId={sid} players={players} />
            </HcPhaseCard>
          )}
          {(state.phase === "innings1" || state.phase === "innings2") && (
            <HcPhaseCard>
              <InningsPhase state={state} selfId={sid} players={players} />
            </HcPhaseCard>
          )}
          {state.phase === "finished" && (
            <HcPhaseCard>
              <MatchSummary state={state} players={players} selfId={sid} />
            </HcPhaseCard>
          )}
        </div>
      )}

      {/* Tutorial floating button */}
      <div className="fixed bottom-4 right-4 z-30">
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      <HcCelebrationLayer state={state} players={players} selfId={sid} />

      {tut.open && (
        <GameTutorial
          slides={HANDCRICKET_TUTORIAL.slides}
          storageKey={HANDCRICKET_TUTORIAL.key}
          accent={HANDCRICKET_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </HcNotebookPage>
  );
}

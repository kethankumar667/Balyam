import { useEffect, useRef, useState } from "react";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import {
  HcCelebrationLayer,
  SquadPicker,
  WaitingForOpponentSquad,
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
 * Single-column portrait layout:
 *   1. Header (title + format pills + matchup chips)
 *   2. teamSelect sub-step: country picker → squad picker → waiting
 *   3. Post-teamSelect phases: toss, innings, finished
 *   4. Tutorial FAB pinned to bottom-right.
 */
export default function HandCricketBoardMobile({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
  onLeave,
  onScorecardClose,
}: HandCricketBoardProps) {
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);

  const isTeamSelect = state.phase === "teamSelect";
  const isIpl = state.options.category === "ipl";
  const mySelection = state.teamSelections[sid];

  // Mirror TeamSelectPhase logic: local override so "Change team" goes back to picker.
  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) setForceTeamPicker(false);
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  function teamSelectContent() {
    if (!mySelection?.teamId || forceTeamPicker) {
      return isIpl ? (
        <HcFranchisePickerNotebook state={state} selfId={sid} players={players} />
      ) : (
        <HcCountryPickerNotebook state={state} selfId={sid} players={players} />
      );
    }
    if (mySelection.squadPlayerIds == null) {
      return (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px 80px" }}>
          <SquadPicker
            state={state}
            selfId={sid}
            players={players}
            onChangeTeam={() => setForceTeamPicker(true)}
          />
        </div>
      );
    }
    return (
      <div style={{ padding: "16px 12px" }}>
        <WaitingForOpponentSquad state={state} selfId={sid} players={players} />
      </div>
    );
  }

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
        onLeave={onLeave}
      />

      {/* ── Phase content ── */}
      {isTeamSelect ? (
        teamSelectContent()
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px 80px" }} className="space-y-3">
          {state.phase === "toss" && (
            <TossPhase state={state} selfId={sid} players={players} />
          )}
          {state.phase === "tossChoice" && (
            <TossChoicePhase state={state} selfId={sid} players={players} />
          )}
          {(state.phase === "innings1" || state.phase === "innings2") && (
            <HcPhaseCard>
              <InningsPhase state={state} selfId={sid} players={players} />
            </HcPhaseCard>
          )}
          {state.phase === "finished" && (
            <HcPhaseCard>
              <MatchSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />
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

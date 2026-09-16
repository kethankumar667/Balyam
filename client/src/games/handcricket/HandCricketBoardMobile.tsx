import { useEffect, useRef, useState } from "react";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import {
  HcCelebrationLayer,
  SquadPicker,
  WaitingForOpponentSquad,
  TossCallPhase,
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
} from "./hc-notebook";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";

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
  const reactions = useSeatReactions();

  const mySelection = state.teamSelections[sid];
  const isTeamSelect = state.phase === "teamSelect";
  const isIpl = state.options.category === "ipl";

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
      return (
        <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden">
          {isIpl ? (
            <HcFranchisePickerNotebook state={state} selfId={sid} players={players} />
          ) : (
            <HcCountryPickerNotebook state={state} selfId={sid} players={players} />
          )}
        </div>
      );
    }
    if (mySelection.squadPlayerIds == null) {
      return (
        <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden">
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
    <HcNotebookPage className="font-['Architects_Daughter',cursive]">
      {/* ── Header ── */}
      <HcNotebookHeader
        state={state}
        players={players}
        selfId={sid}
        roomCode={roomCode}
        roomPhase={roomPhase}
        messages={messages}
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
      />

      {/* ── Phase content ── */}
      {isTeamSelect ? (
        teamSelectContent()
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            padding: "4px 8px 12px",
          }}
          className="space-y-1.5"
        >
          {state.phase === "tossCall" && (
            <div className="w-full">
              <TossCallPhase state={state} selfId={sid} players={players} />
            </div>
          )}
          {state.phase === "toss" && (
            <div className="w-full">
              <TossPhase state={state} selfId={sid} players={players} />
            </div>
          )}
          {state.phase === "tossChoice" && (
            <div className="w-full">
              <TossChoicePhase state={state} selfId={sid} players={players} />
            </div>
          )}
          {(state.phase === "innings1" || state.phase === "innings2") && (
            <div className="w-full">
              <InningsPhase state={state} selfId={sid} players={players} registerCardRef={reactions.registerCardRef} />
            </div>
          )}
          {state.phase === "finished" && (
            <div className="w-full">
              <MatchSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />
            </div>
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

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </HcNotebookPage>
  );
}

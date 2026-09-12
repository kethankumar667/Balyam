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
import { useSkin } from "../skin";
import HandCricketThemeModal from "./HandCricketThemeModal";
import {
  HcNotebookPage,
  HcNotebookHeader,
  HcCountryPickerNotebook,
  HcFranchisePickerNotebook,
  HcPhaseCard,
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
  const [skin, setSkin] = useSkin();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const reactions = useSeatReactions();

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
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "8px 12px 80px" }}>
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
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
        onSkin={() => setThemeModalOpen(true)}
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
            justifyContent: (state.phase === "toss" || state.phase === "tossChoice") ? "center" : "flex-start",
            padding: (state.phase === "toss" || state.phase === "tossChoice") ? "12px 12px 24px" : "8px 12px 80px",
          }}
          className="space-y-3"
        >
          {state.phase === "toss" && (
            <div className="w-full my-auto">
              <TossPhase state={state} selfId={sid} players={players} />
            </div>
          )}
          {state.phase === "tossChoice" && (
            <div className="w-full my-auto">
              <TossChoicePhase state={state} selfId={sid} players={players} />
            </div>
          )}
          {(state.phase === "innings1" || state.phase === "innings2") && (
            <HcPhaseCard>
              <InningsPhase state={state} selfId={sid} players={players} registerCardRef={reactions.registerCardRef} />
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

      <HandCricketThemeModal
        open={themeModalOpen}
        activeSkin={skin}
        onSelectSkin={(newSkin) => {
          setSkin(newSkin);
          setThemeModalOpen(false);
        }}
        onClose={() => setThemeModalOpen(false)}
      />

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </HcNotebookPage>
  );
}

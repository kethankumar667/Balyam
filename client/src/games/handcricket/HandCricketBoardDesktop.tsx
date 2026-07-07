import { useEffect, useRef, useState, type ReactNode } from "react";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
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
  HcScrapbookDoodles,
} from "./hc-notebook";

/**
 * Hand Cricket — desktop notebook shell.
 *
 * Every phase is a full-viewport ruled-parchment sheet (spiral binding on the
 * left) with a compact header across the top. Post-teamSelect phases render
 * their active content in a single centred column with a comfortable max-width;
 * the surrounding page margins are filled by a non-interactive scrapbook doodle
 * layer (stumps, ball, trophy, bat, backpack, stars) so the sheet reads like a
 * hand-decorated notebook page instead of a small card floating in dead space.
 *
 *  • teamSelect  — full-width parchment country/franchise/squad picker.
 *  • toss / tossChoice — small card, vertically centred on the sheet.
 *  • innings / finished — taller content, top-aligned and scrollable.
 *
 * The header ("HAND CRICKET" + format pills + matchup chips + room rail + Leave)
 * spans full width at the top of every phase.
 */
export default function HandCricketBoardDesktop({
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

  // Mirror TeamSelectPhase logic: allow user to go back to the team picker.
  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) setForceTeamPicker(false);
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  /** Derive which teamSelect sub-step we're on. */
  function teamSelectContent() {
    if (!mySelection?.teamId || forceTeamPicker) {
      return isIpl ? (
        <HcFranchisePickerNotebook state={state} selfId={sid} players={players} />
      ) : (
        <HcCountryPickerNotebook state={state} selfId={sid} players={players} />
      );
    }
    if (mySelection.squadPlayerIds == null) {
      // Squad picker: centred with a generous max-width so it never stretches
      // edge-to-edge on ultrawide displays. Doodles fill the outer margins.
      return (
        <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <HcScrapbookDoodles />
          <div
            style={{
              position: "relative",
              height: "100%",
              overflowY: "auto",
              display: "flex",
              justifyContent: "center",
              padding: "12px 24px 20px",
            }}
          >
            <div style={{ width: "100%", maxWidth: 1180 }}>
              <SquadPicker
                state={state}
                selfId={sid}
                players={players}
                onChangeTeam={() => setForceTeamPicker(true)}
                isDesktop
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <PhaseStage centred maxWidth={560}>
        <WaitingForOpponentSquad state={state} selfId={sid} players={players} />
      </PhaseStage>
    );
  }

  return (
    <HcNotebookPage>
      {/* ── Full-width header ── */}
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
      ) : state.phase === "toss" ? (
        <PhaseStage centred maxWidth={620}>
          <TossPhase state={state} selfId={sid} players={players} />
        </PhaseStage>
      ) : state.phase === "tossChoice" ? (
        <PhaseStage centred maxWidth={620}>
          <TossChoicePhase state={state} selfId={sid} players={players} />
        </PhaseStage>
      ) : state.phase === "innings1" || state.phase === "innings2" ? (
        <PhaseStage maxWidth={980}>
          <HcPhaseCard>
            <InningsPhase state={state} selfId={sid} players={players} isDesktop />
          </HcPhaseCard>
        </PhaseStage>
      ) : state.phase === "finished" ? (
        <PhaseStage maxWidth={760}>
          <MatchSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />
        </PhaseStage>
      ) : null}

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

/**
 * The shared content stage for every post-teamSelect phase. Fills the whole
 * sheet, paints the scrapbook doodle margins, then centres a single column of
 * the given max-width. `centred` also vertically centres short content (toss)
 * so it never sits marooned at the top with a sea of empty ruled paper below.
 */
function PhaseStage({
  children,
  maxWidth,
  centred = false,
}: {
  children: ReactNode;
  maxWidth: number;
  centred?: boolean;
}) {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <HcScrapbookDoodles />
      <div
        style={{
          position: "relative",
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: centred ? "center" : "flex-start",
          padding: "22px 28px 40px",
        }}
      >
        <div style={{ width: "100%", maxWidth }}>{children}</div>
      </div>
    </div>
  );
}

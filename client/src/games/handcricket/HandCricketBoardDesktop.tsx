import { useEffect, useRef, useState, type ReactNode } from "react";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
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
  HcNotebookHeader,
  HcCountryPickerNotebook,
  HcFranchisePickerNotebook,
  HcScrapbookDoodles,
} from "./hc-notebook";
import {
  SpiralBinderRings,
  PaperClipDoodle,
} from "../dotsboxes/dotsboxes-theme";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";

/**
 * Hand Cricket — desktop notebook shell.
 *
 * Designed with the nostalgic classroom desk ambience established in Dots & Boxes
 * and Word Building:
 *  - Rich wooden desk texture with ambient radial dots
 *  - 96vh spiral-bound notebook book canvas with binder rings and paper clips
 *  - Single-layer authentic parchment layout (zero nested box-in-a-box clutter)
 *  - Controlled flex scrolling with zero page body overflow
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

  /** Derive which teamSelect sub-step we're on. */
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
            isDesktop
          />
        </div>
      );
    }
    return (
      <PhaseStage centred maxWidth={740}>
        <WaitingForOpponentSquad state={state} selfId={sid} players={players} />
      </PhaseStage>
    );
  }

  return (
    <div className="fixed inset-0 h-screen max-h-screen w-full bg-[#1C1814] text-stone-900 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none font-['Patrick_Hand',cursive]">
      {/* Wooden Desk Texture Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#451A03_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* ── Main Spiral Notebook Page ── */}
      <div className="relative z-10 w-full max-w-[1440px] h-[96vh] bg-[#FCF8EE] rounded-3xl border-2 border-[#D7C9B1] shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex overflow-hidden font-['Architects_Daughter',cursive]">
        {/* Paper Clips on top edge */}
        <PaperClipDoodle className="absolute -top-3 left-24 w-6 h-12 z-30 opacity-90 hidden sm:block pointer-events-none" />
        <PaperClipDoodle className="absolute -top-3 right-44 w-6 h-12 z-30 opacity-90 hidden lg:block pointer-events-none" />

        {/* Left Spiral Wire Ring Binder */}
        <div className="w-10 sm:w-12 h-full bg-[#EFE9DA] border-r-2 border-[#D7C9B1] flex-shrink-0 flex items-center justify-center relative shadow-inner">
          <SpiralBinderRings orientation="vertical" count={16} />
        </div>

        {/* Notebook Content Area */}
        <div className="flex-1 h-full flex flex-col overflow-hidden relative">
          {/* Red Margin Line */}
          <div className="absolute top-0 bottom-0 left-4 sm:left-6 w-0.5 bg-rose-400/40 pointer-events-none z-0" />

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
          <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden">
            {isTeamSelect ? (
              teamSelectContent()
            ) : state.phase === "tossCall" ? (
              <PhaseStage centred maxWidth={820}>
                <TossCallPhase state={state} selfId={sid} players={players} />
              </PhaseStage>
            ) : state.phase === "toss" ? (
              <PhaseStage centred maxWidth={820}>
                <TossPhase state={state} selfId={sid} players={players} />
              </PhaseStage>
            ) : state.phase === "tossChoice" ? (
              <PhaseStage centred maxWidth={820}>
                <TossChoicePhase state={state} selfId={sid} players={players} />
              </PhaseStage>
            ) : state.phase === "innings1" || state.phase === "innings2" ? (
              <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden p-2 sm:p-3 font-notebook">
                <InningsPhase state={state} selfId={sid} players={players} isDesktop registerCardRef={reactions.registerCardRef} />
              </div>
            ) : state.phase === "finished" ? (
              <PhaseStage maxWidth={1160}>
                <MatchSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />
              </PhaseStage>
            ) : null}
          </div>
        </div>
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
    </div>
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
  compact = false,
}: {
  children: ReactNode;
  maxWidth: number;
  centred?: boolean;
  /** Tighter vertical padding — used by the innings stage so the taller
   *  second-innings layout (target + powerplay banner) fits without scrolling. */
  compact?: boolean;
}) {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <HcScrapbookDoodles />
      <div
        style={{
          position: "relative",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: centred ? "center" : "flex-start",
          padding: compact ? "12px 28px 16px" : "22px 28px 40px",
        }}
      >
        <div style={{ width: "100%", maxWidth }}>{children}</div>
      </div>
    </div>
  );
}

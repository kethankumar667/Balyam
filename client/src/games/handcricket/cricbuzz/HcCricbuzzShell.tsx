import { useEffect, useRef, useState, type ReactNode } from "react";
import InlineRoomRail from "../../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate } from "../../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../../tutorials";
import { HcCelebrationLayer, type HandCricketBoardProps } from "../hc-shared";
import { CricbuzzShell } from "./cricbuzz-kit";
import { CricbuzzHeader } from "./CricbuzzHeader";
import {
  CricbuzzTeamPicker,
  CricbuzzSquadPicker,
  CricbuzzWaiting,
} from "./CricbuzzTeamSquad";
import { CricbuzzToss, CricbuzzTossChoice } from "./CricbuzzToss";
import { CricbuzzTossCall } from "./CricbuzzTossCall";
import { CricbuzzInnings } from "./CricbuzzInnings";
import {
  CricbuzzInningsBreak,
} from "./CricbuzzScorecard";
import { CricbuzzSummary } from "./CricbuzzSummary";
import FloatingReactionsLayer from "../../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../../components/reactions/useSeatReactions";

/**
 * Hand Cricket — Cricbuzz Theme Shell.
 * Full Cricbuzz match centre experience with responsive dual layout.
 */
export default function HcCricbuzzShell({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
  onLeave,
  onScorecardClose,
  compact = false,
}: HandCricketBoardProps & { compact?: boolean }) {
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);
  const reactions = useSeatReactions();

  const mySelection = state.teamSelections[sid];
  const isTeamSelect = state.phase === "teamSelect";

  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) setForceTeamPicker(false);
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  const maxWidth = compact ? 580 : state.phase === "teamSelect" ? 1320 : 1500;
  const isLive = !compact && (state.phase === "innings1" || state.phase === "innings2");

  function content(): ReactNode {
    if (isTeamSelect) {
      if (!mySelection?.teamId || forceTeamPicker) {
        return <CricbuzzTeamPicker state={state} selfId={sid} players={players} />;
      }
      if (mySelection.squadPlayerIds == null) {
        return (
          <CricbuzzSquadPicker
            state={state}
            selfId={sid}
            onChangeTeam={() => setForceTeamPicker(true)}
          />
        );
      }
      return <CricbuzzWaiting state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "tossCall") {
      return <CricbuzzTossCall state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "toss") {
      return <CricbuzzToss state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "tossChoice") {
      return <CricbuzzTossChoice state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "innings1" || state.phase === "innings2") {
      return (
        <CricbuzzInnings
          state={state}
          selfId={sid}
          players={players}
          compact={compact}
          registerCardRef={reactions.registerCardRef}
        />
      );
    }
    if (state.phase === "finished") {
      return (
        <CricbuzzSummary
          state={state}
          players={players}
          selfId={sid}
          onContinue={onScorecardClose}
        />
      );
    }
    return null;
  }

  return (
    <CricbuzzShell
      className={compact ? "min-h-dvh-safe" : ""}
      style={{ position: "fixed", inset: 0, zIndex: 50 }}
    >
      <CricbuzzHeader
        state={state}
        players={players}
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
        rail={
          <InlineRoomRail
            code={roomCode}
            game="handcricket"
            phase={roomPhase}
            players={players}
            selfId={selfId}
            messages={messages}
          />
        }
      />

      <div
        className={`min-h-0 flex-1 overflow-x-hidden px-3 pt-4 sm:px-5 ${
          // Every non-live phase (toss, team select, finished) scrolls, and
          // FullscreenGatePrompt's dismissible pill floats fixed at
          // `bottom-[~1rem]` while the player hasn't yet granted fullscreen —
          // exactly the window team-select/toss/toss-call runs in. A flat
          // `py-4` (1rem) left no clearance for that ~48-60px pill, so it sat
          // directly on top of "Lock In Call" / "Opt to Bat" / "Opt to Bowl"
          // on any viewport short enough that those buttons rendered near the
          // bottom. `pb-24` reserves real room below the last card instead.
          // The live innings view manages its own fixed-height layout and
          // sticky pick footer, so it keeps the original thin clearance.
          isLive ? "overflow-hidden pb-4" : "overflow-y-auto pb-24"
        }`}
      >
        <div className={`mx-auto w-full ${isLive ? "h-full" : ""}`} style={{ maxWidth }}>
          {content()}
        </div>
      </div>

      <CricbuzzInningsBreak state={state} players={players} selfId={sid} />
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
    </CricbuzzShell>
  );
}

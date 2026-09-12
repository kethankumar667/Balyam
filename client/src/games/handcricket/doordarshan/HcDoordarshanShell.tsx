import { useEffect, useRef, useState, type ReactNode } from "react";
import InlineRoomRail from "../../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate } from "../../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../../tutorials";
import { type HandCricketBoardProps } from "../hc-shared";
import { useHcCelebrationEvents } from "../useHcCelebrationEvents";
import { DoordarshanShell } from "./doordarshan-kit";
import { DoordarshanHeader } from "./DoordarshanHeader";
import { DoordarshanTeamPicker, DoordarshanSquadPicker, DoordarshanWaiting } from "./DoordarshanTeamSquad";
import { DoordarshanToss, DoordarshanTossChoice } from "./DoordarshanToss";
import { DoordarshanInnings } from "./DoordarshanInnings";
import { DoordarshanInningsBreak, DoordarshanSummary } from "./DoordarshanScorecard";
import { DoordarshanCelebrationOverlay } from "./DoordarshanCelebration";
import { DoordarshanCaptionTicker } from "./DoordarshanCaptionTicker";
import { DoordarshanBumper, DoordarshanGlitchWipe, usePhaseGlitch } from "./DoordarshanTransientFX";
import FloatingReactionsLayer from "../../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../../components/reactions/useSeatReactions";

/**
 * Hand Cricket — "Doordarshan Rerun" shell. Same skeleton as
 * HcBroadcastShell.tsx (one responsive shell, not a desktop/mobile split).
 */
export default function HcDoordarshanShell({
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
  const celebration = useHcCelebrationEvents(state, players, sid);
  const glitching = usePhaseGlitch(state.phase);

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

  const maxWidth = compact ? 560 : state.phase === "teamSelect" ? 1320 : 1500;
  const isLive = !compact && (state.phase === "innings1" || state.phase === "innings2");

  function content(): ReactNode {
    if (isTeamSelect) {
      if (!mySelection?.teamId || forceTeamPicker) {
        return <DoordarshanTeamPicker state={state} selfId={sid} players={players} />;
      }
      if (mySelection.squadPlayerIds == null) {
        return <DoordarshanSquadPicker state={state} selfId={sid} onChangeTeam={() => setForceTeamPicker(true)} />;
      }
      return <DoordarshanWaiting state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "toss") return <DoordarshanToss state={state} selfId={sid} players={players} />;
    if (state.phase === "tossChoice") return <DoordarshanTossChoice state={state} selfId={sid} players={players} />;
    if (state.phase === "innings1" || state.phase === "innings2") {
      return (
        <DoordarshanInnings state={state} selfId={sid} players={players} compact={compact} registerCardRef={reactions.registerCardRef} />
      );
    }
    if (state.phase === "finished") {
      return <DoordarshanSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />;
    }
    return null;
  }

  return (
    <DoordarshanShell className={compact ? "min-h-dvh-safe" : ""} style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <DoordarshanHeader
        state={state}
        players={players}
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
        rail={
          <InlineRoomRail code={roomCode} game="handcricket" phase={roomPhase} players={players} selfId={selfId} messages={messages} />
        }
      />

      <div className={`relative min-h-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-5 ${isLive ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`mx-auto w-full ${isLive ? "h-full" : ""}`} style={{ maxWidth }}>
          {content()}
        </div>
        {glitching && <DoordarshanGlitchWipe />}
      </div>

      <DoordarshanCaptionTicker active={celebration} />
      <DoordarshanInningsBreak state={state} players={players} selfId={sid} />
      {celebration && <DoordarshanCelebrationOverlay data={celebration} />}
      <DoordarshanBumper />

      {tut.open && (
        <GameTutorial
          slides={HANDCRICKET_TUTORIAL.slides}
          storageKey={HANDCRICKET_TUTORIAL.key}
          accent={HANDCRICKET_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </DoordarshanShell>
  );
}

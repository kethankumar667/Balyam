import { useEffect, useRef, useState, type ReactNode } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import { HcCelebrationLayer, type HandCricketBoardProps } from "./hc-shared";
import { useSkin } from "../skin";
import { ProShell } from "../pro/pro-kit";
import {
  HcProHeader,
  HcProInnings,
  HcProSquadPicker,
  HcProSummary,
  HcProTeamPicker,
  HcProToss,
  HcProTossChoice,
  HcProWaiting,
} from "./hc-broadcast";

/**
 * Hand Cricket — broadcast shell, shared by desktop and mobile.
 *
 * ONE shell for both, unlike the notebook skin's two files. The broadcast
 * layout is a single centred column whose max-width is the only thing that
 * differs between a phone and a monitor, so a second component would be two
 * copies of the same tree drifting apart. `compact` carries the difference.
 *
 * Reuses exactly one thing from the notebook implementation:
 * `HcCelebrationLayer`, which is a full-screen effects overlay (confetti,
 * bursts) with no paper styling of its own.
 */
export default function HcBroadcastShell({
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
  const [, setSkin] = useSkin();

  const mySelection = state.teamSelections[sid];
  const isTeamSelect = state.phase === "teamSelect";

  // Lets a player reopen the team picker after choosing but before locking an
  // XI. Mirrors the notebook shell's `forceTeamPicker`, including the reset:
  // once a DIFFERENT team lands from the server, drop back out of the picker.
  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) setForceTeamPicker(false);
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  const maxWidth = compact ? 560 : state.phase === "teamSelect" ? 1180 : 980;

  function content(): ReactNode {
    if (isTeamSelect) {
      if (!mySelection?.teamId || forceTeamPicker) {
        return <HcProTeamPicker state={state} selfId={sid} players={players} />;
      }
      if (mySelection.squadPlayerIds == null) {
        return <HcProSquadPicker state={state} selfId={sid} onChangeTeam={() => setForceTeamPicker(true)} />;
      }
      return <HcProWaiting state={state} selfId={sid} players={players} />;
    }
    if (state.phase === "toss") return <HcProToss state={state} selfId={sid} players={players} />;
    if (state.phase === "tossChoice") return <HcProTossChoice state={state} selfId={sid} players={players} />;
    if (state.phase === "innings1" || state.phase === "innings2") {
      return <HcProInnings state={state} selfId={sid} players={players} compact={compact} />;
    }
    if (state.phase === "finished") {
      return <HcProSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />;
    }
    return null;
  }

  return (
    <ProShell className={compact ? "min-h-dvh-safe" : "h-full"}>
      <HcProHeader
        state={state}
        players={players}
        selfId={sid}
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
        onSkin={() => setSkin("nostalgia")}
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

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5">
        <div className="mx-auto w-full" style={{ maxWidth }}>
          {content()}
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
    </ProShell>
  );
}

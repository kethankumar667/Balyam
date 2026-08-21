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
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";

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
  const reactions = useSeatReactions();

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

  // Wide enough for the innings screen's action column + rail to sit side by
  // side on a laptop, and capped so a 2560px monitor doesn't stretch the score
  // bug into a letterbox. Team selection gets more room for its card grid.
  const maxWidth = compact ? 560 : state.phase === "teamSelect" ? 1320 : 1500;
  // Only the desktop innings screen takes the fill-the-height treatment; on a
  // phone the column is taller than the viewport and must scroll.
  const isLive = !compact && (state.phase === "innings1" || state.phase === "innings2");

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
      return (
        <HcProInnings
          state={state}
          selfId={sid}
          players={players}
          compact={compact}
          registerCardRef={reactions.registerCardRef}
        />
      );
    }
    if (state.phase === "finished") {
      return <HcProSummary state={state} players={players} selfId={sid} onContinue={onScorecardClose} />;
    }
    return null;
  }

  return (
    /*
     * Full-viewport overlay, matching the notebook skin's `HcNotebookPage`
     * (`position: fixed; inset: 0; z-index: 50`).
     *
     * Room.tsx renders the board inside its ordinary page container, so an
     * in-flow shell left the app's cream page background framing a dark panel
     * — the board read as a widget dropped on a page rather than the screen.
     * Hand Cricket is the one game that takes over the viewport, and the
     * broadcast skin has to do the same or the two skins disagree about what
     * the game IS.
     */
    <ProShell
      className={compact ? "min-h-dvh-safe" : ""}
      style={{ position: "fixed", inset: 0, zIndex: 50 }}
    >
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

      {/*
       * The live innings FILLS the remaining height (its inner columns do
       * their own scrolling) so the pick row lands at the bottom of the screen
       * rather than floating mid-page above dead space. Every other phase is
       * content-sized and scrolls the whole area normally — forcing those to
       * full height would stretch a small toss card across the viewport.
       */}
      <div
        className={`min-h-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-5 ${
          isLive ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <div className={`mx-auto w-full ${isLive ? "h-full" : ""}`} style={{ maxWidth }}>
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

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </ProShell>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import { HcCelebrationLayer, type HandCricketBoardProps } from "./hc-shared";
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
import { useSkin } from "../skin";
import { HC_THEMES } from "./hc-theme-definitions";
import HandCricketThemeModal from "./HandCricketThemeModal";

/**
 * Hand Cricket — dedicated theme broadcast shell, shared by desktop and mobile.
 *
 * ONE shell for both, supporting all 6 visual themes:
 *   1. Broadcast Pro (stadium broadcast)
 *   2. Gully Street (concrete street cricket)
 *   3. Midnight Cyber (neon laser grid)
 *   4. 8-Bit Retro Arcade (pixel art CRT arcade)
 *   5. Vintage Pavilion (heritage club mahogany & brass)
 *   6. Classic Notebook (warm parchment)
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
  onSkin,
  compact = false,
}: HandCricketBoardProps & { compact?: boolean; onSkin?: () => void }) {
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);
  const reactions = useSeatReactions();
  const [skin, setSkin] = useSkin();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const theme = HC_THEMES[skin] ?? HC_THEMES.broadcast;

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
    <ProShell
      className={compact ? "min-h-dvh-safe" : ""}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: theme.shellBg,
        fontFamily: theme.fontBody,
      }}
    >
      <HcProHeader
        state={state}
        players={players}
        selfId={sid}
        onHelp={() => tut.setOpen(true)}
        onLeave={onLeave}
        onSkin={() => (onSkin ? onSkin() : setThemeModalOpen(true))}
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
    </ProShell>
  );
}

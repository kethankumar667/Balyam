import InlineRoomRail from "../../components/InlineRoomRail";
import {
  ChoiceRow,
  EndPanel,
  Header,
  HistoryStrip,
  PlayerScoreCard,
  RevealArena,
  RpsFrame,
  RpsOverlays,
} from "./rps-shared";
import { useRpsBoard } from "./useRpsBoard";
import type { RpsBoardProps } from "./useRpsBoard";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { RPS_TUTORIAL } from "../tutorials";

/**
 * Mobile / tablet RPS shell — single column, touch-first, board fits the
 * viewport down to 360px. Score cards stack (side-by-side once there's room at
 * `sm`), the compact arena sits above a 3-up choice grid with 44px+ targets,
 * and the chat rail lives at the bottom of the scroll. This is the shell the
 * picker mounts for every non-desktop tier, so it owns the single hook call.
 */
export default function RpsBoardMobile(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  const tut = useTutorialGate(RPS_TUTORIAL.key);

  return (
    <RpsFrame className="p-3 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Header round={m.state.round} target={m.target} match={m.state.matchNumber} />
        </div>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlayerScoreCard
          ref={m.registerCardRef(m.myId)}
          name={m.me?.name ?? "You"}
          isSelf
          score={m.myScore}
          target={m.target}
          streak={m.myStreak}
          best={m.state.bestStreak[m.myId] ?? 0}
          matchPoint={m.myMatchPoint && !m.state.isOver}
          accent="brand"
        />
        <PlayerScoreCard
          ref={m.registerCardRef(m.opponent?.id ?? null)}
          name={m.opponent?.name ?? "Opponent"}
          score={m.oppScore}
          target={m.target}
          streak={m.oppStreak}
          best={m.opponent ? m.state.bestStreak[m.opponent.id] ?? 0 : 0}
          matchPoint={m.oppMatchPoint && !m.state.isOver}
          accent="ruby"
          rightAligned
        />
      </div>

      <RevealArena
        revealKey={m.revealKey}
        myChoice={m.myChoice}
        oppChoice={m.oppChoice}
        bothChose={m.bothChose}
        meName={m.me?.name ?? "You"}
        oppName={m.opponent?.name ?? "Opponent"}
        bannerOutcome={m.bannerOutcome}
      />

      {m.state.isOver ? (
        <EndPanel
          winner={m.state.winnerId ? m.nameOf(m.state.winnerId) : null}
          youWon={m.state.winnerId === m.myId}
          finalScores={{ me: m.myScore, opp: m.oppScore }}
          ties={m.state.ties}
          onRematch={m.rematch}
        />
      ) : (
        <ChoiceRow myChoice={m.myChoice} bothChose={m.bothChose} onPick={m.pick} />
      )}

      <HistoryStrip state={m.state} myId={m.myId} />

      <InlineRoomRail
        code={m.roomCode}
        game="rps"
        phase={m.roomPhase}
        players={m.players}
        selfId={m.selfId}
        messages={m.messages}
      />

      <RpsOverlays
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        rains={m.rains}
        confettiUntil={m.confettiUntil}
      />

      {tut.open && (
        <GameTutorial
          slides={RPS_TUTORIAL.slides}
          storageKey={RPS_TUTORIAL.key}
          accent={RPS_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </RpsFrame>
  );
}

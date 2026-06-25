import InlineRoomRail from "../../components/InlineRoomRail";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
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
 * Desktop RPS shell — a dedicated wide-screen arrangement, not the mobile
 * column stretched. The two score cards flank a spacious arena in a 3-column
 * row; below it the action area (choice row / end panel) sits beside a
 * persistent right rail holding round history and the room/chat rail. Hover
 * lift on the choice cards is the desktop affordance (already in the shared
 * card). This shell owns the single hook call when the desktop gate passes.
 */
export default function RpsBoardDesktop(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  const tut = useTutorialGate(RPS_TUTORIAL.key);

  const selfCard = (
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
  );
  const oppCard = (
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
  );

  return (
    <RpsFrame className="p-5 lg:p-7 space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Header round={m.state.round} target={m.target} match={m.state.matchNumber} />
        </div>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      {/* Score cards flank a spacious arena across the full width. */}
      <div className="grid grid-cols-[minmax(200px,0.8fr)_minmax(0,2.4fr)_minmax(200px,0.8fr)] gap-4 items-center">
        {selfCard}
        <RevealArena
          revealKey={m.revealKey}
          myChoice={m.arenaMyChoice}
          oppChoice={m.arenaOppChoice}
          bothChose={m.arenaBothChose}
          meName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opponent"}
          bannerOutcome={m.bannerOutcome}
          size="spacious"
        />
        {oppCard}
      </div>

      <TurnTimeWarning deadline={m.roundDeadline} active={m.iNeedToChoose} />

      {/* Action area beside a persistent history + room rail. */}
      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] gap-5 items-start">
        <div>
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
        </div>

        <aside className="space-y-4 rounded-2xl border border-[var(--rim-soft)] bg-surface-1/60 p-4">
          <HistoryStrip state={m.state} myId={m.myId} />
          <div className="h-px bg-[var(--rim-soft)]" />
          <InlineRoomRail
            code={m.roomCode}
            game="rps"
            phase={m.roomPhase}
            players={m.players}
            selfId={m.selfId}
            messages={m.messages}
          />
        </aside>
      </div>

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

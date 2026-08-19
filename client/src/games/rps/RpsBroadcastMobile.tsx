import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate } from "../../components/GameTutorial";
import { RPS_TUTORIAL } from "../tutorials";
import { RpsOverlays } from "./rps-shared";
import { useRpsBoard } from "./useRpsBoard";
import type { RpsBoardProps } from "./useRpsBoard";
import { useSkin } from "../skin";
import { ProShell, ProPanel, ProLabel, PRO } from "../pro/pro-kit";
import {
  ProTopBar,
  ProPlayerCard,
  ProArena,
  ProChoiceRow,
  ProHistoryStrip,
  ProResultCard,
  ProRoundClock,
  MY_SIDE,
  OPP_SIDE,
} from "./rps-broadcast";

/**
 * Mobile RPS — broadcast skin.
 *
 * Single column, ordered by what a player looks at in sequence: who's winning
 * (the two score cards), what just happened (arena), what to do next (throws),
 * then the log. Competitor cards run side-by-side in `compact` form so the
 * arena stays above the fold on a phone.
 */
export default function RpsBroadcastMobile(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  // Never over a live round: safe once this player doesn't need to choose,
  // or no round deadline is running — same condition this board already uses
  // for the turn-timer warning (below). See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(RPS_TUTORIAL.key, !m.iNeedToChoose || m.roundDeadline == null);
  const [, setSkin] = useSkin();
  const showResult = m.state.isOver;

  return (
    <ProShell className="min-h-dvh-safe">
      <ProTopBar
        match={m.state.matchNumber}
        round={m.state.round}
        target={m.target}
        live={!m.state.isOver}
        onLeave={props.onLeave}
        onHelp={() => tut.setOpen(true)}
        onSkin={() => setSkin("nostalgia")}
      />

      <div className="grid grid-cols-2 gap-2.5 px-3 pt-3">
        <ProPlayerCard
          name={m.me?.name ?? "You"}
          isSelf
          score={m.myScore}
          target={m.target}
          streak={m.myStreak}
          best={m.state.bestStreak[m.myId] ?? 0}
          matchPoint={m.myMatchPoint && !m.state.isOver}
          side={MY_SIDE}
          locked={!!m.myChoice}
          cardRef={m.registerCardRef(m.myId)}
          compact
        />
        <ProPlayerCard
          name={m.opponent?.name ?? "Opp"}
          score={m.oppScore}
          target={m.target}
          streak={m.oppStreak}
          best={m.opponent ? m.state.bestStreak[m.opponent.id] ?? 0 : 0}
          matchPoint={m.oppMatchPoint && !m.state.isOver}
          side={OPP_SIDE}
          align="right"
          locked={!!m.oppChoice}
          cardRef={m.registerCardRef(m.opponent?.id ?? null)}
          compact
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-3">
        <ProArena
          myName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opp"}
          myChoice={m.arenaMyChoice}
          oppChoice={m.arenaOppChoice}
          bothChose={m.arenaBothChose}
          revealKey={m.revealKey}
          bannerOutcome={m.bannerOutcome}
          mySide={MY_SIDE}
          oppSide={OPP_SIDE}
          compact
        />
        <ProRoundClock deadline={m.roundDeadline} active={m.iNeedToChoose} />
      </div>

      {!showResult && (
        <div className="px-3 pt-3">
          <ProPanel>
            <ProChoiceRow myChoice={m.myChoice} bothChose={m.bothChose} onPick={m.pick} compact />
          </ProPanel>
        </div>
      )}

      <div className="px-3 pb-5 pt-3">
        <ProPanel>
          <ProLabel className="mb-2">Round log</ProLabel>
          <ProHistoryStrip state={m.state} myId={m.myId} max={10} />
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${PRO.line}` }}>
            <InlineRoomRail
              code={m.roomCode}
              game="rps"
              phase={m.roomPhase}
              players={m.players}
              selfId={m.selfId}
              messages={m.messages}
            />
          </div>
        </ProPanel>
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

      {showResult && (
        <ProResultCard
          won={m.state.winnerId === m.myId}
          myName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opponent"}
          myScore={m.myScore}
          oppScore={m.oppScore}
          rounds={m.state.history.length}
          onClose={() => props.onScorecardClose?.()}
        />
      )}
    </ProShell>
  );
}

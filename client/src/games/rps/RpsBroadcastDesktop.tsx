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
 * Desktop RPS — broadcast skin.
 *
 * Fight-card composition: the two competitors hold the outer columns facing a
 * centre arena, controls and the round log sit on a lower deck. Same
 * `useRpsBoard` model the notebook shell consumes, so the two skins can never
 * drift in behaviour — only in appearance.
 */
export default function RpsBroadcastDesktop(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  const tut = useTutorialGate(RPS_TUTORIAL.key);
  const [, setSkin] = useSkin();
  const showResult = m.state.isOver;

  return (
    <ProShell className="h-full">
      <ProTopBar
        match={m.state.matchNumber}
        round={m.state.round}
        target={m.target}
        live={!m.state.isOver}
        onLeave={props.onLeave}
        onHelp={() => tut.setOpen(true)}
        onSkin={() => setSkin("nostalgia")}
      />

      {/* ── Upper deck: competitor / arena / competitor ── */}
      <div
        className="grid flex-1 items-center gap-5 px-6 py-4"
        style={{ gridTemplateColumns: "minmax(210px,0.9fr) minmax(0,2.2fr) minmax(210px,0.9fr)" }}
      >
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
        />

        <div className="flex flex-col items-center gap-3">
          <ProArena
            myName={m.me?.name ?? "You"}
            oppName={m.opponent?.name ?? "Opponent"}
            myChoice={m.arenaMyChoice}
            oppChoice={m.arenaOppChoice}
            bothChose={m.arenaBothChose}
            revealKey={m.revealKey}
            bannerOutcome={m.bannerOutcome}
            mySide={MY_SIDE}
            oppSide={OPP_SIDE}
          />
          <ProRoundClock deadline={m.roundDeadline} active={m.iNeedToChoose} />
        </div>

        <ProPlayerCard
          name={m.opponent?.name ?? "Opponent"}
          score={m.oppScore}
          target={m.target}
          streak={m.oppStreak}
          best={m.opponent ? m.state.bestStreak[m.opponent.id] ?? 0 : 0}
          matchPoint={m.oppMatchPoint && !m.state.isOver}
          side={OPP_SIDE}
          align="right"
          locked={!!m.oppChoice}
          cardRef={m.registerCardRef(m.opponent?.id ?? null)}
        />
      </div>

      {/* ── Lower deck: controls + round log ── */}
      <div
        className="grid shrink-0 gap-5 px-6 pb-5"
        style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(280px,1fr)", alignItems: "start" }}
      >
        <ProPanel>
          {!showResult ? (
            <ProChoiceRow myChoice={m.myChoice} bothChose={m.bothChose} onPick={m.pick} />
          ) : (
            <div className="py-4 text-center text-[12px] font-bold" style={{ color: PRO.inkLo }}>
              Match complete
            </div>
          )}
        </ProPanel>

        <ProPanel>
          <ProLabel className="mb-2">Round log</ProLabel>
          <ProHistoryStrip state={m.state} myId={m.myId} />
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

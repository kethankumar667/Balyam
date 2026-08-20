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
  // Never over a live round: safe once this player doesn't need to choose,
  // or no round deadline is running — same condition this board already uses
  // for the turn-timer warning (below). See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(RPS_TUTORIAL.key, !m.iNeedToChoose || m.roundDeadline == null);
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

      {/*
       * Everything sits in ONE centred, width-capped stack.
       *
       * The first pass let the upper deck stretch edge-to-edge with `flex-1`,
       * which on a 1600px monitor threw the two competitor cards against
       * opposite screen edges with a void between them and stranded the
       * controls at the bottom. A broadcast composition is a centred block:
       * cap it, centre it, and keep the arena the visual hero.
       */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-4">
        <div className="w-full" style={{ maxWidth: 1180 }}>
          <div
            className="grid items-center gap-6"
            style={{ gridTemplateColumns: "minmax(220px,1fr) minmax(0,1.55fr) minmax(220px,1fr)" }}
          >
            <ProPlayerCard
              name={m.me?.name ?? "You"}
              avatar={m.me?.avatar}
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
              avatar={m.opponent?.avatar}
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

          {/* Lower deck: controls + round log, same cap so the two decks
              share one optical column rather than drifting apart. */}
          <div
            className="mt-5 grid gap-5"
            style={{ gridTemplateColumns: "minmax(0,1.55fr) minmax(300px,1fr)", alignItems: "start" }}
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
        </div>
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

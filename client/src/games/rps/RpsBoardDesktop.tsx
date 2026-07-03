import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { RPS_TUTORIAL } from "../tutorials";
import { RpsScorecardModal } from "./rps-shared";
import { RpsOverlays } from "./rps-shared";
import { useRpsBoard } from "./useRpsBoard";
import type { RpsBoardProps } from "./useRpsBoard";
import {
  NotebookPage,
  NotebookTopBar,
  NotebookPlayerCard,
  NotebookArena,
  NotebookChoiceRow,
  NotebookHistoryPanel,
  NotebookHistoryStrip,
  NotebookDoodles,
} from "./rps-notebook";

const P1_C = "#2e7d32";
const P2_C = "#8B1A1A";

/**
 * Desktop RPS shell — full notebook / scrapbook aesthetic.
 * Matches the reference design: parchment paper, ruled lines,
 * washi-tape player cards, pencil-box arena, sketch choice cards,
 * history strip with room rail.
 */
export default function RpsBoardDesktop(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  const tut = useTutorialGate(RPS_TUTORIAL.key);
  const showScorecard = m.state.isOver;

  return (
    <NotebookPage className="h-full">
      <NotebookDoodles />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <NotebookTopBar
        match={m.state.matchNumber}
        round={m.state.round}
        target={m.target}
        onLeave={props.onLeave ? props.onLeave : undefined}
        onHelp={() => tut.setOpen(true)}
      />

      {/* ── Main 3-column layout ───────────────────────────────────── */}
      <div
        className="relative grid gap-5 px-6 pt-3 pb-4"
        style={{
          gridTemplateColumns:
            "minmax(180px,0.85fr) minmax(0,2.4fr) minmax(180px,0.85fr)",
          alignItems: "center",
        }}
      >
        {/* ── Player 1 card (left) ── */}
        <NotebookPlayerCard
          name={m.me?.name ?? "You"}
          isSelf
          score={m.myScore}
          target={m.target}
          streak={m.myStreak}
          best={m.state.bestStreak[m.myId] ?? 0}
          matchPoint={m.myMatchPoint && !m.state.isOver}
          color={P1_C}
          tapeColor="green"
          side="left"
          cardRef={m.registerCardRef(m.myId)}
        />

        {/* ── Arena ── */}
        <NotebookArena
          myName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opponent"}
          myChoice={m.arenaMyChoice}
          oppChoice={m.arenaOppChoice}
          bothChose={m.arenaBothChose}
          revealKey={m.revealKey}
          bannerOutcome={m.bannerOutcome}
          myColor={P1_C}
          oppColor={P2_C}
        />

        {/* ── Player 2 card (right) ── */}
        <NotebookPlayerCard
          name={m.opponent?.name ?? "Opponent"}
          score={m.oppScore}
          target={m.target}
          streak={m.oppStreak}
          best={m.opponent ? m.state.bestStreak[m.opponent.id] ?? 0 : 0}
          matchPoint={m.oppMatchPoint && !m.state.isOver}
          color={P2_C}
          tapeColor="red-dots"
          side="right"
          cardRef={m.registerCardRef(m.opponent?.id ?? null)}
        />
      </div>

      {/* ── Turn time warning */}
      <TurnTimeWarning deadline={m.roundDeadline} active={m.iNeedToChoose} />

      {/* ── Bottom section: choice row left + history panel right ──── */}
      <div
        className="grid gap-5 px-6 pb-5"
        style={{
          gridTemplateColumns: "minmax(0,1.55fr) minmax(260px,1fr)",
          alignItems: "start",
        }}
      >
        {/* Choice row — hidden once scorecard is visible */}
        {!showScorecard ? (
          <NotebookChoiceRow
            myChoice={m.myChoice}
            bothChose={m.bothChose}
            onPick={m.pick}
          />
        ) : (
          <div className="h-12" />
        )}

        {/* History + room rail */}
        <NotebookHistoryPanel>
          <NotebookHistoryStrip
            history={m.state.history}
            myId={m.myId}
          />
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(100,115,180,0.20)" }}>
            <InlineRoomRail
              code={m.roomCode}
              game="rps"
              phase={m.roomPhase}
              players={m.players}
              selfId={m.selfId}
              messages={m.messages}
            />
          </div>
        </NotebookHistoryPanel>
      </div>

      {/* Overlays: reactions, emoji rain, confetti */}
      <RpsOverlays
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        rains={m.rains}
        confettiUntil={m.confettiUntil}
      />

      {/* Tutorial */}
      {tut.open && (
        <GameTutorial
          slides={RPS_TUTORIAL.slides}
          storageKey={RPS_TUTORIAL.key}
          accent={RPS_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      {/* Session-end scorecard modal */}
      {showScorecard && (
        <RpsScorecardModal
          state={m.state}
          myId={m.myId}
          myName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opponent"}
          myScore={m.myScore}
          oppScore={m.oppScore}
          onClose={() => props.onScorecardClose?.()}
        />
      )}
    </NotebookPage>
  );
}

import { useState } from "react";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { RPS_TUTORIAL } from "../tutorials";
import { RpsScorecardModal } from "./rps-shared";
import { RpsOverlays } from "./rps-shared";
import { useRpsBoard } from "./useRpsBoard";
import type { RpsBoardProps } from "./useRpsBoard";
import { useSkin } from "../skin";
import { RpsWinnerCelebration } from "./RpsAnimations";
import {
  NotebookPage,
  NotebookTopBar,
  NotebookPlayerCard,
  NotebookArena,
  NotebookChoiceRow,
  NotebookHistoryPanel,
  NotebookHistoryStrip,
  NotebookDoodles,
  PAPER_L,
  BORDER,
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
  // Never over a live round: safe once this player doesn't need to choose,
  // or no round deadline is running — same condition this board already uses
  // for the turn-timer warning (below). See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(RPS_TUTORIAL.key, !m.iNeedToChoose || m.roundDeadline == null);
  const [, setSkin] = useSkin();
  const showScorecard = m.state.isOver;
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

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
        onSkin={() => setSkin("broadcast")}
      />

      {/* Centred, width-capped optical column matching broadcast theme */}
      <div className="mx-auto w-full px-6 py-3 flex flex-col gap-5" style={{ maxWidth: 1180 }}>
        {/* ── Main 3-column layout (Upper deck) ───────────────────────── */}
        <div
          className="relative grid gap-6 items-stretch"
          style={{
            gridTemplateColumns:
              "minmax(220px,1fr) minmax(0,1.55fr) minmax(220px,1fr)",
          }}
        >
          {/* ── Player 1 card (left) ── */}
          <NotebookPlayerCard
            name={m.me?.name ?? "You"}
            avatar={m.me?.avatar}
            isSelf
            score={m.myScore}
            target={m.target}
            streak={m.myStreak}
            best={m.state.bestStreak[m.myId] ?? 0}
            matchPoint={m.myMatchPoint && !m.state.isOver}
            color={P1_C}
            tapeColor="green"
            side="left"
            locked={!!m.myChoice}
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
            avatar={m.opponent?.avatar}
            score={m.oppScore}
            target={m.target}
            streak={m.oppStreak}
            best={m.opponent ? m.state.bestStreak[m.opponent.id] ?? 0 : 0}
            matchPoint={m.oppMatchPoint && !m.state.isOver}
            color={P2_C}
            tapeColor="red-dots"
            side="right"
            locked={!!m.oppChoice}
            cardRef={m.registerCardRef(m.opponent?.id ?? null)}
            targetPlayerId={m.opponent?.id}
            onTarget={(id) => setActiveTargetId(id)}
            activeTargetId={activeTargetId}
            onCloseTarget={() => setActiveTargetId(null)}
          />
        </div>

        {/* ── Turn time warning */}
        <TurnTimeWarning deadline={m.roundDeadline} active={m.iNeedToChoose} />

        {/* ── Bottom section: choice row left + history panel right ──── */}
        <div
          className="grid gap-6 items-stretch"
          style={{
            gridTemplateColumns: "minmax(0,1.55fr) minmax(300px,1fr)",
          }}
        >
          {/* Choice row panel — hidden once scorecard is visible */}
          {!showScorecard ? (
            <div
              className="rounded-xl p-5 flex flex-col justify-center h-full"
              style={{
                background: PAPER_L,
                border: `1.5px solid ${BORDER}`,
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              }}
            >
              <NotebookChoiceRow
                myChoice={m.myChoice}
                bothChose={m.bothChose}
                onPick={m.pick}
              />
            </div>
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


      {m.state.isOver && m.state.winnerId && (
        <RpsWinnerCelebration
          winnerName={m.players.find((p) => p.id === m.state.winnerId)?.name ?? "Winner"}
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

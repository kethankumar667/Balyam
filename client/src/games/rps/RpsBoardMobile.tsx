import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { RPS_TUTORIAL } from "../tutorials";
import { RpsScorecardModal, RpsOverlays } from "./rps-shared";
import { useRpsBoard } from "./useRpsBoard";
import type { RpsBoardProps } from "./useRpsBoard";
import {
  NotebookPage,
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
 * Mobile RPS shell — portrait notebook aesthetic.
 * Vertical single-column layout: title → side-by-side compact score cards →
 * arena → choice row → history + room rail.
 */
export default function RpsBoardMobile(props: RpsBoardProps) {
  const m = useRpsBoard(props);
  const tut = useTutorialGate(RPS_TUTORIAL.key);
  const showScorecard = m.state.isOver;

  return (
    <NotebookPage className="min-h-screen">
      <NotebookDoodles />

      {/* ── Compact top bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-1"
        style={{ position: "relative" }}
      >
        <div>
          <div
            className="font-display font-black leading-tight"
            style={{ color: "#1a2952", fontSize: 15 }}
          >
            Rock · Paper · Scissors
          </div>
          <div className="font-script text-xs" style={{ color: "#4a5a82" }}>
            Match #{m.state.matchNumber}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-baseline gap-1 px-2 py-1 rounded"
            style={{
              background: "#f0e04a",
              border: "1.5px solid rgba(140,120,0,0.4)",
              transform: "rotate(-1.5deg)",
            }}
          >
            <span className="font-script text-[11px] font-bold" style={{ color: "#1a2952" }}>
              Rd
            </span>
            <span className="font-black text-base" style={{ color: "#1a2952" }}>
              #{m.state.round}
            </span>
          </div>
          <span className="text-xs font-bold" style={{ color: "#4a5a82" }}>
            to <span style={{ color: "#c0392b", fontWeight: 900 }}>{m.target}</span>
          </span>
          <TutorialButton onClick={() => tut.setOpen(true)} />
          {props.onLeave && (
            <button
              onClick={props.onLeave}
              className="px-2 py-1 rounded text-xs font-bold"
              style={{
                background: "#FBF5E0",
                border: "1.5px solid rgba(46,40,25,0.5)",
                color: "#1a2952",
              }}
            >
              ← Leave
            </button>
          )}
        </div>
      </div>

      {/* ── Score cards: side-by-side compact ───────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 px-4 pt-2">
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
        <NotebookPlayerCard
          name={m.opponent?.name ?? "Opp"}
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

      {/* ── Arena ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <NotebookArena
          myName={m.me?.name ?? "You"}
          oppName={m.opponent?.name ?? "Opp"}
          myChoice={m.arenaMyChoice}
          oppChoice={m.arenaOppChoice}
          bothChose={m.arenaBothChose}
          revealKey={m.revealKey}
          bannerOutcome={m.bannerOutcome}
          myColor={P1_C}
          oppColor={P2_C}
        />
      </div>

      {/* ── Turn warning ─────────────────────────────────────────────── */}
      <TurnTimeWarning deadline={m.roundDeadline} active={m.iNeedToChoose} />

      {/* ── Choice row ───────────────────────────────────────────────── */}
      {!m.state.isOver && (
        <div className="px-4 pt-4">
          <NotebookChoiceRow
            myChoice={m.myChoice}
            bothChose={m.bothChose}
            onPick={m.pick}
          />
        </div>
      )}

      {/* ── History + room rail ──────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-5">
        <NotebookHistoryPanel>
          <NotebookHistoryStrip
            history={m.state.history}
            myId={m.myId}
          />
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(100,115,180,0.18)" }}>
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

      {/* Reaction / rain / confetti overlays */}
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

      {/* Session-end scorecard */}
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

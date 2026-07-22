import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/cn";
import {
  FingerChoiceButton,
  GamePageShell,
  NotebookSurface,
  OverStrip,
  PremiumCard,
  ScoreHeader,
  StampBadge,
} from "../components";
import { getSelectablePool, getSquad, getTeamRef, playersByIds } from "../data";
import { createInnings, isPowerplay, playBall, type InningsState } from "../innings";
import { useCricketStore } from "../store";
import type { BallOutcome, MatchScore } from "../types";
import {
  AchievementOverlay,
  BallResultOverlay,
  MilestoneOverlay,
  OverSummaryOverlay,
  PowerplayOverlay,
  WicketScreen,
} from "./overlays";
import { BattingOrderSheet } from "./BattingOrderSheet";

type QueuedOverlay =
  | { kind: "powerplay"; overs: number }
  | { kind: "ball"; outcome: BallOutcome }
  | { kind: "wicket"; batterName: string; runs: number; balls: number }
  | { kind: "milestone"; batterName: string; milestone: 50 | 100 }
  | { kind: "achievement"; title: string; description: string }
  | { kind: "overSummary"; over: number; balls: BallOutcome[]; runsInOver: number; scoreLine: string };

const DURATION: Record<QueuedOverlay["kind"], number> = {
  powerplay: 2200,
  ball: 850,
  wicket: 1500,
  milestone: 1700,
  achievement: 2000,
  overSummary: 2200,
};

function ppQueue(innings: InningsState): QueuedOverlay[] {
  return innings.ppOvers > 0 ? [{ kind: "powerplay", overs: innings.ppOvers }] : [];
}

/**
 * Gameplay — the live innings. Score header (with a powerplay badge), the
 * batting pair, the current over strip, and the thumb-first finger buttons.
 * Ball events feed a queue of auto-dismissing callout overlays (boundary,
 * wicket, milestone, achievement, over summary). A batting-order bottom sheet
 * is reachable at any time. Overlays are disabled from blocking for long and
 * respect reduced motion. Works for every format via the innings engine.
 */
export function GameplayPage() {
  const navigate = useNavigate();
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const awayTeamId = useCricketStore((s) => s.awayTeamId);
  const homeXI = useCricketStore((s) => s.homeXI);
  const awayXI = useCricketStore((s) => s.awayXI);
  const tossWinner = useCricketStore((s) => s.tossWinner);
  const tossDecision = useCricketStore((s) => s.tossDecision);
  const format = useCricketStore((s) => s.format);
  const setLastInnings = useCricketStore((s) => s.setLastInnings);

  const battingId = useMemo(() => {
    if (!tossWinner || !tossDecision) return homeTeamId;
    if (tossDecision === "bat") return tossWinner;
    return tossWinner === homeTeamId ? awayTeamId : homeTeamId;
  }, [tossWinner, tossDecision, homeTeamId, awayTeamId]);

  const xi = useMemo(() => {
    const ids = battingId === homeTeamId ? homeXI : awayXI;
    const pool = getSelectablePool(battingId, format);
    const resolved = playersByIds(ids, pool);
    return resolved.length >= 2 ? resolved : getSquad(battingId, format).slice(0, 11);
  }, [battingId, homeTeamId, homeXI, awayXI, format]);

  const battingTeam = getTeamRef(battingId);
  const setup = useMemo(() => createInnings(xi, format), [xi, format]);

  const [innings, setInnings] = useState<InningsState>(setup);
  const [queue, setQueue] = useState<QueuedOverlay[]>(() => ppQueue(setup));
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    if (queue.length === 0) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), DURATION[queue[0].kind]);
    return () => window.clearTimeout(t);
  }, [queue]);

  useEffect(() => {
    if (innings.done) setLastInnings(innings);
  }, [innings, setLastInnings]);

  const pp = isPowerplay(innings);
  const busy = queue.length > 0 || innings.done;

  const score: MatchScore = {
    teamId: battingId,
    runs: innings.runs,
    wickets: innings.wickets,
    overs: innings.oversCompleted,
    balls: innings.ballInOver,
    runRate: innings.oversCompleted + innings.ballInOver / 6 > 0 ? innings.runs / (innings.oversCompleted + innings.ballInOver / 6) : 0,
  };

  const striker = innings.xi[innings.strikerIdx];
  const nonStriker = innings.xi[innings.nonStrikerIdx];

  function onPick(pick: number) {
    if (busy) return;
    const { state, events } = playBall(innings, pick);
    setInnings(state);
    const next: QueuedOverlay[] = [];
    for (const e of events) {
      if (e.kind === "ball" && (e.outcome === "4" || e.outcome === "6")) next.push({ kind: "ball", outcome: e.outcome });
      else if (e.kind === "wicket") next.push({ kind: "wicket", batterName: e.batterName, runs: e.runs, balls: e.balls });
      else if (e.kind === "milestone") next.push({ kind: "milestone", batterName: e.batterName, milestone: e.milestone });
      else if (e.kind === "achievement") next.push({ kind: "achievement", title: e.title, description: e.desc });
      else if (e.kind === "overSummary") {
        const runsInOver = e.balls.reduce((n, o) => n + (o === "W" ? 0 : Number(o)), 0);
        next.push({ kind: "overSummary", over: e.over, balls: e.balls, runsInOver, scoreLine: `${state.runs}/${state.wickets} · ${state.oversCompleted} overs` });
      }
    }
    if (next.length > 0) setQueue((q) => [...q, ...next]);
  }

  function playAgain() {
    const fresh = createInnings(xi, format);
    setInnings(fresh);
    setQueue(ppQueue(fresh));
  }

  const head = queue[0];
  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <GamePageShell
      footer={
        innings.done ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("/cricket/scorecard")}
              className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white shadow-md transition active:scale-95"
            >
              View scorecard
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={playAgain}
                className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] transition active:scale-95"
              >
                Play again
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] transition active:scale-95"
              >
                Exit to home
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="my-2 space-y-3">
        <div className="flex items-center justify-between gap-2">
          {pp && !innings.done ? (
            <span className="rounded-full bg-[#C0392B] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">⚡ Powerplay</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setOrderOpen(true)}
            className="rounded-full border-2 border-[#E4D3AC] bg-[#FFFBF0] px-3 py-1 text-[11px] font-bold text-[#6D4323] active:scale-95"
          >
            Batting order
          </button>
        </div>

        <ScoreHeader battingTeam={battingTeam} score={score} />

        {!innings.done && (
          <PremiumCard className="px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">At the crease</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { p: striker, onStrike: true },
                { p: nonStriker, onStrike: false },
              ].map(({ p, onStrike }) => {
                const s = innings.stats[p.id];
                return (
                  <div key={p.id} className={cn("rounded-xl border px-2.5 py-1.5", onStrike ? "border-[#2E7D32] bg-[#2E7D32]/5" : "border-[#E4D3AC] bg-[#FFFBF0]")}>
                    <p className="truncate text-sm font-bold text-[#3A2210]">
                      {p.name}
                      {onStrike && <span className="ml-1 text-[#2E7D32]" title="On strike">*</span>}
                    </p>
                    <p className="text-[11px] font-semibold text-[#6D4323]/70 tabular-nums">{s.runs} ({s.balls})</p>
                  </div>
                );
              })}
            </div>
          </PremiumCard>
        )}

        <PremiumCard className="px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">This over</p>
            <p className="text-[11px] font-semibold text-[#6D4323]/70">
              {innings.oversLimit - innings.oversCompleted} overs left · {innings.xi.length - 1 - innings.wickets} wkts in hand
            </p>
          </div>
          <div className="mt-2">
            <OverStrip balls={innings.thisOver} />
          </div>
        </PremiumCard>

        <NotebookSurface className="px-4 py-5">
          {innings.done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <StampBadge label="Innings complete" tone="gold" />
              <p className="font-display text-4xl text-[#3A2210]">{innings.runs}/{innings.wickets}</p>
              <p className="text-sm text-[#6D4323]/80">{battingTeam.name} · {innings.oversCompleted}.{innings.ballInOver} overs</p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-semibold text-[#2E7D32]">You are batting — choose your run</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <FingerChoiceButton key={n} value={n} onClick={() => onPick(n)} disabled={busy} />
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-[#6D4323]/60">
                {pp ? "Powerplay — swing freely, no wickets can fall!" : "Match the bowler's hidden number and you're out!"}
              </p>
            </>
          )}
        </NotebookSurface>
      </div>

      {head?.kind === "powerplay" && <PowerplayOverlay overs={head.overs} onDismiss={dismiss} />}
      {head?.kind === "ball" && <BallResultOverlay outcome={head.outcome} onDismiss={dismiss} />}
      {head?.kind === "wicket" && <WicketScreen batterName={head.batterName} runs={head.runs} balls={head.balls} onDismiss={dismiss} />}
      {head?.kind === "milestone" && <MilestoneOverlay batterName={head.batterName} milestone={head.milestone} onDismiss={dismiss} />}
      {head?.kind === "achievement" && <AchievementOverlay title={head.title} description={head.description} onDismiss={dismiss} />}
      {head?.kind === "overSummary" && (
        <OverSummaryOverlay over={head.over} balls={head.balls} runsInOver={head.runsInOver} scoreLine={head.scoreLine} onDismiss={dismiss} />
      )}

      <BattingOrderSheet open={orderOpen} onClose={() => setOrderOpen(false)} innings={innings} />
    </GamePageShell>
  );
}

export default GameplayPage;

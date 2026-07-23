import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, StampBadge, TeamFlagCard } from "../components";
import { getTeamRef } from "../data";
import { buildMatchSummary } from "../matchSummary";
import { useCricketStore } from "../store";
import type { HcTeamId } from "../types";

function ScoreBlock({ teamId, runs, wickets, overs, balls, isWinner }: { teamId: HcTeamId; runs: number; wickets: number; overs: number; balls: number; isWinner: boolean }) {
  const team = getTeamRef(teamId);
  return (
    <PremiumCard className={isWinner ? "border-[#E4B128] px-3 py-4 text-center" : "px-3 py-4 text-center opacity-80"}>
      <TeamFlagCard team={team} size="sm" className="mx-auto" />
      <p className="mt-2 font-display text-2xl text-[#3A2210]">
        {runs}/{wickets}
      </p>
      <p className="text-[11px] font-semibold text-[#6D4323]/70">{overs}.{balls} overs</p>
    </PremiumCard>
  );
}

/**
 * Match Result — the winner reveal. Reads the two real completed innings and
 * derives winner + margin honestly (runs margin for the defending side,
 * wickets-in-hand for a successful chase); a genuine tie shows as a tie, not
 * a coin-flip decision.
 */
export function MatchResultPage() {
  const navigate = useNavigate();
  const first = useCricketStore((s) => s.firstInnings);
  const second = useCricketStore((s) => s.secondInnings);
  const startedAt = useCricketStore((s) => s.matchStartedAt);
  const endedAt = useCricketStore((s) => s.matchEndedAt);

  const summary = useMemo(() => {
    if (!first || !second) return null;
    return buildMatchSummary(first, second, startedAt ?? Date.now(), endedAt ?? Date.now());
  }, [first, second, startedAt, endedAt]);

  if (!first || !second || !summary) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No result yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a full match — both innings — to see the result.</p>
          <button
            type="button"
            onClick={() => navigate("/cricket")}
            className="mt-5 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
          >
            Play a match
          </button>
        </NotebookSurface>
      </GamePageShell>
    );
  }

  const winnerTeam = summary.winner !== "tie" ? getTeamRef(summary.winner) : null;

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/celebration")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white shadow-md transition active:scale-95"
        >
          Continue
        </button>
      }
    >
      <NotebookSurface withSpiral className="my-2 px-5 py-8 text-center">
        <p className="ck-anim-fade-up text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">Match Result</p>

        <div className="ck-anim-stamp mt-3 flex justify-center">
          <StampBadge label={winnerTeam ? "Winner" : "Tied match"} tone={winnerTeam ? "green" : "gold"} />
        </div>

        {winnerTeam && (
          <div className="ck-anim-fade-up mt-5 flex justify-center" style={{ animationDelay: "0.15s" }}>
            <TeamFlagCard team={winnerTeam} size="lg" />
          </div>
        )}

        <p className="ck-anim-fade-up mt-4 font-display text-2xl text-[#3A2210]" style={{ animationDelay: "0.25s" }}>
          {summary.marginText}
        </p>

        <div className="ck-anim-fade-up mt-6 grid grid-cols-2 gap-3" style={{ animationDelay: "0.35s" }}>
          <ScoreBlock teamId={summary.firstTeamId} {...summary.first} isWinner={summary.winner === summary.firstTeamId} />
          <ScoreBlock teamId={summary.secondTeamId} {...summary.second} isWinner={summary.winner === summary.secondTeamId} />
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchResultPage;

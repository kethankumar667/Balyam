import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, TeamFlagCard } from "../components";
import { getTeamRef } from "../data";
import { buildMatchSummary } from "../matchSummary";
import { useCricketStore } from "../store";

/**
 * Match Summary — the compact stat recap: result, both scorelines,
 * Player of the Match, and how long the match actually took to play. Every
 * figure is read straight from the two real completed innings.
 */
export function MatchSummaryPage() {
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
          <h1 className="font-display text-2xl text-[#3A2210]">No summary yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a full match — both innings — to see the summary.</p>
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

  const firstTeam = getTeamRef(summary.firstTeamId);
  const secondTeam = getTeamRef(summary.secondTeamId);

  return (
    <GamePageShell
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate("/cricket/profile")}
            className="w-full rounded-2xl bg-[#2E7D32] py-3 text-sm font-black text-white active:scale-95"
          >
            My profile
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate("/cricket/scorecard")}
              className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
            >
              Full scorecard
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
            >
              Home
            </button>
          </div>
        </div>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <h1 className="text-center font-display text-2xl text-[#3A2210]">Match Summary</h1>
        <p className="mt-1 text-center text-sm font-bold text-[#2E7D32]">{summary.marginText}</p>

        <div className="mt-4 space-y-2">
          {[
            { team: firstTeam, line: summary.first },
            { team: secondTeam, line: summary.second },
          ].map(({ team, line }) => (
            <PremiumCard key={team.id} className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>{team.flag ?? team.short}</span>
                <span className="text-sm font-bold text-[#3A2210]">{team.name}</span>
              </span>
              <span className="font-black tabular-nums text-[#3A2210]">
                {line.runs}/{line.wickets} <span className="text-xs font-semibold text-[#6D4323]/70">({line.overs}.{line.balls})</span>
              </span>
            </PremiumCard>
          ))}
        </div>

        {summary.playerOfMatch && (
          <PremiumCard className="mt-3 flex items-center gap-3 px-3 py-3">
            <TeamFlagCard team={getTeamRef(summary.playerOfMatch.teamId)} size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Player of the Match</p>
              <p className="truncate font-bold text-[#3A2210]">{summary.playerOfMatch.playerName}</p>
              <p className="text-xs text-[#6D4323]/70 tabular-nums">{summary.playerOfMatch.runs} ({summary.playerOfMatch.balls})</p>
            </div>
          </PremiumCard>
        )}

        <p className="mt-4 text-center text-[11px] text-[#6D4323]/60">{summary.durationText}</p>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchSummaryPage;

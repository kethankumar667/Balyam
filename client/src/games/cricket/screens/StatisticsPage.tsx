import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, StatPill, TeamFlagCard } from "../components";
import { deriveCareerStats } from "../careerStats";
import { getTeamRef } from "../data";
import { useHistoryStore } from "../historyStore";

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Statistics — activity totals across every completed match. No fabricated
 * "your win/loss record": the same player picks every ball for whichever
 * side is batting, so these are honest aggregate totals, not a personal
 * record against an opponent (see careerStats.ts and StandingsPage for the
 * per-team record instead).
 */
export function StatisticsPage() {
  const navigate = useNavigate();
  const matches = useHistoryStore((s) => s.matches);
  const stats = useMemo(() => deriveCareerStats(matches), [matches]);

  if (matches.length === 0) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No stats yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a full match to start building your stats.</p>
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

  return (
    <GamePageShell
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate("/cricket/profile")}
            className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
          >
            Profile
          </button>
          <button type="button" onClick={() => navigate("/")} className="rounded-2xl bg-[#2E7D32] py-3 text-sm font-black text-white active:scale-95">
            Home
          </button>
        </div>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <h1 className="text-center font-display text-2xl text-[#3A2210]">Statistics</h1>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatPill label="Matches" value={stats.matchesPlayed} tone="gold" />
          <StatPill label="Ties" value={stats.ties} />
          <StatPill label="Runs" value={stats.totalRuns} tone="green" />
          <StatPill label="Fours" value={stats.totalFours} />
          <StatPill label="Sixes" value={stats.totalSixes} tone="green" />
          <StatPill label="Wickets" value={stats.totalWickets} />
        </div>

        {stats.highestScore && (
          <PremiumCard className="mt-3 flex items-center gap-3 px-3 py-2.5">
            <TeamFlagCard team={getTeamRef(stats.highestScore.teamId)} size="sm" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Highest team score</p>
              <p className="font-black tabular-nums text-[#3A2210]">
                {stats.highestScore.runs}/{stats.highestScore.wickets}
              </p>
            </div>
          </PremiumCard>
        )}

        {stats.biggestWin && (
          <PremiumCard className="mt-2 flex items-center gap-3 px-3 py-2.5">
            <TeamFlagCard team={getTeamRef(stats.biggestWin.winner)} size="sm" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Biggest win (by runs)</p>
              <p className="font-black text-[#3A2210]">{stats.biggestWin.marginText}</p>
            </div>
          </PremiumCard>
        )}

        {stats.mostPlayedTeam && (
          <PremiumCard className="mt-2 flex items-center gap-3 px-3 py-2.5">
            <TeamFlagCard team={getTeamRef(stats.mostPlayedTeam.teamId)} size="sm" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Most played team</p>
              <p className="font-black text-[#3A2210]">{stats.mostPlayedTeam.appearances} appearances</p>
            </div>
          </PremiumCard>
        )}

        <p className="mt-3 text-center text-xs text-[#6D4323]/60">Average match length: {formatDuration(stats.avgDurationSeconds)}</p>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default StatisticsPage;

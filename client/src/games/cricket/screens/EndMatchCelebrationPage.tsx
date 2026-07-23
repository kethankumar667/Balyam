import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, StampBadge, TeamFlagCard, WashiTape } from "../components";
import { getTeamRef } from "../data";
import { buildMatchSummary } from "../matchSummary";
import { useCricketStore } from "../store";

const CONFETTI = ["🎉", "🏏", "🎊", "🏆", "✨", "🎉"];

/**
 * End Match Celebration — the finale. A confetti burst, a polaroid-style
 * snapshot of the final result (washi-taped, matching the notebook art
 * direction), and the three real next actions: full summary, rematch, home.
 */
export function EndMatchCelebrationPage() {
  const navigate = useNavigate();
  const first = useCricketStore((s) => s.firstInnings);
  const second = useCricketStore((s) => s.secondInnings);
  const startedAt = useCricketStore((s) => s.matchStartedAt);
  const endedAt = useCricketStore((s) => s.matchEndedAt);
  const resetMatch = useCricketStore((s) => s.resetMatch);

  const summary = useMemo(() => {
    if (!first || !second) return null;
    return buildMatchSummary(first, second, startedAt ?? Date.now(), endedAt ?? Date.now());
  }, [first, second, startedAt, endedAt]);

  if (!first || !second || !summary) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No match to celebrate yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a full match — both innings — to reach the finale.</p>
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

  function rematch() {
    resetMatch();
    navigate("/cricket/gameplay");
  }

  const winnerTeam = summary.winner !== "tie" ? getTeamRef(summary.winner) : null;

  return (
    <GamePageShell
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate("/cricket/match-summary")}
            className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white shadow-md transition active:scale-95"
          >
            View full summary
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={rematch}
              className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
            >
              Rematch
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
      <div className="my-2 space-y-4">
        <div aria-hidden className="flex justify-center gap-3 text-3xl">
          {CONFETTI.map((glyph, i) => (
            <span key={i} className="ck-anim-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              {glyph}
            </span>
          ))}
        </div>

        <h1 className="text-center font-display text-3xl text-[#3A2210]">Match Complete!</h1>

        <div className="relative">
          <WashiTape className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" rotate={-4} tone="gold" />
          <NotebookSurface withSpiral className="ck-anim-stamp px-5 py-7 text-center shadow-lg">
            <StampBadge label={winnerTeam ? `${winnerTeam.short} won` : "Tied match"} tone={winnerTeam ? "green" : "gold"} />
            {winnerTeam && (
              <div className="mt-4 flex justify-center">
                <TeamFlagCard team={winnerTeam} size="md" />
              </div>
            )}
            <p className="mt-3 text-sm font-bold text-[#6D4323]">{summary.marginText}</p>

            <div className="mt-4 flex justify-center gap-4 text-sm font-black tabular-nums text-[#3A2210]">
              <span>
                {getTeamRef(summary.firstTeamId).short} {summary.first.runs}/{summary.first.wickets}
              </span>
              <span className="text-[#6D4323]/40">·</span>
              <span>
                {getTeamRef(summary.secondTeamId).short} {summary.second.runs}/{summary.second.wickets}
              </span>
            </div>

            {summary.playerOfMatch && (
              <p className="mt-3 text-xs text-[#9A6E1A]">
                🏅 {summary.playerOfMatch.playerName} — {summary.playerOfMatch.runs} ({summary.playerOfMatch.balls})
              </p>
            )}
          </NotebookSurface>
        </div>
      </div>
    </GamePageShell>
  );
}

export default EndMatchCelebrationPage;

import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, StampBadge } from "../components";
import { getTeamRef } from "../data";
import { useHistoryStore, type HistoryMatchRecord } from "../historyStore";

function formatPlayedAt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function HistoryRow({ record }: { record: HistoryMatchRecord }) {
  const first = getTeamRef(record.firstTeamId);
  const second = getTeamRef(record.secondTeamId);
  const winnerTeam = record.winner !== "tie" ? getTeamRef(record.winner) : null;

  return (
    <PremiumCard className="px-3.5 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">{formatPlayedAt(record.playedAt)}</p>
        <StampBadge label={winnerTeam ? `${winnerTeam.short} won` : "Tied"} tone={winnerTeam ? "green" : "gold"} rotate={-4} className="text-[9px] px-2 py-0.5" />
      </div>
      <div className="mt-2 space-y-1">
        {[
          { team: first, line: record.first },
          { team: second, line: record.second },
        ].map(({ team, line }) => (
          <div key={team.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-bold text-[#3A2210]">
              <span aria-hidden>{team.flag ?? team.short}</span>
              {team.name}
            </span>
            <span className="font-black tabular-nums text-[#3A2210]">
              {line.runs}/{line.wickets} <span className="text-[11px] font-semibold text-[#6D4323]/60">({line.overs}.{line.balls})</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-[#2E7D32]">{record.marginText}</p>
      {record.playerOfMatch && (
        <p className="mt-1 text-[11px] text-[#6D4323]/70">
          🏅 {record.playerOfMatch.playerName} — {record.playerOfMatch.runs} ({record.playerOfMatch.balls})
        </p>
      )}
    </PremiumCard>
  );
}

/**
 * Match History — every completed match, persisted to localStorage (see
 * historyStore.ts) so it survives reloads. Only a lightweight summary per
 * match is kept, not the full ball-by-ball log — an honest limitation, not
 * a fabrication: there is no replay/full-scorecard view for past matches.
 */
export function MatchHistoryPage() {
  const navigate = useNavigate();
  const matches = useHistoryStore((s) => s.matches);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  function onClear() {
    if (window.confirm("Clear all match history? This can't be undone.")) clearHistory();
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
      <div className="my-2 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h1 className="font-display text-2xl text-[#3A2210]">Match History</h1>
          {matches.length > 0 && (
            <button type="button" onClick={onClear} className="text-xs font-bold text-[#C0392B] underline underline-offset-2">
              Clear
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <NotebookSurface withSpiral className="px-5 py-10 text-center">
            <h2 className="font-display text-xl text-[#3A2210]">No matches yet</h2>
            <p className="mt-2 text-sm text-[#6D4323]/80">Every full match you finish is saved here.</p>
            <button
              type="button"
              onClick={() => navigate("/cricket")}
              className="mt-5 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
            >
              Play a match
            </button>
          </NotebookSurface>
        ) : (
          <div className="space-y-2.5">
            {matches.map((m) => (
              <HistoryRow key={m.id} record={m} />
            ))}
          </div>
        )}
      </div>
    </GamePageShell>
  );
}

export default MatchHistoryPage;

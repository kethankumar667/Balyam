import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, StatPill, TeamFlagCard } from "../components";
import { deriveCareerStats } from "../careerStats";
import { getTeamRef } from "../data";
import { useHistoryStore } from "../historyStore";

/**
 * Profile — the meta hub. Headline totals plus the most recent matches, with
 * links out to the full History, Statistics and Standings screens. All real
 * data from the persisted match history (historyStore.ts).
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const matches = useHistoryStore((s) => s.matches);
  const stats = useMemo(() => deriveCareerStats(matches), [matches]);
  const recent = matches.slice(0, 3);

  return (
    <GamePageShell footer={<button type="button" onClick={() => navigate("/")} className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white active:scale-95">Home</button>}>
      <div className="my-2 space-y-3">
        <NotebookSurface withSpiral className="px-5 py-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">Bhalyam Cricket</p>
          <h1 className="mt-1 font-display text-3xl text-[#3A2210]">Your Profile</h1>
          {stats.mostPlayedTeam ? (
            <div className="mt-4 flex justify-center">
              <TeamFlagCard team={getTeamRef(stats.mostPlayedTeam.teamId)} size="lg" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6D4323]/70">No matches played yet.</p>
          )}
        </NotebookSurface>

        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Matches" value={stats.matchesPlayed} tone="gold" />
          <StatPill label="Runs" value={stats.totalRuns} tone="green" />
          <StatPill label="Sixes" value={stats.totalSixes} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "History", to: "/cricket/history" },
            { label: "Statistics", to: "/cricket/statistics" },
            { label: "Standings", to: "/cricket/standings" },
            { label: "Stickers", to: "/cricket/stickers" },
            { label: "Encyclopedia", to: "/cricket/encyclopedia" },
            { label: "Daily Challenge", to: "/cricket/daily-challenge" },
          ].map((link) => (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-xs font-black text-[#6D4323] active:scale-95"
            >
              {link.label}
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <div>
            <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Recent matches</p>
            <div className="mt-2 space-y-2">
              {recent.map((m) => {
                const first = getTeamRef(m.firstTeamId);
                const second = getTeamRef(m.secondTeamId);
                return (
                  <PremiumCard key={m.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between text-sm font-bold text-[#3A2210]">
                      <span>
                        {first.short} {m.first.runs}/{m.first.wickets} · {second.short} {m.second.runs}/{m.second.wickets}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[#2E7D32]">{m.marginText}</p>
                  </PremiumCard>
                );
              })}
            </div>
            <button type="button" onClick={() => navigate("/cricket/history")} className="mt-2 w-full text-center text-xs font-bold text-[#9A6E1A] underline underline-offset-2">
              View all history
            </button>
          </div>
        )}
      </div>
    </GamePageShell>
  );
}

export default ProfilePage;

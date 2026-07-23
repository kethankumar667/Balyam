import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, StampBadge, TeamFlagCard } from "../components";
import { FORMATS, getTeamRef } from "../data";
import { isChallengeCompletedToday, todaysChallenge } from "../dailyChallenge";
import { useHistoryStore } from "../historyStore";
import { useCricketStore } from "../store";

/**
 * Daily Challenge — a deterministic, date-seeded matchup (no backend: today's
 * pairing is derived purely from the calendar date, so it's the same for
 * everyone and reproducible). "Completed today" is derived by checking real
 * match history for a finished match today with this exact pairing — not a
 * separate flag that could drift out of sync.
 */
export function DailyChallengePage() {
  const navigate = useNavigate();
  const challenge = useMemo(() => todaysChallenge(), []);
  const matches = useHistoryStore((s) => s.matches);
  const completed = useMemo(() => isChallengeCompletedToday(matches, challenge), [matches, challenge]);

  const setCategory = useCricketStore((s) => s.setCategory);
  const setFormat = useCricketStore((s) => s.setFormat);
  const setTeams = useCricketStore((s) => s.setTeams);

  const teamA = getTeamRef(challenge.teamA);
  const teamB = getTeamRef(challenge.teamB);
  const formatLabel = FORMATS.find((f) => f.id === challenge.format)?.label ?? challenge.format;

  function play() {
    setCategory(challenge.category);
    setFormat(challenge.format);
    setTeams(challenge.teamA, challenge.teamB);
    navigate("/cricket/playing-xi");
  }

  return (
    <GamePageShell
      footer={
        <div className="space-y-2">
          <button type="button" onClick={play} className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white shadow-md active:scale-95">
            {completed ? "Play again" : "Play today's challenge"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/cricket/profile")}
            className="w-full rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
          >
            Back to profile
          </button>
        </div>
      }
    >
      <NotebookSurface withSpiral className="my-2 px-5 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">Today's Challenge</p>
        <p className="mt-1 text-xs text-[#6D4323]/60">{challenge.dateKey}</p>

        {completed && (
          <div className="mt-3 flex justify-center">
            <StampBadge label="Completed today" tone="green" />
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-4">
          <TeamFlagCard team={teamA} size="md" />
          <span className="font-display text-2xl text-[#9A6E1A]">vs</span>
          <TeamFlagCard team={teamB} size="md" />
        </div>

        <p className="mt-4 text-sm font-bold text-[#6D4323]">{formatLabel} · {challenge.category === "international" ? "International" : "IPL"}</p>
        <p className="mt-2 text-xs text-[#6D4323]/60">Same matchup for every player today — resets tomorrow.</p>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default DailyChallengePage;

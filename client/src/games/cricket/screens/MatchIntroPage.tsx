import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, StampBadge, TeamFlagCard, WashiTape } from "../components";
import { getTeamRef, FORMATS } from "../data";
import { useCricketStore } from "../store";

/**
 * Match Intro — the premium versus screen. Both crests, format, toss outcome,
 * and a clear "who bats first" line, then Start Match into gameplay.
 */
export function MatchIntroPage() {
  const navigate = useNavigate();
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const awayTeamId = useCricketStore((s) => s.awayTeamId);
  const tossWinner = useCricketStore((s) => s.tossWinner);
  const tossDecision = useCricketStore((s) => s.tossDecision);
  const format = useCricketStore((s) => s.format);

  const home = getTeamRef(homeTeamId);
  const away = getTeamRef(awayTeamId);
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? format.toUpperCase();

  const battingFirst =
    tossWinner && tossDecision
      ? tossDecision === "bat"
        ? tossWinner
        : tossWinner === homeTeamId
          ? awayTeamId
          : homeTeamId
      : homeTeamId;

  return (
    <GamePageShell
      contentClassName="justify-center"
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/gameplay")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-lg font-black text-white shadow-md transition active:scale-95"
        >
          Start Match
        </button>
      }
    >
      <NotebookSurface withSpiral className="relative px-5 py-8 text-center">
        <WashiTape className="left-6 top-2" rotate={-6} />
        <WashiTape className="right-6 top-2" rotate={6} tone="green" />

        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">{formatLabel} Match</p>

        <div className="mt-6 flex items-center justify-around gap-2">
          <TeamFlagCard team={home} size="lg" />
          <span className="font-display text-4xl text-[#C0392B]">vs</span>
          <TeamFlagCard team={away} size="lg" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          {tossWinner && tossDecision && (
            <StampBadge
              label={`${getTeamRef(tossWinner).short} won toss · ${tossDecision === "bat" ? "batting" : "bowling"}`}
              tone="gold"
            />
          )}
          <p className="text-sm font-semibold text-[#6D4323]">
            <span className="font-black" style={{ color: getTeamRef(battingFirst).color }}>
              {getTeamRef(battingFirst).name}
            </span>{" "}
            will bat first
          </p>
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchIntroPage;

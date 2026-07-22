import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { GamePageShell, NotebookSurface, PlayerCard, PremiumCard } from "../components";
import { FORMATS, getExtras, getSquad, getTeamRef } from "../data";
import { useCricketStore } from "../store";

const XI_SIZE = 11;

/**
 * Playing XI — build your side's eleven from the real squad plus the legends
 * pool, name a captain, and see the bench form from whoever you leave out.
 * Validation (exactly 11, at least one keeper, a captain in the XI) is explicit
 * and drives the disabled Continue state. Real roster data only.
 */
export function PlayingXIPage() {
  const navigate = useNavigate();
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const format = useCricketStore((s) => s.format);
  const homeXI = useCricketStore((s) => s.homeXI);
  const setHomeXI = useCricketStore((s) => s.setHomeXI);

  const team = getTeamRef(homeTeamId);
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? format.toUpperCase();
  const squad = useMemo(() => getSquad(homeTeamId, format), [homeTeamId, format]);
  const extras = useMemo(() => getExtras(homeTeamId, format), [homeTeamId, format]);
  const pool = useMemo(() => [...squad, ...extras], [squad, extras]);

  const [selected, setSelected] = useState<string[]>(() => (homeXI.length ? homeXI : squad.slice(0, XI_SIZE).map((p) => p.id)));
  const [captainId, setCaptainId] = useState<string | null>(() => {
    const initial = homeXI.length ? homeXI : squad.slice(0, XI_SIZE).map((p) => p.id);
    const cap = pool.find((p) => p.isCaptain && initial.includes(p.id));
    return cap?.id ?? null;
  });

  const selectedSet = new Set(selected);
  const keeperCount = pool.filter((p) => selectedSet.has(p.id) && p.role === "WK").length;
  const full = selected.length >= XI_SIZE;

  const problem =
    selected.length !== XI_SIZE
      ? `Pick ${XI_SIZE} players (${selected.length}/${XI_SIZE})`
      : keeperCount === 0
        ? "Add at least one wicket-keeper"
        : !captainId
          ? "Choose a captain"
          : null;

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (captainId === id) setCaptainId(null);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= XI_SIZE) return prev;
      return [...prev, id];
    });
  }

  function onContinue() {
    if (problem) return;
    setHomeXI(selected);
    navigate("/cricket/toss");
  }

  const benchPlayers = pool.filter((p) => !selectedSet.has(p.id));

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={onContinue}
          disabled={problem != null}
          className={cn(
            "w-full rounded-2xl py-3.5 text-lg font-black text-white shadow-md transition active:scale-95",
            problem ? "bg-[#9CA3AF] opacity-60 cursor-not-allowed" : "bg-[#2E7D32]",
          )}
        >
          {problem ?? "Confirm XI"}
        </button>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden>{team.flag ?? team.short}</span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl leading-tight text-[#3A2210]">{team.name}</h1>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A6E1A]">Pick your XI · {formatLabel}</p>
            </div>
          </div>
          <span
            className={cn(
              "flex-none rounded-full px-3 py-1 text-sm font-black tabular-nums",
              selected.length === XI_SIZE ? "bg-[#2E7D32] text-white" : "bg-[#F7E8C4] text-[#6D4323] border border-[#E4B128]",
            )}
            aria-live="polite"
          >
            {selected.length}/{XI_SIZE}
          </span>
        </header>

        <section className="mt-4" aria-label="Squad">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Squad</h2>
          <ul className="space-y-2">
            {squad.map((p) => (
              <li key={p.id}>
                <PlayerCard
                  player={p}
                  selected={selectedSet.has(p.id)}
                  captain={captainId === p.id}
                  disabled={!selectedSet.has(p.id) && full}
                  onToggle={() => toggle(p.id)}
                  onSetCaptain={() => setCaptainId(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        {extras.length > 0 && (
          <section className="mt-4" aria-label="Legends pool">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Legends</h2>
            <ul className="space-y-2">
              {extras.map((p) => (
                <li key={p.id}>
                  <PlayerCard
                    player={p}
                    selected={selectedSet.has(p.id)}
                    captain={captainId === p.id}
                    disabled={!selectedSet.has(p.id) && full}
                    onToggle={() => toggle(p.id)}
                    onSetCaptain={() => setCaptainId(p.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <PremiumCard className="mt-4 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Bench ({benchPlayers.length})</p>
          <p className="mt-1 text-sm text-[#6D4323]/80">
            {benchPlayers.length === 0 ? "No one benched." : benchPlayers.map((p) => p.name).join(", ")}
          </p>
        </PremiumCard>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default PlayingXIPage;

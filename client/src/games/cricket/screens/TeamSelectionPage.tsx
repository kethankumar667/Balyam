import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { CollectibleCountryCard, GamePageShell, GameTabs, NotebookSurface } from "../components";
import { CATEGORIES, FORMATS, listTeams } from "../data";
import { useCricketStore } from "../store";
import type { HcCategory, HcFormat, HcTeamId } from "../types";

/**
 * Team Selection — choose the category (International or IPL), the format
 * (T20 / ODI / Test) and the two teams, all from the real shared roster. Teams
 * are collectible postcards; tap to fill slot A (your side) then B. Continue is
 * disabled until two different teams are chosen.
 */
export function TeamSelectionPage() {
  const navigate = useNavigate();
  const store = useCricketStore();

  const [category, setCategory] = useState<HcCategory>(store.category);
  const [format, setFormat] = useState<HcFormat>(store.format);
  const [slotA, setSlotA] = useState<HcTeamId | null>(store.homeTeamId);
  const [slotB, setSlotB] = useState<HcTeamId | null>(store.awayTeamId);

  const teams = useMemo(() => listTeams(category), [category]);

  function onCategory(next: HcCategory) {
    if (next === category) return;
    setCategory(next);
    setSlotA(null);
    setSlotB(null);
  }

  function onTeam(id: HcTeamId) {
    if (slotA === id) return setSlotA(null);
    if (slotB === id) return setSlotB(null);
    if (!slotA) return setSlotA(id);
    if (!slotB) return setSlotB(id);
    return setSlotB(id);
  }

  function slotBadge(id: HcTeamId): string | null {
    if (slotA === id) return "A";
    if (slotB === id) return "B";
    return null;
  }

  const canContinue = slotA != null && slotB != null && slotA !== slotB;

  function onContinue() {
    if (!canContinue || slotA == null || slotB == null) return;
    store.setCategory(category);
    store.setFormat(format);
    store.setTeams(slotA, slotB);
    navigate("/cricket/playing-xi");
  }

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className={cn(
            "w-full rounded-2xl py-3.5 text-lg font-black text-white shadow-md transition active:scale-95",
            canContinue ? "bg-[#2E7D32]" : "bg-[#9CA3AF] opacity-60 cursor-not-allowed",
          )}
        >
          {canContinue ? "Continue" : "Pick two teams"}
        </button>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <header className="text-center">
          <h1 className="font-display text-3xl text-[#3A2210]">Choose Your Teams</h1>
          <p className="mt-1 text-sm text-[#6D4323]/80">Category, format, and your two sides.</p>
        </header>

        <div className="mt-4 flex justify-center">
          <GameTabs
            ariaLabel="Team category"
            tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
            value={category}
            onChange={onCategory}
          />
        </div>

        <div className="mt-3" role="group" aria-label="Match format">
          <div className="flex justify-center gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                aria-pressed={format === f.id}
                className={cn(
                  "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition active:scale-95",
                  format === f.id ? "border-[#E4B128] bg-[#E4B128] text-[#3A2210]" : "border-[#E4D3AC] bg-[#FFFBF0] text-[#6D4323]",
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-70">{f.overs} ov</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {teams.map((team) => (
            <CollectibleCountryCard
              key={team.id}
              team={team}
              selected={slotA === team.id || slotB === team.id}
              slotBadge={slotBadge(team.id)}
              onClick={() => onTeam(team.id)}
            />
          ))}
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default TeamSelectionPage;

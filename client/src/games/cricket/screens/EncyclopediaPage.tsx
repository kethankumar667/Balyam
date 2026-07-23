import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, GameTabs, NotebookSurface, PlayerCard, TeamFlagCard } from "../components";
import { CATEGORIES, FORMATS, getExtras, getSquad, getTeamRef, listTeams } from "../data";
import type { HcCategory, HcFormat, HcTeamId } from "../types";

/**
 * Encyclopedia — a browsable reference of every real team and player in the
 * shared roster (International + IPL, all formats). No mock data: every
 * name, role and squad here is exactly what the game itself plays with.
 */
export function EncyclopediaPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<HcCategory>("international");
  const [format, setFormat] = useState<HcFormat>("t20");
  const [teamId, setTeamId] = useState<HcTeamId | null>(null);

  const teams = useMemo(() => listTeams(category), [category]);
  const squad = useMemo(() => (teamId ? getSquad(teamId, format) : []), [teamId, format]);
  const extras = useMemo(() => (teamId ? getExtras(teamId, format) : []), [teamId, format]);
  const team = teamId ? getTeamRef(teamId) : null;

  if (team) {
    return (
      <GamePageShell
        footer={
          <button type="button" onClick={() => setTeamId(null)} className="w-full rounded-2xl bg-[#2E7D32] py-3 text-sm font-black text-white active:scale-95">
            Back to teams
          </button>
        }
      >
        <NotebookSurface className="my-2 px-4 py-5">
          <div className="flex items-center gap-3">
            <TeamFlagCard team={team} size="md" />
            <div>
              <h1 className="font-display text-2xl text-[#3A2210]">{team.name}</h1>
              <p className="text-xs font-semibold text-[#6D4323]/70">{squad.length + extras.length} real players</p>
            </div>
          </div>

          {category === "international" && (
            <div className="mt-4 flex justify-center">
              <GameTabs ariaLabel="Format" tabs={FORMATS.map((f) => ({ id: f.id, label: f.label }))} value={format} onChange={setFormat} />
            </div>
          )}

          <p className="mt-4 px-1 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Squad</p>
          <div className="mt-2 space-y-1.5">
            {squad.map((p) => (
              <PlayerCard key={p.id} player={p} captain={p.isCaptain} />
            ))}
          </div>

          {extras.length > 0 && (
            <>
              <p className="mt-4 px-1 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Legends &amp; Extras</p>
              <div className="mt-2 space-y-1.5">
                {extras.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </>
          )}
        </NotebookSurface>
      </GamePageShell>
    );
  }

  return (
    <GamePageShell
      footer={
        <button type="button" onClick={() => navigate("/cricket/profile")} className="w-full rounded-2xl bg-[#2E7D32] py-3 text-sm font-black text-white active:scale-95">
          Back to profile
        </button>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <h1 className="text-center font-display text-2xl text-[#3A2210]">Encyclopedia</h1>
        <p className="mt-1 text-center text-sm text-[#6D4323]/80">Every real team and player.</p>

        <div className="mt-4 flex justify-center">
          <GameTabs ariaLabel="Category" tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} value={category} onChange={setCategory} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {teams.map((t) => (
            <TeamFlagCard key={t.id} team={t} size="sm" onClick={() => setTeamId(t.id)} />
          ))}
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default EncyclopediaPage;

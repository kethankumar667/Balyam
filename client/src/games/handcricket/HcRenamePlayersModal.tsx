import { useMemo, useState } from "react";
import type { HcFormat, HcState } from "@shared/types";
import { getRosterFor as getSharedRosterFor, type HcPlayerProfile } from "@shared/hc-rosters";
import Modal from "../../components/Modal";
import { getJsonPlayersRaw } from "./hc-json-data";
import {
  HC_CUSTOM_NAME_MAX_LENGTH,
  clearAllCustomNames,
  clearCustomName,
  customNameFor,
  setCustomName,
  useCustomNames,
} from "./hc-custom-names";

/**
 * "Rename players": the answer to "I can't tell which one is my favourite".
 *
 * Players type the names they want to see for any player on the two squads.
 * The names are kept on this device and shown only on this player's screen —
 * see hc-custom-names.ts for why nothing is sent to the server.
 */

const ROLE_ORDER: Record<HcPlayerProfile["role"], number> = { batter: 0, allrounder: 1, keeper: 2, bowler: 3 };
const ROLE_LABEL: Record<HcPlayerProfile["role"], string> = {
  batter: "Batter",
  allrounder: "All-rounder",
  keeper: "Keeper",
  bowler: "Bowler",
};

interface EditablePlayer {
  /** The shipped name — the key a custom name is stored under. */
  original: string;
  role: HcPlayerProfile["role"];
}

/** Every player on a team's squad and legends list, with the shipped (not renamed) names. */
export function listEditablePlayers(teamId: string, format: HcFormat): EditablePlayer[] {
  const roster = getSharedRosterFor(teamId, format);
  const fromRoster = roster ? [...roster.squad, ...roster.extras] : [];
  const players: EditablePlayer[] =
    fromRoster.length > 0
      ? fromRoster.map((p) => ({ original: p.name, role: p.role }))
      : getJsonPlayersRaw(teamId, format).map((j) => ({
          original: j.name,
          role: j.isWicketKeeper ? "keeper" : j.isAllRounder ? "allrounder" : j.isBowler ? "bowler" : "batter",
        }));
  return players.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}

function teamLabel(teamId: string, format: HcFormat): string {
  const roster = getSharedRosterFor(teamId, format);
  return roster?.teamName ?? teamId;
}

export function HcRenamePlayersModal({
  open,
  onClose,
  state,
  selfId,
}: {
  open: boolean;
  onClose: () => void;
  state: HcState;
  selfId: string;
}) {
  const format = state.options.format;
  const teamIds = useMemo(() => {
    const own = state.teamSelections[selfId]?.teamId ?? null;
    const others = Object.entries(state.teamSelections)
      .filter(([pid]) => pid !== selfId)
      .map(([, sel]) => sel?.teamId ?? null);
    const ids = [own, ...others].filter((id): id is NonNullable<typeof id> => !!id);
    return Array.from(new Set(ids));
  }, [state.teamSelections, selfId]);

  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const customNames = useCustomNames();

  const shownTeam = activeTeam && teamIds.includes(activeTeam as never) ? activeTeam : (teamIds[0] ?? null);
  const players = useMemo(
    () => (shownTeam ? listEditablePlayers(shownTeam, format) : []),
    [shownTeam, format],
  );
  const everyone = useMemo(
    () => teamIds.flatMap((id) => listEditablePlayers(id, format)),
    [teamIds, format],
  );

  const visible = players.filter((p) => {
    const q = query.trim().toLowerCase();
    return !q || p.original.toLowerCase().includes(q) || customNameFor(p.original).toLowerCase().includes(q);
  });

  const commit = (p: EditablePlayer) => {
    const draft = drafts[p.original];
    if (draft === undefined) return;
    const taken = new Set(
      everyone.filter((o) => o.original !== p.original).map((o) => customNameFor(o.original).toLowerCase()),
    );
    // A name another player ships with is taken even when that player is not renamed.
    for (const o of everyone) if (o.original !== p.original) taken.add(o.original.toLowerCase());
    const res = setCustomName(p.original, draft, taken);
    setErrors((e) => {
      const { [p.original]: _gone, ...rest } = e;
      return res.ok ? rest : { ...rest, [p.original]: res.error };
    });
    if (res.ok) {
      setDrafts((d) => {
        const { [p.original]: _gone, ...rest } = d;
        return rest;
      });
    }
  };

  const reset = (p: EditablePlayer) => {
    clearCustomName(p.original);
    setDrafts((d) => {
      const { [p.original]: _gone, ...rest } = d;
      return rest;
    });
    setErrors((e) => {
      const { [p.original]: _gone, ...rest } = e;
      return rest;
    });
  };

  const renamedCount = Object.keys(customNames).length;

  return (
    <Modal open={open} onClose={onClose} ariaLabelledBy="hc-rename-title" mobileSheet zIndex={80}>
      <div className="mx-auto flex max-h-[85vh] w-[min(94vw,640px)] flex-col gap-3 rounded-3xl border border-amber-200 bg-[#FFFBF2] p-4 text-stone-900 shadow-2xl">
        <div>
          <h2 id="hc-rename-title" className="text-lg font-black">
            Rename players
          </h2>
          <p className="text-xs text-stone-600">
            Type the names you want to see. They are saved on this device and only you will see them. Your XI selection
            may reset when a name changes.
          </p>
        </div>

        {teamIds.length === 0 ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Pick your team first, then you can rename its players here.
          </p>
        ) : (
          <>
            {teamIds.length > 1 && (
              <div role="tablist" aria-label="Team" className="flex gap-2">
                {teamIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={id === shownTeam}
                    onClick={() => setActiveTeam(id)}
                    className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-bold ${
                      id === shownTeam ? "border-amber-600 bg-amber-100" : "border-stone-300 bg-white"
                    }`}
                  >
                    {teamLabel(id, format)}
                  </button>
                ))}
              </div>
            )}

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players"
              aria-label="Search players"
              className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-sm"
            />

            <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1" aria-label="Players">
              {visible.map((p) => {
                const isCustom = p.original.toLowerCase() in customNames;
                const value = drafts[p.original] ?? customNameFor(p.original);
                const error = errors[p.original];
                return (
                  <li key={p.original} className="rounded-xl border border-stone-200 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-[11px] font-bold uppercase text-stone-500">
                        {ROLE_LABEL[p.role]}
                      </span>
                      <input
                        type="text"
                        value={value}
                        maxLength={HC_CUSTOM_NAME_MAX_LENGTH}
                        aria-label={`Display name for ${p.original}`}
                        aria-invalid={error ? true : undefined}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.original]: e.target.value }))}
                        onBlur={() => commit(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit(p);
                        }}
                        className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-stone-300 px-2 text-sm"
                      />
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => reset(p)}
                          aria-label={`Reset ${p.original} to the original name`}
                          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-stone-300 text-sm"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {isCustom && <p className="mt-1 pl-[88px] text-[11px] text-stone-500">Originally {p.original}</p>}
                    {error && (
                      <p role="alert" className="mt-1 pl-[88px] text-xs font-semibold text-red-700">
                        {error}
                      </p>
                    )}
                  </li>
                );
              })}
              {visible.length === 0 && <li className="p-3 text-sm text-stone-500">No players match your search.</li>}
            </ul>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              clearAllCustomNames();
              setDrafts({});
              setErrors({});
            }}
            disabled={renamedCount === 0}
            className="min-h-[44px] flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold disabled:opacity-40"
          >
            Reset all names
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl bg-stone-900 px-3 text-sm font-bold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { HcState } from "@shared/types";
import {
  evaluateSquadComposition,
  getRosterFor,
  type HcCompositionReport,
  type HcPlayerProfile,
} from "@shared/hc-rosters";
import { getJsonPlayerStyleMap, getJsonPlayers, getJsonTeamMeta, type JsonPlayerStyle } from "./hc-json-data";
import { getSocket } from "../../lib/socket";

/**
 * Squad-selection logic, lifted out of the presentation.
 *
 * WHY A HOOK: picking an XI is the one genuinely stateful screen in Hand
 * Cricket — a JSON-declared default XI, a roster fallback when the shared
 * squad pool is empty, auto-derived captain/vice-captain, and live composition
 * validation. With two skins to render it, that logic must live in exactly one
 * place or the two will drift apart in ways only a player notices. Same split
 * the RPS board already uses (`useRpsBoard` + two presentational shells).
 */

const ROLE_ORDER: Record<HcPlayerProfile["role"], number> = {
  batter: 0,
  allrounder: 1,
  keeper: 2,
  bowler: 3,
};

export interface HcSquadModel {
  /** Null when the team has no resolvable roster — callers should render an error. */
  ok: boolean;
  teamName: string;
  teamShort: string;
  /** Role-sorted main squad. */
  squad: HcPlayerProfile[];
  /** Role-sorted legends / extras pool. */
  extras: HcPlayerProfile[];
  /** The selected XI, role-sorted. */
  xi: HcPlayerProfile[];
  /** Squad members not in the XI. */
  bench: HcPlayerProfile[];
  /** Extras not in the XI. */
  legendsBench: HcPlayerProfile[];
  selected: Set<string>;
  captainId: string | null;
  viceCaptainId: string | null;
  composition: HcCompositionReport;
  /** Batting/bowling style strings keyed by lowercase player name. */
  styleMap: Map<string, JsonPlayerStyle>;
  coach: string;
  homeCity: string;
  canConfirm: boolean;
  toggle: (id: string) => void;
  setCaptain: (id: string) => void;
  setViceCaptain: (id: string) => void;
  confirm: () => void;
}

export function useHcSquad(state: HcState, selfId: string): HcSquadModel | null {
  const mySelection = state.teamSelections[selfId];
  const myTeamId = mySelection?.teamId ?? null;
  const format = state.options.format;

  const roster = useMemo(
    () => (myTeamId ? getRosterFor(myTeamId, format) : null),
    [myTeamId, format],
  );

  /**
   * The shared roster pool is empty server-side for some teams (Bangladesh,
   * Afghanistan), so the canonical JSON in ./data is the fallback source of
   * truth. Without this the picker renders an empty XI for those teams.
   */
  const jsonPlayers = useMemo(
    () => (myTeamId ? getJsonPlayers(myTeamId, format) : []),
    [myTeamId, format],
  );

  const rosterToUse = useMemo(() => {
    if (!roster) return null;
    if (roster.squad.length > 0 || jsonPlayers.length === 0) return roster;
    const squad: HcPlayerProfile[] = jsonPlayers.map((j) => ({
      id: j.id,
      name: j.name,
      role: j.isWicketKeeper
        ? ("keeper" as const)
        : j.isAllRounder
        ? ("allrounder" as const)
        : j.isBowler
        ? ("bowler" as const)
        : ("batter" as const),
    }));
    return { ...roster, squad, extras: [] };
  }, [roster, jsonPlayers]);

  const jsonMeta = useMemo(
    () => (myTeamId ? getJsonTeamMeta(myTeamId, format) : null),
    [myTeamId, format],
  );

  const sortedSquad = useMemo(
    () => (rosterToUse ? rosterToUse.squad.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) : []),
    [rosterToUse],
  );
  const sortedExtras = useMemo(
    () => (rosterToUse ? rosterToUse.extras.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) : []),
    [rosterToUse],
  );

  const profilesById = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.id, p);
    for (const p of sortedExtras) m.set(p.id, p);
    return m;
  }, [sortedSquad, sortedExtras]);

  /** Name-keyed (lowercase) so the JSON's plain-string XI/captain lists resolve. */
  const profilesByName = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.name.toLowerCase(), p);
    for (const p of sortedExtras) m.set(p.name.toLowerCase(), p);
    return m;
  }, [sortedSquad, sortedExtras]);

  const styleMap = useMemo(
    () => (myTeamId ? getJsonPlayerStyleMap(myTeamId, format) : new Map<string, JsonPlayerStyle>()),
    [myTeamId, format],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  /**
   * Seed the XI once the roster resolves. Runs as an effect rather than a lazy
   * initializer because `rosterToUse` depends on async-ish JSON lookups that
   * are not available on the very first render for every team.
   */
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || sortedSquad.length === 0) return;
    if (jsonMeta && jsonMeta.playingXI.length > 0) {
      const ids = jsonMeta.playingXI
        .map((name) => profilesByName.get(name.toLowerCase()))
        .filter((p): p is HcPlayerProfile => p !== undefined)
        .map((p) => p.id);
      if (ids.length === 11) {
        setSelected(new Set(ids));
        setSeeded(true);
        return;
      }
    }
    setSelected(new Set(sortedSquad.slice(0, 11).map((p) => p.id)));
    setSeeded(true);
  }, [seeded, sortedSquad, jsonMeta, profilesByName]);

  // Drop a captain/VC that just left the XI.
  useEffect(() => {
    if (captainId && !selected.has(captainId)) setCaptainId(null);
    if (viceCaptainId && !selected.has(viceCaptainId)) setViceCaptainId(null);
  }, [selected, captainId, viceCaptainId]);

  // Auto-derive captain + VC: JSON's declared pair when both are in the XI,
  // otherwise the roster's tagged captain, otherwise the first all-rounder or
  // batter by role order.
  useEffect(() => {
    if (captainId || viceCaptainId) return;
    if (selected.size === 0) return;

    if (jsonMeta) {
      const cap = jsonMeta.captain ? profilesByName.get(jsonMeta.captain.toLowerCase()) : undefined;
      const vc = jsonMeta.viceCaptain ? profilesByName.get(jsonMeta.viceCaptain.toLowerCase()) : undefined;
      if (cap && selected.has(cap.id)) {
        setCaptainId(cap.id);
        if (vc && selected.has(vc.id) && vc.id !== cap.id) {
          setViceCaptainId(vc.id);
          return;
        }
      }
    }

    const inXI = [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => p !== undefined);
    const tagged = inXI.find((p) => p.isCaptain);
    const arOrBat = (p: HcPlayerProfile) => p.role === "allrounder" || p.role === "batter";
    const cap = tagged ?? inXI.find(arOrBat) ?? inXI[0];
    if (!cap) return;
    const vc = inXI.find((p) => p.id !== cap.id && arOrBat(p)) ?? inXI.find((p) => p.id !== cap.id);
    if (!vc) return;
    setCaptainId(cap.id);
    setViceCaptainId(vc.id);
  }, [selected, profilesById, profilesByName, jsonMeta, captainId, viceCaptainId]);

  const xi = useMemo(
    () =>
      [...selected]
        .map((id) => profilesById.get(id))
        .filter((p): p is HcPlayerProfile => !!p)
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [selected, profilesById],
  );
  const bench = useMemo(() => sortedSquad.filter((p) => !selected.has(p.id)), [sortedSquad, selected]);
  const legendsBench = useMemo(() => sortedExtras.filter((p) => !selected.has(p.id)), [sortedExtras, selected]);
  const composition = useMemo(() => evaluateSquadComposition(xi), [xi]);

  if (!myTeamId || !rosterToUse) return null;

  const canConfirm =
    selected.size === 11 && !!captainId && !!viceCaptainId && captainId !== viceCaptainId;

  return {
    ok: true,
    teamName: rosterToUse.teamName,
    teamShort: rosterToUse.teamShort,
    squad: sortedSquad,
    extras: sortedExtras,
    xi,
    bench,
    legendsBench,
    selected,
    captainId,
    viceCaptainId,
    composition,
    styleMap,
    coach: jsonMeta?.coach ?? "",
    homeCity: jsonMeta?.homeCity ?? "",
    canConfirm,
    toggle: (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        // Cap at 11 — the server rejects anything else, and silently ignoring
        // the 12th tap reads better than an error toast.
        else if (next.size < 11) next.add(id);
        return next;
      }),
    setCaptain: (id: string) => {
      if (!selected.has(id)) return;
      setCaptainId(id);
      if (viceCaptainId === id) setViceCaptainId(null);
    },
    setViceCaptain: (id: string) => {
      if (!selected.has(id)) return;
      setViceCaptainId(id);
      if (captainId === id) setCaptainId(null);
    },
    confirm: () => {
      if (!canConfirm) return;
      getSocket().emit("game:move", {
        type: "confirmSquad",
        data: { playerIds: [...selected], captainId, viceCaptainId },
      });
    },
  };
}

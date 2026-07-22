/**
 * Bhalyam Cricket — data adapter.
 *
 * Bridges the shared roster data (`@shared/hc-rosters`) to the cricket UI
 * model. Supports BOTH categories (International + IPL) across ALL formats
 * (T20 / ODI / Test). No mock player data — every team and player resolves
 * from the shared source of truth.
 */

import {
  HC_COUNTRIES,
  HC_FRANCHISES,
  getRosterFor,
  type HcCountryProfile,
  type HcFranchiseProfile,
  type HcPlayerProfile,
  type HcRole,
} from "@shared/hc-rosters";
import { HC_OVERS_BY_FORMAT } from "@shared/types";
import type { HcCategory, HcCountry, HcFormat, HcFranchise, HcTeamId } from "@shared/types";
import type { CricketPlayer, PlayerRole, TeamRef } from "./types";

const ROLE_MAP: Record<HcRole, PlayerRole> = {
  batter: "BAT",
  bowler: "BOWL",
  allrounder: "AR",
  keeper: "WK",
};

/** Country display colors — presentation theming only, never player data. */
const COUNTRY_COLORS: Record<HcCountry, string> = {
  india: "#1D63C4",
  australia: "#0B7A3B",
  england: "#CE2029",
  newzealand: "#111827",
  southafrica: "#007749",
  pakistan: "#01411C",
  westindies: "#7A1F1F",
  srilanka: "#0B3D91",
  bangladesh: "#006A4E",
  afghanistan: "#0A7EC2",
  ireland: "#169B62",
  zimbabwe: "#B7791F",
};

export const CATEGORIES: ReadonlyArray<{ id: HcCategory; label: string }> = [
  { id: "international", label: "International" },
  { id: "ipl", label: "IPL" },
];

export const FORMATS: ReadonlyArray<{ id: HcFormat; label: string; overs: number }> = [
  { id: "t20", label: "T20", overs: HC_OVERS_BY_FORMAT.t20 },
  { id: "odi", label: "ODI", overs: HC_OVERS_BY_FORMAT.odi },
  { id: "test", label: "Test", overs: HC_OVERS_BY_FORMAT.test },
];

export function oversForFormat(format: HcFormat): number {
  return HC_OVERS_BY_FORMAT[format];
}

/** Strip captain/keeper annotations from a roster name, capturing the flags. */
function cleanName(raw: string): { name: string; isCaptain: boolean } {
  const isCaptain = /\((?:c|captain)\)/i.test(raw);
  const name = raw
    .replace(/\s*\((?:c|vc|wk|captain)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { name, isCaptain };
}

function toPlayer(profile: HcPlayerProfile, teamId: HcTeamId): CricketPlayer {
  const { name, isCaptain } = cleanName(profile.name);
  return {
    id: profile.id,
    name,
    role: ROLE_MAP[profile.role],
    teamId,
    isCaptain: isCaptain || profile.isCaptain === true,
    isExtra: profile.isExtra === true,
  };
}

const COUNTRIES = HC_COUNTRIES as Record<string, HcCountryProfile | undefined>;
const FRANCHISES = HC_FRANCHISES as Record<string, HcFranchiseProfile | undefined>;

/** Resolve a team id (country or franchise) to a UI TeamRef. */
export function getTeamRef(id: HcTeamId): TeamRef {
  const country = COUNTRIES[id];
  if (country) {
    return {
      id,
      category: "international",
      name: country.name,
      short: country.short,
      flag: country.flag,
      color: COUNTRY_COLORS[id as HcCountry] ?? "#6D4323",
    };
  }
  const franchise = FRANCHISES[id];
  if (franchise) {
    return { id, category: "ipl", name: franchise.name, short: franchise.short, color: franchise.color };
  }
  return { id, category: "international", name: String(id), short: String(id).slice(0, 3).toUpperCase(), color: "#6D4323" };
}

/** Every selectable team in a category, in roster order. */
export function listTeams(category: HcCategory): TeamRef[] {
  if (category === "ipl") {
    return (Object.keys(HC_FRANCHISES) as HcFranchise[]).map(getTeamRef);
  }
  return (Object.keys(HC_COUNTRIES) as HcCountry[]).map(getTeamRef);
}

/** The current playing pool (starting squad) for a team + format. */
export function getSquad(id: HcTeamId, format: HcFormat): CricketPlayer[] {
  const roster = getRosterFor(id, format);
  if (!roster) return [];
  return roster.squad.map((p) => toPlayer(p, id));
}

/** The legends/extras pool for a team + format. */
export function getExtras(id: HcTeamId, format: HcFormat): CricketPlayer[] {
  const roster = getRosterFor(id, format);
  if (!roster) return [];
  return roster.extras.map((p) => toPlayer(p, id));
}

/** Full selectable pool (squad + extras) for a team + format. */
export function getSelectablePool(id: HcTeamId, format: HcFormat): CricketPlayer[] {
  return [...getSquad(id, format), ...getExtras(id, format)];
}

/** A sensible default XI (first 11 of the squad) — real players, not mock. */
export function defaultXI(id: HcTeamId, format: HcFormat): string[] {
  return getSquad(id, format)
    .slice(0, 11)
    .map((p) => p.id);
}

export function playersByIds(ids: string[], pool: CricketPlayer[]): CricketPlayer[] {
  const map = new Map(pool.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is CricketPlayer => p != null);
}

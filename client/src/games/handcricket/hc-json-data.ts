/**
 * Client-side adapter for the Hand Cricket JSON roster files.
 *
 * The four JSON files (test.json, odi.json, t20.json, ipl26.json) are the
 * canonical player data source — they carry the correct playing XI, captain,
 * vice-captain, coach, home ground, and rich per-player metadata
 * (batting/bowling style, etc.).
 *
 * Vite handles JSON imports natively; no createRequire needed here.
 */

import type { HcCountry, HcFormat, HcFranchise } from "@shared/types";
import testData from "./data/test.json";
import odiData from "./data/odi.json";
import t20Data from "./data/t20.json";
import iplData from "./data/ipl26.json";

// ---------------------------------------------------------------------------
// Internal shape declarations — describe the JSON structure without trusting
// inference at call sites. These are compile-time documentation + guard targets.
// ---------------------------------------------------------------------------

interface JsonPlayer {
  id: string;
  name: string;
  shortName: string;
  country: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  isBatsman: boolean;
  isBowler: boolean;
  isWicketKeeper: boolean;
  isAllRounder: boolean;
  active: boolean;
}

interface JsonHomeGround {
  name: string;
  city: string;
  state: string;
}

interface JsonCountryTeam {
  country: string;
  countryCode: string;
  captain: string;
  viceCaptain: string;
  coach: string;
  wicketKeepers: string[];
  playingXI: string[];
  bench: string[];
  players: JsonPlayer[];
  formatLegends: JsonPlayer[];
}

interface JsonFranchiseTeam {
  team: string;
  teamCode: string;
  captain: string;
  viceCaptain: string;
  coach: string;
  homeGround: JsonHomeGround;
  alternateHomeGrounds: JsonHomeGround[];
  wicketKeepers: string[];
  playingXI: string[];
  bench: string[];
  players: JsonPlayer[];
  franchiseLegends: JsonPlayer[];
}

interface JsonFormatData {
  format: string;
  teams: JsonCountryTeam[];
}

interface JsonIplData {
  format: string;
  teams: JsonFranchiseTeam[];
}

// ---------------------------------------------------------------------------
// Map shared HcCountry key → JSON countryCode field value
// ---------------------------------------------------------------------------

const COUNTRY_CODE: Record<HcCountry, string> = {
  india: "IND",
  australia: "AUS",
  england: "ENG",
  newzealand: "NZ",
  southafrica: "RSA",
  pakistan: "PAK",
  westindies: "WI",
  srilanka: "SL",
  bangladesh: "BAN",
  afghanistan: "AFG",
  ireland: "IRE",
  zimbabwe: "ZIM",
};

// Map shared HcFranchise key → JSON teamCode field value
const FRANCHISE_CODE: Record<HcFranchise, string> = {
  csk: "CSK",
  mi: "MI",
  rcb: "RCB",
  kkr: "KKR",
  srh: "SRH",
  dc: "DC",
  pbks: "PBKS",
  rr: "RR",
  gt: "GT",
  lsg: "LSG",
};

// ---------------------------------------------------------------------------
// Validated accessors
// ---------------------------------------------------------------------------

function getFormatData(format: HcFormat): JsonFormatData {
  if (format === "test") return testData as JsonFormatData;
  if (format === "odi") return odiData as JsonFormatData;
  return t20Data as JsonFormatData;
}

function findCountryTeam(
  format: HcFormat,
  countryCode: string,
): JsonCountryTeam | null {
  const data = getFormatData(format);
  return data.teams.find((t) => t.countryCode === countryCode) ?? null;
}

function findFranchiseTeam(teamCode: string): JsonFranchiseTeam | null {
  const ipl = iplData as JsonIplData;
  return ipl.teams.find((t) => t.teamCode === teamCode) ?? null;
}

// ---------------------------------------------------------------------------
// Style abbreviation helpers
// ---------------------------------------------------------------------------

/**
 * Abbreviate a batting-style string to a compact label for tight card layouts.
 *   "Right-hand Bat" → "RHB"
 *   "Left-hand Bat"  → "LHB"
 */
export function abbrevBatStyle(s: string): string {
  if (s === "Right-hand Bat") return "RHB";
  if (s === "Left-hand Bat") return "LHB";
  return s;
}

/**
 * Abbreviate a bowling-style string.
 *   "Right-arm Fast"            → "RA Fast"
 *   "Right-arm Medium Fast"     → "RA Med-F"
 *   "Slow Left-arm Orthodox"    → "SLA Orthodox"
 *   "Left-arm Wrist Spin"       → "LA Wrist"
 *   "None"                      → "" (keeper who doesn't bowl)
 */
export function abbrevBowlStyle(s: string): string {
  if (!s || s === "None") return "";
  return s
    .replace("Right-arm ", "RA ")
    .replace("Left-arm ", "LA ")
    .replace("Slow Left-arm", "SLA")
    .replace("Medium Fast", "Med-F")
    .replace("Fast Medium", "FM")
    .replace("Off Break", "Off-B")
    .replace("Leg Break", "Leg-B")
    .replace("Wrist Spin", "Wrist");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Metadata surfaced to the SquadPicker to pre-fill XI, leadership, and team info. */
export interface JsonTeamMeta {
  /** Player names in the default playing XI (same order as the JSON). */
  playingXI: string[];
  captain: string;
  viceCaptain: string;
  /** Coach full name. */
  coach: string;
  /** Home city — populated for IPL franchises, empty string for international teams. */
  homeCity: string;
}

/**
 * Return playing XI + captain/VC/coach/homeCity for a given team and format.
 * Returns null when no JSON entry is found.
 */
export function getJsonTeamMeta(
  teamId: string,
  format: HcFormat,
): JsonTeamMeta | null {
  // Country path
  const countryCode = (COUNTRY_CODE as Record<string, string | undefined>)[teamId];
  if (countryCode !== undefined) {
    const team = findCountryTeam(format, countryCode);
    if (team) {
      return {
        playingXI: team.playingXI,
        captain: team.captain,
        viceCaptain: team.viceCaptain,
        coach: team.coach,
        homeCity: "",
      };
    }
  }

  // Franchise path
  const franchiseCode = (FRANCHISE_CODE as Record<string, string | undefined>)[teamId];
  if (franchiseCode !== undefined) {
    const team = findFranchiseTeam(franchiseCode);
    if (team) {
      return {
        playingXI: team.playingXI,
        captain: team.captain,
        viceCaptain: team.viceCaptain,
        coach: team.coach,
        homeCity: team.homeGround?.city ?? "",
      };
    }
  }

  return null;
}

/**
 * Return the full player list (squad + bench) with rich metadata for a team
 * and format. Players from formatLegends / franchiseLegends are NOT included
 * (they are extras not in the regular pool).
 */
export function getJsonPlayers(
  teamId: string,
  format: HcFormat,
): JsonPlayer[] {
  const countryCode = (COUNTRY_CODE as Record<string, string | undefined>)[teamId];
  if (countryCode !== undefined) {
    const team = findCountryTeam(format, countryCode);
    return team ? team.players : [];
  }

  const franchiseCode = (FRANCHISE_CODE as Record<string, string | undefined>)[teamId];
  if (franchiseCode !== undefined) {
    const team = findFranchiseTeam(franchiseCode);
    return team ? team.players : [];
  }

  return [];
}

/**
 * Build a name → style info lookup for player cards.
 * Key is the player's name lowercased (matches HcPlayerProfile.name.toLowerCase()).
 * Value carries the abbreviated batting/bowling style and shortName.
 */
export interface JsonPlayerStyle {
  shortName: string;
  battingStyle: string;   // already abbreviated via abbrevBatStyle
  bowlingStyle: string;   // already abbreviated via abbrevBowlStyle (empty if None)
}

export function getJsonPlayerStyleMap(
  teamId: string,
  format: HcFormat,
): Map<string, JsonPlayerStyle> {
  const players = getJsonPlayers(teamId, format);
  const out = new Map<string, JsonPlayerStyle>();
  for (const p of players) {
    out.set(p.name.toLowerCase(), {
      shortName: p.shortName,
      battingStyle: abbrevBatStyle(p.battingStyle),
      bowlingStyle: abbrevBowlStyle(p.bowlingStyle),
    });
  }
  return out;
}

/** Re-export so callers can consume rich player data without a second import. */
export type { JsonPlayer };

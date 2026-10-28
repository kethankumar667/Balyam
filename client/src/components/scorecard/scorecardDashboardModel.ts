import type { ReactNode } from "react";
import type { AllGameSlug, ModeScorecard, PlayerScorecardArchive } from "@shared/profile/Scorecard";
import { GAME_MODE_REGISTRY, getGameModeConfig, type ModeDefinition } from "@shared/profile/GameModes";
import type { RecentMatchItem } from "../../features/profile/CareerMetrics";
import { TILE_ART_BY_GAME } from "../../pages/home/gameArt";
import { buildRecords, type RecordGame } from "../../features/myrecords/records";
import { formatGameMetricValue } from "../../lib/metricFormatters";

export interface ScorecardDeckProps {
  archive: PlayerScorecardArchive;
  records?: readonly RecordGame[];
  playerName: string;
  avatar?: string;
  className?: string;
  recentMatches?: readonly RecentMatchItem[];
  recentMatchesStatus?: "loading" | "ready" | "error";
  onRetryMatches?: () => void;
}

export interface ScorecardLayoutSlots {
  navigator: ReactNode;
  modes: ReactNode;
  record: ReactNode;
  intelligence: ReactNode;
  history: ReactNode;
  battles: ReactNode;
}

export const SCORECARD_GAMES = Object.values(GAME_MODE_REGISTRY).map(config => config.game);
export const PINNED_STORAGE_KEY = "bhalyam.scorecards.pinned";
export const DEFAULT_PINNED_GAMES = ["handcricket", "ludo", "rummy"];
export const SCORECARD_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "board", label: "Board" },
  { id: "card", label: "Cards" },
  { id: "social", label: "Lounge" },
  { id: "retro_arcade", label: "Retro" },
] as const;
export type ScorecardCategory = typeof SCORECARD_CATEGORIES[number]["id"];
export type CricketFamily = "all" | "international" | "franchise" | "galli";

export function scorecardArt(game: string): string | undefined {
  const slug = game === "nokiasnake" ? "snake" : game === "blockblast" ? "brickblocks" : game;
  const entry = Object.entries(TILE_ART_BY_GAME).find(([key]) => key === slug);
  return entry?.[1].replace(/\.png$/, ".webp");
}

export function scorecardModes(archive: PlayerScorecardArchive, game: AllGameSlug, records = buildRecords(archive, false).find(item => item.id === game)): ModeDefinition[] {
  const config = getGameModeConfig(game);
  const historical = records?.previousModeRecords ?? [];
  const modes: ModeDefinition[] = [...config.modes, ...historical.map(mode => ({
    modeId: mode.modeId,
    displayName: mode.modeDisplayName,
    description: mode.deviceOnly ? "Older device save. Not account match history." : "Historical record. This mode is no longer offered.",
    scoringDirection: mode.scoringDirection,
    unit: "",
  }))];
  if (records?.previousOverallBest != null) modes.push({
    modeId: "device_previous_overall", displayName: "Previous device best (mode unknown)",
    description: "Older device save with unknown rules; not assigned to a current mode.",
    scoringDirection: "HIGHER_IS_BETTER", unit: "pts",
  });
  return modes;
}

export interface ScorecardBest {
  score: number;
  source: "recorded" | "imported" | "device";
  record?: ModeScorecard;
}

export function scorecardBest(game: RecordGame | undefined, modeId: string): ScorecardBest | undefined {
  if (modeId === "device_previous_overall" && game?.previousOverallBest != null) {
    return { score: game.previousOverallBest, source: "device" };
  }
  const mode = game?.modes.find(item => item.modeId === modeId);
  if (mode && mode.best !== null) return {
    score: mode.best,
    source: mode.imported ? "imported" : mode.deviceOnly ? "device" : "recorded",
    record: mode.recorded,
  };
  const historical = game?.previousModeRecords.find(item => item.modeId === modeId);
  return historical ? {
    score: historical.bestScore, source: historical.deviceOnly ? "device" : "recorded",
    record: historical.deviceOnly ? undefined : historical,
  } : undefined;
}

export function scorecardCoverage(archive: PlayerScorecardArchive | null, records = buildRecords(archive, false)) {
  const total = Object.values(GAME_MODE_REGISTRY).reduce((sum, config) => sum + config.modes.length, 0);
  const recorded = records.reduce((sum, game) => sum + game.modes.filter(mode => mode.best !== null).length, 0);
  return { total, recorded, percentage: total ? Math.round(recorded / total * 100) : 0 };
}

export function scorecardDate(timestamp?: number): string {
  return timestamp ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(timestamp) : "Not recorded";
}

const CONTEXT_LABELS: Record<ModeScorecard["bestContext"], string> = {
  SOLO: "Solo", VS_BOTS: "Vs bots", PVP_MULTIPLAYER: "Online", PASS_AND_PLAY: "Pass & Play",
};

/** Plain words for how the record was set, never the raw wire enum. */
export function scorecardContextLabel(context: ModeScorecard["bestContext"]): string {
  return CONTEXT_LABELS[context] ?? "Not recorded";
}

/** The countable noun of a mode's unit ("rolls to 100" → "rolls") for milestone copy. */
export function milestoneUnit(mode: ModeDefinition): string {
  return mode.unit.split(" to ")[0].trim() || "points";
}

/** Score plus its unit for sentences ("184 runs", "5m 00s"); timed modes already read as a time. */
export function scorecardValueWithUnit(game: AllGameSlug, mode: ModeDefinition, score: number): string {
  return scorecardValue(game, mode, score);
}

export function scorecardValue(_game: AllGameSlug, mode: ModeDefinition, score: number): string {
  const value = formatGameMetricValue(score, mode.unit === "s" ? "duration_seconds" : "raw_number");
  return mode.unit && mode.unit !== "s" ? `${value} ${mode.unit}` : value;
}

/** Averages are fractional; one decimal is enough to read and never prints "52.667". */
export function scorecardAverage(game: AllGameSlug, mode: ModeDefinition, average: number): string {
  return scorecardValue(game, mode, Math.round(average * 10) / 10);
}

export function shortModeName(mode: ModeDefinition, game: AllGameSlug): { name: string; detail: string } {
  if (game !== "handcricket") return { name: mode.displayName, detail: mode.description };
  const name = mode.displayName.replace(/^(International|Franchise|Galli)\s+/, "").replace(/\s*\(.*\)$/, "");
  return { name, detail: mode.displayName.match(/\((.+)\)/)?.[1] ?? "Historical format" };
}

import type { ReactNode } from "react";
import type { AllGameSlug, PlayerScorecardArchive } from "@shared/profile/Scorecard";
import { GAME_MODE_REGISTRY, getGameModeConfig, type ModeDefinition } from "@shared/profile/GameModes";
import type { RecentMatchItem } from "../../features/profile/CareerMetrics";
import { TILE_ART_BY_GAME } from "../../pages/home/gameArt";

export interface ScorecardDeckProps {
  archive: PlayerScorecardArchive;
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

export function scorecardModes(archive: PlayerScorecardArchive, game: AllGameSlug): ModeDefinition[] {
  const config = getGameModeConfig(game);
  const recorded = archive.games[game]?.modes ?? {};
  const historical = Object.values(recorded).filter(mode => !config.modes.some(current => current.modeId === mode.modeId));
  return [...config.modes, ...historical.map(mode => ({
    modeId: mode.modeId,
    displayName: mode.modeDisplayName,
    description: "Historical record. This mode is no longer offered.",
    scoringDirection: mode.scoringDirection,
    unit: "",
  }))];
}

export function scorecardCoverage(archive: PlayerScorecardArchive | null) {
  const total = Object.values(GAME_MODE_REGISTRY).reduce((sum, config) => sum + config.modes.length, 0);
  const recorded = Object.values(GAME_MODE_REGISTRY).reduce((sum, config) =>
    sum + config.modes.filter(mode => archive?.games[config.game]?.modes[mode.modeId] != null).length, 0);
  return { total, recorded, percentage: total ? Math.round(recorded / total * 100) : 0 };
}

export function scorecardDate(timestamp?: number): string {
  return timestamp ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(timestamp) : "Not recorded";
}

export function shortModeName(mode: ModeDefinition, game: AllGameSlug): { name: string; detail: string } {
  if (game !== "handcricket") return { name: mode.displayName, detail: mode.description };
  const name = mode.displayName.replace(/^(International|Franchise|Galli)\s+/, "").replace(/\s*\(.*\)$/, "");
  return { name, detail: mode.displayName.match(/\((.+)\)/)?.[1] ?? "Historical format" };
}

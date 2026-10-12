/**
 * Privacy & Data Export Utility (DPDP Act Compliance).
 * Generates a clean, non-sensitive JSON export of the current player's data.
 */

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { UserAccountDetails } from "../accountGenerator";
import { buildDataExport, exportFilename } from "./dataInventory";

export interface PlayerExportPayload {
  exportDate: string;
  version: string;
  identity: {
    playerId: string;
    displayName: string;
    avatar?: string;
    joinedAt: string;
    level: number;
    experiencePoints: number;
  };
  statistics?: PlayerStats;
  accountDetails?: UserAccountDetails | Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

/**
 * Downloads everything this device holds about the player — the same export the
 * "Your data" panel offers, from anywhere that promises one.
 *
 * It exists so a privacy page cannot offer a different, thinner file than the
 * one the player is entitled to. (The page once built its own six-field stub
 * with made-up defaults and a wrong storage key.)
 */
export function downloadMyData(now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(buildDataExport(now), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename(now);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadPlayerExport(
  profile: PlayerProfile,
  stats?: PlayerStats | null,
  accountDetails?: UserAccountDetails | Record<string, unknown> | null,
): void {
  const payload: PlayerExportPayload = {
    exportDate: new Date().toISOString(),
    version: "1.0.0",
    identity: {
      playerId: profile.playerId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      joinedAt: new Date(profile.joinedAt).toISOString(),
      level: profile.level,
      experiencePoints: profile.experiencePoints,
    },
    statistics: stats ?? undefined,
    accountDetails: accountDetails ?? undefined,
    preferences: {
      theme: typeof localStorage !== "undefined" ? localStorage.getItem("bhalyam.theme") : "light",
      language: typeof localStorage !== "undefined" ? localStorage.getItem("bhalyam.language") : "en",
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `bhalyam-player-data-${profile.playerId.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

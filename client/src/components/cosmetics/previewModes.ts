/**
 * BHALYAM — Cosmetics Boutique Category-Specific Preview Modes
 *
 * Defines strictly-typed preview contexts per cosmetic category, replacing
 * generic contexts with authentic presentation environments.
 */

import React from "react";
import {
  LayoutGrid,
  Eye,
  Smartphone,
  RotateCw,
  Gamepad2,
  Home,
  MapPin,
  Layers,
  Copy,
  Hand,
  User,
  Crown,
  Users,
} from "lucide-react";
import type { CosmeticCategory } from "@shared/cosmetics";

export type PreviewMode =
  | "FULL_TABLE"
  | "PLAYER_VIEW"
  | "MOBILE_VIEW"
  | "INSPECT"
  | "ROLL_PREVIEW"
  | "IN_GAME"
  | "HOME_BASE"
  | "ON_BOARD"
  | "CARD_BACK"
  | "DRAW_PILE"
  | "IN_HAND"
  | "PROFILE"
  | "GAME_SEAT"
  | "LOBBY"
  | "PODIUM";

export interface CosmeticPreviewModeOption {
  readonly id: PreviewMode;
  readonly label: string;
  readonly accessibleLabel: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

export const PREVIEW_MODES_BY_CATEGORY: Record<
  CosmeticCategory,
  readonly CosmeticPreviewModeOption[]
> = {
  TABLE_THEME: [
    {
      id: "FULL_TABLE",
      label: "Full Table",
      accessibleLabel: "Preview full table layout",
      icon: LayoutGrid,
    },
    {
      id: "PLAYER_VIEW",
      label: "Player View",
      accessibleLabel: "Preview table from player perspective",
      icon: Eye,
    },
    {
      id: "MOBILE_VIEW",
      label: "Mobile View",
      accessibleLabel: "Preview table on mobile viewport",
      icon: Smartphone,
    },
  ],
  DICE_SKIN: [
    {
      id: "INSPECT",
      label: "Inspect",
      accessibleLabel: "Inspect dice materials and details",
      icon: Eye,
    },
    {
      id: "ROLL_PREVIEW",
      label: "Roll Preview",
      accessibleLabel: "Preview visual rolling animation",
      icon: RotateCw,
    },
    {
      id: "IN_GAME",
      label: "In Game",
      accessibleLabel: "Preview dice resting on game surface",
      icon: Gamepad2,
    },
  ],
  TOKEN_SKIN: [
    {
      id: "INSPECT",
      label: "Inspect",
      accessibleLabel: "Inspect token sculpted details",
      icon: Eye,
    },
    {
      id: "HOME_BASE",
      label: "Home Base",
      accessibleLabel: "Preview token in home yard",
      icon: Home,
    },
    {
      id: "ON_BOARD",
      label: "On Board",
      accessibleLabel: "Preview token moving on board track",
      icon: MapPin,
    },
  ],
  CARD_BACK: [
    {
      id: "CARD_BACK",
      label: "Card Back",
      accessibleLabel: "Inspect card back artwork",
      icon: Layers,
    },
    {
      id: "DRAW_PILE",
      label: "Draw Pile",
      accessibleLabel: "Preview card back in deck stack",
      icon: Copy,
    },
    {
      id: "IN_HAND",
      label: "In Hand",
      accessibleLabel: "Preview card back held in hand",
      icon: Hand,
    },
  ],
  AVATAR_AURA: [
    {
      id: "PROFILE",
      label: "Profile",
      accessibleLabel: "Preview aura on player profile avatar",
      icon: User,
    },
    {
      id: "GAME_SEAT",
      label: "Game Seat",
      accessibleLabel: "Preview aura during live game seat",
      icon: Gamepad2,
    },
    {
      id: "PODIUM",
      label: "Podium",
      accessibleLabel: "Preview aura on victory podium",
      icon: Crown,
    },
  ],
  PODIUM_TITLE: [
    {
      id: "PROFILE",
      label: "Profile",
      accessibleLabel: "Preview title in profile banner",
      icon: User,
    },
    {
      id: "LOBBY",
      label: "Lobby",
      accessibleLabel: "Preview title in player list",
      icon: Users,
    },
    {
      id: "PODIUM",
      label: "Podium",
      accessibleLabel: "Preview title on victory podium",
      icon: Crown,
    },
  ],
};

/**
 * Returns the default preview mode for a given category.
 */
export function getDefaultPreviewMode(category: CosmeticCategory): PreviewMode {
  return PREVIEW_MODES_BY_CATEGORY[category][0].id;
}

/**
 * Type guard checking if a mode is valid for a given category.
 */
export function isValidModeForCategory(
  mode: string,
  category: CosmeticCategory,
): mode is PreviewMode {
  return PREVIEW_MODES_BY_CATEGORY[category].some((opt) => opt.id === mode);
}

import React from "react";

export type ChestTier = "bronze" | "silver" | "gold" | "diamond" | "legendary";

export type LootItemRarity = "common" | "rare" | "epic" | "legendary";

export type LootItemType =
  | "coins"
  | "title"
  | "badge"
  | "emojis"
  | "frame"
  | "shield"
  | "xp"
  | "custom";

export interface LootItem {
  id: string;
  type: LootItemType;
  title: string;
  description?: string;
  amount?: number;
  rarity: LootItemRarity;
  badgeText?: string;
  icon?: React.ReactNode;
}

export type ChestOpeningStage =
  | "idle"        // Chest floating, rotating god rays, awaiting first tap
  | "rumble"      // Chest rattling, padlock popping, energy leaking
  | "burst"       // 3D lid explodes open, volumetric light beam, confetti blast
  | "revealing"   // Sequential tap-to-reveal card discovery
  | "pedestal";   // All items showcased side-by-side with Collect button

export interface ChestTierConfig {
  tier: ChestTier;
  displayName: string;
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  haloGradients: string;
  imageSrc: string;
}

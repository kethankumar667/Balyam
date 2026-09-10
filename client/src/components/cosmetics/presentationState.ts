/**
 * BHALYAM — Cosmetics Presentation State Resolver
 *
 * Deterministic presentation state calculation separating selection, rarity,
 * ownership, equipped status, and affordability.
 *
 * Invariant: Backend remains 100% authoritative. This resolver computes presentation
 * labels, deficit numbers, and button states only.
 */

import type { CosmeticCatalogItem } from "@shared/cosmetics";

export type CosmeticPresentationState =
  | "DEFAULT"
  | "LOCKED"
  | "AVAILABLE"
  | "INSUFFICIENT_BALANCE"
  | "OWNED"
  | "EQUIPPED"
  | "PURCHASING"
  | "EQUIPPING"
  | "UNAVAILABLE";

export interface CosmeticPresentationResult {
  readonly state: CosmeticPresentationState;
  readonly canPurchase: boolean;
  readonly canEquip: boolean;
  readonly shortfall: number;
  readonly safeBalance: number;
  readonly progressPercent: number;
  readonly progressText: string;
  readonly ctaLabel: string;
  readonly badgeLabel: string;
  readonly badgeStyle: string;
  readonly cardSubtext: string;
}

export function resolveCosmeticPresentationState(params: {
  item: CosmeticCatalogItem;
  isOwned: boolean;
  isEquipped: boolean;
  isAdminUser: boolean;
  walletBalance: string;
  isSubmitting: boolean;
  activeActionId?: string | null;
}): CosmeticPresentationResult {
  const {
    item,
    isOwned,
    isEquipped,
    isAdminUser,
    walletBalance,
    isSubmitting,
    activeActionId,
  } = params;

  // Safe integer balance parsing (invalid / malformed input defaults to 0)
  const rawParsed = Number.parseInt(walletBalance, 10);
  const safeBalance =
    Number.isFinite(rawParsed) && rawParsed >= 0 ? rawParsed : 0;
  const priceCoins = item.priceCoins;
  const shortfall = Math.max(0, priceCoins - safeBalance);
  const canAfford = safeBalance >= priceCoins;
  const isDefault = item.unlockMethod === "DEFAULT";
  const isStreak = item.unlockMethod === "STREAK_MILESTONE";

  const progressPercent =
    priceCoins > 0
      ? Math.min(100, Math.max(0, Math.round((safeBalance / priceCoins) * 100)))
      : 100;
  const progressText = `${safeBalance.toLocaleString()} / ${priceCoins.toLocaleString()}`;

  const isCurrentAction = isSubmitting && activeActionId === item.id;
  const categoryLabel = item.category.replace("_", " ");

  // 1. Equipped state
  if (isEquipped) {
    return {
      state: "EQUIPPED",
      canPurchase: false,
      canEquip: false,
      shortfall: 0,
      safeBalance,
      progressPercent: 100,
      progressText,
      ctaLabel: isDefault ? "EQUIPPED (DEFAULT)" : "EQUIPPED",
      badgeLabel: "EQUIPPED",
      badgeStyle: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      cardSubtext: "Currently active on your seat",
    };
  }

  // 2. In-flight mutation state
  if (isCurrentAction) {
    return {
      state: isOwned ? "EQUIPPING" : "PURCHASING",
      canPurchase: false,
      canEquip: false,
      shortfall,
      safeBalance,
      progressPercent,
      progressText,
      ctaLabel: isOwned ? "EQUIPPING..." : "PURCHASING...",
      badgeLabel: isOwned ? "EQUIPPING" : "PURCHASING",
      badgeStyle:
        "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse",
      cardSubtext: isOwned ? "Applying to loadout..." : "Processing purchase...",
    };
  }

  // 3. Default cosmetic (always free & accessible)
  if (isDefault) {
    return {
      state: "DEFAULT",
      canPurchase: false,
      canEquip: true,
      shortfall: 0,
      safeBalance,
      progressPercent: 100,
      progressText,
      ctaLabel: "RESTORE DEFAULT",
      badgeLabel: "DEFAULT",
      badgeStyle: "bg-zinc-800 text-zinc-300 border-zinc-700",
      cardSubtext: "Standard lounge cosmetic",
    };
  }

  // 4. Admin user presentation bypass
  // Note: Only modifies presentation badges and CTA text. Server authoritatively verifies keys/roles.
  if (isAdminUser) {
    return {
      state: "OWNED",
      canPurchase: false,
      canEquip: true,
      shortfall: 0,
      safeBalance,
      progressPercent: 100,
      progressText,
      ctaLabel: "EQUIP (ADMIN PASS)",
      badgeLabel: "FREE",
      badgeStyle: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      cardSubtext: "Free access via Admin Pass",
    };
  }

  // 5. Owned item
  if (isOwned) {
    return {
      state: "OWNED",
      canPurchase: false,
      canEquip: true,
      shortfall: 0,
      safeBalance,
      progressPercent: 100,
      progressText,
      ctaLabel: `EQUIP ${categoryLabel}`,
      badgeLabel: "OWNED",
      badgeStyle: "bg-sky-500/20 text-sky-400 border-sky-500/40",
      cardSubtext: "In your permanent inventory",
    };
  }

  // 6. Streak milestone locked
  if (isStreak) {
    return {
      state: "LOCKED",
      canPurchase: false,
      canEquip: false,
      shortfall: 0,
      safeBalance,
      progressPercent: 0,
      progressText: "Day 7 Streak",
      ctaLabel: "STREAK DAY 7 REQUIRED",
      badgeLabel: "DAY 7",
      badgeStyle: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      cardSubtext: "Unlock by maintaining a 7-day streak",
    };
  }

  // 7. Insufficient balance (shortfall > 0)
  if (!canAfford) {
    return {
      state: "INSUFFICIENT_BALANCE",
      canPurchase: false,
      canEquip: false,
      shortfall,
      safeBalance,
      progressPercent,
      progressText,
      ctaLabel: `${shortfall.toLocaleString()} COINS SHORT`,
      badgeLabel: `${shortfall.toLocaleString()} SHORT`,
      badgeStyle: "bg-rose-950/60 text-rose-400 border-rose-800/40",
      cardSubtext: `Need ${shortfall.toLocaleString()} more coins`,
    };
  }

  // 8. Available for purchase
  return {
    state: "AVAILABLE",
    canPurchase: true,
    canEquip: false,
    shortfall: 0,
    safeBalance,
    progressPercent: 100,
    progressText,
    ctaLabel: `UNLOCK FOR ${priceCoins.toLocaleString()} COINS`,
    badgeLabel: `${priceCoins.toLocaleString()} COINS`,
    badgeStyle: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    cardSubtext: `Unlock for ${priceCoins.toLocaleString()} coins`,
  };
}

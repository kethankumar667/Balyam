/**
 * BHALYAM — Cosmetics shop: what the page offers to do with the selected item.
 *
 * The shop has exactly one primary control per item and it changes with the item's state. This turns the
 * presentation resolver's verdict (which stays authoritative about affordability and ownership) into the plain
 * sentences and the single action the layouts draw, so the desktop column and the phone's pinned bar can never
 * disagree. Sentence case throughout: the old stage shouted ("EQUIPPED (Click to Reset Default)").
 */

import type { CosmeticCatalogItem, CosmeticCategory } from "@shared/cosmetics";
import type { CosmeticPresentationResult } from "../presentationState";

const NOUN: Record<CosmeticCategory, string> = {
  AVATAR_AURA: "frame",
  DICE_SKIN: "dice",
  TOKEN_SKIN: "token",
  CARD_BACK: "card back",
  TABLE_THEME: "table",
  PODIUM_TITLE: "title",
};

/** "frame", "dice", "card back": what the shopper calls the thing, for "Equip frame". */
export function categoryNoun(category: CosmeticCategory): string {
  return NOUN[category] ?? "item";
}

const LABEL: Record<CosmeticCategory, string> = {
  AVATAR_AURA: "Avatar frame",
  DICE_SKIN: "Dice skin",
  TOKEN_SKIN: "Token skin",
  CARD_BACK: "Card back",
  TABLE_THEME: "Table theme",
  PODIUM_TITLE: "Podium title",
};

/** The line under an item's name: "Avatar frame", "Card back for UNO". Sits below the heading, never above it. */
export function categoryLabel(category: CosmeticCategory, scope?: string): string {
  const base = LABEL[category] ?? "Cosmetic";
  if (category !== "CARD_BACK") return base;
  if (scope === "uno") return `${base} for UNO`;
  if (scope === "rummy") return `${base} for Rummy`;
  return base;
}

export type ShopPrimary =
  /** A confirmation rather than a control ("Equipped"). */
  | { kind: "status"; label: string }
  | { kind: "button"; intent: "unlock" | "equip" | "locked"; label: string; disabled: boolean };

export interface ShopActionPlan {
  primary: ShopPrimary;
  /** Equipped, and not the default: the shopper may go back to the default look. */
  canReset: boolean;
  /** At most one plain sentence about money or a lock. Never repeated elsewhere on the page. */
  note: string | null;
  /** Coins still needed; 0 unless the item is unaffordable. */
  shortfall: number;
  /** A paid, owned item can be refunded (never for the Admin Pass, which paid nothing). */
  showRefund: boolean;
  /** The price is still a question for the shopper: shown for items they have not unlocked. */
  showPrice: boolean;
  /** The refund rule, said before the shopper buys; null where nothing is being bought. */
  refundPromise: string | null;
}

/** Matches `REFUND_WINDOW_MS` on the server (15 minutes). */
export const REFUND_PROMISE = "Changed your mind? Full refund within 15 minutes.";

export function planShopAction(params: {
  item: CosmeticCatalogItem;
  presentation: CosmeticPresentationResult;
  isOwned: boolean;
  isAdminUser: boolean;
  isSubmitting: boolean;
}): ShopActionPlan {
  const { item, presentation, isOwned, isAdminUser, isSubmitting } = params;
  const isDefault = item.unlockMethod === "DEFAULT";
  const noun = categoryNoun(item.category);
  const price = item.priceCoins.toLocaleString();

  const showRefund = isOwned && !isAdminUser && item.unlockMethod === "COIN_PURCHASE";
  const showPrice = !isOwned && !isAdminUser && item.unlockMethod === "COIN_PURCHASE";
  const base = { canReset: false, note: null, shortfall: 0, showRefund, showPrice, refundPromise: showPrice ? REFUND_PROMISE : null };

  switch (presentation.state) {
    case "EQUIPPED":
      return {
        ...base,
        primary: { kind: "status", label: isDefault ? "Using the default look" : "Equipped" },
        canReset: !isDefault,
      };

    case "DEFAULT":
      return {
        ...base,
        primary: { kind: "button", intent: "equip", label: "Use the default look", disabled: isSubmitting },
      };

    case "OWNED":
      return {
        ...base,
        primary: {
          kind: "button",
          intent: "equip",
          label: isAdminUser ? `Equip ${noun}, free with Admin Pass` : `Equip ${noun}`,
          disabled: isSubmitting,
        },
      };

    case "AVAILABLE":
      return {
        ...base,
        primary: { kind: "button", intent: "unlock", label: `Unlock for ${price} coins`, disabled: isSubmitting },
      };

    case "INSUFFICIENT_BALANCE":
      return {
        ...base,
        shortfall: presentation.shortfall,
        note: `You need ${presentation.shortfall.toLocaleString()} more coins.`,
        primary: { kind: "button", intent: "locked", label: `${price} coins`, disabled: true },
      };

    case "LOCKED":
      return {
        ...base,
        note: "Keep a 7-day streak to unlock this.",
        primary: { kind: "button", intent: "locked", label: "Locked", disabled: true },
      };

    default:
      return { ...base, primary: { kind: "button", intent: "locked", label: "Unavailable", disabled: true } };
  }
}

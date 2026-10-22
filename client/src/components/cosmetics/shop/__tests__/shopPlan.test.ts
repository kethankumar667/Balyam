import { describe, it, expect } from "vitest";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import { resolveCosmeticPresentationState } from "../../presentationState";
import { REFUND_PROMISE, categoryLabel, categoryNoun, planShopAction } from "../shopPlan";
import { DEFAULT_FRAME, frame } from "./fakeShop";

function plan(opts: {
  item?: CosmeticCatalogItem;
  isOwned?: boolean;
  isEquipped?: boolean;
  isAdminUser?: boolean;
  walletBalance?: string;
  isSubmitting?: boolean;
}) {
  const item = opts.item ?? frame();
  const isOwned = opts.isOwned ?? false;
  const isAdminUser = opts.isAdminUser ?? false;
  const isSubmitting = opts.isSubmitting ?? false;
  const presentation = resolveCosmeticPresentationState({
    item,
    isOwned,
    isEquipped: opts.isEquipped ?? false,
    isAdminUser,
    walletBalance: opts.walletBalance ?? "2000",
    isSubmitting,
  });
  return planShopAction({ item, presentation, isOwned, isAdminUser, isSubmitting });
}

describe("planShopAction — one primary control per state", () => {
  it("offers Unlock, with the price, when the shopper can afford it", () => {
    const p = plan({ walletBalance: "2000" });

    expect(p.primary).toEqual({ kind: "button", intent: "unlock", label: "Unlock for 600 coins", disabled: false });
    expect(p.showPrice).toBe(true);
    expect(p.note).toBeNull();
    expect(p.shortfall).toBe(0);
  });

  it("says exactly how many coins are missing, once, when it is too expensive", () => {
    const p = plan({ walletBalance: "100" });

    expect(p.primary).toEqual({ kind: "button", intent: "locked", label: "600 coins", disabled: true });
    expect(p.note).toBe("You need 500 more coins.");
    expect(p.shortfall).toBe(500);
  });

  it("treats a malformed balance as zero rather than offering the unlock", () => {
    const p = plan({ walletBalance: "not-a-number" });

    expect(p.primary).toMatchObject({ intent: "locked", disabled: true });
    expect(p.shortfall).toBe(600);
  });

  it("offers Equip for something owned, and a refund for a paid one", () => {
    const p = plan({ isOwned: true });

    expect(p.primary).toEqual({ kind: "button", intent: "equip", label: "Equip frame", disabled: false });
    expect(p.showRefund).toBe(true);
    expect(p.showPrice).toBe(false);
  });

  it("names the thing being equipped", () => {
    expect(plan({ item: frame({ category: "DICE_SKIN", id: "dice_wooden_teak" }), isOwned: true }).primary).toMatchObject({
      label: "Equip dice",
    });
    expect(plan({ item: frame({ category: "CARD_BACK", id: "cardback_classic_uno" }), isOwned: true }).primary).toMatchObject({
      label: "Equip card back",
    });
  });

  it("shows what is worn as a confirmation, not a button, and lets the shopper reset it", () => {
    const p = plan({ isOwned: true, isEquipped: true });

    expect(p.primary).toEqual({ kind: "status", label: "Equipped" });
    expect(p.canReset).toBe(true);
  });

  it("does not offer a reset when the default look is what is worn", () => {
    const p = plan({ item: DEFAULT_FRAME, isOwned: true, isEquipped: true });

    expect(p.primary).toEqual({ kind: "status", label: "Using the default look" });
    expect(p.canReset).toBe(false);
  });

  it("lets the shopper go back to the default look when something else is worn", () => {
    const p = plan({ item: DEFAULT_FRAME, isOwned: true, isEquipped: false });

    expect(p.primary).toEqual({ kind: "button", intent: "equip", label: "Use the default look", disabled: false });
    expect(p.showRefund).toBe(false);
  });

  it("explains a streak-locked item instead of showing a price", () => {
    const p = plan({ item: frame({ unlockMethod: "STREAK_MILESTONE", priceCoins: 0 }) });

    expect(p.primary).toEqual({ kind: "button", intent: "locked", label: "Locked", disabled: true });
    expect(p.note).toBe("Keep a 7-day streak to unlock this.");
    expect(p.showPrice).toBe(false);
  });

  it("makes the Admin Pass free: no price, no refund, and says so", () => {
    const p = plan({ isAdminUser: true, walletBalance: "0" });

    expect(p.primary).toMatchObject({ kind: "button", intent: "equip", label: "Equip frame, free with Admin Pass" });
    expect(p.showPrice).toBe(false);
    expect(p.showRefund).toBe(false);
  });

  it("disables the control while a purchase or equip is in flight", () => {
    expect(plan({ isSubmitting: true }).primary).toMatchObject({ intent: "unlock", disabled: true });
    expect(plan({ isOwned: true, isSubmitting: true }).primary).toMatchObject({ intent: "equip", disabled: true });
  });
});

describe("the refund promise", () => {
  it("is said before buying, whether or not the shopper can afford it", () => {
    expect(plan({ walletBalance: "2000" }).refundPromise).toBe(REFUND_PROMISE);
    expect(plan({ walletBalance: "100" }).refundPromise).toBe(REFUND_PROMISE);
  });

  it("is not repeated once owned (the refund button takes over) or where nothing is bought", () => {
    expect(plan({ isOwned: true }).refundPromise).toBeNull();
    expect(plan({ item: DEFAULT_FRAME, isOwned: true }).refundPromise).toBeNull();
    expect(plan({ isAdminUser: true }).refundPromise).toBeNull();
    expect(plan({ item: frame({ unlockMethod: "STREAK_MILESTONE", priceCoins: 0 }) }).refundPromise).toBeNull();
  });

  it("names the 15-minute window the server enforces", () => {
    expect(REFUND_PROMISE).toContain("15 minutes");
  });
});

describe("category wording", () => {
  it("has a noun for every category, for 'Equip frame'", () => {
    expect(categoryNoun("AVATAR_AURA")).toBe("frame");
    expect(categoryNoun("DICE_SKIN")).toBe("dice");
    expect(categoryNoun("TOKEN_SKIN")).toBe("token");
    expect(categoryNoun("CARD_BACK")).toBe("card back");
  });

  it("labels an item's kind under its name, naming the game for card backs", () => {
    expect(categoryLabel("AVATAR_AURA")).toBe("Avatar frame");
    expect(categoryLabel("DICE_SKIN")).toBe("Dice skin");
    expect(categoryLabel("CARD_BACK", "uno")).toBe("Card back for UNO");
    expect(categoryLabel("CARD_BACK", "rummy")).toBe("Card back for Rummy");
  });
});

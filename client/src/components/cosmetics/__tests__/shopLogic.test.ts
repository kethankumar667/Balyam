import { describe, it, expect } from "vitest";
import type { CosmeticCatalogItem, EquippedCosmeticsLoadout } from "@shared/cosmetics";
import {
  CARD_BACK_SCOPES,
  SHOP_CATEGORY_TABS,
  categoryTitle,
  isEquippedInSlot,
  itemsForSlot,
  parseShopQuery,
} from "../shopLogic";

function item(id: string, category: CosmeticCatalogItem["category"]): CosmeticCatalogItem {
  return {
    id,
    category,
    name: id,
    description: "",
    priceCoins: 100,
    rarity: "COMMON",
    unlockMethod: "COIN_PURCHASE",
    isActive: true,
    displayOrder: 0,
  };
}

const NOTHING_EQUIPPED: EquippedCosmeticsLoadout = { tableThemes: {}, diceSkins: {}, tokenSkins: {}, cardBacks: {} };

describe("shop tabs", () => {
  it("offers exactly the four categories that are sold", () => {
    expect(SHOP_CATEGORY_TABS.map((tab) => tab.category)).toEqual([
      "DICE_SKIN",
      "TOKEN_SKIN",
      "CARD_BACK",
      "AVATAR_AURA",
    ]);
  });
});

describe("itemsForSlot", () => {
  const catalog = [
    item("cardback_classic_navy", "CARD_BACK"), // rummy only
    item("cardback_classic_uno", "CARD_BACK"), // uno only
    item("not_in_the_registry", "CARD_BACK"),
  ];

  it("lists only the card backs made for the game variant being browsed", () => {
    expect(itemsForSlot(catalog, "CARD_BACK", "rummy").map((i) => i.id)).toEqual(["cardback_classic_navy"]);
    expect(itemsForSlot(catalog, "CARD_BACK", "uno").map((i) => i.id)).toEqual(["cardback_classic_uno"]);
  });

  it("leaves out an item the registry does not know instead of showing it unfiltered", () => {
    const ids = itemsForSlot(catalog, "CARD_BACK", "rummy").map((i) => i.id);

    expect(ids).not.toContain("not_in_the_registry");
  });

  it("lists nothing for a category with no items", () => {
    expect(itemsForSlot(catalog, "DICE_SKIN", "GLOBAL")).toEqual([]);
  });
});

describe("isEquippedInSlot", () => {
  it("reads a dice skin from the slot being browsed", () => {
    const equipped = { ...NOTHING_EQUIPPED, diceSkins: { GLOBAL: "dice_a", ludo: "dice_b" } };

    expect(isEquippedInSlot(equipped, "DICE_SKIN", "GLOBAL", "dice_a")).toBe(true);
    expect(isEquippedInSlot(equipped, "DICE_SKIN", "ludo", "dice_a")).toBe(false);
  });

  it("reads a token skin per game slot", () => {
    const equipped = { ...NOTHING_EQUIPPED, tokenSkins: { ludo: "token_a" } };

    expect(isEquippedInSlot(equipped, "TOKEN_SKIN", "ludo", "token_a")).toBe(true);
    expect(isEquippedInSlot(equipped, "TOKEN_SKIN", "GLOBAL", "token_a")).toBe(false);
  });

  it("reads a card back from uno or rummy, treating any other scope as rummy", () => {
    const equipped = { ...NOTHING_EQUIPPED, cardBacks: { uno: "back_u", rummy: "back_r" } };

    expect(isEquippedInSlot(equipped, "CARD_BACK", "uno", "back_u")).toBe(true);
    expect(isEquippedInSlot(equipped, "CARD_BACK", "rummy", "back_r")).toBe(true);
    expect(isEquippedInSlot(equipped, "CARD_BACK", "GLOBAL", "back_r")).toBe(true);
    expect(isEquippedInSlot(equipped, "CARD_BACK", "uno", "back_r")).toBe(false);
  });

  it("reads the avatar frame, which has a single slot", () => {
    const equipped = { ...NOTHING_EQUIPPED, avatarAura: "frame_blaze_ring" };

    expect(isEquippedInSlot(equipped, "AVATAR_AURA", "GLOBAL", "frame_blaze_ring")).toBe(true);
    expect(isEquippedInSlot(equipped, "AVATAR_AURA", "GLOBAL", "frame_diya_glow")).toBe(false);
  });

  it("is false for everything when nothing is equipped", () => {
    expect(isEquippedInSlot(NOTHING_EQUIPPED, "DICE_SKIN", "GLOBAL", "dice_a")).toBe(false);
    expect(isEquippedInSlot(NOTHING_EQUIPPED, "AVATAR_AURA", "GLOBAL", "frame_blaze_ring")).toBe(false);
  });
});

describe("categoryTitle", () => {
  it("names each tab's collection", () => {
    expect(categoryTitle("DICE_SKIN")).toBe("DICE SKINS");
    expect(categoryTitle("TOKEN_SKIN")).toBe("TOKEN SKINS");
    expect(categoryTitle("CARD_BACK")).toBe("CARD BACKS");
    expect(categoryTitle("AVATAR_AURA")).toBe("AVATAR FRAMES");
  });
});

describe("parseShopQuery — the /shop deep link", () => {
  it("returns nothing for a bare /shop", () => {
    expect(parseShopQuery("")).toEqual({});
  });

  it("accepts a category that has a tab", () => {
    expect(parseShopQuery("?category=AVATAR_AURA")).toEqual({ category: "AVATAR_AURA" });
  });

  it("accepts a card-back game variant", () => {
    for (const scope of CARD_BACK_SCOPES) {
      expect(parseShopQuery(`?category=CARD_BACK&scope=${scope}`)).toEqual({ category: "CARD_BACK", scope });
    }
  });

  it("drops a category with no tab, including ones that exist but are not sold", () => {
    expect(parseShopQuery("?category=TABLE_THEME")).toEqual({});
    expect(parseShopQuery("?category=PODIUM_TITLE")).toEqual({});
    expect(parseShopQuery("?category=nonsense")).toEqual({});
  });

  it("is case-sensitive, because the categories are a closed set", () => {
    expect(parseShopQuery("?category=avatar_aura")).toEqual({});
  });

  it("ignores a scope on any category but card backs", () => {
    expect(parseShopQuery("?category=DICE_SKIN&scope=uno")).toEqual({ category: "DICE_SKIN" });
  });

  it("drops a scope that is not a card-back game variant", () => {
    expect(parseShopQuery("?category=CARD_BACK&scope=ludo")).toEqual({ category: "CARD_BACK" });
    expect(parseShopQuery("?category=CARD_BACK&scope=GLOBAL")).toEqual({ category: "CARD_BACK" });
  });

  it("ignores a scope given without a usable category", () => {
    expect(parseShopQuery("?scope=uno")).toEqual({});
  });

  it("does not pass hostile values through", () => {
    expect(parseShopQuery("?category=<script>alert(1)</script>&scope=../../etc")).toEqual({});
    expect(parseShopQuery("?category=CARD_BACK&scope=uno%00")).toEqual({ category: "CARD_BACK" });
  });
});

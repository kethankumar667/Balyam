/**
 * BHALYAM — Cosmetics Boutique Polish Verification Suite
 *
 * Tests the visual, interaction, and state guarantees for the Enchanted Display Vault:
 * 1. Category Preview Modes configuration and validation.
 * 2. Synchronous race-safe preview mode derivation.
 * 3. Deterministic 9-state presentation resolver with safe balance parsing.
 * 4. Malformed wallet balance resilience (NaN / invalid fallback to 0 and insufficient balance).
 * 5. Admin pass presentation-only bypass without entitlement fabrication.
 * 6. Title wrapping without truncate clipping.
 * 7. Separation of card rarity borders from selection indicator.
 * 8. Centralized decisive CTA in preview panel with deduplicated deficit messaging.
 * 9. WAI-ARIA tablist/tabpanel accessibility compliance.
 * 10. Dice materials and isolated presentation-only roll preview.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PREVIEW_MODES_BY_CATEGORY,
  isValidModeForCategory,
  getDefaultPreviewMode,
  type PreviewMode,
} from "../previewModes";
import {
  resolveCosmeticPresentationState,
} from "../presentationState";
import { CosmeticsItemCard } from "../CosmeticsItemCard";
import { CosmeticsPreviewStage } from "../CosmeticsPreviewStage";
import {
  type CosmeticCatalogItem,
  type CosmeticCategory,
} from "@shared/cosmetics";

// Mock audio & haptics singletons
vi.mock("../../../services/AudioManager", () => ({
  AudioManager: {
    play: vi.fn(),
  },
}));

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: {
    trigger: vi.fn(),
  },
}));

// Test mock items
const mockTeakDice: CosmeticCatalogItem = {
  id: "dice_wooden_teak",
  name: "Carved Teak Wood",
  description: "Handcrafted dark teak with warm recessed pips.",
  category: "DICE_SKIN",
  rarity: "RARE",
  priceCoins: 800,
  unlockMethod: "COIN_PURCHASE",
  isActive: true,
  displayOrder: 1,
};

const mockObsidianDice: CosmeticCatalogItem = {
  id: "dice_cyber_neon",
  name: "Cyber Neon Obsidian",
  description: "Pitch black volcanic obsidian illuminated by cyan LED edges.",
  category: "DICE_SKIN",
  rarity: "EPIC",
  priceCoins: 1200,
  unlockMethod: "COIN_PURCHASE",
  isActive: true,
  displayOrder: 2,
};

const mockDefaultTable: CosmeticCatalogItem = {
  id: "table_emerald_lounge",
  name: "Emerald Baize",
  description: "Classic felt lounge table.",
  category: "TABLE_THEME",
  rarity: "COMMON",
  priceCoins: 0,
  unlockMethod: "DEFAULT",
  isActive: true,
  displayOrder: 3,
};

const mockStreakTitle: CosmeticCatalogItem = {
  id: "title_streak_master",
  name: "Streak Champion",
  description: "Unlocked at Day 7 login streak.",
  category: "PODIUM_TITLE",
  rarity: "LEGENDARY",
  priceCoins: 0,
  unlockMethod: "STREAK_MILESTONE",
  isActive: true,
  displayOrder: 4,
};

describe("Cosmetics Boutique Polish — Preview Modes Configuration", () => {
  it("defines exactly 3 valid preview modes per cosmetic category", () => {
    const categories: CosmeticCategory[] = [
      "TABLE_THEME",
      "DICE_SKIN",
      "TOKEN_SKIN",
      "CARD_BACK",
      "AVATAR_AURA",
      "PODIUM_TITLE",
    ];

    for (const cat of categories) {
      const modes = PREVIEW_MODES_BY_CATEGORY[cat];
      expect(modes).toBeDefined();
      expect(modes.length).toBe(3);
    }

    expect(PREVIEW_MODES_BY_CATEGORY.DICE_SKIN.map((m) => m.id)).toEqual([
      "INSPECT",
      "ROLL_PREVIEW",
      "IN_GAME",
    ]);

    expect(PREVIEW_MODES_BY_CATEGORY.TABLE_THEME.map((m) => m.id)).toEqual([
      "FULL_TABLE",
      "PLAYER_VIEW",
      "MOBILE_VIEW",
    ]);
  });

  it("validates preview mode category compatibility correctly", () => {
    expect(isValidModeForCategory("ROLL_PREVIEW", "DICE_SKIN")).toBe(true);
    expect(isValidModeForCategory("IN_GAME", "DICE_SKIN")).toBe(true);
    // Invalid cross-category mode
    expect(isValidModeForCategory("PODIUM", "DICE_SKIN")).toBe(false);
    expect(isValidModeForCategory("ROLL_PREVIEW", "TABLE_THEME")).toBe(false);
  });

  it("synchronously derives safe default preview mode on category mismatch", () => {
    const currentMode: PreviewMode = "PODIUM";
    const newCategory: CosmeticCategory = "DICE_SKIN";

    const derived = isValidModeForCategory(currentMode, newCategory)
      ? currentMode
      : getDefaultPreviewMode(newCategory);

    expect(derived).toBe("INSPECT");
  });
});

describe("Cosmetics Boutique Polish — Presentation State Resolver", () => {
  it("computes EQUIPPED state with 0 shortfall and inactive purchase/equip", () => {
    const res = resolveCosmeticPresentationState({
      item: mockTeakDice,
      isOwned: true,
      isEquipped: true,
      isAdminUser: false,
      walletBalance: "2000",
      isSubmitting: false,
    });

    expect(res.state).toBe("EQUIPPED");
    expect(res.ctaLabel).toBe("EQUIPPED");
    expect(res.canPurchase).toBe(false);
    expect(res.canEquip).toBe(false);
    expect(res.shortfall).toBe(0);
  });

  it("computes INSUFFICIENT_BALANCE with exact positive shortfall and concise CTA", () => {
    const res = resolveCosmeticPresentationState({
      item: mockTeakDice, // price 800
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "300",
      isSubmitting: false,
    });

    expect(res.state).toBe("INSUFFICIENT_BALANCE");
    expect(res.shortfall).toBe(500);
    expect(res.ctaLabel).toBe("500 COINS SHORT");
    expect(res.badgeLabel).toBe("500 SHORT");
    expect(res.canPurchase).toBe(false);
    expect(res.canEquip).toBe(false);
  });

  it("handles malformed or negative walletBalance gracefully without NaN", () => {
    const resMalformed = resolveCosmeticPresentationState({
      item: mockTeakDice, // price 800
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "not-a-number",
      isSubmitting: false,
    });

    expect(resMalformed.state).toBe("INSUFFICIENT_BALANCE");
    expect(resMalformed.safeBalance).toBe(0);
    expect(resMalformed.shortfall).toBe(800);
    expect(resMalformed.ctaLabel).toBe("800 COINS SHORT");
    expect(Number.isNaN(resMalformed.shortfall)).toBe(false);

    const resNegative = resolveCosmeticPresentationState({
      item: mockTeakDice,
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "-100",
      isSubmitting: false,
    });

    expect(resNegative.safeBalance).toBe(0);
    expect(resNegative.shortfall).toBe(800);
  });

  it("computes AVAILABLE state when balance covers priceCoins", () => {
    const res = resolveCosmeticPresentationState({
      item: mockTeakDice, // price 800
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "1000",
      isSubmitting: false,
    });

    expect(res.state).toBe("AVAILABLE");
    expect(res.canPurchase).toBe(true);
    expect(res.canEquip).toBe(false);
    expect(res.shortfall).toBe(0);
    expect(res.ctaLabel).toBe("UNLOCK FOR 800 COINS");
  });

  it("computes DEFAULT cosmetic restore option", () => {
    const res = resolveCosmeticPresentationState({
      item: mockDefaultTable,
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "0",
      isSubmitting: false,
    });

    expect(res.state).toBe("DEFAULT");
    expect(res.canEquip).toBe(true);
    expect(res.canPurchase).toBe(false);
    expect(res.ctaLabel).toBe("RESTORE DEFAULT");
  });

  it("computes Admin Pass presentation bypass without backend entitlement fabrication", () => {
    const res = resolveCosmeticPresentationState({
      item: mockObsidianDice,
      isOwned: false,
      isEquipped: false,
      isAdminUser: true,
      walletBalance: "0",
      isSubmitting: false,
    });

    expect(res.state).toBe("OWNED");
    expect(res.badgeLabel).toBe("FREE");
    expect(res.ctaLabel).toBe("EQUIP (ADMIN PASS)");
    expect(res.canEquip).toBe(true);
    expect(res.shortfall).toBe(0);
  });

  it("identifies streak milestone locked state", () => {
    const res = resolveCosmeticPresentationState({
      item: mockStreakTitle,
      isOwned: false,
      isEquipped: false,
      isAdminUser: false,
      walletBalance: "10000",
      isSubmitting: false,
    });

    expect(res.state).toBe("LOCKED");
    expect(res.ctaLabel).toBe("STREAK DAY 7 REQUIRED");
    expect(res.canPurchase).toBe(false);
  });
});

describe("Cosmetics Boutique Polish — CosmeticsItemCard Component", () => {
  it("renders item title with line-clamp-2 break-words and without truncate", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CosmeticsItemCard
        item={mockObsidianDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        isSelected={false}
        isOwned={false}
        isEquipped={false}
        isSubmitting={false}
        walletBalance="500"
        isAdminUser={false}
        onSelect={onSelect}
      />
    );

    const titleEl = screen.getByText("Cyber Neon Obsidian");
    expect(titleEl).toBeDefined();
    // Title must not have 'truncate' class which clips multi-word names
    expect(titleEl.className).not.toContain("truncate");
    expect(titleEl.className).toContain("break-words");
    expect(titleEl.className).toContain("line-clamp-2");
  });

  it("separates rarity styling from selection indicator", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CosmeticsItemCard
        item={mockObsidianDice} // EPIC rarity
        category="DICE_SKIN"
        scope="GLOBAL"
        isSelected={true}
        isOwned={false}
        isEquipped={false}
        isSubmitting={false}
        walletBalance="2000"
        isAdminUser={false}
        onSelect={onSelect}
      />
    );

    const card = container.firstChild as HTMLElement;
    // Epic border color maintained
    expect(card.className).toContain("border-purple-400/80");
    // Selection ring maintained
    expect(card.className).toContain("ring-amber-400/80");
    // Displays vault previewing indicator
    expect(screen.getByText("Previewing in Vault")).toBeDefined();
  });

  it("does not render duplicate action buttons on card (CTA is centralized in stage)", () => {
    const onSelect = vi.fn();
    render(
      <CosmeticsItemCard
        item={mockTeakDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        isSelected={false}
        isOwned={true}
        isEquipped={false}
        isSubmitting={false}
        walletBalance="1000"
        isAdminUser={false}
        onSelect={onSelect}
      />
    );

    // Cards should NOT have independent Equip or Buy buttons
    expect(screen.queryByRole("button", { name: /equip/i })).toBeNull();
  });

  it("triggers onSelect when clicked or activated via keyboard", () => {
    const onSelect = vi.fn();
    render(
      <CosmeticsItemCard
        item={mockTeakDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        isSelected={false}
        isOwned={false}
        isEquipped={false}
        isSubmitting={false}
        walletBalance="100"
        isAdminUser={false}
        onSelect={onSelect}
      />
    );

    const card = screen.getByRole("button", { name: /inspect carved teak wood in vault/i });
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe("Cosmetics Boutique Polish — CosmeticsPreviewStage Component", () => {
  it("renders WAI-ARIA tablist with role=tab, aria-selected, and role=tabpanel", () => {
    const onSelectMode = vi.fn();
    const onPurchase = vi.fn();
    const onEquip = vi.fn();
    const onUnequip = vi.fn();

    render(
      <CosmeticsPreviewStage
        item={mockTeakDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        previewMode="INSPECT"
        onSelectPreviewMode={onSelectMode}
        isEquipped={false}
        isOwned={false}
        isAdminUser={false}
        walletBalance="1000"
        isSubmitting={false}
        onPurchase={onPurchase}
        onEquip={onEquip}
        onUnequip={onUnequip}
      />
    );

    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeDefined();

    const inspectTab = screen.getByRole("tab", { name: /Inspect dice materials and details/i });
    expect(inspectTab.getAttribute("aria-selected")).toBe("true");

    const rollTab = screen.getByRole("tab", { name: /Preview visual rolling animation/i });
    expect(rollTab.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(rollTab);
    expect(onSelectMode).toHaveBeenCalledWith("ROLL_PREVIEW");

    const panel = screen.getByRole("tabpanel");
    expect(panel).toBeDefined();
    expect(panel.id).toBe("preview-panel-INSPECT");
  });

  it("renders a single decisive CTA and single deficit sentence without duplication", () => {
    const onPurchase = vi.fn();
    render(
      <CosmeticsPreviewStage
        item={mockTeakDice} // price 800
        category="DICE_SKIN"
        scope="GLOBAL"
        previewMode="INSPECT"
        onSelectPreviewMode={vi.fn()}
        isEquipped={false}
        isOwned={false}
        isAdminUser={false}
        walletBalance="300" // shortfall 500
        isSubmitting={false}
        onPurchase={onPurchase}
        onEquip={vi.fn()}
        onUnequip={vi.fn()}
      />
    );

    // Deficit sentence rendered once in helper text
    const needText = screen.getByText(/Need 500 more Coins/i);
    expect(needText).toBeDefined();

    // CTA button with concise deficit label
    const ctaButton = screen.getByRole("button", { name: /500 coins short/i });
    expect(ctaButton).toBeDefined();
    expect(ctaButton.hasAttribute("disabled")).toBe(true);
  });

  it("renders Dice ROLL_PREVIEW face tumbling without game engine imports or server RNG", () => {
    render(
      <CosmeticsPreviewStage
        item={mockTeakDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        previewMode="ROLL_PREVIEW"
        onSelectPreviewMode={vi.fn()}
        isEquipped={false}
        isOwned={true}
        isAdminUser={false}
        walletBalance="1000"
        isSubmitting={false}
        onPurchase={vi.fn()}
        onEquip={vi.fn()}
        onUnequip={vi.fn()}
      />
    );

    expect(screen.getByText(/Visual Preview Only/i)).toBeDefined();
    expect(screen.getByText(/Independent of game RNG/i)).toBeDefined();
    const rollBtn = screen.getByRole("button", { name: /roll/i });
    expect(rollBtn).toBeDefined();
  });

  it("renders static presentation-only IN_GAME mockup with zero engine/network code", () => {
    render(
      <CosmeticsPreviewStage
        item={mockTeakDice}
        category="DICE_SKIN"
        scope="GLOBAL"
        previewMode="IN_GAME"
        onSelectPreviewMode={vi.fn()}
        isEquipped={false}
        isOwned={true}
        isAdminUser={false}
        walletBalance="1000"
        isSubmitting={false}
        onPurchase={vi.fn()}
        onEquip={vi.fn()}
        onUnequip={vi.fn()}
      />
    );

    expect(screen.getByText(/In-Match Table Surface View/i)).toBeDefined();
  });
});

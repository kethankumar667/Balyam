import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import { ShopStrip } from "../ShopStrip";
import { ShopStage } from "../ShopStage";
import { ItemPreviewVisual } from "../ItemPreviewVisuals";
import { rarityVars, shopRarityOf, SHOP_RARITY } from "../shopRarity";
import { BLAZE_RING, DEFAULT_FRAME, frame } from "./fakeShop";

describe("ShopStrip", () => {
  const items = [DEFAULT_FRAME, frame(), BLAZE_RING];

  function renderStrip(over: { selectedId?: string; owned?: string[]; wearing?: string | null; items?: CosmeticCatalogItem[] } = {}) {
    const onSelect = vi.fn();
    const owned = new Set(over.owned ?? []);
    render(
      <ShopStrip
        items={over.items ?? items}
        category="AVATAR_AURA"
        selectedId={over.selectedId ?? "frame_bubble_float"}
        isOwned={(i) => i.unlockMethod === "DEFAULT" || owned.has(i.id)}
        isEquipped={(i) => i.id === (over.wearing ?? null)}
        onSelect={onSelect}
        label="Frames styles"
      />,
    );
    return { onSelect };
  }

  it("lists every style as an option and marks the selected one", () => {
    renderStrip();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByRole("option", { name: /Bubble Float/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("option", { name: /Blaze Ring/ }).getAttribute("aria-selected")).toBe("false");
  });

  it("selects a style when it is tapped", () => {
    const { onSelect } = renderStrip();

    fireEvent.click(screen.getByRole("option", { name: /Blaze Ring/ }));

    expect(onSelect).toHaveBeenCalledWith("frame_blaze_ring");
  });

  it("shows material dice faces on the shelf rather than generic dice icons", () => {
    const { container } = render(<ShopStrip
      items={[frame({ id: "dice_golden_ember", category: "DICE_SKIN", name: "Golden Ember" })]}
      category="DICE_SKIN" selectedId="dice_golden_ember"
      isOwned={() => false} isEquipped={() => false} onSelect={vi.fn()} label="Dice styles"
    />);
    const material = container.querySelector('[data-dice-material="dice_golden_ember"]');
    expect(material).not.toBeNull();
    const faces = material?.querySelectorAll("[data-die-face]");
    expect(faces).toHaveLength(6);
    expect(Array.from(faces ?? []).map((face) => Number(face.getAttribute("data-die-face"))).sort())
      .toEqual([1, 2, 3, 4, 5, 6]);
    for (const face of faces ?? []) {
      expect(face.querySelectorAll(".rounded-full")).toHaveLength(Number(face.getAttribute("data-die-face")));
      expect((face as HTMLElement).style.background).not.toBe("");
      expect((face as HTMLElement).style.transform).toContain("translateZ");
    }
  });

  it("moves the selection with the arrow keys, Home and End, and stops at the ends", () => {
    const { onSelect } = renderStrip();
    const selected = screen.getByRole("option", { name: /Bubble Float/ });

    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("frame_blaze_ring");

    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith("aura_none");

    fireEvent.keyDown(selected, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith("frame_blaze_ring");

    fireEvent.keyDown(selected, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith("aura_none");
  });

  it("does nothing when an arrow key has nowhere to go", () => {
    const { onSelect } = renderStrip({ selectedId: "frame_blaze_ring" });

    fireEvent.keyDown(screen.getByRole("option", { name: /Blaze Ring/ }), { key: "ArrowRight" });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("puts only the selected tile in the tab order", () => {
    renderStrip();

    expect(screen.getByRole("option", { name: /Bubble Float/ }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("option", { name: /Blaze Ring/ }).getAttribute("tabindex")).toBe("-1");
  });

  it("says each tile's state in words, not colour alone", () => {
    renderStrip({ owned: ["frame_blaze_ring"], wearing: "frame_blaze_ring" });

    expect(screen.getByRole("option", { name: /No Aura/ }).textContent).toContain("Default");
    expect(screen.getByRole("option", { name: /Bubble Float/ }).textContent).toContain("600");
    expect(screen.getByRole("option", { name: /Blaze Ring/ }).textContent).toContain("Equipped");
  });

  it("shows Owned for something unlocked but not worn, and Locked for a streak reward", () => {
    renderStrip({
      owned: ["frame_bubble_float"],
      items: [frame(), frame({ id: "frame_diya_glow", name: "Diya Glow", unlockMethod: "STREAK_MILESTONE", priceCoins: 0 })],
    });

    expect(screen.getByRole("option", { name: /Bubble Float/ }).textContent).toContain("Owned");
    expect(screen.getByRole("option", { name: /Diya Glow/ }).textContent).toContain("Locked");
  });
});

describe("ShopStage", () => {
  it.each([false, true])("reduces preview artwork by 20% without scaling stage navigation (compact=%s)", (compact) => {
    const { container } = render(<ShopStage
      item={frame()} category="AVATAR_AURA" scope="GLOBAL" mode="PROFILE"
      onModeChange={vi.fn()} onStep={vi.fn()} compact={compact}
    />);
    const artwork = container.querySelector("[data-shop-preview-scale]");
    expect(artwork?.className).toContain(compact ? "scale-[0.84]" : "scale-[1.24]");
    expect(artwork?.className).toContain(compact ? "scale-[0.64]" : "scale-[0.8]");
    expect(artwork?.contains(screen.getByRole("button", { name: "Next style" }))).toBe(false);
    expect(artwork?.contains(screen.getByRole("tablist", { name: "Preview context" }))).toBe(false);
  });

  function renderStage(over: { category?: "AVATAR_AURA" | "DICE_SKIN"; item?: CosmeticCatalogItem; withSteps?: boolean } = {}) {
    const onModeChange = vi.fn();
    const onStep = vi.fn();
    const category = over.category ?? "AVATAR_AURA";
    render(
      <ShopStage
        item={over.item ?? frame()}
        category={category}
        scope="GLOBAL"
        mode={category === "DICE_SKIN" ? "INSPECT" : "PROFILE"}
        onModeChange={onModeChange}
        onStep={over.withSteps === false ? undefined : onStep}
      />,
    );
    return { onModeChange, onStep };
  }

  it("offers the preview contexts as an accessible tablist with the current one selected", () => {
    renderStage();

    expect(screen.getByRole("tablist", { name: "Preview context" })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Profile/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Game Seat/i }).getAttribute("aria-selected")).toBe("false");
    // One stable panel for every context, so every tab's aria-controls points at something that exists.
    const panel = screen.getByRole("tabpanel");
    expect(panel.id).toBe("preview-panel");
    for (const tab of screen.getAllByRole("tab")) expect(tab.getAttribute("aria-controls")).toBe(panel.id);
  });

  it("switches context when a tab is chosen, and with the arrow keys", () => {
    const { onModeChange } = renderStage();

    fireEvent.click(screen.getByRole("tab", { name: /Game Seat/i }));
    expect(onModeChange).toHaveBeenLastCalledWith("GAME_SEAT");

    fireEvent.keyDown(screen.getByRole("tab", { name: /Profile/i }), { key: "ArrowRight" });
    expect(onModeChange).toHaveBeenLastCalledWith("GAME_SEAT");
  });

  it("uses each category's own contexts (dice can be rolled)", () => {
    renderStage({ category: "DICE_SKIN", item: frame({ id: "dice_wooden_teak", category: "DICE_SKIN", name: "Carved Teak" }) });

    expect(screen.getByRole("tab", { name: /Inspect dice materials and details/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Preview visual rolling animation/i })).toBeDefined();
  });

  it.each(["INSPECT", "ROLL_PREVIEW", "IN_GAME"] as const)("renders a six-faced die in %s, not a single tile", (mode) => {
    const { container } = render(<ItemPreviewVisual
      item={frame({ id: "dice_golden_ember", category: "DICE_SKIN" })}
      category="DICE_SKIN" scope="GLOBAL" mode={mode} displayName="Player" avatarId={null}
    />);
    expect(container.querySelectorAll("[data-die-face]")).toHaveLength(6);
    expect(container.querySelector<HTMLElement>("[data-die-cube]")?.style.transformStyle).toBe("preserve-3d");
  });

  it("names the rarity in text on a solid badge", () => {
    renderStage({ item: BLAZE_RING });

    expect(screen.getByText("Epic")).toBeDefined();
  });

  it("steps through the styles with the arrows, when it is given a way to", () => {
    const { onStep } = renderStage();

    fireEvent.click(screen.getByRole("button", { name: "Next style" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous style" }));

    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(2, -1);
  });

  it("has no arrows when it is not given a way to step (the phone steps with the strip)", () => {
    renderStage({ withSteps: false });

    expect(screen.queryByRole("button", { name: "Next style" })).toBeNull();
  });
});

describe("ItemPreviewVisual", () => {
  const teak: CosmeticCatalogItem = frame({ id: "dice_wooden_teak", category: "DICE_SKIN", name: "Carved Teak Wood", rarity: "RARE" });

  it("shows the inspected die without a material-inspection caption", () => {
    const { container } = render(<ItemPreviewVisual item={teak} category="DICE_SKIN" scope="GLOBAL" mode="INSPECT" displayName="Kay" avatarId={null} />);
    expect(container.querySelectorAll("[data-die-face]")).toHaveLength(6);
    expect(screen.queryByText(/3D Tactile Material Inspection/i)).toBeNull();
  });

  it("renders the dice roll preview as presentation only, independent of game RNG", () => {
    render(<ItemPreviewVisual item={teak} category="DICE_SKIN" scope="GLOBAL" mode="ROLL_PREVIEW" displayName="Kay" avatarId={null} />);

    expect(screen.getByText(/Visual Preview Only/i)).toBeDefined();
    expect(screen.getByText(/Independent of game RNG/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /roll/i })).toBeDefined();
  });

  it("renders the in-game dice mockup with no engine or network code", () => {
    render(<ItemPreviewVisual item={teak} category="DICE_SKIN" scope="GLOBAL" mode="IN_GAME" displayName="Kay" avatarId={null} />);

    expect(screen.getByText(/In-Match Table Surface View/i)).toBeDefined();
  });

  it("draws a Rummy card back that has no art of its own as Rummy's, not as UNO's red 'ONE' card", () => {
    // Regression: the fallback design was UNO's red card for every game, so a Rummy default previewed as one.
    const navy = frame({ id: "cardback_classic_navy", category: "CARD_BACK", name: "Classic Navy Mandala" });
    render(<ItemPreviewVisual item={navy} category="CARD_BACK" scope="rummy" mode="CARD_BACK" displayName="Kay" avatarId={null} />);

    expect(screen.getByText("RUMMY")).toBeDefined();
    expect(screen.queryByText("ONE")).toBeNull();
  });

  it("keeps UNO's red 'ONE' card for UNO", () => {
    const uno = frame({ id: "cardback_classic_uno", category: "CARD_BACK", name: "Classic UNO" });
    render(<ItemPreviewVisual item={uno} category="CARD_BACK" scope="uno" mode="CARD_BACK" displayName="Kay" avatarId={null} />);

    expect(screen.getByText("ONE")).toBeDefined();
  });
});

describe("shop rarity colours", () => {
  it("gives every rarity its own colour and a text label", () => {
    const rgbs = new Set(Object.values(SHOP_RARITY).map((r) => r.rgb));
    expect(rgbs.size).toBe(4);
    expect(SHOP_RARITY.LEGENDARY.label).toBe("Legendary");
  });

  it("uses dark ink on the gold, where white would not be readable", () => {
    expect(SHOP_RARITY.LEGENDARY.onSolid).not.toBe("#FFFFFF");
    expect(SHOP_RARITY.EPIC.onSolid).toBe("#FFFFFF");
  });

  it("falls back to Common for an unknown rarity instead of throwing", () => {
    // @ts-expect-error — an unrecognised value from outside the closed set
    expect(shopRarityOf("MYTHIC")).toBe(SHOP_RARITY.COMMON);
    expect(shopRarityOf(undefined)).toBe(SHOP_RARITY.COMMON);
  });

  it("publishes the colour as a CSS variable for the band, plate and underline to share", () => {
    expect((rarityVars("RARE") as Record<string, string>)["--shop-rar"]).toBe(SHOP_RARITY.RARE.rgb);
  });
});

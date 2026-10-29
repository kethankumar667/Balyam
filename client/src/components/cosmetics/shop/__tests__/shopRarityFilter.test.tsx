import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShopMobile } from "../ShopMobile";
import { ShopDesktop } from "../ShopDesktop";
import { BLAZE_RING, DEFAULT_FRAME, frame, makeShop } from "./fakeShop";

// The invitation promo has its own tests (features/referrals); the shop is tested without a router or a store.
vi.mock("../../../../features/referrals/InvitePromo", () => ({ InvitePromo: () => null }));

describe.each([ShopMobile, ShopDesktop])("rarity shelf", (Layout) => {
  it("uses the newly previewed item's ownership and price after filtering", () => {
    const epic = frame({ ...BLAZE_RING, priceCoins: 600 });
    const shop = makeShop({ previewItem: DEFAULT_FRAME, categoryItems: [DEFAULT_FRAME, epic] });
    render(<Layout shop={shop} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Epic" }));
    const unlock = screen.getByRole("button", { name: /Unlock.*600/i });
    fireEvent.click(unlock);
    expect(shop.purchase).toHaveBeenCalledWith(epic);
  });

  it.each(["Common", "Rare", "Epic", "Legendary"] as const)("uses actual %s catalog rarity", (label) => {
    const rarity = label.toUpperCase() as "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    const matching = frame({ rarity });
    const shop = makeShop({ categoryItems: [matching, frame({ id: "frame_blaze_ring", rarity: rarity === "COMMON" ? "EPIC" : "COMMON" })] });
    render(<Layout shop={shop} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option").textContent).toContain(matching.name);
  });

  it("resets the filter for category and card variant changes", () => {
    const shop = makeShop();
    const { rerender } = render(<Layout shop={shop} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Epic" }));
    rerender(<Layout shop={{ ...shop, selectedCategory: "CARD_BACK", selectedScope: "rummy" }} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Rare" }));
    rerender(<Layout shop={{ ...shop, selectedCategory: "CARD_BACK", selectedScope: "uno" }} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("filters selection and stage navigation together, and recovers from an empty rarity", () => {
    const shop = makeShop({ categoryItems: [DEFAULT_FRAME, frame(), BLAZE_RING] });
    render(<Layout shop={shop} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Epic" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option").textContent).toContain("Blaze Ring");
    expect(screen.getByRole("option").getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("button", { name: "Next style" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Legendary" }));
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status", { name: "Filtered styles" }).textContent).toContain("No legendary styles");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
});

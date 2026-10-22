import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ShopPage from "../ShopPage";
import { useCosmeticsStore } from "../../store/cosmeticsStore";

// The page's own behaviour is under test, not the app chrome around it (header, sidebar, wallet drawer…).
vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("../../hooks/useEconomy", () => ({
  useWallet: () => ({ wallet: null, status: "loaded", balance: "500", isLoading: false, error: null }),
}));

const viewport = vi.hoisted(() => ({ value: "desktop" as "desktop" | "mobile" }));
vi.mock("../../lib/useViewport", () => ({ useViewport: () => viewport.value }));

const fetchCosmetics = vi.fn(async () => {});

beforeEach(() => {
  viewport.value = "desktop";
  fetchCosmetics.mockClear();
  useCosmeticsStore.setState({
    fetchCosmetics,
    catalog: [],
    selectedCategory: "DICE_SKIN",
    selectedScope: "GLOBAL",
    selectedItemId: null,
    errorMessage: null,
  });
});

function renderShop(entries: string[], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/games" element={<div>games page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ShopPage — it is a page, not a dialog", () => {
  it("renders inside the app layout with no dialog on screen", () => {
    renderShop(["/shop"]);

    expect(screen.getByTestId("app-layout")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws the desktop boutique from 768px up", () => {
    viewport.value = "desktop";
    renderShop(["/shop"]);

    expect(screen.getByRole("heading", { level: 1, name: /Cosmetics Boutique/i })).toBeDefined();
  });

  it("draws the phone boutique below 768px", () => {
    viewport.value = "mobile";
    renderShop(["/shop"]);

    expect(screen.getByRole("heading", { level: 2, name: "Boutique" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1, name: /Cosmetics Boutique/i })).toBeNull();
  });
});

describe("ShopPage — landing on a tab", () => {
  it("lands on the tab named in the deep link", () => {
    renderShop(["/shop?category=AVATAR_AURA"]);

    expect(useCosmeticsStore.getState().selectedCategory).toBe("AVATAR_AURA");
    expect(screen.getByRole("tab", { name: /Frames/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("lands on a card-back game variant named in the link", () => {
    renderShop(["/shop?category=CARD_BACK&scope=uno"]);

    expect(useCosmeticsStore.getState().selectedCategory).toBe("CARD_BACK");
    expect(useCosmeticsStore.getState().selectedScope).toBe("uno");
  });

  it("keeps the tab the player last browsed when the link names nothing usable", () => {
    useCosmeticsStore.setState({ selectedCategory: "CARD_BACK", selectedScope: "rummy" });

    renderShop(["/shop?category=NOT_A_TAB"]);

    expect(useCosmeticsStore.getState().selectedCategory).toBe("CARD_BACK");
  });

  it("refreshes the catalog on arrival", () => {
    renderShop(["/shop"]);

    expect(fetchCosmetics).toHaveBeenCalledTimes(1);
  });
});

describe("ShopPage — Back", () => {
  it("returns to the page the player came from", () => {
    renderShop(["/games", "/shop"], 1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("games page")).toBeDefined();
  });

  it("goes home when the shop was the first thing opened, rather than leaving the site", () => {
    renderShop(["/shop"]);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("home page")).toBeDefined();
  });

  it("works the same on the phone layout", () => {
    viewport.value = "mobile";
    renderShop(["/games", "/shop"], 1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("games page")).toBeDefined();
  });
});

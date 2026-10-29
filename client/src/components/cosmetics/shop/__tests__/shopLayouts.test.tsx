import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ShopDesktop } from "../ShopDesktop";
import { ShopMobile } from "../ShopMobile";
import { REASSURANCE } from "../ShopNav";
import { BLAZE_RING, DEFAULT_FRAME, frame, makeEmptyShop, makeShop, type FakeShopOptions } from "./fakeShop";

// The invitation promo has its own tests (features/referrals); the layouts are tested without a router or a store.
vi.mock("../../../../features/referrals/InvitePromo", () => ({ InvitePromo: () => null }));

/**
 * The two layouts are separate designs over one set of state and actions, so the same scenarios are run
 * through both: whatever the shopper can do on a desktop they can do on a phone, in the same words.
 */
const layouts = [
  ["desktop", ShopDesktop],
  ["phone", ShopMobile],
] as const;

function show(Layout: typeof ShopDesktop | typeof ShopMobile, over: FakeShopOptions = {}) {
  const shop = makeShop(over);
  const onBack = vi.fn();
  render(<Layout shop={shop} onBack={onBack} />);
  return { shop, onBack };
}

describe.each(layouts)("shop — %s layout", (_name, Layout) => {
  it("does not call an unavailable balance zero or invent a coin shortfall", () => {
    show(Layout, { walletBalance: null, walletStatus: "unavailable", walletError: "Wallet could not be loaded." });
    expect(screen.getByRole("status", { name: "Wallet unavailable" })).toBeDefined();
    expect(screen.queryByText(/You need .* more coins/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Unlock for/ })).toBeNull();
    expect((screen.getByRole("button", { name: "Balance unavailable" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps owned styles equippable while the wallet is unavailable and offers a wallet retry", () => {
    const { shop } = show(Layout, { walletBalance: null, walletStatus: "error", walletError: "Wallet could not be loaded.", ownedIds: new Set(["frame_bubble_float"]) });
    fireEvent.click(screen.getByRole("button", { name: "Equip frame" }));
    expect(shop.equip).toHaveBeenCalledWith(shop.previewItem);
    fireEvent.click(screen.getByRole("button", { name: "Retry wallet" }));
    expect(shop.retryWallet).toHaveBeenCalledOnce();
  });

  it("shows loading instead of zero before the first balance arrives", () => {
    show(Layout, { walletBalance: null, walletStatus: "loading" });
    expect(screen.getByRole("status", { name: "Loading wallet balance" }).getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("status", { name: "Your balance: 0 coins" })).toBeNull();
  });

  it("keeps balances above the safe-number limit exact", () => {
    show(Layout, { walletBalance: "9007199254740993" });
    expect(screen.getByRole("status", { name: "Your balance: 9,007,199,254,740,993 coins" })).toBeDefined();
  });

  it("provides a catalog retry instead of describing a failure as an empty category", () => {
    const { shop } = show(Layout, { ...makeEmptyShop(), errorMessage: "Failed to load cosmetics catalog. Please try again." });
    fireEvent.click(screen.getByRole("button", { name: "Retry shop" }));
    expect(shop.retryCatalog).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Nothing in .* yet/)).toBeNull();
  });

  it("shows real collection progress", () => {
    show(Layout, { ownedIds: new Set(["frame_blaze_ring"]) });
    const collection = screen.getByRole("progressbar", { name: "Your collection" });
    expect(collection.getAttribute("aria-valuenow")).toBe("2");
    expect(collection.getAttribute("aria-valuemax")).toBe("3");
    expect(screen.getByText("2 / 3 unlocked")).toBeDefined();
    expect(screen.queryByText(/Special offers|Limited time/i)).toBeNull();
  });

  it("does not present Admin Pass access as earned collection ownership", () => {
    show(Layout, { isAdminUser: true });
    expect(screen.queryByRole("progressbar", { name: "Your collection" })).toBeNull();
    expect(screen.getByText(/not earned ownership/)).toBeDefined();
  });

  it("places the collectible shelf after a cinematic hero and labels rarity on the cards", () => {
    const { container } = render(<Layout shop={makeShop()} onBack={vi.fn()} />);
    expect(container.querySelector("[data-shop-hero]")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "All frames" })).toBeDefined();
    expect(within(screen.getByRole("option", { name: /Blaze Ring/ })).getByText("Epic")).toBeDefined();
  });

  it("shows the page title, the balance and the promise that nothing here changes a match", () => {
    show(Layout);

    expect(screen.getByRole("heading", { level: 1, name: "Shop" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Your balance: 2,000 coins" })).toBeDefined();
    expect(screen.getAllByText(REASSURANCE)).toHaveLength(1);
  });

  it("goes back from the Back button", () => {
    const { onBack } = show(Layout);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("lists the four categories as tabs and switches category on a tap", () => {
    const { shop } = show(Layout);

    const tabs = within(screen.getByRole("tablist", { name: "Cosmetic categories" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Dice", "Tokens", "Cards", "Frames"]);
    expect(screen.getByRole("tab", { name: "Frames" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Dice" }));

    expect(shop.selectCategory).toHaveBeenCalledWith("DICE_SKIN");
  });

  it("names the selected style and offers to unlock it for its price when the shopper can afford it", () => {
    const { shop } = show(Layout);

    expect(screen.getByRole("heading", { level: 2, name: "Bubble Float" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Unlock for 600 coins/ }));

    expect(shop.purchase).toHaveBeenCalledWith(shop.previewItem);
  });

  it("says how many coins are missing, once, and cannot be pressed when it is too expensive", () => {
    show(Layout, { walletBalance: "100" });

    const button = screen.getByRole("button", { name: /600 coins/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getAllByText("You need 500 more coins.")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Unlock/ })).toBeNull();
  });

  it("tells a buyer about the refund before they pay, once", () => {
    show(Layout);

    expect(screen.getAllByText(/Full refund within 15 minutes/)).toHaveLength(1);
  });

  it("moves between the category tabs with the arrow keys, one tab stop for the group", () => {
    const { shop } = show(Layout);

    const frames = screen.getByRole("tab", { name: "Frames" });
    expect(frames.getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: "Dice" }).getAttribute("tabindex")).toBe("-1");
    expect(frames.getAttribute("aria-controls")).toBe(screen.getByRole("tabpanel", { name: "Frames" }).id);

    fireEvent.keyDown(frames, { key: "ArrowRight" });

    expect(shop.selectCategory).toHaveBeenCalledWith("DICE_SKIN");
  });

  it("equips something the shopper owns", () => {
    const { shop } = show(Layout, { ownedIds: new Set(["frame_bubble_float"]) });

    fireEvent.click(screen.getByRole("button", { name: "Equip frame" }));

    expect(shop.equip).toHaveBeenCalledWith(shop.previewItem);
  });

  it("confirms what is worn, and lets the shopper reset it or take the refund", () => {
    const { shop } = show(Layout, { ownedIds: new Set(["frame_bubble_float"]), wearing: "frame_bubble_float" });

    expect(screen.getAllByText("Equipped").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Equip frame" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(shop.unequip).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Refund 600 coins" }));
    expect(shop.refund).toHaveBeenCalledWith(shop.previewItem);
  });

  it("recognises the frame the shopper is already wearing in the strip", () => {
    show(Layout, { ownedIds: new Set(["frame_blaze_ring"]), wearing: "frame_blaze_ring" });

    expect(screen.getByRole("option", { name: /Blaze Ring/ }).textContent).toContain("Equipped");
  });

  it("selects another style from the strip", () => {
    const { shop } = show(Layout);

    fireEvent.click(screen.getByRole("option", { name: /Blaze Ring/ }));

    expect(shop.selectItem).toHaveBeenCalledWith(BLAZE_RING.id);
  });

  it("offers Rummy and UNO for card backs only", () => {
    const { shop } = show(Layout, { selectedCategory: "CARD_BACK", selectedScope: "rummy" });

    expect(screen.getByRole("button", { name: "Rummy" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "UNO" }));
    expect(shop.selectScope).toHaveBeenCalledWith("uno");
  });

  it("has no game switch on the other tabs", () => {
    show(Layout);

    expect(screen.queryByRole("group", { name: "Card backs for" })).toBeNull();
  });

  it("says so while the catalogue is loading, and when a category is empty", () => {
    const { unmount } = render(<Layout shop={makeEmptyShop({ isLoading: true })} onBack={vi.fn()} />);
    expect(screen.getByText("Loading the shop…")).toBeDefined();
    unmount();

    render(<Layout shop={makeEmptyShop()} onBack={vi.fn()} />);
    expect(screen.getByText("Nothing in frames yet.")).toBeDefined();
  });

  it("shows a failure as an alert instead of swallowing it", () => {
    show(Layout, { errorMessage: "Could not reach the shop." });

    expect(within(screen.getByRole("alert")).getByText("Could not reach the shop.")).toBeDefined();
  });

  it("does not show a failed empty catalog as a zero collection", () => {
    render(<Layout shop={makeEmptyShop({ errorMessage: "Could not reach the shop." })} onBack={vi.fn()} />);
    expect(screen.getByText(/Collection unavailable/)).toBeDefined();
    expect(screen.queryByRole("progressbar", { name: "Your collection" })).toBeNull();
  });

  it("keeps actions disabled while a transaction is pending", () => {
    const { shop } = show(Layout, { isSubmitting: true });
    const buttons = screen.getAllByRole("button").filter((button) => (button as HTMLButtonElement).disabled);
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => fireEvent.click(button));
    expect(shop.purchase).not.toHaveBeenCalled();
    expect(shop.equip).not.toHaveBeenCalled();
  });

  it("keeps the Admin Pass free of prices", () => {
    show(Layout, { isAdminUser: true, walletBalance: "0" });

    expect(screen.getByRole("button", { name: /free with Admin Pass/ })).toBeDefined();
    expect(screen.queryByText(/more coins/)).toBeNull();
  });
});

describe("shop — what differs between the layouts", () => {
  it.each([ShopDesktop, ShopMobile])("steps through stage arrows, wrapping round at both ends", (Layout) => {
    const shop = makeShop({ previewItem: BLAZE_RING });
    const { unmount } = render(<Layout shop={shop} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Next style" }));

    expect(shop.selectItem).toHaveBeenCalledWith(DEFAULT_FRAME.id);
    unmount();
    const first = makeShop({ previewItem: DEFAULT_FRAME });
    render(<Layout shop={first} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous style" }));
    expect(first.selectItem).toHaveBeenCalledWith(BLAZE_RING.id);
  });

  it.each([ShopDesktop, ShopMobile])("has no step arrows when there is only one style", (Layout) => {
    render(<Layout shop={makeShop({ categoryItems: [frame()] })} onBack={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Next style" })).toBeNull();
  });

  it("puts the promise under the title on the desktop and beside the action on the phone", () => {
    const { container, unmount } = render(<ShopDesktop shop={makeShop()} onBack={vi.fn()} />);
    expect(container.querySelector("h1")?.parentElement?.textContent).toContain(REASSURANCE);
    unmount();

    const phone = render(<ShopMobile shop={makeShop()} onBack={vi.fn()} />);
    expect(phone.container.querySelector("h1")?.parentElement?.textContent).not.toContain(REASSURANCE);
    expect(screen.getByText(REASSURANCE)).toBeDefined();
  });
});

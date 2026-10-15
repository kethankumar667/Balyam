import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LootRevealCard } from "../LootRevealCard";
import type { LootItem } from "../types";

const COINS: LootItem = {
  id: "c",
  type: "coins",
  title: "15,000 Coins",
  description: "Arrives in 24 hr",
  amount: 15_000,
  rarity: "legendary",
};
const TITLE: LootItem = {
  id: "t",
  type: "title",
  title: "Mastermind Elite",
  description: "Exclusive Title for Level 50",
  rarity: "epic",
  badgeText: "PRESTIGE TITLE",
};

describe("LootRevealCard", () => {
  afterEach(cleanup);

  it("renders the full card by default", () => {
    const { container } = render(<LootRevealCard item={COINS} />);
    expect(container.firstElementChild?.getAttribute("data-layout")).toBe("card");
    expect(screen.getByText("15,000 Coins")).toBeDefined();
  });

  describe("row layout (the phone summary)", () => {
    it("is flagged as a row", () => {
      const { container } = render(<LootRevealCard item={TITLE} layout="row" />);
      expect(container.firstElementChild?.getAttribute("data-layout")).toBe("row");
    });

    it("keeps every fact of the reward: badge, full title, description", () => {
      render(<LootRevealCard item={TITLE} layout="row" />);
      expect(screen.getByText("PRESTIGE TITLE")).toBeDefined();
      expect(screen.getByText("Mastermind Elite")).toBeDefined();
      expect(screen.getByText("Exclusive Title for Level 50")).toBeDefined();
    });

    it("states a coin reward once, in its title, instead of repeating the amount beside it", () => {
      render(<LootRevealCard item={COINS} layout="row" />);
      expect(screen.getByText("15,000 Coins")).toBeDefined();
      expect(screen.queryByText("+")).toBeNull();
    });

    it("falls back to the rarity name when the item has no badge text", () => {
      render(<LootRevealCard item={COINS} layout="row" />);
      expect(screen.getByText("LEGENDARY")).toBeDefined();
    });

    it("lets a long title wrap instead of cutting it off", () => {
      render(<LootRevealCard item={{ ...TITLE, title: "Monthly Champion of the Whole Lounge" }} layout="row" />);
      const heading = screen.getByText("Monthly Champion of the Whole Lounge");
      expect(heading.className).not.toContain("truncate");
    });
  });
});

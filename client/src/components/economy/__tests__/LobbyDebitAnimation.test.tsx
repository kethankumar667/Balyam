import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LobbyDebitAnimation, type DebitAnimationItem } from "../LobbyDebitAnimation";

describe("LobbyDebitAnimation Component", () => {
  const sampleItems: DebitAnimationItem[] = [
    {
      id: "d1",
      playerId: "p1",
      playerName: "Alice",
      amount: 100,
      startX: 120,
      startY: 240,
      targetX: 500,
      targetY: 100,
      createdAt: Date.now(),
    },
  ];

  it("renders nothing when items array is empty", () => {
    const { container } = render(<LobbyDebitAnimation items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders debit amount and DEBIT label", () => {
    render(<LobbyDebitAnimation items={sampleItems} />);
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("Debit")).toBeDefined();
  });

  it("renders coin particles container with aria-hidden for accessibility", () => {
    const { container } = render(<LobbyDebitAnimation items={sampleItems} />);
    expect(container.firstChild).not.toBeNull();
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeDefined();
  });

  it("caps visible debit items to maximum 4 concurrent items", () => {
    const manyItems: DebitAnimationItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`,
      playerId: `p${i}`,
      amount: 100 * (i + 1),
      startX: 100,
      startY: 100,
      targetX: 400,
      targetY: 400,
      createdAt: Date.now(),
    }));

    render(<LobbyDebitAnimation items={manyItems} />);
    // Active items are sliced to -4, so only the last 4 amounts should be rendered
    expect(screen.queryByText("100")).toBeNull();
    expect(screen.getByText("800")).toBeDefined();
    expect(screen.getByText("700")).toBeDefined();
    expect(screen.getByText("600")).toBeDefined();
    expect(screen.getByText("500")).toBeDefined();
  });
});

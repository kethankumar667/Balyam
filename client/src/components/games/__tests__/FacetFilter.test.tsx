import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FacetFilter, { INITIAL_FACETS, matchesFacets, type GameFacets } from "../FacetFilter";
import { BHALYAM_GAMES } from "../../bhalyam/data";

describe("FacetFilter Component & Matching Logic", () => {
  it("evaluates matchesFacets correctly for player count", () => {
    const ludo = BHALYAM_GAMES.find((g) => g.slug === "ludo")!;
    expect(ludo).toBeDefined();

    // Ludo is 2-4 players
    const soloFacet: GameFacets = { ...INITIAL_FACETS, playerCount: ["solo"] };
    const partyFacet: GameFacets = { ...INITIAL_FACETS, playerCount: ["party"] };

    expect(matchesFacets(ludo, partyFacet)).toBe(true);
  });

  it("evaluates matchesFacets correctly for game duration", () => {
    const quickGame = BHALYAM_GAMES.find((g) => g.duration?.includes("5") || g.duration?.includes("3"));
    if (quickGame) {
      const quickFacet: GameFacets = { ...INITIAL_FACETS, duration: ["quick"] };
      expect(matchesFacets(quickGame, quickFacet)).toBe(true);
    }
  });

  it("renders trigger button with filter facets and expands panel on click", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <FacetFilter
        facets={INITIAL_FACETS}
        onChange={onChange}
        onReset={onReset}
        totalMatches={12}
      />
    );

    const triggerBtn = screen.getByText(/Filter Facets/i);
    expect(triggerBtn).toBeDefined();

    // Click to open facets drawer
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/Player Count/i)).toBeDefined();
    expect(screen.getByText(/Game Type/i)).toBeDefined();
    expect(screen.getByText(/Duration/i)).toBeDefined();
  });

  it("calls onReset when reset button is clicked", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    const activeFacets: GameFacets = {
      ...INITIAL_FACETS,
      playerCount: ["solo"],
    };

    render(
      <FacetFilter
        facets={activeFacets}
        onChange={onChange}
        onReset={onReset}
        totalMatches={4}
      />
    );

    const resetBtn = screen.getByText(/Reset/i);
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalled();
  });
});

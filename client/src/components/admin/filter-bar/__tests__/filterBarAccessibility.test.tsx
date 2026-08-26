import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FilterBar, { type FilterOption } from "../index";

function makeFilter(overrides: Partial<FilterOption> = {}): FilterOption {
  return {
    id: "role",
    label: "Role",
    value: "all",
    options: [{ label: "All", value: "all" }],
    onChange: vi.fn(),
    ...overrides,
  };
}

describe("FilterBar — accessible names (Phase 2 §3)", () => {
  it("regression: a filter dropdown's accessible name defaults to 'Filter by <label>', not the bare label — 'Role, combobox' says less out of context than 'Filter by Role, combobox'", () => {
    render(<FilterBar filters={[makeFilter({ label: "Role" })]} />);
    expect(screen.getByRole("combobox", { name: "Filter by Role" })).toBeDefined();
  });

  it("matches the task's named examples for game/severity", () => {
    render(
      <FilterBar
        filters={[
          makeFilter({ id: "game", label: "Game" }),
          makeFilter({ id: "severity", label: "Severity" }),
        ]}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Filter by Game" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Filter by Severity" })).toBeDefined();
  });

  it("an explicit ariaLabel overrides the default when the bare label reads awkwardly (e.g. 'State & Env')", () => {
    render(
      <FilterBar
        filters={[makeFilter({ id: "status", label: "State & Env", ariaLabel: "Filter by environment" })]}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Filter by environment" })).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "Filter by State & Env" })).toBeNull();
  });

  it("regression: the reset button has an explicit, unambiguous accessible name", () => {
    render(
      <FilterBar
        filters={[makeFilter({ value: "admin" })]}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeDefined();
  });
});

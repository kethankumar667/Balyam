import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrainVitaThemeDialog, type SlateChoice } from "../BrainVitaThemeDialog";
import { SCHOOL_SLATE_REQUIREMENT } from "../../../lib/schoolSlate";
import type { EarnedSkinId } from "../brainvitaSkins";

const ORDER: readonly EarnedSkinId[] = ["holo", "zen", "reef", "toy", "palace"];

function open(slate: SlateChoice | undefined, onSelectSkin = vi.fn()) {
  render(
    <BrainVitaThemeDialog open onClose={vi.fn()} skin="wood" unlocked={["wood", "zen"]} order={ORDER} onSelectSkin={onSelectSkin} slate={slate} />,
  );
  return onSelectSkin;
}

describe("Goli Jump world picker: School Slate", () => {
  it("lists the slate right after Classic wood, before the earned worlds", () => {
    open({ isOn: false, isOwned: true, error: null, select: vi.fn() });
    const names = screen.getAllByRole("radio").map((row) => row.textContent ?? "");
    expect(names[0]).toContain("Classic wood");
    expect(names[1]).toContain("School Slate");
  });

  it("is left out when the screen gives it no slate", () => {
    open(undefined);
    expect(screen.queryByRole("radio", { name: /School Slate/ })).not.toBeInTheDocument();
  });

  it("puts the slate on when an owner taps it", () => {
    const select = vi.fn();
    open({ isOn: false, isOwned: true, error: null, select });
    fireEvent.click(screen.getByRole("radio", { name: /School Slate/ }));
    expect(select).toHaveBeenCalledOnce();
  });

  it("shows what it takes, and does nothing, for an account that has not earned it", () => {
    const select = vi.fn();
    open({ isOn: false, isOwned: false, error: null, select });
    const row = screen.getByRole("radio", { name: /School Slate/ });
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(SCHOOL_SLATE_REQUIREMENT)).toBeInTheDocument();
    fireEvent.click(row);
    expect(select).not.toHaveBeenCalled();
  });

  it("marks the slate, not the world beneath it, as the choice while it is worn", () => {
    open({ isOn: true, isOwned: true, error: null, select: vi.fn() });
    expect(screen.getByRole("radio", { name: /School Slate/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Classic wood/ })).toHaveAttribute("aria-checked", "false");
  });

  it("says why a change failed", () => {
    open({ isOn: false, isOwned: true, error: "School Slate could not be changed. Please try again.", select: vi.fn() });
    expect(screen.getByRole("alert")).toHaveTextContent("could not be changed");
  });

  it("hands a chosen world to the screen, which is what takes the slate off", () => {
    const onSelectSkin = open({ isOn: true, isOwned: true, error: null, select: vi.fn() });
    fireEvent.click(screen.getByRole("radio", { name: /Zen garden/ }));
    expect(onSelectSkin).toHaveBeenCalledWith("zen");
  });
});

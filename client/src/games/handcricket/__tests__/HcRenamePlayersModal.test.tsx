import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { HcState } from "@shared/types";
import { HcRenamePlayersModal, listEditablePlayers } from "../HcRenamePlayersModal";
import { clearAllCustomNames, customNameFor } from "../hc-custom-names";

const state = {
  options: { format: "t20", mode: "single", category: "international" },
  teamSelections: { me: { teamId: "india" }, them: { teamId: "australia" } },
} as unknown as HcState;

const renderModal = (s: HcState = state) => render(<HcRenamePlayersModal open onClose={() => {}} state={s} selfId="me" />);

afterEach(() => {
  clearAllCustomNames();
  localStorage.clear();
});

describe("HcRenamePlayersModal", () => {
  it("lists my team's players first, with a tab for the opponent", () => {
    renderModal();
    expect(screen.getByRole("tab", { name: "India", selected: true })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Australia" })).toBeDefined();
    const [first] = listEditablePlayers("india", "t20");
    expect(screen.getByLabelText(`Display name for ${first.original}`)).toBeDefined();
  });

  it("saves a new name when the field loses focus and shows how to undo it", () => {
    renderModal();
    const [first] = listEditablePlayers("india", "t20");
    const input = screen.getByLabelText(`Display name for ${first.original}`) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "My Favourite" } });
    fireEvent.blur(input);

    expect(customNameFor(first.original)).toBe("My Favourite");
    expect(screen.getByText(`Originally ${first.original}`)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: `Reset ${first.original} to the original name` }));
    expect(customNameFor(first.original)).toBe(first.original);
  });

  it("will not give two players the same name, even across both teams", () => {
    renderModal();
    const [a, b] = listEditablePlayers("india", "t20");
    const inputB = screen.getByLabelText(`Display name for ${b.original}`) as HTMLInputElement;

    fireEvent.change(inputB, { target: { value: a.original } });
    fireEvent.blur(inputB);

    expect(screen.getByRole("alert").textContent).toMatch(/already has that name/i);
    expect(customNameFor(b.original)).toBe(b.original);
  });

  it("filters players with the search box", () => {
    renderModal();
    const [first] = listEditablePlayers("india", "t20");
    fireEvent.change(screen.getByLabelText("Search players"), { target: { value: "zzzz-no-such-player" } });
    expect(screen.queryByLabelText(`Display name for ${first.original}`)).toBeNull();
    expect(screen.getByText("No players match your search.")).toBeDefined();
  });

  it("resets every name at once", () => {
    renderModal();
    const [first] = listEditablePlayers("india", "t20");
    const input = screen.getByLabelText(`Display name for ${first.original}`) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Favourite" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: "Reset all names" }));
    expect(customNameFor(first.original)).toBe(first.original);
  });

  it("asks the player to pick a team first when none is chosen yet", () => {
    renderModal({ ...state, teamSelections: {} } as unknown as HcState);
    expect(screen.getByText(/Pick your team first/i)).toBeDefined();
  });

  it("works for a team whose squad lives only in the JSON data", () => {
    const players = listEditablePlayers("bangladesh", "t20");
    expect(players.length).toBeGreaterThan(10);
  });
});

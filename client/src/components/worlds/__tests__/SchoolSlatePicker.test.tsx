import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capabilitiesFor } from "@shared/permissions";
import { resolveEffectiveLoadout } from "@shared/cosmetics";
import type { RoomPublicState } from "@shared/types";
import { useAuthStore } from "../../../store/authStore";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";
import { useRoomStore } from "../../../store/roomStore";
import { TableWorldControl } from "../TableWorldControl";

const emit = vi.fn();
vi.mock("../../../lib/socket", () => ({ getSocket: () => ({ emit }) }));

/**
 * School Slate is earned through the Social Quest and is a look for the classic Rummy and Ludo tables, not a world. Their
 * pickers have to offer it to whoever owns it (an admin owns everything), and keep it honest: it only draws on a
 * classic table, plain Classic means no look on it, and each game keeps its own slot.
 */

const HOST_ID = "host-1";
const SLATE = "table_retro_school_slate";
const room = (game: string, world: string): RoomPublicState =>
  ({ code: "ABC123", game, phase: "playing", hostId: HOST_ID, world, players: [] }) as unknown as RoomPublicState;

const equipItem = vi.fn();
const unequipItem = vi.fn();

function seat(game: string, world: string, owned: string[], wearing: boolean): void {
  act(() => {
    useRoomStore.setState({ playerId: HOST_ID, roomState: room(game, world) });
    useCosmeticsStore.setState({
      ownedIds: new Set(owned),
      resolved: resolveEffectiveLoadout(wearing ? { tableThemes: { [game]: SLATE } } : {}),
      equipItem,
      unequipItem,
      errorMessage: null,
    });
  });
}

const open = (game: string) => {
  render(<TableWorldControl game={game as "rummy"} variant="icon" />);
  fireEvent.click(screen.getByRole("button", { name: "Change the table's world" }));
};

describe("School Slate in the Rummy table's picker", () => {
  beforeEach(() => {
    localStorage.clear();
    emit.mockReset();
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean }) => void) => ack?.({ ok: true }));
    equipItem.mockReset().mockResolvedValue(true);
    unequipItem.mockReset().mockResolvedValue(true);
    act(() => useAuthStore.setState({ capabilities: capabilitiesFor("guest") }));
  });
  afterEach(() => {
    cleanup();
    act(() => useRoomStore.setState({ playerId: null, roomState: null }));
  });

  it("offers School Slate to an account that owns it, as its own row under Classic", () => {
    seat("rummy", "classic", [SLATE], false);
    open("rummy");

    const slate = screen.getByRole("radio", { name: /School Slate/ });
    expect(slate).not.toHaveAttribute("aria-disabled", "true");
    expect(slate).toHaveAttribute("aria-checked", "false");
    const rows = screen.getAllByRole("radio").map((row) => row.textContent ?? "");
    expect(rows.findIndex((text) => text.includes("School Slate"))).toBe(rows.findIndex((text) => text.includes("Classic")) + 1);
  });

  it("equips it for Rummy when it is chosen on a classic table, and closes", async () => {
    seat("rummy", "classic", [SLATE], false);
    open("rummy");

    fireEvent.click(screen.getByRole("radio", { name: /School Slate/ }));

    await waitFor(() => expect(equipItem).toHaveBeenCalledWith("TABLE_THEME", "rummy", SLATE));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(emit).not.toHaveBeenCalled();
  });

  it("moves the table to Classic when it is chosen from another world, because it only draws there", async () => {
    seat("rummy", "toy", [SLATE], false);
    open("rummy");

    fireEvent.click(screen.getByRole("radio", { name: /School Slate/ }));

    await waitFor(() => expect(equipItem).toHaveBeenCalled());
    await waitFor(() => expect(emit).toHaveBeenCalledWith("room:setWorld", "classic", expect.any(Function)));
  });

  it("shows it as locked, with what it takes, and does nothing when the account has not earned it", () => {
    seat("rummy", "classic", [], false);
    open("rummy");

    const slate = screen.getByRole("radio", { name: /School Slate/ });
    expect(slate).toHaveAttribute("aria-disabled", "true");
    expect(slate).toHaveTextContent(/bringing three friends/i);
    fireEvent.click(slate);
    expect(equipItem).not.toHaveBeenCalled();
  });

  it("marks School Slate, not plain Classic, as the choice while it is worn", () => {
    seat("rummy", "classic", [SLATE], true);
    open("rummy");

    expect(screen.getByRole("radio", { name: /School Slate/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Classic/ })).toHaveAttribute("aria-checked", "false");
  });

  it("takes School Slate off when plain Classic is chosen, so the two never both apply", async () => {
    seat("rummy", "classic", [SLATE], true);
    open("rummy");

    fireEvent.click(screen.getByRole("radio", { name: /The table as it has always been/ }));

    await waitFor(() => expect(unequipItem).toHaveBeenCalledWith("TABLE_THEME", "rummy"));
  });

  it("offers it in Ludo's picker too, and equips it for Ludo rather than for Rummy", async () => {
    seat("ludo", "classic", [SLATE], false);
    open("ludo");

    fireEvent.click(screen.getByRole("radio", { name: /School Slate/ }));

    await waitFor(() => expect(equipItem).toHaveBeenCalledWith("TABLE_THEME", "ludo", SLATE));
    expect(equipItem).not.toHaveBeenCalledWith("TABLE_THEME", "rummy", SLATE);
  });

  it("takes it off Ludo, and only Ludo, when plain Classic is chosen there", async () => {
    seat("ludo", "classic", [SLATE], true);
    open("ludo");

    expect(screen.getByRole("radio", { name: /School Slate/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /The table as it has always been/ }));

    await waitFor(() => expect(unequipItem).toHaveBeenCalledWith("TABLE_THEME", "ludo"));
    expect(unequipItem).not.toHaveBeenCalledWith("TABLE_THEME", "rummy");
  });

  it("does not take a slate worn in Rummy for one worn in Ludo", () => {
    seat("ludo", "classic", [SLATE], false);
    act(() => useCosmeticsStore.setState({ resolved: resolveEffectiveLoadout({ tableThemes: { rummy: SLATE } }) }));
    open("ludo");

    expect(screen.getByRole("radio", { name: /School Slate/ })).toHaveAttribute("aria-checked", "false");
  });
});

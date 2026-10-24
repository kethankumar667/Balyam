import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capabilitiesFor } from "@shared/permissions";
import type { RoomPublicState } from "@shared/types";
import type { WorldId } from "@shared/worlds";
import { useAuthStore } from "../../../store/authStore";
import { useRoomStore } from "../../../store/roomStore";
import { artWorldsFor } from "../../../lib/worlds/worldArt";
import { WORLD_META } from "../../../lib/worlds/worldMeta";
import { recordWorldWin } from "../../../lib/worlds/worldWins";
import { TableWorldControl } from "../TableWorldControl";
import InlineRoomRail from "../../InlineRoomRail";

const emit = vi.fn();
vi.mock("../../../lib/socket", () => ({ getSocket: () => ({ emit }) }));
vi.mock("../../PlayerList", () => ({ default: () => null }));
vi.mock("../../VoicePanel", () => ({ default: () => null }));
vi.mock("../../QrCodeModal", () => ({ default: () => null }));
vi.mock("../../Chat", () => ({ default: () => null }));

/**
 * Changing the table's world DURING a match. Only the host gets the control, only while the match is live, and what it
 * offers is what that host has unlocked, the same as in the lobby.
 */

const HOST_ID = "host-1";
const stateOf = (overrides: Partial<RoomPublicState> = {}): RoomPublicState =>
  ({ code: "ABC123", game: "ludo", phase: "playing", hostId: HOST_ID, world: "classic", players: [], ...overrides }) as unknown as RoomPublicState;
const seatAs = (playerId: string, room: RoomPublicState) => act(() => useRoomStore.setState({ playerId, roomState: room }));
const win = (count: number) => {
  for (let i = 0; i < count; i += 1) recordWorldWin("ludo", `ludo${i}`);
};

describe("the host's control for the table's world, during a match", () => {
  beforeEach(() => {
    localStorage.clear();
    emit.mockReset();
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean; error?: string }) => void) => ack?.({ ok: true }));
    act(() => useAuthStore.setState({ capabilities: capabilitiesFor("guest") }));
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    act(() => useRoomStore.setState({ playerId: null, roomState: null }));
  });

  it("gives the host a way in, and shows which world the table is in", () => {
    seatAs(HOST_ID, stateOf({ world: "toy" }));
    render(<TableWorldControl game="ludo" variant="row" />);
    const row = screen.getByRole("button", { name: /table world/i });
    expect(row).toHaveTextContent(WORLD_META.toy.name);
    expect(row.className).toMatch(/min-h-\[44px\]/);
  });

  it("gives the Rummy host a labelled, touch-sized icon that opens the existing picker", () => {
    seatAs(HOST_ID, stateOf({ game: "rummy" }));
    render(<TableWorldControl game="rummy" variant="icon" />);
    const trigger = screen.getByRole("button", { name: "Change the table's world" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(trigger).not.toHaveTextContent("World");
    expect(trigger).toHaveClass("min-h-[44px]", "min-w-[44px]");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("gives the Ludo host a Theme navigation button using the same picker", () => {
    seatAs(HOST_ID, stateOf());
    render(<TableWorldControl game="ludo" variant="nav" />);
    const trigger = screen.getByRole("button", { name: "Change table theme" });
    expect(trigger).toHaveTextContent("Theme");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("places the desktop theme button directly before Chat without moving the other room actions", () => {
    seatAs(HOST_ID, stateOf());
    render(<InlineRoomRail
      code="ABC123"
      game="ludo"
      phase="playing"
      players={[]}
      selfId={HOST_ID}
      messages={[]}
      beforeChat={<TableWorldControl game="ludo" variant="icon" />}
    />);
    const nav = within(screen.getByRole("navigation", { name: "Room actions" }));
    const buttons = nav.getAllByRole("button");
    const chat = nav.getByRole("button", { name: "Chat" });
    expect(buttons[buttons.indexOf(chat) - 1]).toHaveAccessibleName("Change the table's world");
    expect(buttons.slice(0, 2).map((button) => button.getAttribute("aria-label"))).toEqual(["Room code", "Players"]);
    expect(buttons[buttons.length - 1]).toHaveAccessibleName("Reactions");
  });

  it.each([
    ["another player", "someone-else", "playing"],
    ["a finished table", HOST_ID, "finished"],
    ["the lobby", HOST_ID, "lobby"],
  ] as const)("leaves no Theme label or button for %s", (_label, playerId, phase) => {
    seatAs(playerId, stateOf({ phase }));
    const { container } = render(<TableWorldControl game="ludo" variant="nav" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the icon's picker to request a world and shows a refusal without changing the table", () => {
    act(() => useAuthStore.setState({ capabilities: capabilitiesFor("super_admin") }));
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean; error?: string }) => void) =>
      ack?.({ ok: false, error: "Only the host can change the world" }));
    seatAs(HOST_ID, stateOf({ game: "rummy" }));
    render(<TableWorldControl game="rummy" variant="icon" />);
    const trigger = screen.getByRole("button", { name: "Change the table's world" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(WORLD_META.neon.name) }));
    expect(emit).toHaveBeenCalledWith("room:setWorld", "neon", expect.any(Function));
    expect(screen.getByRole("alert")).toHaveTextContent("Only the host can change the world");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useRoomStore.getState().roomState?.world).toBe("classic");
  });

  it.each([
    ["another player", "someone-else", "playing"],
    ["a finished table", HOST_ID, "finished"],
    ["the lobby", HOST_ID, "lobby"],
  ] as const)("hides the icon for %s", (_label, playerId, phase) => {
    seatAs(playerId, stateOf({ game: "rummy", phase }));
    const { container } = render(<TableWorldControl game="rummy" variant="icon" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("gives a player who is not the host nothing", () => {
    seatAs("someone-else", stateOf());
    const { container } = render(<TableWorldControl game="ludo" variant="row" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("gives nothing in the lobby, which has its own card, or on a finished table", () => {
    for (const phase of ["lobby", "finished"] as const) {
      seatAs(HOST_ID, stateOf({ phase }));
      const { container, unmount } = render(<TableWorldControl game="ludo" variant="chip" />);
      expect(container, phase).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("gives nothing for a game with no worlds", () => {
    seatAs(HOST_ID, stateOf({ game: "rps" }));
    const { container } = render(<TableWorldControl game="rps" variant="row" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers only what the host has unlocked, and keeps the rest locked", () => {
    win(3);
    seatAs(HOST_ID, stateOf());
    render(<TableWorldControl game="ludo" variant="row" />);
    fireEvent.click(screen.getByRole("button", { name: /table world/i }));
    const group = within(screen.getByRole("radiogroup", { name: /world/i }));
    expect(group.getAllByRole("radio")).toHaveLength(artWorldsFor("ludo").length);
    const isOpen = (name: string) => group.getByRole("radio", { name: new RegExp(name) }).getAttribute("aria-disabled") !== "true";
    expect(isOpen(WORLD_META.classic.name)).toBe(true);
    expect(isOpen(WORLD_META.neon.name)).toBe(true);
    expect(isOpen(WORLD_META.toy.name)).toBe(true);
    expect(isOpen(WORLD_META.palace.name)).toBe(false);
  });

  it("opens every world for an account that unlocks everything", () => {
    act(() => useAuthStore.setState({ capabilities: capabilitiesFor("super_admin") }));
    seatAs(HOST_ID, stateOf());
    render(<TableWorldControl game="ludo" variant="row" />);
    fireEvent.click(screen.getByRole("button", { name: /table world/i }));
    const group = within(screen.getByRole("radiogroup", { name: /world/i }));
    for (const id of artWorldsFor("ludo") as readonly WorldId[]) expect(group.getByRole("radio", { name: new RegExp(WORLD_META[id].name) })).toHaveAttribute("aria-disabled", "false");
  });

  it("asks the server for the chosen world and closes only when the server agrees", () => {
    win(1);
    seatAs(HOST_ID, stateOf());
    render(<TableWorldControl game="ludo" variant="chip" />);
    fireEvent.click(screen.getByRole("button", { name: /change the table's world/i }));
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(WORLD_META.neon.name) }));
    expect(emit).toHaveBeenCalledWith("room:setWorld", "neon", expect.any(Function));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open and says why when the server refuses", () => {
    win(1);
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean; error?: string }) => void) => ack?.({ ok: false, error: "The world cannot be changed once the match is over" }));
    seatAs(HOST_ID, stateOf());
    render(<TableWorldControl game="ludo" variant="chip" />);
    fireEvent.click(screen.getByRole("button", { name: /change the table's world/i }));
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(WORLD_META.neon.name) }));
    expect(screen.getByRole("alert")).toHaveTextContent(/match is over/);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

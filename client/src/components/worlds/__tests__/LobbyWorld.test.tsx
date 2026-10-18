import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capabilitiesFor } from "@shared/permissions";
import { useAuthStore } from "../../../store/authStore";
import { artWorldsFor } from "../../../lib/worlds/worldArt";
import { WORLD_META, requirementFor } from "../../../lib/worlds/worldMeta";
import { WORLD_WINS_STORAGE_KEY, recordWorldWin } from "../../../lib/worlds/worldWins";
import { LobbyWorld } from "../LobbyWorld";

const emit = vi.fn();
vi.mock("../../../lib/socket", () => ({ getSocket: () => ({ emit }) }));

const asAdmin = () => useAuthStore.setState({ capabilities: capabilitiesFor("super_admin") });
const asPlayer = () => useAuthStore.setState({ capabilities: capabilitiesFor("guest") });
const win = (game: "ludo" | "rummy", count: number) => {
  for (let i = 0; i < count; i += 1) recordWorldWin(game, `${game}${i}`);
};

describe("the table's world in the lobby", () => {
  beforeEach(() => {
    localStorage.clear();
    emit.mockReset();
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean; error?: string }) => void) => ack?.({ ok: true }));
    asPlayer();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    act(() => asPlayer());
  });

  it("shows everyone which world the table is in", () => {
    render(<LobbyWorld game="ludo" world="palace" isHost={false} />);
    expect(screen.getByText(WORLD_META.palace.name)).toBeInTheDocument();
    expect(screen.getByText(WORLD_META.palace.blurb)).toBeInTheDocument();
  });

  it("reads a table with no world chosen as the classic one", () => {
    render(<LobbyWorld game="ludo" world={undefined} isHost={false} />);
    expect(screen.getByText(WORLD_META.classic.name)).toBeInTheDocument();
  });

  it("tells a player it is the host's choice, and gives them no control", () => {
    render(<LobbyWorld game="ludo" world="toy" isHost={false} />);
    expect(screen.getByText(/chosen by the host/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
  });

  it("gives the host a button that opens the choices, with a touch target big enough", () => {
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    const button = screen.getByRole("button", { name: /change world/i });
    expect(button.className).toMatch(/min-h-\[44px\]/);
    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("radiogroup", { name: /world/i })).getAllByRole("radio")).toHaveLength(artWorldsFor("ludo").length);
  });

  it("offers only what the host has earned, and says what each locked world asks for", () => {
    win("ludo", 3);
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    const radio = (name: string) => screen.getByRole("radio", { name: new RegExp(name) });
    expect(radio("Classic")).toHaveAttribute("aria-disabled", "false");
    expect(radio("Toy box")).toHaveAttribute("aria-disabled", "false");
    expect(radio("Royal palace")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(requirementFor("ludo", "palace"))).toBeInTheDocument();
    expect(screen.queryByText(requirementFor("ludo", "toy"))).not.toBeInTheDocument();
  });

  it("counts each game's wins on its own", () => {
    win("rummy", 30);
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    expect(screen.getByRole("radio", { name: /Toy box/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("offers only the worlds the game can draw, however many the server would accept", () => {
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    expect(screen.queryByRole("radio", { name: /Coral reef/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Zen garden/ })).not.toBeInTheDocument();
  });

  it("draws the classic world for a table that names a world the game has no art for", () => {
    render(<LobbyWorld game="ludo" world="reef" isHost={false} />);
    expect(screen.getByText(WORLD_META.classic.name)).toBeInTheDocument();
  });

  it("tells the server which world the host chose, and closes when it is accepted", () => {
    win("ludo", 3);
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Toy box/ }));
    expect(emit).toHaveBeenCalledWith("room:setWorld", "toy", expect.any(Function));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not ask the server for a world the host has not earned", () => {
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Royal palace/ }));
    expect(emit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the dialog open and says why when the server refuses", () => {
    win("ludo", 3);
    emit.mockImplementation((_event: string, _world: string, ack?: (r: { ok: boolean; error?: string }) => void) => ack?.({ ok: false, error: "The world can only be chosen before the match starts" }));
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Toy box/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/before the match starts/);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens every world on an account that can unlock everything, says so, and saves nothing", () => {
    asAdmin();
    render(<LobbyWorld game="ludo" world="classic" isHost />);
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    for (const id of artWorldsFor("ludo")) expect(screen.getByRole("radio", { name: new RegExp(WORLD_META[id].name) })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByText(/every world is open on this account/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Royal palace/ }));
    expect(emit).toHaveBeenCalledWith("room:setWorld", "palace", expect.any(Function));
    expect(localStorage.getItem(WORLD_WINS_STORAGE_KEY)).toBeNull();
  });

  it("shows Rummy's table world too, with the same worlds to choose from", () => {
    render(<LobbyWorld game="rummy" world="palace" isHost />);
    expect(screen.getByText(WORLD_META.palace.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /change world/i }));
    expect(within(screen.getByRole("radiogroup", { name: /world/i })).getAllByRole("radio")).toHaveLength(artWorldsFor("rummy").length);
  });

  it("renders nothing for a game that has no worlds", () => {
    const { container } = render(<LobbyWorld game="rps" world="classic" isHost />);
    expect(container).toBeEmptyDOMElement();
  });
});

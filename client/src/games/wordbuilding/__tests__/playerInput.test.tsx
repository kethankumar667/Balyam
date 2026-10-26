import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WORDBUILDING_OPTIONS, type WordBuildingPublicState } from "@shared/types";
import { Grid, ReportCardOverlay } from "../wordbuilding-shared";
import { useWordBuildingBoard } from "../useWordBuildingBoard";

const { emit, listeners, network } = vi.hoisted(() => ({ emit: vi.fn(), listeners: new Map<string, (message: string) => void>(), network: { online: true } }));
vi.mock("../../../lib/socket", () => ({ getSocket: () => ({
  connected: true, emit, on: (event: string, cb: (message: string) => void) => listeners.set(event, cb),
  off: (event: string) => listeners.delete(event),
}) }));
vi.mock("../../../core/recovery/ConnectionStateManager", () => ({ connectionStateManager: { isOnline: () => network.online } }));
vi.mock("../../../hooks/useHaptics", () => ({ useTurnHaptics: vi.fn() }));
vi.mock("../../../components/GameTutorial", () => ({ useTutorialGate: () => ({ open: false, setOpen: vi.fn() }) }));
vi.mock("../../../hooks/useGameTheme", () => ({ useGameTheme: () => ({ theme: "notebook", toggleTheme: vi.fn(), isNotebook: true, isNeon: false }) }));
afterEach(() => { cleanup(); emit.mockClear(); listeners.clear(); network.online = true; vi.useRealTimers(); });
function state(): WordBuildingPublicState {
  return { kind: "wordbuilding", phase: "playing", options: DEFAULT_WORDBUILDING_OPTIONS,
    board: Array.from({ length: 10 }, () => Array(10).fill("")),
    playerOrder: ["p1", "p2"], turnPlayerId: "p1", scores: { p1: 0, p2: 0 },
    scoredWords: [], recentMoves: [], turnDeadline: null, winnerId: null,
    filledCells: 0, totalCells: 100, pendingClaim: null };
}
describe("Word Building input", () => {
  it("allows filled claim cells, not empty cells, and exposes the chosen path", () => {
    const pick = vi.fn();
    render(<Grid board={[["C", ""]]} size={2} cellPx={28} selected={null} canPlay
      cellOverlays={new Map()} inkOf={{}} activePulse={null} onPickCell={pick}
      claimMode claimPath={[{ r: 0, c: 0 }]} />);
    const filled = screen.getByRole("button", { name: "Cell 1,1: C" });
    expect(filled).toBeEnabled();
    expect(filled).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Empty cell 1,2" })).toBeDisabled();
    fireEvent.click(filled);
    expect(pick).toHaveBeenCalledWith(0, 0);
  });
  it("previews, cancels, confirms once, and unlocks on a server error", () => {
    const { result } = renderHook(() => useWordBuildingBoard({ state: state(), players: [], selfId: "p1" }));
    act(() => result.current.pickCell(0, 0));
    act(() => result.current.placeLetter("A"));
    expect(emit).not.toHaveBeenCalled();
    expect(result.current.previewLetter).toBe("A");
    act(() => result.current.cancelPlacement());
    expect(result.current.previewLetter).toBeNull();
    act(() => result.current.pickCell(0, 1));
    act(() => result.current.placeLetter("B"));
    act(() => { result.current.confirmPlacement(); result.current.confirmPlacement(); });
    expect(emit).toHaveBeenCalledTimes(1);
    act(() => listeners.get("game:error")?.("Not your turn"));
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe("Not your turn");
  });
  it("uses A-Z as a preview and Enter to confirm; Escape clears the preview", () => {
    const { result } = renderHook(() => useWordBuildingBoard({ state: state(), players: [], selfId: "p1" }));
    act(() => result.current.pickCell(0, 0));
    fireEvent.keyDown(window, { key: "C" });
    expect(emit).not.toHaveBeenCalled();
    expect(result.current.previewLetter).toBe("C");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(result.current.selected).toBeNull();
    act(() => result.current.pickCell(0, 1));
    fireEvent.keyDown(window, { key: "D" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("game:move", { type: "place", data: { r: 0, c: 1, letter: "D" }, playerId: "p1" });
  });
  it("clears submitted input on authoritative acknowledgement, not a timer-only update", () => {
    const initial = state();
    const { result, rerender } = renderHook(({ game }) => useWordBuildingBoard({ state: game, players: [], selfId: "p1" }), { initialProps: { game: initial } });
    act(() => result.current.pickCell(0, 0));
    act(() => result.current.placeLetter("C"));
    act(() => result.current.confirmPlacement());
    rerender({ game: { ...initial, turnDeadline: 12345 } });
    expect(result.current.submitting).toBe(true);
    rerender({ game: { ...initial, filledCells: 1, turnPlayerId: "p2" } });
    expect(result.current.submitting).toBe(false);
    expect(result.current.previewLetter).toBeNull();
  });
  it("shows a draw without crowning the first seat and shares tied rank numbers", () => {
    render(<ReportCardOverlay state={{ ...state(), phase: "finished" }} nameOf={id => id} inkOf={{}} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Word Building report card" })).toHaveTextContent("Draw:");
    expect(screen.getByText("Joint highest score")).toBeInTheDocument();
    expect(screen.queryByText("Class Topper:")).not.toBeInTheDocument();
  });
  it("keeps an offline preview and reports the connection failure instead of latching a dropped emit", () => {
    network.online = false;
    const { result } = renderHook(() => useWordBuildingBoard({ state: state(), players: [], selfId: "p1" }));
    act(() => result.current.pickCell(0, 0));
    act(() => result.current.placeLetter("C"));
    act(() => result.current.confirmPlacement());
    expect(emit).not.toHaveBeenCalled();
    expect(result.current.previewLetter).toBe("C");
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toContain("Connection is not ready");
  });
  it("celebrates the first new score, not historical scores, and clears effects despite timer updates", () => {
    vi.useFakeTimers();
    const initial = state();
    const { result, rerender } = renderHook(({ game }) => useWordBuildingBoard({ state: game, players: [], selfId: "p1" }), { initialProps: { game: initial } });
    const scored: WordBuildingPublicState = { ...initial, scoredWords: [{
      id: "w1", word: "CAT", scorerId: "p1", points: 3, cells: [{ r: 0, c: 0 }], orientation: "row", ts: 1,
    }] };
    rerender({ game: scored });
    expect(result.current.activePulse?.word).toBe("CAT");
    rerender({ game: { ...scored, turnDeadline: 10000 } });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.activePulse).toBeNull();
    expect(result.current.activeAnnotation).toBeNull();
  });
});

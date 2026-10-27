import { act, fireEvent, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LUDO_OPTIONS, type LudoState } from "@shared/types";
import { useLudoBoard, type LudoBoardProps } from "../useLudoBoard";
import { connectionStateManager } from "../../../core/recovery/ConnectionStateManager";

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }));
vi.mock("../../../lib/socket", () => ({ getSocket: () => socket }));
vi.mock("../sound", () => ({ sfx: {}, isSoundEnabled: () => false, setSoundEnabled: vi.fn() }));
vi.mock("../settings", () => ({
  useLudoSettings: () => [{ showHoverPreview: true, reducedMotion: true }, vi.fn()],
  prefersReducedMotion: () => true,
}));

function props(): LudoBoardProps {
  const state: LudoState = {
    kind: "ludo", phase: "playing", turnPlayerId: "self", turnPhase: "moving",
    diceValue: 6, consecutiveSixes: 0, movableTokenIds: ["red-0", "red-2"],
    tokens: { self: [0, 1, 2, 3].map(i => ({ id: `red-${i}`, color: "red", state: "yard" })) },
    playerColors: { self: "red" }, playerArms: { self: "red" },
    playerOrder: ["self", "b", "c", "d", "e"], finishOrder: [], quitPlayers: [], winnerId: null,
    finishedCount: {}, hasCaptured: {}, lastEvent: null, turnDeadline: null,
    stats: { rollCount: {}, captureCount: {}, sixCount: {}, biggestStreak: {}, startedAt: 0, endedAt: null },
    options: DEFAULT_LUDO_OPTIONS,
  };
  return { state, players: [], selfId: "self", messages: [], roomCode: "LOCAL5", roomPhase: "playing" };
}
beforeEach(() => {
  socket.emit.mockClear();
  connectionStateManager.transition("CONNECTED");
});

describe("shared Ludo choice model", () => {
  it("previews only a server-listed local token and clears on a turn change", () => {
    const initial = props();
    const { result, rerender } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => result.current.previewToken("red-1"));
    expect(result.current.previewTokenId).toBeNull();
    act(() => result.current.previewToken("red-2"));
    expect(result.current.previewTokenId).toBe("red-2");
    expect(result.current.hoverPreview).not.toBeNull();
    rerender({ ...initial, state: { ...initial.state, turnPlayerId: "b" } });
    expect(result.current.previewTokenId).toBeNull();
    expect(result.current.hoverPreview).toBeNull();
  });

  it("clears preview on inspection or lost connectivity and gates every token move entry", () => {
    const { result } = renderHook(useLudoBoard, { initialProps: props() });
    act(() => result.current.previewToken("red-0"));
    act(() => result.current.setInspectingBoard(true));
    expect(result.current.previewTokenId).toBeNull();
    act(() => result.current.move("red-0"));
    expect(socket.emit).not.toHaveBeenCalled();
    act(() => result.current.setInspectingBoard(false));
    act(() => result.current.previewToken("red-0"));
    act(() => connectionStateManager.transition("RECONNECTING"));
    expect(result.current.previewTokenId).toBeNull();
    fireEvent.keyDown(window, { key: "1" });
    act(() => result.current.move("red-0"));
    expect(socket.emit).not.toHaveBeenCalled();
    act(() => connectionStateManager.transition("CONNECTED"));
    fireEvent.keyDown(window, { key: "1" });
    expect(socket.emit).toHaveBeenCalledWith("game:move", { type: "move", data: { tokenId: "red-0" }, playerId: "self" });
  });

  it("does not keep a withdrawn choice highlighted", () => {
    const initial = props();
    const { result, rerender } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => result.current.previewToken("red-0"));
    rerender({ ...initial, state: { ...initial.state, movableTokenIds: ["red-2"] } });
    expect(result.current.previewTokenId).toBeNull();
    act(() => result.current.move("red-0"));
    expect(socket.emit).not.toHaveBeenCalled();
    act(() => result.current.move("red-2"));
    expect(socket.emit).toHaveBeenCalledOnce();
  });
});

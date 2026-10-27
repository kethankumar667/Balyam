import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LUDO_OPTIONS, type LudoState } from "@shared/types";
import { useLudoBoard, type LudoBoardProps } from "../useLudoBoard";
import { connectionStateManager } from "../../../core/recovery/ConnectionStateManager";

const socket = vi.hoisted(() => ({ connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() }));
const preferences = vi.hoisted(() => ({ showHoverPreview: true, reducedMotion: true }));
vi.mock("../../../lib/socket", () => ({ getSocket: () => socket, generateActionId: () => crypto.randomUUID() }));
vi.mock("../sound", () => ({ sfx: {}, isSoundEnabled: () => false, setSoundEnabled: vi.fn() }));
vi.mock("../settings", () => ({
  useLudoSettings: () => [preferences, vi.fn()],
  prefersReducedMotion: () => preferences.reducedMotion,
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
  socket.on.mockClear();
  socket.connected = true;
  preferences.reducedMotion = true;
  connectionStateManager.transition("CONNECTED");
});
afterEach(() => { vi.useRealTimers(); });

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
    expect(socket.emit).toHaveBeenCalledWith("game:move", { type: "move", data: { tokenId: "red-0" }, playerId: "self", actionId: expect.any(String) });
  });

  it.each([2, 5, 8])("blocks offline roll shortcuts at %i seats without buffering intents", count => {
    const initial = props();
    initial.state = { ...initial.state, playerOrder: Array.from({ length: count }, (_, i) => i ? `p${i}` : "self"), turnPhase: "rolling" };
    const { result } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => connectionStateManager.transition("RECONNECTING"));
    fireEvent.keyDown(window, { key: "r" });
    act(() => result.current.roll());
    expect(socket.emit).not.toHaveBeenCalled();
    act(() => connectionStateManager.transition("CONNECTED"));
    socket.connected = false;
    act(() => result.current.roll());
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("sends a single action for synchronous rapid taps and unlocks only on authoritative progress", () => {
    const initial = props();
    const { result, rerender } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => {
      result.current.move("red-0");
      result.current.move("red-2");
    });
    expect(socket.emit).toHaveBeenCalledOnce();
    expect(result.current.pendingAction).toBe("move");
    rerender({ ...initial, state: { ...initial.state } });
    act(() => result.current.move("red-2"));
    expect(socket.emit).toHaveBeenCalledOnce();
    rerender({ ...initial, state: { ...initial.state, turnPlayerId: "b" } });
    expect(result.current.pendingAction).toBeNull();
  });

  it("recovers from rejection and clears an unconfirmed action after reconnect", () => {
    const { result } = renderHook(useLudoBoard, { initialProps: props() });
    act(() => result.current.move("red-0"));
    const errorHandler = socket.on.mock.calls.find(([event]) => event === "game:error")?.[1];
    expect(errorHandler).toBeTypeOf("function");
    act(() => errorHandler("Move refused"));
    expect(result.current.pendingAction).toBeNull();
    act(() => result.current.move("red-2"));
    expect(socket.emit).toHaveBeenCalledTimes(2);
    act(() => connectionStateManager.transition("RECONNECTING"));
    expect(result.current.pendingAction).toBeNull();
    act(() => connectionStateManager.transition("CONNECTED"));
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it("does not unlock/replay an unconfirmed move merely because confirmation takes time", () => {
    vi.useFakeTimers();
    const { result } = renderHook(useLudoBoard, { initialProps: props() });
    act(() => result.current.move("red-0"));
    act(() => vi.advanceTimersByTime(8_000));
    expect(result.current.actionStalled).toBe(true);
    act(() => result.current.move("red-2"));
    expect(socket.emit).toHaveBeenCalledOnce();
  });

  it("blocks stale input after the deadline and restores a fresh authoritative turn", () => {
    vi.useFakeTimers();
    const initial = props();
    initial.state = { ...initial.state, turnDeadline: Date.now() + 1_000 };
    const { result, rerender } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => vi.advanceTimersByTime(1_100));
    act(() => result.current.move("red-0"));
    expect(socket.emit).not.toHaveBeenCalled();
    expect(result.current.deadlineExpired).toBe(true);
    rerender({ ...initial, state: { ...initial.state, turnDeadline: Date.now() + 20_000 } });
    expect(result.current.deadlineExpired).toBe(false);
    act(() => result.current.move("red-0"));
    expect(socket.emit).toHaveBeenCalledOnce();
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

  it("locks rapid roll calls and clears the local dice animation on rejection", () => {
    vi.useFakeTimers();
    const initial = props();
    initial.state = { ...initial.state, turnPhase: "rolling", diceValue: null };
    const { result } = renderHook(useLudoBoard, { initialProps: initial });
    act(() => vi.advanceTimersByTime(600));
    act(() => {
      result.current.roll();
      result.current.roll();
    });
    expect(socket.emit).toHaveBeenCalledOnce();
    expect(result.current.rolling).toBe(true);
    const errorHandler = socket.on.mock.calls.find(([event]) => event === "game:error")?.[1];
    act(() => errorHandler("Roll refused"));
    expect(result.current.rolling).toBe(false);
    expect(result.current.pendingAction).toBeNull();
    act(() => result.current.roll());
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it("rolls a rejected optimistic move back to the unchanged server snapshot", () => {
    vi.useFakeTimers();
    preferences.reducedMotion = false;
    const initial = props();
    initial.state = {
      ...initial.state, diceValue: 3,
      tokens: { ...initial.state.tokens, self: initial.state.tokens.self.map(token =>
        token.id === "red-0" ? { ...token, state: "track", trackPos: 0 } : token) },
    };
    const { result } = renderHook(useLudoBoard, { initialProps: initial });
    const position = () => result.current.allTokens.find(({ token }) => token.id === "red-0")?.token.trackPos;
    act(() => result.current.move("red-0"));
    expect(position()).not.toBe(0);
    const errorHandler = socket.on.mock.calls.find(([event]) => event === "game:error")?.[1];
    act(() => errorHandler("Move refused"));
    expect(position()).toBe(0);
    act(() => vi.advanceTimersByTime(2_000));
    expect(position()).toBe(0);
  });

  it("drops pending state on remount without replaying and checks expiry on foreground", () => {
    vi.useFakeTimers();
    const initial = props();
    initial.state = { ...initial.state, turnDeadline: Date.now() + 1_000 };
    const first = renderHook(useLudoBoard, { initialProps: initial });
    act(() => first.result.current.move("red-0"));
    first.unmount();
    const second = renderHook(useLudoBoard, { initialProps: initial });
    expect(second.result.current.pendingAction).toBeNull();
    expect(socket.emit).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + 2_000);
    fireEvent.focus(window);
    expect(second.result.current.deadlineExpired).toBe(true);
    act(() => second.result.current.move("red-2"));
    expect(socket.emit).toHaveBeenCalledOnce();
    second.unmount();
    act(() => vi.advanceTimersByTime(10_000));
  });
});

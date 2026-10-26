import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { createInitialState, gameReducer } from "../engine/gameReducer";
import { DEFAULT_BINDINGS } from "../arcade/storage";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("arcade keyboard input", () => {
  it("supports remapping and starts repeating after DAS, stopping on release", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    const state = gameReducer(createInitialState(), { type: "START_GAME" });
    renderHook(() => useKeyboardControls(state, dispatch, { ...DEFAULT_BINDINGS, MOVE_LEFT: "KeyA" }));
    fireEvent.keyDown(window, { code: "KeyA" });
    expect(dispatch).toHaveBeenCalledWith({ type: "MOVE_LEFT" });
    act(() => vi.advanceTimersByTime(state.settings.dasMs + state.settings.arrMs));
    expect(dispatch.mock.calls.filter(([action]) => action.type === "MOVE_LEFT").length).toBeGreaterThanOrEqual(3);
    fireEvent.keyUp(window, { code: "KeyA" });
    const count = dispatch.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(dispatch).toHaveBeenCalledTimes(count);
  });
  it("does not hijack keys in editable controls or settings dialogs", () => {
    const dispatch = vi.fn();
    const state = gameReducer(createInitialState(), { type: "START_GAME" });
    renderHook(() => useKeyboardControls(state, dispatch));
    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { code: "ArrowLeft" });
    expect(dispatch).not.toHaveBeenCalled();
    input.remove();
  });
});

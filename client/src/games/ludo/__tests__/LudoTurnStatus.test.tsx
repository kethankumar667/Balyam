import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LudoTurnStatus } from "../LudoTurnStatus";
import type { LudoBoardModel } from "../useLudoBoard";
import type { LudoState } from "@shared/types";

const recovery = vi.hoisted(() => ({ isOnline: true, isFailed: false, retryRecovery: vi.fn() }));
vi.mock("../../../core/recovery/useRecovery", () => ({ useRecovery: () => recovery }));
const model: Pick<LudoBoardModel, "selfId" | "rolling" | "pendingAction" | "actionStalled" | "deadlineExpired" | "inspectingBoard" | "nameOf"> = {
  selfId: "self", rolling: false, pendingAction: null, actionStalled: false,
  deadlineExpired: false, inspectingBoard: false, nameOf: id => id === "self" ? "You" : "Anil",
};
const state: Pick<LudoState, "phase" | "turnPlayerId" | "turnPhase" | "turnDeadline" | "lastEvent"> = {
  phase: "playing", turnPlayerId: "self", turnPhase: "rolling", turnDeadline: null, lastEvent: null,
};
afterEach(() => {
  recovery.isOnline = true;
  recovery.isFailed = false;
  recovery.retryRecovery.mockClear();
  vi.useRealTimers();
});
describe("Ludo turn guidance", () => {
  it("distinguishes roll, choose and waiting with one consistent status", () => {
    const view = render(<LudoTurnStatus m={model} state={state} />);
    expect(screen.getByRole("status").textContent).toContain("Your turn");
    expect(screen.getByText("Roll the dice.")).toBeTruthy();
    view.rerender(<LudoTurnStatus m={model} state={{ ...state, turnPhase: "moving" }} />);
    expect(screen.getByText("Choose a token to move.")).toBeTruthy();
    view.rerender(<LudoTurnStatus m={model} state={{ ...state, turnPlayerId: "other" }} />);
    expect(screen.getByText("Waiting for Anil")).toBeTruthy();
  });
  it("shows reconnection rather than a stale move prompt", () => {
    recovery.isOnline = false;
    render(<LudoTurnStatus m={model} state={state} />);
    expect(screen.getByText("Reconnecting")).toBeTruthy();
    expect(screen.queryByText("Roll the dice.")).toBeNull();
  });
  it("offers recovery for failed connection or stalled confirmation, never automatic replay", () => {
    render(<LudoTurnStatus m={{ ...model, pendingAction: "move", actionStalled: true }} state={state} />);
    expect(screen.getByText("Waiting for server confirmation.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore room" }));
    expect(recovery.retryRecovery).toHaveBeenCalledOnce();
  });
  it("tells players that expiry waits for the server instead of inventing a skipped turn", () => {
    render(<LudoTurnStatus m={{ ...model, deadlineExpired: true }} state={state} />);
    expect(screen.getByText("Time is up. Waiting for the server.")).toBeTruthy();
  });
  it("keeps a ticking timer outside the live announcement", () => {
    vi.useFakeTimers();
    render(<LudoTurnStatus m={model} state={{ ...state, turnDeadline: Date.now() + 10_000 }} />);
    const status = screen.getByRole("status");
    expect(screen.getByRole("timer").textContent).toContain("10s");
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("timer").textContent).toContain("9s");
    expect(status.querySelector('[role="timer"]')).toBeNull();
  });
  it("explains real no-move and three-sixes outcomes", () => {
    const view = render(<LudoTurnStatus m={model} state={{ ...state, lastEvent: { kind: "noMove", byPlayerId: "other", ts: 1 } }} />);
    expect(screen.getByText("Last outcome: Anil had no legal move; turn passed.")).toBeTruthy();
    view.rerender(<LudoTurnStatus m={model} state={{ ...state, lastEvent: { kind: "forfeit", byPlayerId: "other", ts: 2 } }} />);
    expect(screen.getByText("Last outcome: Anil rolled three sixes; turn forfeited.")).toBeTruthy();
  });
});

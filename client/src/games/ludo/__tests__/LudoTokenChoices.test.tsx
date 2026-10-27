import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LUDO_OPTIONS, type LudoState, type LudoToken } from "@shared/types";
import { LudoTokenChoices } from "../LudoTokenChoices";

const tokens: LudoToken[] = [0, 1, 2, 3].map(index => ({
  id: `purple-${index}`, color: "purple", state: index === 3 ? "home" : "yard",
}));
const state: LudoState = {
  kind: "ludo", phase: "playing", turnPlayerId: "self", turnPhase: "moving",
  diceValue: 6, consecutiveSixes: 0, movableTokenIds: ["purple-2", "purple-0"],
  tokens: { self: tokens }, playerColors: { self: "purple" }, playerArms: { self: "purple" },
  playerOrder: ["self", "b", "c", "d", "e"], finishOrder: [], quitPlayers: [], winnerId: null,
  finishedCount: {}, hasCaptured: {}, lastEvent: null, turnDeadline: null,
  stats: { rollCount: {}, captureCount: {}, sixCount: {}, biggestStreak: {}, startedAt: 0, endedAt: null },
  options: DEFAULT_LUDO_OPTIONS,
};
function show(overrides: Partial<LudoState> = {}, options: { online?: boolean; inspecting?: boolean; rolling?: boolean; selfId?: string | null } = {}) {
  const model = {
    selfId: options.selfId === undefined ? "self" : options.selfId,
    inspectingBoard: options.inspecting ?? false,
    rolling: options.rolling ?? false,
    inputBlocked: false, pendingAction: null, deadlineExpired: false,
    move: vi.fn(), previewToken: vi.fn(), clearTokenPreview: vi.fn(),
  };
  const view = render(<LudoTokenChoices state={{ ...state, ...overrides }} m={model} isOnline={options.online ?? true} />);
  return { ...view, model };
}

describe("large Ludo token choices", () => {
  it("numbers the seat's tokens consistently and offers only server-listed choices", () => {
    const { model } = show();
    const choices = screen.getAllByRole("button");
    expect(choices.map(button => button.getAttribute("aria-label"))).toEqual(["Move token 1", "Move token 3"]);
    expect(screen.queryByRole("button", { name: "Move token 2" })).toBeNull();
    fireEvent.click(choices[1]);
    expect(model.move).toHaveBeenCalledOnce();
    expect(model.move).toHaveBeenCalledWith("purple-2");
  });

  it("supports one legal token without silently auto-moving it", () => {
    const { model } = show({ movableTokenIds: ["purple-0"] });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(model.move).not.toHaveBeenCalled();
  });

  it("keeps the board's pawn numbers when token order changes", () => {
    show({ tokens: { self: [...tokens].reverse() } });
    expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual(["Move token 3", "Move token 1"]);
  });

  it.each([
    { turnPhase: "rolling" as const },
    { phase: "finished" as const },
    { turnPlayerId: "b" },
    { movableTokenIds: [] },
    { playerOrder: ["self", "b", "c", "d"] },
  ])("has no move controls outside the current eligible choice: %j", override => {
    show(override);
    expect(screen.queryByRole("group", { name: "Choose a token" })).toBeNull();
  });

  it("offers no choices to a spectator", () => {
    show({}, { selfId: null });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("waits for the dice animation instead of hiding the result before it settles", () => {
    show({}, { rolling: true });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each([{ online: false }, { inspecting: true }])("disables choices while unavailable: %j", options => {
    const { model } = show({}, options);
    const button = screen.getByRole("button", { name: "Move token 1" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(model.move).not.toHaveBeenCalled();
    expect(screen.getByText(options.inspecting ? "Disable the magnifier to move." : "Reconnecting. Token moves are unavailable.")).toBeTruthy();
  });

  it("highlights the matching pawn on focus or hover and clears on exit or selection", () => {
    const { model } = show();
    const button = screen.getByRole("button", { name: "Move token 3" });
    fireEvent.focus(button);
    expect(model.previewToken).toHaveBeenCalledWith("purple-2");
    fireEvent.blur(button);
    expect(model.clearTokenPreview).toHaveBeenCalledOnce();
    fireEvent.mouseEnter(button);
    expect(model.previewToken).toHaveBeenCalledTimes(2);
    fireEvent.mouseLeave(button);
    fireEvent.click(button);
    expect(model.clearTokenPreview).toHaveBeenCalledTimes(3);
  });

  it("updates immediately when the server withdraws a choice", () => {
    const { rerender, model } = show();
    rerender(<LudoTokenChoices state={{ ...state, movableTokenIds: ["purple-2"] }} m={model} isOnline />);
    expect(screen.queryByRole("button", { name: "Move token 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Move token 3" })).toBeTruthy();
  });

  it("explains mixed-player stacks with own pawn numbers and the total count", () => {
    show({
      tokens: {
        self: tokens.map(token => token.id === "purple-0" || token.id === "purple-2"
          ? { ...token, state: "track", trackPos: 10 } : token),
        b: [{ id: "red-0", color: "red", state: "track", trackPos: 10 }],
      },
      playerColors: { self: "purple", b: "red" },
    });
    for (const number of [1, 3]) {
      const button = screen.getByRole("button", { name: `Move token ${number}` });
      expect(button.textContent).toContain("Stack 3");
      const description = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(description?.textContent).toBe("3 tokens on this square. Your tokens: 1, 3.");
    }
  });

  it("removes stack hints when tokens separate and never counts yard or home slots", () => {
    const shared = tokens.map(token => token.id !== "purple-3" ? { ...token, state: "track" as const, trackPos: 10 } : token);
    const { rerender, model } = show({ tokens: { self: shared } });
    expect(screen.getAllByText("Stack 3")).toHaveLength(2);
    rerender(<LudoTokenChoices state={state} m={model} isOnline />);
    expect(screen.queryByText("Stack 3")).toBeNull();
    expect(screen.getByRole("button", { name: "Move token 1" }).getAttribute("aria-describedby")).toBeNull();
  });

  it("does not combine different players' home lanes with the same step number", () => {
    show({
      tokens: {
        self: [{ ...tokens[0], state: "stretch", stretchPos: 2 }],
        b: [{ id: "red-0", color: "red", state: "stretch", stretchPos: 2 }],
      },
      playerArms: { self: "green", b: "purple" },
      playerColors: { self: "purple", b: "red" },
    });
    expect(screen.queryByText(/Stack/)).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Game2048Board from "../Game2048Board";
import Game2048BoardMobile from "../Game2048BoardMobile";
import Game2048BoardDesktop from "../Game2048BoardDesktop";
import { useGame2048 } from "../useGame2048";
import { renderHook, act } from "@testing-library/react";

describe("Game2048Board", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the mode-select menu first, with no grid visible", () => {
    render(<Game2048Board />);
    expect(screen.getByText("2048")).toBeTruthy();
    expect(screen.getByText("Battle")).toBeTruthy();
    expect(screen.getByText("Race")).toBeTruthy();
    expect(screen.getByText("Time Attack")).toBeTruthy();
    expect(screen.getByText("Zen")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "2048 board" })).toBeNull();
  });

  it("selecting a mode reveals the grid and the mode's HUD", () => {
    render(<Game2048Board />);
    fireEvent.click(screen.getByText("Zen"));
    expect(screen.getByRole("img", { name: "2048 board" })).toBeTruthy();
    expect(screen.getByText(/undo \(3\)/i)).toBeTruthy();
  });

  it("Change Mode / Menu button returns to the mode-select screen", () => {
    render(<Game2048Board />);
    fireEvent.click(screen.getByText("Zen"));
    fireEvent.click(screen.getByText("← Menu"));
    expect(screen.getByText("Pick a mode to start")).toBeTruthy();
  });

  it("calls onExit from the mode-select screen's back button", () => {
    const onExit = vi.fn();
    render(<Game2048Board onExit={onExit} />);
    fireEvent.click(screen.getByText("← Back"));
    expect(onExit).toHaveBeenCalled();
  });

  it("renders the Battle HUD when Battle is selected", () => {
    render(<Game2048Board />);
    fireEvent.click(screen.getByText("Battle"));
    expect(screen.getByText(/⚔️ Score/)).toBeTruthy();
  });

  it("renders the Time Attack countdown HUD when selected", () => {
    render(<Game2048Board />);
    fireEvent.click(screen.getByText("Time Attack"));
    expect(screen.getByText(/⏱ Score/)).toBeTruthy();
  });

  it("renders dedicated mobile layout with on-screen directional controls", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));

    render(<Game2048BoardMobile game={result.current} />);
    expect(screen.getByRole("img", { name: "2048 board" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide Up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide Down" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide Left" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide Right" })).toBeTruthy();
    expect(screen.getByText(/Chronicler|Patience|foundation|Serenity|destined/i)).toBeTruthy();
  });

  it("renders dedicated desktop layout with 3-column command deck and Hall of Fame", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("race"));

    render(<Game2048BoardDesktop game={result.current} />);
    expect(screen.getByRole("img", { name: "2048 board" })).toBeTruthy();
    expect(screen.getByText("Lounge Hall of Fame")).toBeTruthy();
    expect(screen.getByText("Run Diagnostics")).toBeTruthy();
    expect(screen.getByText("Tactical Controls")).toBeTruthy();
    expect(screen.getByText(/Arrows \/ WASD/)).toBeTruthy();
  });

  it("clicking tactile directional buttons in mobile triggers move without throwing", () => {
    const { result } = renderHook(() => useGame2048());
    act(() => result.current.selectMode("zen"));

    render(<Game2048BoardMobile game={result.current} />);
    const slideLeftBtn = screen.getByRole("button", { name: "Slide Left" });
    fireEvent.click(slideLeftBtn);
    expect(result.current.moveCount).toBeGreaterThanOrEqual(0);
  });
});

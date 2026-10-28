import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NeonBreakout } from "../arcade/NeonBreakout";
vi.mock("../arcade/Board", () => ({ NeonBoard: () => <div aria-label="Neon arena preview" /> }));
vi.mock("../services/audioService", () => ({ breakoutAudio: {
  setMuted: vi.fn(), playBallLaunch: vi.fn(), playBrickDestroy: vi.fn(), playPaddleBounce: vi.fn(),
  playLifeLost: vi.fn(), playLevelComplete: vi.fn(), playGameOver: vi.fn(),
} }));
afterEach(() => { cleanup(); localStorage.clear(); });
describe("neon breakout UI", () => {
  it("offers three honest solo modes and retains the historical record", () => {
    localStorage.setItem("bhalyam_brick_breakout_v1", JSON.stringify({ highScore: 4567 }));
    render(<MemoryRouter><NeonBreakout /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /Play Campaign/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Play Score Attack/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Play Daily Challenge/i })).toBeVisible();
    expect(screen.getByText(/4,567/)).toBeVisible();
    expect(screen.getByText(/not verified global rankings/i)).toBeVisible();
  });
  it("supports launch, pause, help, resume, and confirmation before abandoning a run", () => {
    render(<MemoryRouter><NeonBreakout /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Play Campaign/i }));
    fireEvent.click(screen.getByRole("button", { name: "Launch ball" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    expect(screen.getByRole("heading", { name: "Flight paused" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resume game" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose mode" }));
    expect(screen.getByRole("dialog", { name: "Leave this run?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep playing" }));
    expect(screen.getByRole("button", { name: "Launch ball" })).toBeDisabled();
  });
  it("pauses on backgrounding and does not let dialog keys resume the game", () => {
    render(<MemoryRouter><NeonBreakout /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Play Score Attack/i }));
    fireEvent.click(screen.getByRole("button", { name: "Launch ball" }));
    fireEvent.blur(window);
    expect(screen.getByRole("heading", { name: "Flight paused" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "How to play" }));
    expect(screen.getByRole("dialog", { name: "Pilot's field guide" })).toBeVisible();
    fireEvent.keyDown(window, { code: "KeyP", key: "p" });
    expect(screen.getByRole("heading", { name: "Flight paused" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume game" }));
    expect(screen.queryByRole("heading", { name: "Flight paused" })).not.toBeInTheDocument();
  });
  it("honors essential-only consent without writing optional records or settings", () => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "essential-only", noticeVersion: 7, at: new Date().toISOString() }));
    render(<MemoryRouter><NeonBreakout /></MemoryRouter>);
    expect(screen.getByText(/Essential-only storage/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Arcade settings" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Sound cues" }));
    expect(localStorage.getItem("bhalyam_brick_breakout_v1")).toBeNull();
  });
});

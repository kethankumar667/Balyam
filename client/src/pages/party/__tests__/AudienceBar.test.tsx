import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QUICK_REACTIONS } from "@shared/reactions";

const emit = vi.fn();
vi.mock("../../../lib/socket", () => ({ getSocket: () => ({ emit }) }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

import { AudienceBar } from "../AudienceBar";

describe("AudienceBar", () => {
  beforeEach(() => {
    emit.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("offers exactly the cheering set and a Leave button, and nothing else", () => {
    render(<AudienceBar onLeave={vi.fn()} />);

    const cheers = screen.getByRole("toolbar", { name: "Cheer for the players" });
    expect(cheers.querySelectorAll("button")).toHaveLength(QUICK_REACTIONS.length);
    expect(screen.getByRole("button", { name: /Leave/ })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("sends the tapped emoji to the room, aimed at nobody", () => {
    render(<AudienceBar onLeave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Fire" }));

    expect(emit).toHaveBeenCalledWith("room:reaction", { emoji: "🔥" });
  });

  it("rests the buttons after a burst, so a tap is never silently lost, then wakes them", () => {
    render(<AudienceBar onLeave={vi.fn()} />);
    const fire = screen.getByRole("button", { name: "Fire" });

    fireEvent.click(fire);
    fireEvent.click(fire);
    fireEvent.click(fire);
    expect(emit).toHaveBeenCalledTimes(3);
    expect(fire).toBeDisabled();

    fireEvent.click(fire);
    expect(emit).toHaveBeenCalledTimes(3);

    act(() => {
      vi.advanceTimersByTime(4_100);
    });
    expect(fire).not.toBeDisabled();
    fireEvent.click(fire);
    expect(emit).toHaveBeenCalledTimes(4);
  });

  it("leaves when asked", () => {
    const onLeave = vi.fn();
    render(<AudienceBar onLeave={onLeave} />);

    fireEvent.click(screen.getByRole("button", { name: /Leave/ }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

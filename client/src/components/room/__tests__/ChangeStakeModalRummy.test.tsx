import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeStakeModal } from "../ChangeStakeModal";

const mockEmit = vi.fn();
vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

/**
 * Rummy is staked by point rate (1 pt = 1/2/4/8/16 coins → 80…1280 per seat), so the lobby's
 * "change stake" control must offer those five tiers and nothing else — not the platform's
 * 100/200/500/1000 presets or its free-amount slider.
 */
describe("ChangeStakeModal — Rummy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the point rates instead of the platform presets and slider", () => {
    render(<ChangeStakeModal open onClose={vi.fn()} game="rummy" currentStake={80} playerCount={3} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByText("Custom Stake Slider")).toBeNull();
    expect(screen.queryByText("Starter")).toBeNull();
  });

  it("selects the current rate, and projects the pot from it", () => {
    render(<ChangeStakeModal open onClose={vi.fn()} game="rummy" currentStake={160} playerCount={3} />);
    const selected = screen.getAllByRole("radio").filter((o) => o.getAttribute("aria-checked") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toContain("1 pt = 2 coins");
    expect(screen.getByText(/480\s+coins/)).toBeDefined(); // 160 × 3 seats
  });

  it("emits the per-seat stake of the tapped rate", () => {
    const onClose = vi.fn();
    mockEmit.mockImplementation((_event, _stake, ack) => ack?.({ ok: true }));
    render(<ChangeStakeModal open onClose={onClose} game="rummy" currentStake={80} playerCount={2} />);

    fireEvent.click(screen.getByRole("radio", { name: /1 pt = 4 coins/ }));
    fireEvent.click(screen.getByText(/Confirm/i).closest("button")!);

    expect(mockEmit).toHaveBeenCalledWith("room:setEntryStake", 320, expect.any(Function));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not offer Confirm for the rate that is already set", () => {
    render(<ChangeStakeModal open onClose={vi.fn()} game="rummy" currentStake={80} playerCount={2} />);
    expect((screen.getByText(/Confirm/i).closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps a guest host on the 1-point rate", () => {
    render(<ChangeStakeModal open onClose={vi.fn()} game="rummy" currentStake={80} isGuestHost playerCount={2} />);
    const options = screen.getAllByRole("radio");
    expect(options[0]!.hasAttribute("disabled")).toBe(false);
    for (const locked of options.slice(1)) expect(locked.hasAttribute("disabled")).toBe(true);
  });

  it("leaves every other game exactly as it was: presets and a slider, no point rates", () => {
    render(<ChangeStakeModal open onClose={vi.fn()} game="ludo" currentStake={100} playerCount={2} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText("Custom Stake Slider")).toBeDefined();
  });
});

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

describe("ChangeStakeModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with current stake selected", () => {
    render(
      <ChangeStakeModal
        open={true}
        onClose={vi.fn()}
        currentStake={200}
        playerCount={3}
      />
    );

    expect(screen.getByText("Change Entry Stake")).toBeDefined();
    expect(screen.getByText(/600\s+coins/)).toBeDefined(); // 200 * 3
    expect(screen.getByText(/200\s+\/\s+seat/)).toBeDefined();
  });

  it("allows selecting a different preset tier and confirms emit", () => {
    const onClose = vi.fn();
    mockEmit.mockImplementation((event, stake, ack) => {
      if (ack) ack({ ok: true });
    });

    render(
      <ChangeStakeModal
        open={true}
        onClose={onClose}
        currentStake={100}
        playerCount={2}
      />
    );

    // Click 500 tier
    const tier500Btn = screen.getByText("500").closest("button");
    expect(tier500Btn).toBeDefined();
    fireEvent.click(tier500Btn!);

    // Pot updates to 1,000 coins (500 * 2)
    expect(screen.getByText(/1,000\s+coins/)).toBeDefined();

    // Click confirm button
    const confirmBtn = screen.getByText(/Confirm/i).closest("button")!;
    fireEvent.click(confirmBtn);

    expect(mockEmit).toHaveBeenCalledWith("room:setEntryStake", 500, expect.any(Function));
    expect(onClose).toHaveBeenCalled();
  });

  it("restricts guest hosts from selecting tiers > 100", () => {
    render(
      <ChangeStakeModal
        open={true}
        onClose={vi.fn()}
        currentStake={100}
        isGuestHost={true}
        playerCount={2}
      />
    );

    const tier200Btn = screen.getByText("200").closest("button");
    expect(tier200Btn?.getAttribute("disabled")).not.toBeNull();

    expect(screen.getByText(/Guest hosts can only host at the 100-coin starter table/i)).toBeDefined();
  });

  it("displays server error when bet cannot be changed", () => {
    mockEmit.mockImplementation((event, stake, ack) => {
      if (ack) ack({ ok: false, error: "Cannot change entry stake once another human player is ready" });
    });

    render(
      <ChangeStakeModal
        open={true}
        onClose={vi.fn()}
        currentStake={100}
        playerCount={2}
      />
    );

    const tier200Btn = screen.getByText("200").closest("button");
    fireEvent.click(tier200Btn!);

    const confirmBtn = screen.getByText(/Confirm/i).closest("button")!;
    fireEvent.click(confirmBtn);

    expect(screen.getByText("Cannot change entry stake once another human player is ready")).toBeDefined();
  });
});

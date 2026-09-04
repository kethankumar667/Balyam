import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnsupportedSeatCountCard } from "../UnsupportedSeatCountCard";

describe("UnsupportedSeatCountCard Component", () => {
  it("renders corrective message and seat count for 6-seat table as host", () => {
    render(<UnsupportedSeatCountCard seatCount={6} isHost={true} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Unsupported Table Size/i)).toBeDefined();
    expect(screen.getByText("(6 seats)")).toBeDefined();
    expect(screen.getByText(/Max 5 Seats Supported/i)).toBeDefined();
    expect(
      screen.getByText(/game economy currently supports tables of 1 to 5 players/i)
    ).toBeDefined();
    expect(screen.getByText(/Please remove 1 player or bot to enable match start/i)).toBeDefined();

    // Verifies NO prize pool amounts, coins, or payouts are displayed
    expect(screen.queryByText(/Match Prize Pool/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Payouts/i })).toBeNull();
    expect(screen.queryByText(/1st Place/i)).toBeNull();
  });

  it("renders correct pluralization when multiple excess players need to be removed", () => {
    render(<UnsupportedSeatCountCard seatCount={8} isHost={true} />);

    expect(screen.getByText("(8 seats)")).toBeDefined();
    expect(screen.getByText(/Please remove 3 players or bots to enable match start/i)).toBeDefined();
  });

  it("renders respectful waiting message for non-host participants", () => {
    render(<UnsupportedSeatCountCard seatCount={7} isHost={false} />);

    expect(
      screen.getByText(/Waiting for host to adjust table capacity to 5 or fewer players/i)
    ).toBeDefined();
    expect(screen.queryByText(/Please remove/i)).toBeNull();
  });
});

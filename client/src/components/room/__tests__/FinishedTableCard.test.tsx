import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FinishedTableCard from "../FinishedTableCard";

// The invitation promo has its own tests (features/referrals); this card is tested without a router or a store.
vi.mock("../../../features/referrals/InvitePromo", () => ({ InvitePromo: () => null }));

describe("FinishedTableCard", () => {
  afterEach(cleanup);

  it("says the match is over and how to play again", () => {
    render(<FinishedTableCard game="ludo" onNewRoom={vi.fn()} onLeave={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Match finished" })).toBeInTheDocument();
    expect(screen.getByText(/closed to new players/)).toBeInTheDocument();
    expect(screen.getByText(/share its link/)).toBeInTheDocument();
  });

  it("offers a new room for the same game, named without its decorative emoji", () => {
    render(<FinishedTableCard game="ludo" onNewRoom={vi.fn()} onLeave={vi.fn()} />);

    const button = screen.getByRole("button", { name: /Create a new .*Ludo.* room/ });
    expect(button.textContent).not.toMatch(/🎲/u);
  });

  it("starts a new room when asked, and leaves when asked, as two different actions", () => {
    const onNewRoom = vi.fn();
    const onLeave = vi.fn();
    render(<FinishedTableCard game="rummy" onNewRoom={onNewRoom} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole("button", { name: /Create a new/ }));
    expect(onNewRoom).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Leave table" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onNewRoom).toHaveBeenCalledTimes(1);
  });

  it("offers nothing that starts or readies a match: no Start, no Ready, no stake", () => {
    render(<FinishedTableCard game="uno" onNewRoom={vi.fn()} onLeave={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Start|Ready|Rematch|Play again/i })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

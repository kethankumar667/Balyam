import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { PlayerCardContext, PlayerCardTrigger, type PlayerCardOpener } from "../PlayerCardContext";

/**
 * The contract every avatar in the app relies on: tapping a face asks the
 * provider for that seat's card, never does anything else, and renders as plain
 * art whenever it cannot be opened.
 */

function makeOpener(): PlayerCardOpener {
  return { openSeatCard: vi.fn(), openAccountCard: vi.fn() };
}

function withProvider(opener: PlayerCardOpener, children: React.ReactNode) {
  return <PlayerCardContext.Provider value={opener}>{children}</PlayerCardContext.Provider>;
}

describe("SeatAvatar as a player card trigger", () => {
  it("opens that seat's card when tapped", () => {
    const opener = makeOpener();
    render(withProvider(opener, <SeatAvatar seatId="seat-7" name="Faisal" avatar="face.png" />));

    fireEvent.click(screen.getByRole("button", { name: "View Faisal's profile" }));

    expect(opener.openSeatCard).toHaveBeenCalledWith("seat-7", { name: "Faisal", avatar: "face.png" });
  });

  it("does not trigger the row it sits inside", () => {
    const opener = makeOpener();
    const onRowClick = vi.fn();
    render(
      withProvider(
        opener,
        <div onClick={onRowClick}>
          <SeatAvatar seatId="seat-7" name="Faisal" />
        </div>
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "View Faisal's profile" }));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("is plain, non-interactive art when no seat id is given", () => {
    render(withProvider(makeOpener(), <SeatAvatar name="Faisal" />));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is plain art when the seat id is null, as selfId is before a seat is assigned", () => {
    render(withProvider(makeOpener(), <SeatAvatar seatId={null} name="Faisal" />));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders without a provider, as every existing component test does", () => {
    render(<SeatAvatar seatId="seat-7" name="Faisal" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("PlayerCardTrigger", () => {
  it("asks for an account card when given an account id", () => {
    const opener = makeOpener();
    render(
      withProvider(
        opener,
        <PlayerCardTrigger accountId="acct-1" name="Ravi" avatar="r.png">
          <span>face</span>
        </PlayerCardTrigger>
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "View Ravi's profile" }));

    expect(opener.openAccountCard).toHaveBeenCalledWith("acct-1", { name: "Ravi", avatar: "r.png" });
    expect(opener.openSeatCard).not.toHaveBeenCalled();
  });

  it("leaves the child untouched when the id is empty", () => {
    render(
      withProvider(
        makeOpener(),
        <PlayerCardTrigger accountId="" name="Ravi">
          <span>face</span>
        </PlayerCardTrigger>
      )
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("face")).toBeDefined();
  });
});

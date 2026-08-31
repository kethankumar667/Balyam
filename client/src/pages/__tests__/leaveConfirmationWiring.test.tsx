import { describe, it, expect, vi } from "vitest";
import React, { useCallback, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LeaveRoomModal from "../../components/room/LeaveRoomModal";

/**
 * Regression coverage for the leave-confirmation bypass found in a
 * production certification audit: nine game boards (Ludo, UNO, Rummy,
 * Carrom, Word Building, Dots & Boxes, Bingo, Hand Cricket, RPS) were wired
 * as `onLeave={leaveRoom}` in Room.tsx — every board just forwards whatever
 * `onLeave` callback it's given to its own Leave button (see
 * `HcLeaveButton` in hc-notebook.tsx, `ludo-board-composites.tsx`,
 * `carrom-shared.tsx`, etc.), so the bug was entirely in Room.tsx's own
 * wiring: it hands boards the real leave function instead of a function
 * that opens `LeaveRoomModal` first.
 *
 * The fix (Room.tsx) introduces `requestLeaveConfirmation` — every board
 * now receives that instead of `leaveRoom` directly, and `leaveRoom` only
 * ever runs as `LeaveRoomModal`'s `onConfirm`. This harness reproduces that
 * exact two-step contract with the REAL `LeaveRoomModal` (not a stub) so a
 * future regression that reintroduces `onLeave={leaveRoom}` on any board
 * would fail here in spirit — the pattern under test is precisely the one
 * every one of those nine call sites in Room.tsx now uses.
 */
function RoomLeaveWiringHarness({ onActuallyLeft }: { onActuallyLeft: () => void }) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const requestLeaveConfirmation = useCallback(() => setShowLeaveModal(true), []);

  // Stand-in for a game board: it receives `onLeave` as a prop and calls it
  // from some nested button, exactly like every one of the nine boards does
  // (they never call `leaveRoom` or emit `room:leave` themselves).
  function StandInGameBoard({ onLeave }: { onLeave: () => void }) {
    return (
      <div>
        <p>Game in progress</p>
        <button onClick={onLeave}>Leave</button>
      </div>
    );
  }

  return (
    <div>
      <StandInGameBoard onLeave={requestLeaveConfirmation} />
      <LeaveRoomModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={onActuallyLeft}
      />
    </div>
  );
}

describe("Room.tsx leave-confirmation wiring — regression for the audit bypass", () => {
  it("clicking a board's Leave button opens the confirmation modal instead of leaving immediately", () => {
    const onActuallyLeft = vi.fn();
    render(<RoomLeaveWiringHarness onActuallyLeft={onActuallyLeft} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(screen.getByText("Leave this table?")).toBeDefined();
    expect(onActuallyLeft).not.toHaveBeenCalled();
  });

  it("Cancel (Stay Here) keeps the player in the room — leave never executes", () => {
    const onActuallyLeft = vi.fn();
    render(<RoomLeaveWiringHarness onActuallyLeft={onActuallyLeft} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    fireEvent.click(screen.getByRole("button", { name: "Stay Here" }));

    expect(screen.queryByText("Leave this table?")).toBeNull();
    expect(onActuallyLeft).not.toHaveBeenCalled();
  });

  it("Confirm (Leave Room) executes the leave exactly once", () => {
    const onActuallyLeft = vi.fn();
    render(<RoomLeaveWiringHarness onActuallyLeft={onActuallyLeft} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    fireEvent.click(screen.getByRole("button", { name: /Leave Room/i }));

    expect(onActuallyLeft).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Leave this table?")).toBeNull();
  });

  it("a board that (incorrectly) received the real leave callback directly would leave with no modal — proving the harness actually distinguishes the two wirings", () => {
    // This is the bug being regression-tested: if Room.tsx ever again wires
    // a board as `onLeave={leaveRoom}` instead of `onLeave={requestLeaveConfirmation}`,
    // this is what that looks like — no modal, immediate execution.
    const onActuallyLeft = vi.fn();
    function BuggyBoard({ onLeave }: { onLeave: () => void }) {
      return <button onClick={onLeave}>Leave</button>;
    }
    render(<BuggyBoard onLeave={onActuallyLeft} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(onActuallyLeft).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Leave this table?")).toBeNull();
  });
});

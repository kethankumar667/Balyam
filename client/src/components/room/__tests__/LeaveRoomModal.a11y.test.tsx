import { describe, it, expect, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaveRoomModal from "../LeaveRoomModal";

/**
 * `LeaveRoomModal` is now the single confirm-before-leave gate shared by
 * RoomHeader's lobby button, the mid-match header fallback, and Star Game's
 * own leave buttons (see Room.tsx / StarBoardDesktop.tsx). Its accessibility
 * contract — via the shared `Modal` + `useFocusTrap` — is what all three
 * entry points now depend on.
 */
function Harness() {
  const [open, setOpen] = useState(false);
  const onConfirm = vi.fn();
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open trigger</button>
      <LeaveRoomModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirm} />
    </div>
  );
}

describe("LeaveRoomModal — accessibility", () => {
  it("exposes dialog semantics and labels", () => {
    render(<LeaveRoomModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("leave-modal-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("leave-modal-desc");
  });

  it("focuses the safe action (Stay Here), not the destructive one, on open", async () => {
    render(<LeaveRoomModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe("Stay Here");
    });
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<LeaveRoomModal isOpen={true} onClose={onClose} onConfirm={() => {}} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger element after closing", async () => {
    render(<Harness />);
    const trigger = screen.getByText("Open trigger");
    trigger.focus();
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe("Stay Here");
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});

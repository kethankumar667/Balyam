import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import DetailDrawer from "../index";

/**
 * A real opener button + drawer, wired the way an admin page actually wires
 * them: click (or keyboard-activate) the opener, the drawer opens, closing
 * it should hand focus back to that exact button. Testing this against a
 * harness that mounts the drawer already-open would prove nothing about
 * ADMIN-A11Y-004's focus-restoration requirement.
 */
function Harness({ initialOpen = false }: { initialOpen?: boolean } = {}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open Row
      </button>
      <DetailDrawer isOpen={open} onClose={() => setOpen(false)} title="User Details">
        <button type="button">First Field Action</button>
        <button type="button">Second Field Action</button>
      </DetailDrawer>
    </div>
  );
}

describe("DetailDrawer — focus lifecycle (ADMIN-A11Y-004)", () => {
  it("has dialog semantics: role=dialog, aria-modal, and a label pointing at the visible title", () => {
    render(<DetailDrawer isOpen onClose={() => {}} title="Room #ST4091" children={null} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).not.toBeNull();
    expect(document.getElementById(labelledBy!)?.textContent).toBe("Room #ST4091");
  });

  it("regression: opening the drawer moves focus into it (onto the first focusable control) — previously focus stayed wherever it was on the page behind the drawer", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open Row"));

    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe("First Field Action");
    });
  });

  it("regression: with no focusable control inside, focus lands on the drawer's own title instead of staying on the page", async () => {
    render(<DetailDrawer isOpen onClose={() => {}} title="Read-only Detail" children={<p>Nothing to interact with.</p>} />);
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe("Read-only Detail");
    });
  });

  it("regression: focus is trapped — Tab from the LAST focusable control in the dialog (Second Field Action) wraps back to the FIRST (the close button, which is earliest in DOM order), not out to the page", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open Row"));
    await waitFor(() => expect(document.activeElement?.textContent).toBe("First Field Action"));

    const lastControl = screen.getByText("Second Field Action");
    lastControl.focus();
    expect(document.activeElement).toBe(lastControl);

    fireEvent.keyDown(lastControl, { key: "Tab" });
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close drawer" }));
    });
  });

  it("regression: Shift+Tab from the FIRST focusable control in the dialog (the close button) wraps to the LAST (Second Field Action), not out to the page", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open Row"));
    await waitFor(() => expect(document.activeElement?.textContent).toBe("First Field Action"));

    // The close button is earliest in DOM order — a real, legitimately
    // tabbable control, just not the preferred INITIAL landing spot (see
    // the two tests above). It's the trap's actual "first" boundary.
    const closeBtn = screen.getByRole("button", { name: "Close drawer" });
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });

    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe("Second Field Action");
    });
  });

  it("plain Tab from a control in the middle of the dialog is left to the browser's own default focus order — the trap only intervenes at the two boundaries", () => {
    const preventDefault = vi.fn();
    render(<Harness />);
    fireEvent.click(screen.getByText("Open Row"));

    const firstField = screen.getByText("First Field Action");
    firstField.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    Object.defineProperty(event, "preventDefault", { value: preventDefault });
    window.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("Escape still closes the drawer (pre-existing behavior, must not regress)", () => {
    const onClose = vi.fn();
    render(<DetailDrawer isOpen onClose={onClose} title="X" children={null} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("regression: closing the drawer restores focus to whatever opened it — previously focus was simply lost", async () => {
    render(<Harness />);
    const opener = screen.getByText("Open Row");
    opener.focus();
    fireEvent.click(opener);

    await waitFor(() => expect(document.activeElement?.textContent).toBe("First Field Action"));

    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    });
  });
});

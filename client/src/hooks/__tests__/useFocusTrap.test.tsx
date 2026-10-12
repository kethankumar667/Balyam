import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useFocusTrap } from "../useFocusTrap";

/**
 * A dialog the way most of this app writes one: `onClose` is an inline arrow,
 * so it is a NEW function on every render — and typing in the field renders.
 */
function Dialog({ open = true, onEscape }: { open?: boolean; onEscape?: (text: string) => void }) {
  const [text, setText] = useState("");
  const { containerRef } = useFocusTrap<HTMLDivElement>({ open, onClose: () => onEscape?.(text) });
  return (
    <div ref={containerRef} role="dialog" aria-label="Confirm">
      <button type="button">Close</button>
      <input aria-label="Confirmation" value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Opener
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Shut
      </button>
      <Dialog open={open} />
    </>
  );
}

describe("useFocusTrap", () => {
  it("keeps focus in the field while the dialog re-renders on every keystroke", () => {
    render(<Dialog />);
    const input = screen.getByLabelText("Confirmation");
    input.focus();

    for (const typed of ["D", "DE", "DEL", "DELE", "DELET", "DELETE"]) {
      fireEvent.change(input, { target: { value: typed } });
      expect(document.activeElement).toBe(input);
    }
  });

  it("does not hand focus back to whatever opened the dialog while it is still open", () => {
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    fireEvent.click(opener);
    const input = screen.getByLabelText("Confirmation");
    input.focus();

    fireEvent.change(input, { target: { value: "D" } });

    expect(document.activeElement).toBe(input);
    expect(document.activeElement).not.toBe(opener);
  });

  it("sends Escape to the latest onClose, not the one from when it opened", () => {
    const onEscape = vi.fn();
    render(<Dialog onEscape={onEscape} />);
    const input = screen.getByLabelText("Confirmation");
    fireEvent.change(input, { target: { value: "abc" } });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onEscape).toHaveBeenCalledWith("abc");
  });

  it("still returns focus to the opener when the dialog really closes", () => {
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByRole("button", { name: "Shut" }));

    expect(document.activeElement).toBe(opener);
  });
});

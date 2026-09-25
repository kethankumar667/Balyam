import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RummyRatePicker from "../RummyRatePicker";

describe("RummyRatePicker", () => {
  it("offers exactly the five point rates, each with its per-seat stake", () => {
    render(<RummyRatePicker value={80} onChange={() => {}} />);
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(5);
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("1 pt = 1 coin"),
      expect.stringContaining("1 pt = 2 coins"),
      expect.stringContaining("1 pt = 4 coins"),
      expect.stringContaining("1 pt = 8 coins"),
      expect.stringContaining("1 pt = 16 coins"),
    ]);
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("80 / seat"),
      expect.stringContaining("160 / seat"),
      expect.stringContaining("320 / seat"),
      expect.stringContaining("640 / seat"),
      expect.stringContaining("1,280 / seat"),
    ]);
  });

  it("marks the rate that matches the current stake as selected, and only that one", () => {
    render(<RummyRatePicker value={320} onChange={() => {}} />);
    const selected = screen.getAllByRole("radio").filter((o) => o.getAttribute("aria-checked") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toContain("1 pt = 4 coins");
  });

  it("reports the per-seat stake — a plain coin count — when a rate is tapped", () => {
    const onChange = vi.fn();
    render(<RummyRatePicker value={80} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /1 pt = 8 coins/ }));
    expect(onChange).toHaveBeenCalledWith(640);
  });

  it("says the winner takes the whole pot with no platform fee", () => {
    render(<RummyRatePicker value={80} onChange={() => {}} />);
    expect(document.body.textContent).toContain("winner takes the whole pot");
    expect(document.body.textContent).toContain("no platform fee");
  });

  it("locks every rate above 1 point for a guest host, and never emits them", () => {
    const onChange = vi.fn();
    render(<RummyRatePicker value={80} onChange={onChange} isGuest />);
    const options = screen.getAllByRole("radio");
    expect(options[0]!.hasAttribute("disabled")).toBe(false);
    for (const locked of options.slice(1)) {
      expect(locked.hasAttribute("disabled")).toBe(true);
      fireEvent.click(locked);
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Guest hosts can play the 1-point table");
  });
});

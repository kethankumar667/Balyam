import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SEALED_ROOM_ERROR } from "@shared/permissions";
import TableUnavailable, { type UnavailableStatus } from "../TableUnavailable";

describe("TableUnavailable", () => {
  const cases: Array<[UnavailableStatus, RegExp]> = [
    ["not_found", /this table has closed/i],
    ["sealed", /this table isn't open/i],
    ["full", /this table is full/i],
    ["started", /already started/i],
  ];

  it.each(cases)("explains %s in plain words and announces it", (status, title) => {
    render(<TableUnavailable status={status} onBack={vi.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(title);
    expect(alert.textContent).toMatch(/ask your friend/i);
  });

  it("quotes the server's own wording for a sealed table", () => {
    render(<TableUnavailable status="sealed" onBack={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toContain(SEALED_ROOM_ERROR);
  });

  it("offers a way back that is at least 44px tall", () => {
    const onBack = vi.fn();
    render(<TableUnavailable status="not_found" onBack={onBack} />);

    const back = screen.getByRole("button", { name: /return to lounge/i });
    back.click();

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(back.className).toMatch(/min-h-\[44px\]/);
  });
});

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("starts no countdown unless it is asked to", () => {
    render(<TableUnavailable status="not_found" onBack={vi.fn()} />);

    expect(screen.queryByText(/taking you back/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /stay on this page/i })).toBeNull();
  });
});

describe("TableUnavailable for someone who was seated there", () => {
  afterEach(cleanup);

  it("words a closed table as something that happened to them, and does not send them to ask a friend", () => {
    render(<TableUnavailable status="not_found" returning onBack={vi.fn()} />);

    const text = screen.getByRole("alert").textContent ?? "";
    expect(text).toMatch(/this room has closed/i);
    expect(text).toMatch(/while you were away/i);
    expect(text).not.toMatch(/ask your friend/i);
  });

  it("says a released seat was released, rather than that the game cannot be joined", () => {
    render(<TableUnavailable status="started" returning onBack={vi.fn()} />);

    const text = screen.getByRole("alert").textContent ?? "";
    expect(text).toMatch(/your seat was released/i);
    expect(text).not.toMatch(/ask your friend/i);
  });

  it("reads a full or sealed table the same for everyone", () => {
    for (const status of ["full", "sealed"] as const) {
      const { unmount } = render(<TableUnavailable status={status} returning onBack={vi.fn()} />);
      expect(screen.getByRole("alert").textContent).toMatch(/ask your friend/i);
      unmount();
    }
  });

  it("shows the server's own reason when it gives one", () => {
    render(<TableUnavailable status="not_found" returning message="This match has ended and the table has closed." onBack={vi.fn()} />);

    const text = screen.getByRole("alert").textContent ?? "";
    expect(text).toContain("This match has ended and the table has closed.");
    expect(text).not.toMatch(/while you were away/i);
  });

  it("offers a second way forward only when it is given one", () => {
    const onClick = vi.fn();
    const { rerender } = render(<TableUnavailable status="not_found" returning onBack={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /new bingo room/i })).toBeNull();

    rerender(<TableUnavailable status="not_found" returning onBack={vi.fn()} secondary={{ label: "Start a new Bingo room", onClick }} />);
    const button = screen.getByRole("button", { name: /start a new bingo room/i });
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.className).toMatch(/min-h-\[44px\]/);
  });
});

describe("TableUnavailable counting down to the lounge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const tick = (seconds: number) => act(() => { vi.advanceTimersByTime(seconds * 1000); });

  it("counts down in plain sight and goes back exactly once when it reaches zero", () => {
    const onBack = vi.fn();
    render(<TableUnavailable status="not_found" returning autoReturnSeconds={10} onBack={onBack} />);
    expect(screen.getByText(/taking you back to the lounge in 10s/i)).toBeDefined();

    tick(3);
    expect(screen.getByText(/in 7s/i)).toBeDefined();
    expect(onBack).not.toHaveBeenCalled();

    tick(7);
    expect(onBack).toHaveBeenCalledTimes(1);
    tick(30);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("lets the player stay, and then never takes them anywhere", () => {
    const onBack = vi.fn();
    render(<TableUnavailable status="not_found" returning autoReturnSeconds={10} onBack={onBack} />);

    tick(4);
    fireEvent.click(screen.getByRole("button", { name: /stay on this page/i }));
    expect(screen.queryByText(/taking you back/i)).toBeNull();
    tick(60);
    expect(onBack).not.toHaveBeenCalled();
    // The way back by hand is still there.
    fireEvent.click(screen.getByRole("button", { name: /return to lounge/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("holds the countdown while the tab is hidden, so a returning player gets the whole of it to read", () => {
    const onBack = vi.fn();
    let visibility: DocumentVisibilityState = "hidden";
    // A plain own-property override, removed afterwards: spying on the prototype's getter and restoring can recurse.
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    try {
      render(<TableUnavailable status="not_found" returning autoReturnSeconds={10} onBack={onBack} />);
      tick(120);
      expect(screen.getByText(/in 10s/i)).toBeDefined();
      expect(onBack).not.toHaveBeenCalled();

      visibility = "visible";
      tick(4);
      expect(screen.getByText(/in 6s/i)).toBeDefined();
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState;
    }
  });

  it("announces the plan once instead of every second", () => {
    render(<TableUnavailable status="not_found" returning autoReturnSeconds={10} onBack={vi.fn()} />);

    const announcement = screen.getByRole("status");
    expect(announcement.textContent).toMatch(/returning to the lounge shortly/i);
    tick(5);
    expect(screen.getByRole("status").textContent).toBe(announcement.textContent);
  });
});

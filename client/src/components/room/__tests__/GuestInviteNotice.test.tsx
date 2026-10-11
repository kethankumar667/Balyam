import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import GuestInviteNotice from "../GuestInviteNotice";

function click(element: HTMLElement) {
  element.click();
}

describe("GuestInviteNotice", () => {
  it("tells a new guest what is about to be created: expiry, room-only name, and how to keep progress", () => {
    render(<GuestInviteNotice onContinue={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /guest account/i })).toBeTruthy();
    expect(screen.getByText(/7 days/)).toBeTruthy();
    expect(screen.getByText(/pick any name for this game room/i)).toBeTruthy();
    expect(screen.getByText(/sign in to save your progress/i)).toBeTruthy();
  });

  it("creates nothing until the guest taps Continue", () => {
    const onContinue = vi.fn().mockResolvedValue(true);
    render(<GuestInviteNotice onContinue={onContinue} onCancel={vi.fn()} />);

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("calls onContinue once and shows progress while the account is created", async () => {
    let finish: (created: boolean) => void = () => {};
    const onContinue = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    render(<GuestInviteNotice onContinue={onContinue} onCancel={vi.fn()} />);

    click(screen.getByRole("button", { name: /continue as guest/i }));

    const busy = await screen.findByRole("button", { name: /creating your guest account/i });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(busy.hasAttribute("disabled")).toBe(true);
    finish(true);
  });

  it("explains the failure and lets the guest try again when the account could not be created", async () => {
    const onContinue = vi.fn().mockResolvedValue(false);
    render(<GuestInviteNotice onContinue={onContinue} onCancel={vi.fn()} />);

    click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/could not set up your guest account/i),
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("leaves without creating anything when the guest says Not now", () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();
    render(<GuestInviteNotice onContinue={onContinue} onCancel={onCancel} />);

    click(screen.getByRole("button", { name: /not now/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});

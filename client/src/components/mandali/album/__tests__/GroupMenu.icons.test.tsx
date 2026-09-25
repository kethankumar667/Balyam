import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroupMenu } from "../GroupMenu";

const handlers = () => ({
  onInvite: vi.fn(),
  onCoins: vi.fn(),
  onInfo: vi.fn(),
  onNotifications: vi.fn(),
  onManage: vi.fn(),
  onRequests: vi.fn(),
  onLeave: vi.fn(),
});

describe("GroupMenu, folded (icons) variant", () => {
  it("offers every control as a named button, so the folded rail is still usable", () => {
    render(<GroupMenu variant="icons" notificationLevel="ALL" canManageMembers pendingRequestCount={0} {...handlers()} />);

    for (const name of [
      "Invite people",
      "Coins",
      "Group info",
      "Notifications",
      "Manage members",
      "Join requests",
      "Leave this Mandali",
    ]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("runs the same action as the full menu", () => {
    const h = handlers();
    render(<GroupMenu variant="icons" notificationLevel="ALL" canManageMembers={false} pendingRequestCount={0} {...h} />);

    fireEvent.click(screen.getByRole("button", { name: "Invite people" }));
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(h.onInvite).toHaveBeenCalledTimes(1);
    expect(h.onNotifications).toHaveBeenCalledTimes(1);
  });

  it("does not show admin controls to an ordinary member", () => {
    render(<GroupMenu variant="icons" notificationLevel="ALL" canManageMembers={false} pendingRequestCount={0} {...handlers()} />);
    expect(screen.queryByRole("button", { name: "Manage members" })).toBeNull();
    expect(screen.queryByRole("button", { name: /join requests/i })).toBeNull();
  });

  it("says how many people are waiting to join, in words a screen reader can use", () => {
    render(<GroupMenu variant="icons" notificationLevel="ALL" canManageMembers pendingRequestCount={3} {...handlers()} />);
    expect(screen.getByRole("button", { name: "Join requests (3)" })).toBeTruthy();
  });
});

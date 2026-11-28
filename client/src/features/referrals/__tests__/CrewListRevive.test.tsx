import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReferralBonusView, ReferralFriend, ReferralOverview, ReferralReviveResult } from "@shared/referrals";
import { canReviveFriend } from "@shared/referrals";
import { CrewList } from "../crew/CrewList";

const NOW = Date.UTC(2026, 10, 28, 12);
const DAY = 86_400_000;
const campaign: ReferralOverview["campaign"] = {
  inviterBonus: 2000, inviteeBonus: 2000, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3,
};
const none = (): ReferralBonusView => ({ state: "NONE", amount: 2000, vestingUntil: null, creditedAt: null, blockedReason: null });
const friend = (patch: Partial<ReferralFriend> = {}): ReferralFriend => ({
  ordinal: 2, displayName: "Maruthi", avatarId: null, joinedAt: NOW - 32 * DAY, expiresAt: NOW - 2 * DAY, qualifiedAt: null,
  status: "EXPIRED", via: "code", yourBonus: none(), theirBonus: none(), ...patch,
});

function show(friends: ReferralFriend[], onRevive?: (ordinal: number) => Promise<ReferralReviveResult>) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CrewList friends={friends} campaign={campaign} serverNow={NOW} onRevive={onRevive} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("giving a friend whose window ended one more window", () => {
  it("offers the button on an expired friend and sends that friend's place in the list", async () => {
    const onRevive = vi.fn(async (): Promise<ReferralReviveResult> => ({ ok: true, expiresAt: NOW + 30 * DAY }));
    show([friend()], onRevive);

    fireEvent.click(screen.getByRole("button", { name: "Give Maruthi 30 more days" }));

    await waitFor(() => expect(onRevive).toHaveBeenCalledWith(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says why when the server declines, in plain words", async () => {
    show([friend()], async () => ({ ok: false, code: "TOO_LATE" }));

    fireEvent.click(screen.getByRole("button", { name: "Give Maruthi 30 more days" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("more than 30 days since their window ended");
  });

  it("shows the network's message when the request itself fails", async () => {
    show([friend()], async () => { throw new Error("Invitations could not be updated. Please try again."); });

    fireEvent.click(screen.getByRole("button", { name: "Give Maruthi 30 more days" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invitations could not be updated");
  });

  it("offers nothing without a handler, on an open window, after a qualified match, or once the extra time was used", () => {
    show([friend({ ordinal: 1 })]);
    expect(screen.queryByRole("button", { name: /more days/ })).not.toBeInTheDocument();
    cleanup();

    const onRevive = vi.fn();
    show([
      friend({ ordinal: 1, displayName: "Open", status: "JOINED", joinedAt: NOW - DAY, expiresAt: NOW + 29 * DAY }),
      friend({ ordinal: 2, displayName: "Played", status: "QUALIFIED", qualifiedAt: NOW - 5 * DAY }),
      friend({ ordinal: 3, displayName: "Used", joinedAt: NOW - 62 * DAY, expiresAt: NOW - 2 * DAY }),
    ], onRevive);
    expect(screen.queryByRole("button", { name: /more days/ })).not.toBeInTheDocument();
    expect(onRevive).not.toHaveBeenCalled();
  });

  it("keeps Play Together for a friend whose window is still running", () => {
    show([friend({ status: "JOINED", joinedAt: NOW - DAY, expiresAt: NOW + 5 * DAY })], vi.fn());
    expect(screen.getByText("Play Together")).toBeInTheDocument();
    expect(screen.getByText("Ending soon")).toBeInTheDocument();
  });
});

describe("canReviveFriend", () => {
  const base = { status: "EXPIRED" as const, joinedAt: NOW - 32 * DAY, expiresAt: NOW - 2 * DAY };

  it("is true for a friend who went quiet recently and has not had the extra time", () => {
    expect(canReviveFriend(base, NOW)).toBe(true);
    expect(canReviveFriend({ ...base, expiresAt: NOW - 30 * DAY, joinedAt: NOW - 60 * DAY }, NOW)).toBe(true);
  });

  it("is false once more than 30 days have passed since the window ended", () => {
    expect(canReviveFriend({ ...base, expiresAt: NOW - 31 * DAY, joinedAt: NOW - 61 * DAY }, NOW)).toBe(false);
  });

  it("is false for a window that was already extended, whatever its length", () => {
    expect(canReviveFriend({ ...base, joinedAt: NOW - 62 * DAY }, NOW)).toBe(false);
  });

  it("is false unless the window has really ended", () => {
    expect(canReviveFriend({ ...base, status: "JOINED" }, NOW)).toBe(false);
    expect(canReviveFriend({ ...base, status: "QUALIFIED" }, NOW)).toBe(false);
  });
});

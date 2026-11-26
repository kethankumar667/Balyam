import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describeXpJourney } from "../../../../lib/xpJourney";
import ProfilePhoneIdentity from "../ProfilePhoneIdentity";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

const PROFILE: PlayerProfile = {
  playerId: "player_1",
  displayName: "Stale name",
  joinedAt: new Date(2026, 7, 15).getTime(),
  lastSeenAt: new Date(2026, 10, 1).getTime(),
  level: 16,
  experiencePoints: 1585,
};
const journey = describeXpJourney(PROFILE.experiencePoints);

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(cleanup);

describe("ProfilePhoneIdentity", () => {
  it("says who the player is: name, level and title, membership and join date", () => {
    render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan Kumar" onEditName={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 2, name: "Kethan Kumar" })).toBeDefined();
    expect(screen.getByText(`Level ${journey.level} · ${journey.title}`)).toBeDefined();
    expect(screen.getByText("Member")).toBeDefined();
    expect(screen.getByText("Joined Aug 2026")).toBeDefined();
  });

  it("leaves level progress to the next-move card, so it is never drawn twice", () => {
    render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan Kumar" onEditName={vi.fn()} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/progress/i)).toBeNull();
  });

  it("falls back to the profile's name, then to 'Player', so the heading is never empty", () => {
    const { rerender } = render(<ProfilePhoneIdentity profile={PROFILE} onEditName={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Stale name" })).toBeDefined();

    rerender(<ProfilePhoneIdentity profile={PROFILE} name="   " onEditName={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Player" })).toBeDefined();
  });

  it("labels a non-member as a guest", () => {
    render(<ProfilePhoneIdentity profile={PROFILE} isMember={false} name="Kethan" onEditName={vi.fn()} />);

    expect(screen.getByText("Guest")).toBeDefined();
    expect(screen.queryByText("Member")).toBeNull();
  });

  it("opens the editor from a secondary Edit profile button", () => {
    const onEditName = vi.fn();
    render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan" onEditName={onEditName} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    expect(onEditName).toHaveBeenCalledOnce();
  });

  it("offers no edit button when editing is not available", () => {
    render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan" />);

    expect(screen.queryByRole("button", { name: "Edit profile" })).toBeNull();
  });

  describe("copy player ID", () => {
    it("is labelled for what it copies, and copies the player ID", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard(writeText);
      render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan" onEditName={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Copy player ID" }));

      await waitFor(() => expect(writeText).toHaveBeenCalledWith("player_1"));
    });

    it("confirms in the button and to screen readers once copied", async () => {
      setClipboard(vi.fn().mockResolvedValue(undefined));
      render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan" onEditName={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Copy player ID" }));

      expect(await screen.findByRole("button", { name: "Player ID copied" })).toBeDefined();
      expect(screen.getByRole("status").textContent).toBe("Player ID copied");
    });

    it("does not claim success when the clipboard is blocked", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      setClipboard(writeText);
      render(<ProfilePhoneIdentity profile={PROFILE} name="Kethan" onEditName={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Copy player ID" }));

      await waitFor(() => expect(writeText).toHaveBeenCalled());
      expect(screen.getByRole("button", { name: "Copy player ID" })).toBeDefined();
      expect(screen.getByRole("status").textContent).toBe("");
    });
  });
});

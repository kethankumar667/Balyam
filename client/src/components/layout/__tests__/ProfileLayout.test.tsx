import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileLayout from "../ProfileLayout";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

const PROFILE: PlayerProfile = {
  playerId: "player_1",
  displayName: "Stale name",
  avatar: "avatar_1.jpg",
  joinedAt: 1_700_000_000_000,
  lastSeenAt: 1_700_000_100_000,
  level: 8,
  experiencePoints: 780,
};

describe("ProfileLayout", () => {
  it("renders the four-route profile system with truthful identity chrome", () => {
    render(
      <MemoryRouter initialEntries={["/profile/matches"]}>
        <ProfileLayout
          profile={PROFILE}
          name="Live player"
          avatar="avatar_2.jpg"
          onEditName={vi.fn()}
        >
          <div>Route content</div>
        </ProfileLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Live player" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit display name" })).toBeDefined();

    const navigation = screen.getByRole("navigation", { name: "Profile sections" });
    const links = within(navigation).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(within(navigation).getByRole("link", { name: /Matches/i }).getAttribute("aria-current")).toBe("page");

    expect(screen.queryByText(/Pro League/i)).toBeNull();
    expect(screen.queryByText(/22ms/i)).toBeNull();
  });
});

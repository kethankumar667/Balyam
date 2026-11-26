import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileLayout from "../ProfileLayout";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

const viewport = vi.hoisted(() => ({ current: "desktop" as "mobile" | "desktop" }));
vi.mock("../../../lib/useViewport", () => ({ useViewport: () => viewport.current }));

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

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProfileLayout profile={PROFILE} name="Live player" onEditName={vi.fn()}>
        <div>Route content</div>
      </ProfileLayout>
    </MemoryRouter>,
  );
}

/**
 * On a phone the overview is a first-class destination (the "You" tab), so it opens with a Profile heading and
 * a compact identity. The other profile routes, and wider screens, keep the back link and the hero.
 */
describe("ProfileLayout on a phone", () => {
  afterEach(() => { viewport.current = "desktop"; });

  it("opens the overview with a Profile heading and a Settings link instead of a back link", () => {
    viewport.current = "mobile";
    renderAt("/profile");

    expect(screen.getByRole("heading", { level: 1, name: "Profile" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings/preferences");
    expect(screen.queryByRole("link", { name: "Games" })).toBeNull();
    expect(screen.getByText("Route content")).toBeDefined();
  });

  it("shows the compact identity, with Edit profile and Copy player ID as secondary actions", () => {
    viewport.current = "mobile";
    renderAt("/profile");

    expect(screen.getByRole("heading", { level: 2, name: "Live player" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy player ID" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Edit display name" })).toBeNull();
  });

  it("labels the first section tab Overview and marks it as the current page", () => {
    viewport.current = "mobile";
    renderAt("/profile");

    const navigation = screen.getByRole("navigation", { name: "Profile sections" });
    const overview = within(navigation).getByRole("link", { name: /^Overview/ });
    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(within(navigation).queryByRole("link", { name: /^Home/ })).toBeNull();
  });

  it("keeps the back link and the hero on the other profile routes", () => {
    viewport.current = "mobile";
    renderAt("/profile/achievements");

    expect(screen.getByRole("link", { name: "Games" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Live player" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1, name: "Profile" })).toBeNull();
  });

  it("keeps the hero on the overview at tablet and desktop widths", () => {
    viewport.current = "desktop";
    renderAt("/profile");

    expect(screen.getByRole("heading", { level: 1, name: "Live player" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Games" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1, name: "Profile" })).toBeNull();
  });

  it("copes with a profile that has not loaded yet", () => {
    viewport.current = "mobile";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfileLayout profile={null} name="Live player"><div>Route content</div></ProfileLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Profile" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByText("Route content")).toBeDefined();
  });
});

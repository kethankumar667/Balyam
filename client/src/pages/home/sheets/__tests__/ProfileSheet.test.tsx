import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfileSheet, type NotificationItem } from "../ProfileSheet";
import { useAuthStore, setAccessToken } from "../../../../store/authStore";

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "invite",
    title: "Priya invited you to a Rummy table",
    desc: "Room ANNA42",
    time: "2m ago",
    unread: true,
  },
];

function renderSheet(initialView: "profile" | "notifications" = "profile") {
  return render(
    <BrowserRouter>
      <ProfileSheet
        open
        onClose={() => {}}
        notifications={NOTIFICATIONS}
        onUpdateNotifications={() => {}}
        onOpenJoin={() => {}}
        initialView={initialView}
      />
    </BrowserRouter>,
  );
}

/**
 * Sets up each of the three identity states `ProfileSheet` must distinguish.
 * `isMember` itself is no longer what the sheet reads (see the regression
 * suite below) — `kind`/`userId` and the module-level access token are what
 * `useIdentityPresentation()` actually derives `mode` from, so fixtures must
 * set those, not the legacy flag.
 */
function asGuest(): void {
  setAccessToken(null);
  useAuthStore.setState({ kind: "guest", userId: null, isAdmin: false, isSuperAdmin: false });
}
function asLocalFallback(): void {
  setAccessToken(null);
  useAuthStore.setState({ kind: "member", userId: null, isAdmin: false, isSuperAdmin: false });
}
function asVerifiedMember(): void {
  setAccessToken("test-access-token");
  useAuthStore.setState({ kind: "member", userId: "user-verified-1", isAdmin: false, isSuperAdmin: false });
}

describe("ProfileSheet — Notifications visibility (guest vs member)", () => {
  beforeEach(() => {
    asGuest();
  });

  it("regression: a guest does not see the Notifications row or its unread badge on the profile card", () => {
    renderSheet("profile");
    expect(screen.queryByText("Notifications")).toBeNull();
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it("regression: a guest who reaches view=notifications (e.g. via the sidebar bell) falls back to the profile card, not the notifications feed", () => {
    renderSheet("notifications");
    // The notifications feed's back-button title is unique to that panel;
    // its absence confirms we fell through to the profile card instead.
    expect(screen.queryByTitle("Back to profile")).toBeNull();
    expect(screen.getByText("Add your name")).toBeDefined();
  });

  it("a signed-in member does see the Notifications row with its unread count", () => {
    asVerifiedMember();
    renderSheet("profile");
    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("1 unread")).toBeDefined();
  });

  it("a signed-in member landing on view=notifications sees the real notifications feed", () => {
    asVerifiedMember();
    renderSheet("notifications");
    expect(screen.getByTitle("Back to profile")).toBeDefined();
    expect(screen.getByText("Priya invited you to a Rummy table")).toBeDefined();
  });
});

/**
 * Consumer-wiring regression (Phase C1): the sheet used to gate its entire
 * membership panel — including the "Offline Demo Mode" badge and the
 * sign-out button — on `isMember`, which was narrowed to "verified member
 * only". That silently made both unreachable for a local-fallback session,
 * sending it to the same guest sign-up prompt as an actual guest even
 * though it already has a locally "signed in" identity to leave. `signedIn`
 * is now `identity.mode !== "guest"`, which correctly admits local fallback.
 */
describe("ProfileSheet — identity-mode presentation (Offline Demo Mode consumer-wiring fix)", () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it("guest: shows the guest prompt, never the membership panel, badge, or sign-out", () => {
    asGuest();
    renderSheet("profile");
    expect(screen.queryByText("Your Membership")).toBeNull();
    expect(screen.queryByText("Offline Demo Mode")).toBeNull();
    expect(screen.queryByText("Active Member")).toBeNull();
    expect(screen.queryByText("Sign out / Log out")).toBeNull();
    // The guest branch's own call to action.
    expect(screen.getByRole("link", { name: /create a free account/i })).toBeDefined();
  });

  it("local fallback: shows the membership panel with the Offline Demo Mode badge and a working sign-out, not the guest prompt", () => {
    asLocalFallback();
    renderSheet("profile");
    expect(screen.getByText("Your Membership")).toBeDefined();
    expect(screen.getByText("Offline Demo Mode")).toBeDefined();
    expect(screen.queryByText("Active Member")).toBeNull();
    expect(screen.getByText("Sign out / Log out")).toBeDefined();
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
  });

  it("verified member: shows the membership panel with the Active Member badge and sign-out", () => {
    asVerifiedMember();
    renderSheet("profile");
    expect(screen.getByText("Your Membership")).toBeDefined();
    expect(screen.getByText("Active Member")).toBeDefined();
    expect(screen.queryByText("Offline Demo Mode")).toBeNull();
    expect(screen.getByText("Sign out / Log out")).toBeDefined();
  });

  it("local fallback's sign-out button calls the store's signOut() action", () => {
    asLocalFallback();
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    const originalSignOut = useAuthStore.getState().signOut;
    useAuthStore.setState({ signOut: mockSignOut });
    renderSheet("profile");
    screen.getByText("Sign out / Log out").click();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    useAuthStore.setState({ signOut: originalSignOut });
  });
});

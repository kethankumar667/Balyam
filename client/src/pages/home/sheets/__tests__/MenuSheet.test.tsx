import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { MenuSheet } from "../MenuSheet";
import { useAuthStore, setAccessToken } from "../../../../store/authStore";

function renderMenu() {
  return render(
    <BrowserRouter>
      <MenuSheet open onClose={() => {}} onOpenJoin={() => {}} />
    </BrowserRouter>,
  );
}

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

/**
 * Consumer-wiring regression (Phase C2): the menu used to gate its
 * sign-out/sign-in action on `isMember`, which was narrowed to "verified
 * member only". A local-fallback session then saw "Sign in" here with no
 * way to find "Sign out" at all, even though it already has an identity to
 * leave. `signedIn` is now `identity.mode !== "guest"`.
 */
describe("MenuSheet — identity-mode presentation (Offline Demo Mode consumer-wiring fix)", () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it("guest: shows Sign in, not Sign out", () => {
    asGuest();
    renderMenu();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("local fallback: shows Sign out, not Sign in", () => {
    asLocalFallback();
    renderMenu();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("verified member: shows Sign out", () => {
    asVerifiedMember();
    renderMenu();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("local fallback's Sign out is a real, keyboard-operable button that calls the store's signOut()", () => {
    asLocalFallback();
    const calls: unknown[] = [];
    const mockSignOut = async () => { calls.push(true); };
    const originalSignOut = useAuthStore.getState().signOut;
    useAuthStore.setState({ signOut: mockSignOut });

    renderMenu();
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button.tagName).toBe("BUTTON");
    button.click();
    expect(calls.length).toBe(1);

    useAuthStore.setState({ signOut: originalSignOut });
  });
});

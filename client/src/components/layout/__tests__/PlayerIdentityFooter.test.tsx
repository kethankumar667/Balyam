import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlayerIdentityFooter from "../PlayerIdentityFooter";
import { useAuthStore } from "../../../store/authStore";

/**
 * A player's own id, surfaced for support/admin lookups (2026-09-07) — see
 * this component's own doc comment for the incident that motivated it: an
 * admin nearly topped up the wrong guest's wallet because there was no
 * on-screen way for a player to hand over their exact identity.
 */

const GUEST_ID_KEY = "bhalyam.guest.id";

function resetAuthStore() {
  useAuthStore.setState({ userId: null, kind: "guest" } as never);
}

beforeEach(() => {
  localStorage.clear();
  resetAuthStore();
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  resetAuthStore();
});

describe("PlayerIdentityFooter", () => {
  it("renders nothing when there is neither a signed-in member nor a minted guest id yet", () => {
    const { container } = render(<PlayerIdentityFooter />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the guest's durable id when no member session exists", () => {
    localStorage.setItem(GUEST_ID_KEY, "guest_0333360bb1b9febd4f0df7b2f5e49286");
    render(<PlayerIdentityFooter />);

    const btn = screen.getByRole("button", { name: /copy your player id for support/i });
    expect(btn).toBeDefined();
    // Truncated on screen (long ids would overflow the sidebar) — the full,
    // untruncated id is what actually gets copied (see the next test).
    expect(screen.getByText(/guest_033336…e49286/)).toBeDefined();
  });

  it("prefers the member id over any stored guest id once signed in", () => {
    localStorage.setItem(GUEST_ID_KEY, "guest_0333360bb1b9febd4f0df7b2f5e49286");
    useAuthStore.setState({ userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9", kind: "member" } as never);
    render(<PlayerIdentityFooter />);

    expect(screen.getByText(/12e092a4-d71…7e4ec9/)).toBeDefined();
    expect(screen.queryByText(/guest_033336/)).toBeNull();
  });

  it("copies the FULL untruncated id to the clipboard, and confirms it visibly", async () => {
    useAuthStore.setState({ userId: "12e092a4-d712-4bfc-8222-a5a6f37e4ec9", kind: "member" } as never);
    render(<PlayerIdentityFooter />);

    const btn = screen.getByRole("button", { name: /copy your player id for support/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("12e092a4-d712-4bfc-8222-a5a6f37e4ec9");
    });
    await waitFor(() => {
      expect(screen.getByText(/player id copied to clipboard/i)).toBeDefined();
    });
  });

  it("a short id (well under the truncation threshold) renders in full, not truncated", () => {
    localStorage.setItem(GUEST_ID_KEY, "guest_short");
    render(<PlayerIdentityFooter />);
    expect(screen.getByText("guest_short")).toBeDefined();
  });
});

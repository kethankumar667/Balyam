import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

import App from "../../../App";
import { useAuthStore } from "../../../store/authStore";

/**
 * A Gang's chat, members and controls are for signed-in members. Reaching
 * the page while signed out must never render it — not even for a moment — and
 * must send the visitor to sign in with a way back afterwards.
 */

const HUB = "GANG HUB (chat, members, controls)";
function Hub() {
  return <div>{HUB}</div>;
}

let currentUrl = "";
function LocationProbe() {
  const { pathname, search } = useLocation();
  currentUrl = pathname + search;
  return null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <App components={{ GangHubPage: Hub }} />
    </MemoryRouter>
  );
}

describe("the old /mandali addresses still work", () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ isMember: false, ready: true } as never);
  });

  it("sends an old Gang link, with its invite token, to the same Gang at /gang", async () => {
    useAuthStore.setState({ isMember: true, ready: true } as never);

    renderAt("/mandali/nellore?invite=abc123");

    await waitFor(() => expect(currentUrl).toBe("/gang/nellore?invite=abc123"));
    expect(await screen.findByText(HUB)).toBeDefined();
  });

  it("sends the old index address to /gang", async () => {
    useAuthStore.setState({ isMember: true, ready: true } as never);

    renderAt("/mandali");

    await waitFor(() => expect(currentUrl).toBe("/gang"));
  });

  it("still asks a signed-out visitor to sign in, and brings them back to the NEW address", async () => {
    useAuthStore.setState({ isMember: false, ready: true } as never);

    renderAt("/mandali/nellore?invite=abc123");

    await waitFor(() => expect(currentUrl.startsWith("/login")).toBe(true));
    expect(decodeURIComponent(currentUrl)).toContain("redirectTo=/gang/nellore?invite=abc123");
  });
});

describe("/gang/:handle is members-only", () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ isMember: false, ready: true } as never);
  });

  it("does not render the Gang for a signed-out visitor, and sends them to sign in", async () => {
    useAuthStore.setState({ isMember: false, ready: true } as never);

    renderAt("/gang/nellore");

    await waitFor(() => expect(currentUrl.startsWith("/login")).toBe(true));
    expect(screen.queryByText(HUB)).toBeNull();
  });

  it("remembers where they were going, so signing in brings them back", async () => {
    useAuthStore.setState({ isMember: false, ready: true } as never);

    renderAt("/gang/nellore?invite=abc123");

    await waitFor(() => expect(currentUrl.startsWith("/login")).toBe(true));
    expect(decodeURIComponent(currentUrl)).toContain("redirectTo=/gang/nellore?invite=abc123");
  });

  it("renders nothing of the Gang while the session is still being checked", () => {
    useAuthStore.setState({ isMember: false, ready: false } as never);

    renderAt("/gang/nellore");

    expect(screen.queryByText(HUB)).toBeNull();
    expect(currentUrl).toBe("/gang/nellore");
  });

  it("shows the Gang to a signed-in member", async () => {
    useAuthStore.setState({ isMember: true, ready: true } as never);

    renderAt("/gang/nellore");

    expect(await screen.findByText(HUB)).toBeTruthy();
    expect(currentUrl).toBe("/gang/nellore");
  });
});

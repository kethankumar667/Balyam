import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

import App from "../../../App";
import { useAuthStore } from "../../../store/authStore";

/**
 * A Mandali's chat, members and controls are for signed-in members. Reaching
 * the page while signed out must never render it — not even for a moment — and
 * must send the visitor to sign in with a way back afterwards.
 */

const HUB = "MANDALI HUB (chat, members, controls)";
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
      <App components={{ MandaliHubPage: Hub }} />
    </MemoryRouter>
  );
}

describe("/mandali/:handle is members-only", () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ isMember: false, ready: true } as never);
  });

  it("does not render the Mandali for a signed-out visitor, and sends them to sign in", async () => {
    useAuthStore.setState({ isMember: false, ready: true } as never);

    renderAt("/mandali/nellore");

    await waitFor(() => expect(currentUrl.startsWith("/login")).toBe(true));
    expect(screen.queryByText(HUB)).toBeNull();
  });

  it("remembers where they were going, so signing in brings them back", async () => {
    useAuthStore.setState({ isMember: false, ready: true } as never);

    renderAt("/mandali/nellore?invite=abc123");

    await waitFor(() => expect(currentUrl.startsWith("/login")).toBe(true));
    expect(decodeURIComponent(currentUrl)).toContain("redirectTo=/mandali/nellore?invite=abc123");
  });

  it("renders nothing of the Mandali while the session is still being checked", () => {
    useAuthStore.setState({ isMember: false, ready: false } as never);

    renderAt("/mandali/nellore");

    expect(screen.queryByText(HUB)).toBeNull();
    expect(currentUrl).toBe("/mandali/nellore");
  });

  it("shows the Mandali to a signed-in member", async () => {
    useAuthStore.setState({ isMember: true, ready: true } as never);

    renderAt("/mandali/nellore");

    expect(await screen.findByText(HUB)).toBeTruthy();
    expect(currentUrl).toBe("/mandali/nellore");
  });
});

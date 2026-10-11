import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { calculateMiniclipXPProgression } from "@shared/progression/MiniclipProgression";

const apiJson = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson,
  usePlayerId: () => ({ playerId: "p_me", ready: true }),
}));

import { OwnLevelStrip } from "../OwnLevelStrip";

const serve = (progression: unknown) =>
  apiJson.mockImplementation(async (path?: string) => {
    if (typeof path === "string" && path.endsWith("/progression")) return progression ? { progression } : null;
    return null;
  });

const show = (onNavigate?: () => void) =>
  render(
    <MemoryRouter>
      <OwnLevelStrip onNavigate={onNavigate} />
    </MemoryRouter>,
  );

describe("OwnLevelStrip", () => {
  afterEach(() => {
    cleanup();
    apiJson.mockReset();
  });

  it("shows the player's own level, XP bar and XP to go, from their own progression", async () => {
    serve(calculateMiniclipXPProgression(380));
    show();

    const bar = await screen.findByRole("progressbar", { name: "Progress to Level 5" });
    expect(bar).toHaveAttribute("aria-valuenow", "80");
    expect(screen.getByText("80 / 100 XP")).toBeInTheDocument();
    expect(screen.getByText("20 XP to go")).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/api/profile/p_me/progression");
  });

  it("opens the full profile when tapped, and tells the sheet to close", async () => {
    serve(calculateMiniclipXPProgression(380));
    const onNavigate = vi.fn();
    show(onNavigate);

    const link = await screen.findByRole("link", { name: "Open your profile" });
    expect(link).toHaveAttribute("href", "/profile");
    fireEvent.click(link);

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("shows nothing when the level cannot be fetched, instead of a made-up bar", async () => {
    serve(null);
    const { container } = show();

    await vi.waitFor(() => expect(apiJson).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

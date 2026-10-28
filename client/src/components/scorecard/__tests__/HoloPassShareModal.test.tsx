import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModeScorecard } from "@shared/profile/Scorecard";
import HoloPassShareModal from "../HoloPassShareModal";

vi.mock("../../../lib/cosmeticsResolver", async importOriginal => ({
  ...await importOriginal<typeof import("../../../lib/cosmeticsResolver")>(),
  useResolvedCosmetics: () => ({}),
}));

const record: ModeScorecard = {
  modeId: "medium", modeDisplayName: "Classic Balanced", bestScore: 42, bestScoreAchievedAt: 1700000000000,
  bestScoreMatchId: "private-match", scoringDirection: "LOWER_IS_BETTER", timesPlayed: 3,
  totalScoreAccumulated: 158, averageScore: 52.6667, recentScores: [42, 56, 60], bestContext: "VS_BOTS",
  secondaryMetrics: {}, radar: { velocity: 50, clutch: 50, efficiency: 50, consistency: 50, aggression: 50 },
  foilTier: "carbon",
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function draw() {
  return render(<HoloPassShareModal game="snl" scorecard={record} playerName="A player" onClose={() => {}} />);
}

describe("scorecard sharing", () => {
  it("copies a usable public challenge link, not an internal match or player credential", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Copy Link" }));
    expect(await screen.findByText("Copied Link!")).toBeVisible();
    const url = new URL(writeText.mock.calls[0][0]);
    expect(url.pathname).toBe("/challenge");
    expect(Object.fromEntries(url.searchParams)).toEqual({ game: "snl", mode: "medium", score: "42" });
    expect(url.href).not.toMatch(/private-match|A.player/);
  });

  it("shares the mode unit exactly once through the native API", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Share challenge" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(share.mock.calls[0][0].text).toContain("42 rolls to 100.");
    expect(share.mock.calls[0][0].url).toContain("/challenge?");
  });

  it("ignores native cancellation but surfaces real share failures", async () => {
    const share = vi.fn().mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"))
      .mockRejectedValueOnce(new Error("Unavailable"));
    vi.stubGlobal("navigator", { share });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Share challenge" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share challenge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sharing could not be opened");
  });

  it("falls back to copying when native sharing is absent and shows a manual link if that fails", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Share challenge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be copied");
    expect(screen.getByRole("textbox", { name: "Scorecard share link" }).getAttribute("value")).toContain("/challenge?");
    expect(screen.queryByText("Copied Link!")).not.toBeInTheDocument();
  });

  it("builds the same challenge for WhatsApp with a safely isolated new tab", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    draw();
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    const text = new URL(open.mock.calls[0][0]!.toString()).searchParams.get("text")!;
    expect(text).toContain("42 rolls to 100.");
    expect(text).toContain("/challenge?game=snl&mode=medium&score=42");
    expect(open).toHaveBeenCalledWith(expect.any(String), "_blank", "noopener,noreferrer");
  });
});

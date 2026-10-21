import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StarBurstOverlay } from "../StarAnimations";

// canvas-confetti needs a real canvas; the burst's visibility is what is under test.
vi.mock("../../../animations/particles/comicBursts", () => ({
  fireStarSparkleBurst: vi.fn(),
  fireFireworksBurst: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe("StarBurstOverlay", () => {
  it("names the player who completed the star", () => {
    render(<StarBurstOverlay playerName="Sweety" />);

    expect(screen.getByText(/Sweety got 4 matching slips!/)).toBeDefined();
  });

  it("clears itself even when the host passes no onComplete", async () => {
    render(<StarBurstOverlay playerName="Sweety" />);

    // The board shells mount it for the whole star/handstack phase with no
    // onComplete; before, it stayed over the table and every sheet until the
    // phase changed.
    await waitFor(() => expect(screen.queryByText(/Sweety got 4 matching slips!/)).toBeNull(), {
      timeout: 4000,
    });
  });

  it("calls onComplete exactly once for hosts that unmount it themselves", async () => {
    const onComplete = vi.fn();
    render(<StarBurstOverlay playerName="Sweety" onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 4000 });
  });

  it("sits below the room-rail sheets (backdrop z-40, panel z-50)", () => {
    const { container } = render(<StarBurstOverlay playerName="Sweety" />);

    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.className).toContain("z-[35]");
    expect(overlay.className).not.toMatch(/\bz-(40|50)\b/);
  });
});

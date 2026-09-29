import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PendingRewards } from "../PendingRewards";
import { formatArrival } from "../formatArrival";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiFetch: mockApiFetch,
}));

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

const reward = (over: Record<string, unknown> = {}) => ({
  rewardId: "rwd_1",
  amount: 500,
  status: "PENDING",
  vestingUntil: NOW + 24 * HOUR,
  description: "Level 5 milestone reward",
  ...over,
});

const respondWith = (body: unknown, ok = true) => mockApiFetch.mockResolvedValueOnce({ ok, json: async () => body });

describe("formatArrival", () => {
  it("says a reward is arriving now once its time has come", () => {
    expect(formatArrival(NOW, NOW)).toBe("arriving now");
    expect(formatArrival(NOW - 5_000, NOW)).toBe("arriving now");
  });

  it("counts minutes inside the last hour, never showing zero", () => {
    expect(formatArrival(NOW + 1_000, NOW)).toBe("in 1 min");
    expect(formatArrival(NOW + 30 * 60_000, NOW)).toBe("in 30 min");
  });

  it("rounds hours UP so a reward never seems to arrive sooner than it does", () => {
    expect(formatArrival(NOW + HOUR, NOW)).toBe("in 1 hr");
    expect(formatArrival(NOW + HOUR + 60_000, NOW)).toBe("in 2 hr");
    expect(formatArrival(NOW + 24 * HOUR, NOW)).toBe("in 24 hr");
  });
});

describe("PendingRewards", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("shows each reward that is on its way, with the coins and when they arrive", async () => {
    respondWith({ rewards: [reward(), reward({ rewardId: "rwd_2", amount: 150, description: "Level 2", vestingUntil: NOW + 3 * HOUR })], standing: null });

    render(<PendingRewards playerId="p1" now={() => NOW} />);

    expect(await screen.findByText("+500 coins")).toBeTruthy();
    expect(screen.getByText("Level 5 milestone reward")).toBeTruthy();
    expect(screen.getByText("in 24 hr")).toBeTruthy();
    expect(screen.getByText("+150 coins")).toBeTruthy();
    expect(screen.getByText("in 3 hr")).toBeTruthy();
  });

  it("leaves out rewards that are already paid or withdrawn", async () => {
    respondWith({
      rewards: [reward({ status: "RELEASED" }), reward({ rewardId: "rwd_v", status: "VOIDED", amount: 999 }), reward({ rewardId: "rwd_p", amount: 42 })],
      standing: null,
    });

    render(<PendingRewards playerId="p1" now={() => NOW} />);

    expect(await screen.findByText("+42 coins")).toBeTruthy();
    expect(screen.queryByText("+500 coins")).toBeNull();
    expect(screen.queryByText("+999 coins")).toBeNull();
  });

  it("draws nothing at all when nothing is on its way", async () => {
    respondWith({ rewards: [reward({ status: "RELEASED" })], standing: null });

    const { container } = render(<PendingRewards playerId="p1" now={() => NOW} />);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("tells a restricted or under-review account what is happening, as an alert", async () => {
    respondWith({ rewards: [], standing: { state: "UNDER_REVIEW", message: "Your rewards are paused while your account is being reviewed. Contact support if you think this is a mistake." } });

    render(<PendingRewards playerId="p1" now={() => NOW} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Contact support");
  });

  it("asks for the signed-in player's own rewards, with the id safely encoded", async () => {
    respondWith({ rewards: [], standing: null });

    render(<PendingRewards playerId="a/b c" now={() => NOW} />);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/rewards/a%2Fb%20c"));
  });

  it("says so when the list cannot be loaded, and loads it when the player retries", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("offline"));
    render(<PendingRewards playerId="p1" now={() => NOW} />);

    expect(await screen.findByText(/couldn.t load your pending rewards/i)).toBeTruthy();

    respondWith({ rewards: [reward()], standing: null });
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("+500 coins")).toBeTruthy();
  });

  it("treats a non-OK response as a failure, not as an empty list", async () => {
    respondWith({}, false);

    render(<PendingRewards playerId="p1" now={() => NOW} />);

    expect(await screen.findByText(/couldn.t load your pending rewards/i)).toBeTruthy();
  });

  it("hands what it loaded to the caller, so arrival times can be shown elsewhere", async () => {
    const onLoaded = vi.fn();
    respondWith({ rewards: [reward({ sourceId: "level:5" })], standing: null });

    render(<PendingRewards playerId="p1" onLoaded={onLoaded} now={() => NOW} />);

    await screen.findByText("+500 coins");
    expect(onLoaded).toHaveBeenCalledWith([expect.objectContaining({ sourceId: "level:5", vestingUntil: NOW + 24 * HOUR })]);
  });

  it("keeps the list on screen while it refreshes, instead of collapsing and reopening", async () => {
    respondWith({ rewards: [reward()], standing: null });
    const { rerender } = render(<PendingRewards playerId="p1" refreshKey={0} now={() => NOW} />);
    await screen.findByText("+500 coins");

    let release: (v: unknown) => void = () => {};
    mockApiFetch.mockReturnValueOnce(new Promise((r) => { release = r; }));
    rerender(<PendingRewards playerId="p1" refreshKey={1} now={() => NOW} />);

    expect(screen.getByText("+500 coins")).toBeTruthy();
    release({ ok: true, json: async () => ({ rewards: [reward({ amount: 700 })], standing: null }) });
    expect(await screen.findByText("+700 coins")).toBeTruthy();
  });

  it("reloads when told a claim just happened", async () => {
    respondWith({ rewards: [], standing: null });
    const { rerender } = render(<PendingRewards playerId="p1" refreshKey={0} now={() => NOW} />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    respondWith({ rewards: [reward()], standing: null });
    rerender(<PendingRewards playerId="p1" refreshKey={1} now={() => NOW} />);

    expect(await screen.findByText("+500 coins")).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});

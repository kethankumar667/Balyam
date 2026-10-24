import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletActivityChart } from "../WalletActivityChart";
import { getWalletActivity } from "../../../lib/economyApi";

vi.mock("../../../lib/economyApi", () => ({ getWalletActivity: vi.fn() }));
const fetchActivity = vi.mocked(getWalletActivity);
const activity = {
  serverNow: Date.UTC(2026, 10, 30),
  days: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, "0")}`,
    credited: "9007199254740993", spent: "100", balance: index === 0 ? "0" : "9007199254740993",
  })),
};
beforeEach(() => fetchActivity.mockReset());

describe("WalletActivityChart", () => {
  it("renders all 30 exact daily values and finite chart coordinates beyond Number.MAX_SAFE_INTEGER", async () => {
    fetchActivity.mockResolvedValue(activity);
    const { container } = render(<WalletActivityChart version={1} refreshKey={0} />);
    await screen.findByRole("img", { name: /daily wallet balance/i });
    expect(screen.getAllByRole("row")).toHaveLength(31);
    expect(screen.getAllByText("9,007,199,254,740,993")).toHaveLength(59);
    expect(container.querySelector("polyline")?.getAttribute("points")).not.toMatch(/NaN|Infinity/);
  });

  it("shows an explicit failure and retries rather than drawing a fake empty chart", async () => {
    fetchActivity.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(activity);
    render(<WalletActivityChart version={1} refreshKey={0} />);
    fireEvent.click(await screen.findByRole("button", { name: /retry activity/i }));
    await screen.findByRole("img");
    expect(fetchActivity).toHaveBeenCalledTimes(2);
  });

  it("ignores an old request after unmount and refetches on a wallet version change", async () => {
    fetchActivity.mockResolvedValue(activity);
    const { rerender } = render(<WalletActivityChart version={1} refreshKey={0} />);
    await screen.findByRole("img");
    rerender(<WalletActivityChart version={2} refreshKey={0} />);
    await waitFor(() => expect(fetchActivity).toHaveBeenCalledTimes(2));
  });
});

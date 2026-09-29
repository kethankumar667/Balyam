import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrustTierCard } from "../TrustTierCard";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiFetch: mockApiFetch,
}));

const tier2 = {
  trust: {
    tier: 2,
    reasons: [
      { label: "Tier 2: Account at least 3 days old", met: true, detail: "You have 5" },
      { label: "Tier 2: 5 matches with real people", met: true, detail: "You have 6" },
      { label: "Tier 3: Account at least 30 days old", met: false, detail: "You have 5" },
      { label: "Tier 3: Played 10 different people", met: false, detail: "You have 4" },
    ],
  },
  transfer: { dailyCap: 1000, sentToday: 300 },
  standing: null,
};

const respondWith = (body: unknown, ok = true) => mockApiFetch.mockResolvedValueOnce({ ok, json: async () => body });

describe("TrustTierCard", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("shows the tier, and the checklist behind it with what is done and what is not", async () => {
    respondWith(tier2);

    render(<TrustTierCard playerId="p1" />);

    expect(await screen.findByText(/Tier 2/, { selector: "p" })).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]!.textContent).toContain("Account at least 3 days old");
    expect(items[0]!.textContent).toContain("done");
    expect(items[2]!.textContent).toContain("Account at least 30 days old");
    expect(items[2]!.textContent).toContain("not yet");
    expect(items[3]!.textContent).toContain("You have 4");
  });

  it("says what the tier changes: how many coins can be sent a day, and how many already have been", async () => {
    respondWith(tier2);

    render(<TrustTierCard playerId="p1" />);

    const line = (await screen.findByText(/You can send up to/)).parentElement!;
    expect(line.textContent).toContain("1,000");
    expect(line.textContent).toContain("300 sent today");
  });

  it("leaves out the sent-today figure when the server does not have one", async () => {
    respondWith({ ...tier2, transfer: { dailyCap: 500, sentToday: null } });

    render(<TrustTierCard playerId="p1" />);

    const line = (await screen.findByText(/You can send up to/)).parentElement!;
    expect(line.textContent).toContain("500");
    expect(line.textContent).not.toContain("sent today");
  });

  it("states that the tier never uses the device or network", async () => {
    respondWith(tier2);

    render(<TrustTierCard playerId="p1" />);

    expect(await screen.findByText(/never your device or network/i)).toBeTruthy();
  });

  it("is honest when the account is restricted, as an alert", async () => {
    respondWith({ ...tier2, standing: { state: "RESTRICTED", message: "Your rewards take longer to arrive. Contact support if you think this is a mistake." } });

    render(<TrustTierCard playerId="p1" />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Contact support");
  });

  it("requests the signed-in player's own trust details", async () => {
    respondWith(tier2);

    render(<TrustTierCard playerId="p1" />);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/rewards/p1/trust"));
  });

  it("says it could not load, reassures the account is unaffected, and reloads on retry", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("offline"));
    render(<TrustTierCard playerId="p1" />);

    expect(await screen.findByText("Trust tier unavailable")).toBeTruthy();
    expect(screen.getByText(/account is unaffected/i)).toBeTruthy();

    respondWith(tier2);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText(/Tier 2/, { selector: "p" })).toBeTruthy();
  });

  it("treats a non-OK response as a failure", async () => {
    respondWith({}, false);

    render(<TrustTierCard playerId="p1" />);

    expect(await screen.findByText("Trust tier unavailable")).toBeTruthy();
  });
});

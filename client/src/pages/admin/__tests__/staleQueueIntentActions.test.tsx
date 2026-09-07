import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEconomyPage from "../economy/index";
import * as economyApi from "../../../lib/economyApi";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/**
 * Terminal Intent Queue (Blocker 06): the durable async job queue behind
 * every settlement/refund/forfeiture write, exposed via five endpoints that
 * previously had zero client references. This covers the actionable part —
 * retrying a FAILED intent and requeuing a stuck PROCESSING one — which is
 * new; the underlying stale-settlement list itself is already covered by
 * adminEconomyDashboard.test.tsx.
 */
describe("Admin Economy — Terminal Intent Queue actions", () => {
  function intent(overrides: Partial<economyApi.TerminalIntentRecord> = {}): economyApi.TerminalIntentRecord {
    return {
      id: "intent-abc12345-0000-0000-0000-000000000000",
      matchId: "m_TEST_9001",
      operationKind: "SETTLEMENT",
      status: "FAILED",
      attemptCount: 3,
      nextAttemptAt: Date.now() + 60_000,
      claimOwner: null,
      claimedAt: null,
      leaseExpiresAt: null,
      lastErrorCode: "WALLET_SERVICE_TIMEOUT",
      lastErrorCategory: "INFRASTRUCTURE",
      createdAt: Date.now() - 3_600_000,
      updatedAt: Date.now() - 600_000,
      completedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(economyApi, "getWorldBankSnapshot").mockResolvedValue({
      worldBank: {
        baseFeeRevenue: "0",
        botPrizeRevenue: "0",
        abandonmentForfeitureRevenue: "0",
        guestEscrowLiability: "0",
        totalVoucherRedeemed: "0",
      },
    });
    vi.spyOn(economyApi, "getStaleSettlements").mockResolvedValue({ settlements: [] });
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter initialEntries={["/admin/economy?tab=stale"]}>
        <AdminEconomyPage />
      </MemoryRouter>,
    );

  it("lists real terminal intents and defaults the status filter to FAILED", async () => {
    const listSpy = vi.spyOn(economyApi, "listTerminalIntents").mockResolvedValue({ intents: [intent()] });
    renderDashboard();

    await waitFor(() => expect(screen.getByText("m_TEST_9001")).toBeDefined());
    expect(screen.getByText("WALLET_SERVICE_TIMEOUT")).toBeDefined();
    expect(listSpy).toHaveBeenCalledWith("FAILED");
  });

  it("switching the status filter re-fetches with that status", async () => {
    const listSpy = vi.spyOn(economyApi, "listTerminalIntents").mockResolvedValue({ intents: [] });
    renderDashboard();
    await waitFor(() => expect(listSpy).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "PROCESSING" }));

    await waitFor(() => expect(listSpy).toHaveBeenCalledWith("PROCESSING"));
  });

  it("opening a FAILED intent shows its reconciliation and lets an operator retry it with a reason", async () => {
    const failedIntent = intent();
    vi.spyOn(economyApi, "listTerminalIntents").mockResolvedValue({ intents: [failedIntent] });
    vi.spyOn(economyApi, "reconcileTerminalIntent").mockResolvedValue({
      intent: failedIntent,
      reconciliation: {
        matchId: "m_TEST_9001",
        isConserved: false,
        committedTotal: "400",
        actualDebited: "400",
        actualCredited: "0",
        discrepancy: "400",
        detail: "400 debited but 0 credited — settlement never completed.",
      },
    });
    const retrySpy = vi.spyOn(economyApi, "retryTerminalIntent").mockResolvedValue({
      updated: true,
      intent: { ...failedIntent, status: "PENDING", attemptCount: 3 },
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText("m_TEST_9001")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /manage terminal intent/i }));

    // Real reconciliation content, not a fabricated placeholder.
    expect(await screen.findByText(/400 debited but 0 credited/i)).toBeDefined();
    expect(screen.getByText("No — discrepancy detected")).toBeDefined();

    const retryButton = screen.getByRole("button", { name: /confirm retry/i });
    expect((retryButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/reason \(required\)/i), {
      target: { value: "Upstream wallet service outage resolved, safe to retry." },
    });
    expect((retryButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(retrySpy).toHaveBeenCalledWith(
        failedIntent.id,
        "Upstream wallet service outage resolved, safe to retry.",
      ),
    );
    expect(await screen.findByText(/moved back to PENDING/i)).toBeDefined();
  });

  it("requeuing a stuck PROCESSING intent surfaces a lease-still-active error instead of pretending to succeed", async () => {
    const processingIntent = intent({
      id: "intent-def67890",
      status: "PROCESSING",
      claimOwner: "worker-3",
      leaseExpiresAt: Date.now() + 30_000,
      lastErrorCode: null,
      lastErrorCategory: null,
    });
    vi.spyOn(economyApi, "listTerminalIntents").mockResolvedValue({ intents: [processingIntent] });
    vi.spyOn(economyApi, "reconcileTerminalIntent").mockResolvedValue({
      intent: processingIntent,
      reconciliation: {
        matchId: "m_TEST_9001",
        isConserved: true,
        committedTotal: "400",
        actualDebited: "400",
        actualCredited: "400",
        discrepancy: "0",
        detail: "Conserved so far.",
      },
    });
    const requeueSpy = vi
      .spyOn(economyApi, "requeueTerminalIntent")
      .mockRejectedValue(new Error("Lease is still active for this claim; pass force to override."));

    renderDashboard();
    await waitFor(() => expect(screen.getByText("m_TEST_9001")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /manage terminal intent/i }));

    const requeueButton = await screen.findByRole("button", { name: /^confirm requeue$/i });
    fireEvent.click(requeueButton);

    await waitFor(() => expect(requeueSpy).toHaveBeenCalledWith(processingIntent.id, false));
    expect(await screen.findByText(/lease is still active/i)).toBeDefined();

    // Operator explicitly opts into overriding the active lease.
    fireEvent.click(screen.getByRole("checkbox", { name: /override active lease/i }));
    vi.spyOn(economyApi, "requeueTerminalIntent").mockResolvedValue({
      updated: true,
      intent: { ...processingIntent, status: "PENDING" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm forced requeue/i }));

    expect(await screen.findByText(/moved back to PENDING/i)).toBeDefined();
  });

  it("a COMPLETED intent shows no operator action", async () => {
    const completedIntent = intent({ status: "COMPLETED", completedAt: Date.now() });
    vi.spyOn(economyApi, "listTerminalIntents").mockResolvedValue({ intents: [completedIntent] });
    vi.spyOn(economyApi, "reconcileTerminalIntent").mockResolvedValue({
      intent: completedIntent,
      reconciliation: {
        matchId: "m_TEST_9001",
        isConserved: true,
        committedTotal: "400",
        actualDebited: "400",
        actualCredited: "400",
        discrepancy: "0",
        detail: "Conserved.",
      },
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText("m_TEST_9001")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /manage terminal intent/i }));

    expect(await screen.findByText(/no operator action available/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /confirm retry/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /confirm requeue/i })).toBeNull();
  });
});
